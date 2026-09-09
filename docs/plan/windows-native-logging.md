# Windows native install + full logging

Branch: `windows-native-logging`

## Scope

- [x] Replace bash-only rule install/update path with native Windows PowerShell/Python execution while preserving Linux behavior.
- [x] Add persistent structured logging for HTTP requests/responses, OAuth flow, MCP JSON-RPC, tool calls, prompts/arguments, results, errors and durations.
- [x] Redact credentials/tokens/passphrases from logs.
- [x] Add root `run-aki.bat` for double-click startup and first-run dependency install.
- [x] Add regression tests for logging/redaction; targeted local test passed and Windows installer module passes `node --check`.
- [x] Open PR. GitHub Actions did not start on this fork (`0` workflow runs), so CI could not be used as a gate.

## Log destination

`%USERPROFILE%\.aki\mcpsv\logs\aki-YYYY-MM-DD.jsonl` on Windows; equivalent `~/.aki/mcpsv/logs/` on other platforms.

## Validation notes

- `test/log.test.js`: passed in a local Node 22 scratch run.
- `scripts/windows-rule-installer.js`: syntax-checked with Node 22.
- PR: `#1`.
