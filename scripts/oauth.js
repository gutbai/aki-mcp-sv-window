#!/usr/bin/env node
// Minimal OAuth 2.1 authorization server.
// Claude: pre-registered confidential client. ChatGPT/Grok: DCR public clients + PKCE.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import {
  CLIENT_PATH as CLIENT_FILE,
  DCR_CLIENTS_PATH as DCR_FILE,
  PASSPHRASE_PATH as PASSPHRASE_FILE,
  TOKENS_PATH as TOKENS_FILE,
} from './userdata.js';
import { log, audit } from './log.js';
import { readBody, json as httpJson } from './http.js';
import { esc } from './html.js';

const CLAUDE_CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const CHATGPT_LEGACY_CALLBACK = 'https://chatgpt.com/connector_platform_oauth_redirect';
const CHATGPT_CALLBACK_PREFIX = 'https://chatgpt.com/connector/oauth/';
const GEMINI_CALLBACK_PREFIX = 'https://oauth-redirect.googleusercontent.com/r/';
const GROK_CALLBACK_PREFIX = 'https://grok.com/connectors-oauth-exchange-code/';
const CODE_TTL_MS = 5 * 60 * 1000;
const ACCESS_TTL_S = 365 * 24 * 3600;
const PASSPHRASE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const PASSPHRASE_LENGTH = 10;
const PASSPHRASE_DISPLAY_PATH = PASSPHRASE_FILE.replace(os.homedir(), '~');

const authCodes = new Map();
const accessTokens = new Map();
const refreshTokens = new Map();

function redirectKind(uri) {
  if (uri === CHATGPT_LEGACY_CALLBACK) return 'chatgpt-legacy-stable';
  if (uri?.startsWith(CHATGPT_CALLBACK_PREFIX)) return 'chatgpt-callback-id';
  if (uri === CLAUDE_CALLBACK) return 'claude';
  if (uri?.startsWith(GROK_CALLBACK_PREFIX)) return 'grok';
  if (uri?.startsWith(GEMINI_CALLBACK_PREFIX)) return 'gemini';
  return 'other';
}

function isAllowedRedirect(uri) {
  if (typeof uri !== 'string' || !uri) return false;
  if (uri === CLAUDE_CALLBACK || uri === CHATGPT_LEGACY_CALLBACK) return true;
  return uri.startsWith(CHATGPT_CALLBACK_PREFIX)
    || uri.startsWith(GROK_CALLBACK_PREFIX)
    || uri.startsWith(GEMINI_CALLBACK_PREFIX);
}

function loadTokens() {
  if (!existsSync(TOKENS_FILE)) return;
  try {
    const saved = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
    for (const [token, entry] of Object.entries(saved.access ?? {})) accessTokens.set(token, entry);
    for (const [token, entry] of Object.entries(saved.refresh ?? {})) refreshTokens.set(token, entry);
  } catch (e) {
    console.error(`[oauth] skipping unreadable ${TOKENS_FILE} (${e.message}) — will need to authorize again`);
  }
}

function saveTokens() {
  const now = Date.now();
  for (const [token, entry] of accessTokens) if (entry.expires < now) accessTokens.delete(token);
  const body = { access: Object.fromEntries(accessTokens), refresh: Object.fromEntries(refreshTokens) };
  writeFileSync(TOKENS_FILE, JSON.stringify(body), { mode: 0o600 });
}

loadTokens();

export function loadOrCreateClient() {
  if (existsSync(CLIENT_FILE)) return JSON.parse(readFileSync(CLIENT_FILE, 'utf8'));
  const creds = { clientId: randomBytes(16).toString('hex'), clientSecret: randomBytes(32).toString('hex') };
  writeFileSync(CLIENT_FILE, JSON.stringify(creds), { mode: 0o600 });
  return creds;
}

