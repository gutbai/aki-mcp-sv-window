import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.MCP_DISABLE_FILE_LOG = '1';
process.env.GATEKEEPER_PORT = '0';

const { startGatekeeper } = await import('../scripts/gatekeeper.js');

const origin = 'https://mcp.example.test';
const server = startGatekeeper(origin);
if (!server.listening) await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;

try {
  const rootRes = await fetch(base + '/.well-known/oauth-protected-resource');
  assert.equal(rootRes.status, 200);
  assert.match(rootRes.headers.get('content-type') || '', /^application\/json/);
  const root = await rootRes.json();
  assert.equal(root.resource, origin);
  assert.deepEqual(root.authorization_servers, [origin]);

  const mcpRes = await fetch(base + '/.well-known/oauth-protected-resource/mcp');
  assert.equal(mcpRes.status, 200);
  const mcp = await mcpRes.json();
  assert.equal(mcp.resource, origin + '/mcp');
  assert.deepEqual(mcp.authorization_servers, [origin]);

  const asRes = await fetch(base + '/.well-known/oauth-authorization-server');
  assert.equal(asRes.status, 200);
  const as = await asRes.json();
  assert.equal(as.issuer, origin);
  assert.equal(as.registration_endpoint, origin + '/register');
  assert.equal(as.token_endpoint, origin + '/token');
  assert.ok(as.code_challenge_methods_supported.includes('S256'));

  const badAlias = await fetch(base + '/.well-known/oauth-authorization-server/mcp');
  assert.equal(badAlias.status, 404);

  const challenge = await fetch(base + '/mcp');
  assert.equal(challenge.status, 401);
  assert.equal(
    challenge.headers.get('www-authenticate'),
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
  );

  console.log('PASS: OAuth discovery metadata is RFC 9728-consistent for root and /mcp resources');
} finally {
  server.close();
  await once(server, 'close');
}
