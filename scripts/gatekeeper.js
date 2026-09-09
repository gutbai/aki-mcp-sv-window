// Public entry: OAuth AS (Claude pre-registered + ChatGPT DCR) + Streamable HTTP /mcp via streamable-bridge.
// Runs in-process inside start.js (docs/plan/done/consolidate-mcp-tool-processes.md, Part B): startGatekeeper() returns the http.Server so the orchestrator can close it on shutdown.
import http from 'node:http';
import { loadOrCreatePassphrase, metadataHandlers, handleAuthorize, handleToken, handleRegister, verifyBearer } from './oauth.js';
import { handleStreamableMcp, terminateSession } from './streamable-bridge.js';
import { log, logErr, audit, nextRequestId } from './log.js';
import { serveStatic } from './http.js';

const STATIC_ALIASES = { '/favicon.ico': '/favicon/favicon.ico' };

function protectedResourceMetadata(res, resource, authorizationServer) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({
    resource,
    authorization_servers: [authorizationServer],
  }));
}

// origin: the public https origin (Tailscale MagicDNS). onFatal: called if the listen socket errors, so the orchestrator tears the whole stack down instead of leaking an orphaned hub.
export function startGatekeeper(origin, onFatal) {
  if (!origin) throw new Error('PUBLIC_ORIGIN (Tailscale origin) is not set');

  const port = Number(process.env.GATEKEEPER_PORT || 9999);
  const passphrase = loadOrCreatePassphrase();
  const meta = metadataHandlers(origin);

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

    // The authorization server issuer is `origin`, so only the root RFC 8414/OIDC discovery
    // documents are authoritative. Serving a `/mcp` AS metadata alias with issuer=`origin` makes
    // strict clients reject the document for issuer mismatch.
    if ((path === '/.well-known/oauth-authorization-server' || path === '/.well-known/openid-configuration') && req.method === 'GET') return meta.authorizationServer(req, res);
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
  });

  return server;
}