function loadDcrClients() {
  if (!existsSync(DCR_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DCR_FILE, 'utf8'));
  } catch (e) {
    console.error(`[oauth] ignoring malformed ${DCR_FILE}: ${e.message}`);
    return {};
  }
}

function saveDcrClients(map) {
  writeFileSync(DCR_FILE, JSON.stringify(map, null, 2), { mode: 0o600 });
}

function resolveClient(clientId) {
  if (!clientId) return null;
  const staticClient = loadOrCreateClient();
  if (clientId === staticClient.clientId) {
    return {
      clientId: staticClient.clientId,
      clientSecret: staticClient.clientSecret,
      redirectUris: [CLAUDE_CALLBACK],
      isStatic: true,
      tokenEndpointAuthMethod: 'client_secret_post',
      clientName: 'Pre-registered MCP client',
    };
  }
  return loadDcrClients()[clientId] || null;
}

export function getOAuthDiagnostics() {
  const clients = Object.values(loadDcrClients()).map((entry) => ({
    clientId: entry.clientId,
    clientName: entry.clientName || 'MCP client',
    redirectUris: entry.redirectUris || [],
    redirectKinds: (entry.redirectUris || []).map(redirectKind),
    tokenEndpointAuthMethod: entry.tokenEndpointAuthMethod || 'none',
  }));
  const legacyChatgpt = clients.filter((c) => c.redirectKinds.includes('chatgpt-legacy-stable'));
  const callbackIdChatgpt = clients.filter((c) => c.redirectKinds.includes('chatgpt-callback-id'));
  return {
    clients,
    legacyChatgptCount: legacyChatgpt.length,
    callbackIdChatgptCount: callbackIdChatgpt.length,
    recommendation: legacyChatgpt.length
      ? 'A legacy ChatGPT DCR client is cached. Reset ChatGPT OAuth, delete/recreate the ChatGPT connector, then reconnect so ChatGPT can register its current callback-id redirect.'
      : 'No cached legacy ChatGPT DCR client detected.',
  };
}

export function resetChatGptOAuth() {
  const map = loadDcrClients();
  const removedIds = new Set();
  for (const [clientId, entry] of Object.entries(map)) {
    if ((entry.redirectUris || []).some((uri) => uri === CHATGPT_LEGACY_CALLBACK || uri.startsWith(CHATGPT_CALLBACK_PREFIX))) {
      removedIds.add(clientId);
      delete map[clientId];
    }
  }
  saveDcrClients(map);
  for (const [code, entry] of authCodes) if (removedIds.has(entry.clientId)) authCodes.delete(code);
  for (const [token, entry] of refreshTokens) if (removedIds.has(entry.clientId)) refreshTokens.delete(token);
  // Old access-token records created before clientId was persisted cannot be attributed safely. Clearing access
  // tokens guarantees the reset actually invalidates stale ChatGPT grants; other clients can refresh/reconnect.
  const revokedAccess = accessTokens.size;
  accessTokens.clear();
  saveTokens();
  audit('oauth.reset.chatgpt', { removedDcrClients: removedIds.size, revokedAccess });
  return { removedDcrClients: removedIds.size, revokedAccess };
}

export function loadOrCreatePassphrase() {
  if (existsSync(PASSPHRASE_FILE)) return readFileSync(PASSPHRASE_FILE, 'utf8').trim();
  const bytes = randomBytes(PASSPHRASE_LENGTH);
  const p = Array.from(bytes, (b) => PASSPHRASE_ALPHABET[b % PASSPHRASE_ALPHABET.length]).join('');
  writeFileSync(PASSPHRASE_FILE, p, { mode: 0o600 });
  return p;
}

