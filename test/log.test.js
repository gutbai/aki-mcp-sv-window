import assert from 'node:assert/strict';

process.env.MCP_DISABLE_FILE_LOG = '1';
const { redactForLog } = await import('../scripts/log.js');

const got = redactForLog({
  authorization: 'Bearer secret-token',
  prompt: 'read this file and keep prompt text visible',
  nested: { passphrase: 'abc123', code: '123456789abcdef' },
  raw: 'client_secret=hello&code_verifier=world&foo=bar',
  error: { code: -32000, message: 'safe' },
});

assert.equal(got.authorization, '[REDACTED]');
assert.equal(got.prompt, 'read this file and keep prompt text visible');
assert.equal(got.nested.passphrase, '[REDACTED]');
assert.equal(got.nested.code, '[REDACTED]');
assert.match(got.raw, /client_secret=\[REDACTED\]/);
assert.match(got.raw, /code_verifier=\[REDACTED\]/);
assert.equal(got.raw.endsWith('foo=bar'), true);
assert.equal(got.error.code, -32000);

console.log('log redaction tests passed');
