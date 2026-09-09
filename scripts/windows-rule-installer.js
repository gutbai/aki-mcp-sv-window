// Windows-native akidevrule installer. No bash/Git-Bash dependency: clone/pull with git, then run
// the upstream PowerShell launcher (which delegates to install.py). Python is a direct fallback.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { audit } from './log.js';

const RULES_DIR = path.join(os.homedir(), '.aki', 'akidevrule');
const SOURCE_REPO_FILE = path.join(RULES_DIR, '.source-repo');
const RULES_CLONE_DIR = path.join(os.homedir(), '.aki', 'akidevrule-src');
const RULES_REPO_URL = 'https://github.com/lacvietanh/akidevrule.git';

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    audit('process.in', { command, args, cwd, purpose: 'install-rules' });
    execFile(command, args, { cwd, timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const output = stdout || stderr || '(no output)';
      if (err) {
        const wrapped = new Error(stderr || stdout || err.message);
        wrapped.code = err.code;
        audit('process.error', { command, args, cwd, purpose: 'install-rules', durationMs: Date.now() - started, error: wrapped });
        return reject(wrapped);
      }
      audit('process.out', { command, args, cwd, purpose: 'install-rules', durationMs: Date.now() - started, output });
      resolve(output);
    });
  });
}

const hasInstaller = (repo) => ['install.ps1', 'install.py'].some((name) => existsSync(path.join(repo, name)));

async function ensureRepo() {
  const recorded = existsSync(SOURCE_REPO_FILE) ? readFileSync(SOURCE_REPO_FILE, 'utf8').trim() : null;
  if (recorded && hasInstaller(recorded)) return recorded;

  if (existsSync(path.join(RULES_CLONE_DIR, '.git'))) {
    await run('git.exe', ['-C', RULES_CLONE_DIR, 'pull', '--ff-only']);
  } else {
    mkdirSync(path.dirname(RULES_CLONE_DIR), { recursive: true });
    await run('git.exe', ['clone', '--depth', '1', RULES_REPO_URL, RULES_CLONE_DIR]);
  }
  if (!hasInstaller(RULES_CLONE_DIR)) throw new Error(`akidevrule clone has no install.ps1/install.py: ${RULES_CLONE_DIR}`);
  return RULES_CLONE_DIR;
}

async function runPowerShell(repo) {
  const script = path.join(repo, 'install.ps1');
  if (!existsSync(script)) return null;
  let missing = null;
  for (const command of ['powershell.exe', 'pwsh.exe']) {
    try {
      return await run(command, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], repo);
    } catch (e) {
      if (e.code === 'ENOENT') {
        missing = e;
        continue;
      }
      throw e;
    }
  }
  if (missing) return null;
  return null;
}

async function runPython(repo) {
  const script = path.join(repo, 'install.py');
  if (!existsSync(script)) return null;
  const candidates = [
    ['py.exe', ['-3', script]],
    ['python.exe', [script]],
    ['python3.exe', [script]],
  ];
  for (const [command, args] of candidates) {
    try {
      return await run(command, args, repo);
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }
  }
  return null;
}

export async function installRulesWindows() {
  const repo = await ensureRepo();
  const output = await runPowerShell(repo) ?? await runPython(repo);
  if (output == null) {
    throw new Error('PowerShell/Python 3 not found. Windows install does not require bash; install Python 3 or enable Windows PowerShell, then retry.');
  }
  const lastLine = output.trim().split(/\r?\n/).filter(Boolean).pop() || 'installed';
  return `${lastLine} (source: ${repo})`;
}