function safeEqual(a, b) {
  const ab = Buffer.from(a ?? '');
  const bb = Buffer.from(b ?? '');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const json = (res, status, body) => httpJson(res, status, body, { 'Cache-Control': 'no-store' });

export function metadataHandlers(origin) {
  return {
    protectedResource(req, res) {
      json(res, 200, { resource: `${origin}/mcp`, authorization_servers: [origin] });
    },
    authorizationServer(req, res) {
      json(res, 200, {
        issuer: origin,
        authorization_endpoint: `${origin}/authorize`,
        token_endpoint: `${origin}/token`,
        registration_endpoint: `${origin}/register`,
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
      });
    },
  };
}

export async function handleRegister(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req) || '{}');
  } catch {
    return json(res, 400, { error: 'invalid_client_metadata' });
  }
  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || !redirectUris.length || !redirectUris.every(isAllowedRedirect)) {
    log(`[oauth] register REJECTED (redirect_uri not allowlisted): ${JSON.stringify(redirectUris)}`);
    return json(res, 400, { error: 'invalid_redirect_uri' });
  }
  const authMethod = body.token_endpoint_auth_method || 'none';
  if (authMethod !== 'none' && authMethod !== 'client_secret_post') {
    return json(res, 400, { error: 'invalid_client_metadata' });
  }

  const clientId = randomBytes(16).toString('hex');
  const clientSecret = authMethod === 'client_secret_post' ? randomBytes(32).toString('hex') : null;
  const entry = {
    clientId,
    clientSecret,
    redirectUris,
    tokenEndpointAuthMethod: authMethod,
    clientName: typeof body.client_name === 'string' ? body.client_name : 'MCP client',
  };
  const map = loadDcrClients();
  map[clientId] = entry;
  saveDcrClients(map);

  const kinds = redirectUris.map(redirectKind);
  audit('oauth.register', { clientId, clientName: entry.clientName, redirectKinds: kinds, authMethod });
  if (kinds.includes('chatgpt-legacy-stable')) {
    log('[oauth] WARNING: ChatGPT registered legacy connector_platform_oauth_redirect; current OpenAI docs use connector/oauth/{callback_id} for new connections');
  }

  const resp = {
    client_id: clientId,
    client_name: entry.clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: authMethod,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
  if (clientSecret) resp.client_secret = clientSecret;
  return json(res, 201, resp);
}

const PAGE_STYLE = `
:root { color-scheme: light dark; --bg:#faf9f7; --card:#fff; --line:#e5e2dc; --fg:#1a1a1a; --muted:#6b6b6b; --accent:#ff4800; }
@media (prefers-color-scheme: dark) { :root { --bg:#1a1817; --card:#232120; --line:#38352f; --fg:#ececec; --muted:#9a948c; } }
* { box-sizing: border-box; }
body { font-family: -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; width: 100%; max-width: 360px; }
h1 { font-size: 16px; margin: 0 0 4px; }
p { color: var(--muted); font-size: 13px; margin: 0 0 16px; }
input { width: 100%; padding: 9px 10px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--fg); font-size: 14px; }
input:focus { outline: none; border-color: var(--accent); }
button { width: 100%; margin-top: 10px; padding: 9px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: #fff; font-size: 14px; cursor: pointer; }
button[disabled] { opacity: .6; cursor: progress; }
`;

