import assert from 'node:assert/strict';

process.env.MCP_DISABLE_FILE_LOG = '1';
const { redactForLog } = await import('../scripts/log.js');

const got = redactForLog({
  authorization: 'Bearer secret-token',
  prompt: 'read this file and keep prompt text visible',
  nested: { passphrase: 'abc123', code: '123456789abcdef' },
  raw: 'client_secret=hello&code_verifier=world&foo=bar',
  url: '/authorize?state=oauth-secret&code_challenge=challenge-secret&target=keep-this',
  startup: '[start] OAuth Client Secret: super-secret-value',
  startup2: '[start] Passphrase (enter it in browser): phrase123',
  headers: {
    'tailscale-user-login': 'example-login',
    'tailscale-user-name': 'Example Name',
    'tailscale-user-profile-pic': 'example-profile',
    'x-forwarded-for': 'example-forwarded-address',
    referer: 'https://example.test/authorize?state=abc',
    host: 'desktop.example.test',
  },
  error: { code: -32000, message: 'safe' },
});

assert.equal(got.authorization, '[REDACTED]');
assert.equal(got.prompt, 'read this file and keep prompt text visible');
assert.equal(got.nested.passphrase, '[REDACTED]');
assert.equal(got.nested.code, '[REDACTED]');
assert.match(got.raw, /client_secret=\[REDACTED\]/);
assert.match(got.raw, /code_verifier=\[REDACTED\]/);
assert.equal(got.raw.endsWith('foo=bar'), true);
assert.match(got.url, /state=\[REDACTED\]/);
assert.match(got.url, /code_challenge=\[REDACTED\]/);
assert.match(got.url, /target=keep-this/);
assert.equal(got.startup, '[start] OAuth Client Secret: [REDACTED]');
assert.equal(got.startup2, '[start] Passphrase (enter it in browser): [REDACTED]');
assert.equal(got.headers['tailscale-user-login'], '[REDACTED]');
assert.equal(got.headers['tailscale-user-name'], '[REDACTED]');
assert.equal(got.headers['tailscale-user-profile-pic'], '[REDACTED]');
assert.equal(got.headers['x-forwarded-for'], '[REDACTED]');
assert.equal(got.headers.referer, '[REDACTED]');
assert.equal(got.headers.host, 'desktop.example.test');
assert.equal(got.error.code, -32000);

console.log('log redaction tests passed');
