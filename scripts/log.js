// Persistent structured logging for the whole process. Console output is tee'd to a daily JSONL file,
// while audit() records request/tool payloads without spamming the terminal. Secrets are redacted before disk write.
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { USER_DIR } from './userdata.js';

export const LOG_DIR = path.join(USER_DIR, 'logs');
const FILE_LOG_DISABLED = process.env.MCP_DISABLE_FILE_LOG === '1';
const rawConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};
let fileLoggingBroken = false;
let seq = 0;

const REDACT_KEY = /authorization|cookie|set-cookie|client[_-]?secret|access[_-]?token|refresh[_-]?token|passphrase|password|code[_-]?verifier|x-panel-token/i;

function redactString(value) {
  return value
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
    .replace(/(^|[?&])((?:passphrase|client_secret|access_token|refresh_token|code_verifier|x-panel-token|token|password|code|t)=)[^&\s"']+/gi, '$1$2[REDACTED]')
    .replace(/((?:oauth\s+client\s+secret|client\s+secret|access\s+token|refresh\s+token|passphrase|password)[^:\r\n]{0,120}:\s*)\S+/gi, '$1[REDACTED]');
}

function sanitize(value, seen = new WeakSet(), key = '') {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') {
    if (REDACT_KEY.test(key) || (key.toLowerCase() === 'code' && value.length > 8)) return '[REDACTED]';
    return redactString(value);
  }
  if (value instanceof Error) return { name: value.name, message: redactString(value.message), stack: redactString(value.stack || '') };
  if (Buffer.isBuffer(value)) return `<Buffer ${value.length} bytes>`;
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = REDACT_KEY.test(k) || (k.toLowerCase() === 'code' && typeof v === 'string' && v.length > 8)
      ? '[REDACTED]'
      : sanitize(v, seen, k);
  }
  return out;
}

export const redactForLog = (value) => sanitize(value);

function currentLogFile() {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `aki-${day}.jsonl`);
}

function writeRecord(record) {
  if (FILE_LOG_DISABLED || fileLoggingBroken) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
    appendFileSync(currentLogFile(), `${JSON.stringify(sanitize(record))}\n`, { encoding: 'utf8', mode: 0o600 });
  } catch (e) {
    fileLoggingBroken = true;
    rawConsole.error(`[aki-log] file logging disabled after write failure: ${e.message}`);
  }
}

function teeConsole(level, args) {
  writeRecord({ ts: new Date().toISOString(), type: 'console', level, args });
}

for (const level of Object.keys(rawConsole)) {
  console[level] = (...args) => {
    teeConsole(level, args);
    rawConsole[level](...args);
  };
}

export function audit(type, data = {}) {
  writeRecord({ ts: new Date().toISOString(), type, ...data });
}

export function nextRequestId(prefix = 'req') {
  seq += 1;
  return `${prefix}-${process.pid}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

const stamp = () => new Date().toISOString();
export const log = (...a) => console.log(`[${stamp()}]`, ...a);
export const logErr = (...a) => console.error(`[${stamp()}]`, ...a);