function errorPage(title, message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><link rel="icon" href="/favicon/favicon.ico" sizes="any"><meta name="theme-color" content="#ff4800">
<style>${PAGE_STYLE}</style></head><body>
<div class="card">
<h1>${esc(title)}</h1>
<p>${esc(message)}</p>
<p>Go back and try again, or re-open the connector in your AI client.</p>
</div>
</body></html>`;
}

export async function handleAuthorize(req, res, passphrase, origin) {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://internal');
  const q = req.method === 'GET' ? url.searchParams : new URLSearchParams(await readBody(req));
  const redirectUri = q.get('redirect_uri');
  const clientId = q.get('client_id');
  const codeChallenge = q.get('code_challenge');
  const codeChallengeMethod = q.get('code_challenge_method');
  const state = q.get('state') || '';
  const resource = q.get('resource') || '';
  const client = resolveClient(clientId);
  const redirectOk = !!client && (client.redirectUris.includes(redirectUri) || (client.isStatic && isAllowedRedirect(redirectUri)));
  const kind = redirectKind(redirectUri);

  audit('oauth.authorize', {
    phase: req.method,
    clientId,
    clientType: client?.isStatic ? 'static' : client ? 'dcr' : 'unknown',
    redirectKind: kind,
    hasState: !!state,
    hasResource: !!resource,
  });

  if (!redirectOk || codeChallengeMethod !== 'S256' || !codeChallenge) {
    log(`[oauth] authorize REJECTED (${req.method}): client_ok=${!!client} redirect_ok=${redirectOk} method=${codeChallengeMethod} hasChallenge=${!!codeChallenge}`);
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(errorPage('Connection request invalid', 'This connection request is invalid or has expired.'));
    return;
  }

  if (req.method === 'GET') {
    const clientLabel = client.clientName ? `An app called "${esc(client.clientName)}"` : 'An MCP client';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirm MCP connection</title><link rel="icon" href="/favicon/favicon.ico" sizes="any"><link rel="icon" type="image/png" href="/favicon/icon-192.png"><link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png"><link rel="manifest" href="/favicon/manifest.json"><meta name="theme-color" content="#ff4800">
<style>${PAGE_STYLE}</style></head><body>
<form class="card" method="POST" onsubmit="this.btn.disabled=true;this.btn.textContent='Confirming…'">
<h1>Confirm MCP connection</h1>
<p>${clientLabel} wants to connect.</p>
<p>Enter the passphrase shown in the control panel (section 1 · Connectors) to grant access — or read it from <code>${PASSPHRASE_DISPLAY_PATH}</code>.</p>
<input type="hidden" name="redirect_uri" value="${esc(redirectUri)}">
<input type="hidden" name="client_id" value="${esc(clientId)}">
<input type="hidden" name="code_challenge" value="${esc(codeChallenge)}">
<input type="hidden" name="code_challenge_method" value="${esc(codeChallengeMethod)}">
<input type="hidden" name="state" value="${esc(state)}">
<input type="hidden" name="resource" value="${esc(resource)}">
<input type="password" name="passphrase" placeholder="Passphrase" autofocus autocomplete="current-password">
<button type="submit" name="btn">Approve</button>
</form>
</body></html>`);
    return;
  }

  if (!safeEqual(q.get('passphrase'), passphrase)) {
    log('[oauth] authorize POST: WRONG passphrase');
    res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(errorPage('Wrong passphrase', "That passphrase didn't match."));
    return;
  }
  const code = randomBytes(24).toString('hex');
  authCodes.set(code, { clientId, redirectUri, codeChallenge, resource, expires: Date.now() + CODE_TTL_MS });
  log(`[oauth] authorize approved -> code issued (state=${state ? 'yes' : 'no'}, redirect=${kind}), redirecting to ${new URL(redirectUri).host}`);
  const redirect = new URL(redirectUri);
  redirect.searchParams.set('code', code);
  // Current ChatGPT callback-id redirects do not need AS issuer multiplexing. Keep `iss` only for the
  // legacy stable callback because old/published connector flows may still rely on it.
  if (redirectUri === CHATGPT_LEGACY_CALLBACK) redirect.searchParams.set('iss', origin);
  if (state) redirect.searchParams.set('state', state);
  res.writeHead(302, { Location: redirect.toString() });
  res.end();
}

function authenticateClient(body) {
  const client = resolveClient(body.get('client_id'));
  if (!client) return null;
  if (client.tokenEndpointAuthMethod === 'none') return client;
  if (!safeEqual(body.get('client_secret'), client.clientSecret || '')) return null;
  return client;
}

