import assert from 'node:assert/strict';

process.env.MCP_DISABLE_FILE_LOG = '1';
const { redactForLog } = await import('../scripts/log.js');

const got = redactForLog({
  authorization: 'Bearer secret-token',
  prompt: 'read this file and keep prompt text visible',
  nested: { passphrase: 'abc123', code: '123456789abcdef' },
  raw: 'client_secret=hello&code_verifier=world&foo=bar',
  url: '/?t=panel-secret&target=keep-this',
  startup: '[start] OAuth Client Secret: super-secret-value',
  startupPassphrase: '[start] Passphrase (enter it in browser): phrase123',
  error: { code: -32000, message: 'safe' },
});

assert.equal(got.authorization, '[REDACTED]');
assert.equal(got.prompt, 'read this file and keep prompt text visible');
assert.equal(got.nested.passphrase, '[REDACTED]');
assert.equal(got.nested.code, '[REDACTED]');
assert.match(got.raw, /client_secret=\[REDACTED\]/);
assert.match(got.raw, /code_verifier=\[REDACTED\]/);
assert.equal(got.raw.endsWith('foo=bar'), true);
assert.match(got.url, /\?t=\[REDACTED\]/);
assert.match(got.url, /target=keep-this/);
assert.equal(got.startup, '[start] OAuth Client Secret: [REDACTED]');
assert.equal(got.startupPassphrase, '[start] Passphrase (enter it in browser): [REDACTED]');
assert.equal(got.error.code, -32000);

console.log('log redaction tests passed');
