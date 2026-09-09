// Public entry: OAuth AS (Claude pre-registered + ChatGPT DCR) + Streamable HTTP /mcp via streamable-bridge.
// Runs in-process inside start.js (docs/plan/done/consolidate-mcp-tool-processes.md, Part B): startGatekeeper() returns the http.Server so the orchestrator can close it on shutdown.
import http from 'node:http';
import { loadOrCreatePassphrase, handleAuthorize, handleToken, handleRegister, verifyBearer } from './oauth.js';
import { handleStreamableMcp, terminateSession } from './streamable-bridge.js';
import { log, logErr, audit, nextRequestId } from './log.js';
import { serveStatic } from './http.js';

const STATIC_ALIASES = { '/favicon.ico': '/favicon/favicon.ico' };

function sendJson(res, body) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function protectedResourceMetadata(res, resource, authorizationServer) {
  return sendJson(res, {
    resource,
    authorization_servers: [authorizationServer],
  });
}

function authorizationServerMetadata(res, origin) {
  // Keep discovery completely local to the gatekeeper request handler. This intentionally avoids
  // the shared oauth.js metadata wrapper: on Windows we observed both RFC 8414 and OIDC discovery
  // requests connect successfully but never receive a byte, while the adjacent PRMD handler works.
  return sendJson(res, {
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    registration_endpoint: `${origin}/register`,
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
  });
}

function selfCheckDiscovery(port) {
  const paths = [
    '/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-authorization-server',
    '/.well-known/openid-configuration',
  ];
  for (const path of paths) {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 2500 }, (res) => {
      res.resume();
      res.on('end', () => {
        if (res.statusCode === 200) log(`[oauth] discovery self-check OK ${path}`);
        else logErr(`[oauth] discovery self-check FAILED ${path}: HTTP ${res.statusCode}`);
      });
    });
    req.on('timeout', () => {
      req.destroy();
      logErr(`[oauth] discovery self-check FAILED ${path}: timeout`);
    });
    req.on('error', (e) => logErr(`[oauth] discovery self-check FAILED ${path}: ${e.message}`));
  }
}

// origin: the public https origin (Tailscale MagicDNS). onFatal: called if the listen socket errors, so the orchestrator tears the whole stack down instead of leaking an orphaned hub.
export function startGatekeeper(origin, onFatal) {
  if (!origin) throw new Error('PUBLIC_ORIGIN (Tailscale origin) is not set');

  const port = Number(process.env.GATEKEEPER_PORT || 9999);
  const passphrase = loadOrCreatePassphrase();

  const server = http.createServer(async (req, res) => {
    const path = (req.url || '').split('?')[0];
    const t0 = Date.now();
    const requestId = nextRequestId('http');
    req.akiRequestId = requestId;
    res.akiRequestId = requestId;
    audit('http.in', {
      requestId,
      surface: 'gatekeeper',
      method: req.method,
      url: req.url,
      headers: req.headers,
      remoteAddress: req.socket?.remoteAddress || null,
    });
    res.on('finish', () => {
      const durationMs = Date.now() - t0;
      log(`[gatekeeper] ${req.method} ${req.url} -> ${res.statusCode} ${durationMs}ms`);
      audit('http.out', {
        requestId,
        surface: 'gatekeeper',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        headers: res.getHeaders(),
        durationMs,
      });
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version');
    res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Session-Id, MCP-Protocol-Version');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // RFC 9728 validation is strict: the returned `resource` must match the resource identifier
    // from which the exact well-known URL was derived. Root metadata therefore identifies `origin`,
    // while the path-specific metadata for the MCP endpoint identifies `origin/mcp`.
    if (path === '/.well-known/oauth-protected-resource' && req.method === 'GET') {
      return protectedResourceMetadata(res, origin, origin);
    }
    if (path === '/.well-known/oauth-protected-resource/mcp' && req.method === 'GET') {
      return protectedResourceMetadata(res, `${origin}/mcp`, origin);
    }

    // The authorization server issuer is `origin`, so the root RFC 8414 and OIDC discovery
    // documents return the same authoritative metadata.
    if ((path === '/.well-known/oauth-authorization-server' || path === '/.well-known/openid-configuration') && req.method === 'GET') {
      return authorizationServerMetadata(res, origin);
    }
    if (path === '/register' && req.method === 'POST') return handleRegister(req, res);
    if (path === '/authorize' && (req.method === 'GET' || req.method === 'POST')) return handleAuthorize(req, res, passphrase, origin);
    if (path === '/token' && req.method === 'POST') return handleToken(req, res);

    if (path === '/mcp') {
      if (!verifyBearer(req.headers.authorization)) {
        res.writeHead(401, {
          'Content-Type': 'text/plain',
          'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
        });
        res.end('unauthorized');
        return;
      }
      if (req.method === 'POST') return handleStreamableMcp(req, res);
      if (req.method === 'DELETE') {
        const sid = req.headers['mcp-session-id'];
        if (sid) terminateSession(sid);
        res.writeHead(204);
        return res.end();
      }
      res.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'POST, DELETE' });
      return res.end('server push not supported');
    }

    if (req.method === 'GET' && await serveStatic(res, path, STATIC_ALIASES)) return;

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });

  server.on('error', (e) => {
    logErr(`[gatekeeper] failed to listen on :${port}: ${e.message}`);
    audit('server.error', { surface: 'gatekeeper', error: e });
    onFatal?.();
  });
  server.listen(port, () => {
    log(`[gatekeeper] listening on :${port} (OAuth-protected /mcp)`);
    selfCheckDiscovery(port);
  });

  return server;
}