export async function handleToken(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const body = new URLSearchParams(await readBody(req));
  const grantType = body.get('grant_type');
  const resource = body.get('resource') || '';
  log(`[oauth] token request: grant_type=${grantType}`);
  audit('oauth.token', { phase: 'request', grantType, clientId: body.get('client_id'), hasResource: !!resource });

  const client = authenticateClient(body);
  if (!client) {
    log('[oauth] token FAILED: invalid_client (unknown client_id or secret mismatch)');
    return json(res, 401, { error: 'invalid_client' });
  }

  if (grantType === 'authorization_code') {
    const code = body.get('code');
    const entry = authCodes.get(code);
    if (!entry || entry.expires < Date.now()) {
      log(`[oauth] token FAILED: invalid_grant (code ${entry ? 'expired' : 'unknown'})`);
      return json(res, 400, { error: 'invalid_grant' });
    }
    authCodes.delete(code);
    if (entry.clientId !== client.clientId) {
      log('[oauth] token FAILED: invalid_grant (code was issued to a different client)');
      return json(res, 400, { error: 'invalid_grant' });
    }
    if (entry.redirectUri !== body.get('redirect_uri')) {
      log('[oauth] token FAILED: invalid_grant (redirect_uri mismatch)');
      return json(res, 400, { error: 'invalid_grant' });
    }
    if (entry.resource && resource && entry.resource !== resource) {
      log('[oauth] token FAILED: invalid_target (resource mismatch)');
      return json(res, 400, { error: 'invalid_target' });
    }
    const computed = createHash('sha256').update(body.get('code_verifier') || '').digest('base64url');
    if (computed !== entry.codeChallenge) {
      log('[oauth] token FAILED: invalid_grant (PKCE code_verifier mismatch)');
      return json(res, 400, { error: 'invalid_grant' });
    }
    return issueTokens(res, entry.clientId, undefined, 'authorization_code');
  }

  if (grantType === 'refresh_token') {
    const entry = refreshTokens.get(body.get('refresh_token'));
    if (!entry || entry.clientId !== client.clientId) {
      log(`[oauth] token FAILED: invalid_grant (${entry ? 'refresh_token belongs to another client' : 'unknown refresh_token — stale after tokens file reset?'})`);
      return json(res, 400, { error: 'invalid_grant' });
    }
    return issueTokens(res, entry.clientId, body.get('refresh_token'), 'refresh_token');
  }

  log(`[oauth] token FAILED: unsupported_grant_type (${grantType})`);
  return json(res, 400, { error: 'unsupported_grant_type' });
}

function mintTokens(clientId, existingRefresh, via) {
  const accessToken = randomBytes(32).toString('hex');
  accessTokens.set(accessToken, { expires: Date.now() + ACCESS_TTL_S * 1000, clientId });
  const refreshToken = existingRefresh || randomBytes(32).toString('hex');
  refreshTokens.set(refreshToken, { clientId });
  saveTokens();
  log(`[oauth] tokens ISSUED via ${via} (access + refresh) — client is now authorized`);
  audit('oauth.token', { phase: 'issued', via, clientId });
  return { accessToken, refreshToken };
}

function issueTokens(res, clientId, existingRefresh, via) {
  const { accessToken, refreshToken } = mintTokens(clientId, existingRefresh, via);
  json(res, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_TTL_S, refresh_token: refreshToken });
}

export function getOrIssueAccessToken() {
  const now = Date.now();
  for (const [token, entry] of accessTokens) {
    if (entry.expires >= now) return token;
  }
  return mintTokens(loadOrCreateClient().clientId, undefined, 'panel').accessToken;
}

export function verifyBearer(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    log('[oauth] bearer check FAILED: no/invalid Authorization header');
    return false;
  }
  const entry = accessTokens.get(authHeader.slice(7));
  if (!entry) {
    log('[oauth] bearer check FAILED: token not recognized (stale after tokens file reset / restart?)');
    return false;
  }
  if (entry.expires < Date.now()) {
    log('[oauth] bearer check FAILED: token expired');
    return false;
  }
  return true;
}
