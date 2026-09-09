# Windows native install + full logging

Branch: `windows-native-logging`

## Scope

- [ ] Replace bash-only rule install/update path with native Windows PowerShell/Python execution while preserving Linux behavior.
- [ ] Add persistent structured logging for HTTP requests/responses, OAuth flow, MCP JSON-RPC, tool calls, prompts/arguments, results, errors and durations.
- [ ] Redact credentials/tokens/passphrases from logs.
- [ ] Add root `run-aki.bat` for double-click startup and first-run dependency install.
- [ ] Add/adjust tests and README notes.
- [ ] Open PR and verify CI before merge.

## Log destination

`%USERPROFILE%\.aki\mcpsv\logs\aki-YYYY-MM-DD.jsonl` on Windows; equivalent `~/.aki/mcpsv/logs/` on other platforms.
