# ChatGPT OAuth diagnostics + Windows fixes

Branch: `oauth-diagnostics-fix`

## Scope

- [x] Fix Windows akidevrule installer false-success when Python is missing.
- [x] Redact Tailscale identity headers and other auth/personally identifying headers from persistent logs.
- [x] Add one-click live log viewer (`view-logs.bat`) for the newest JSONL log.
- [x] Update ChatGPT OAuth handling toward current OpenAI guidance: prefer callback-id redirects, keep legacy stable callback only as compatibility, and make stale DCR clients resettable.
- [x] Add OAuth diagnostics and `reset-chatgpt-oauth.bat` so stale DCR state can be removed before recreating the connector.
- [x] Add regression tests. GitHub Actions is not starting on this fork, so CI could not be used as the merge gate.

## Evidence driving the OAuth change

The captured log shows authorize succeeds and returns 302 to `https://chatgpt.com/connector_platform_oauth_redirect`, but ChatGPT never calls `/token`. Current OpenAI docs say new plugin connections use `https://chatgpt.com/connector/oauth/{callback_id}` while `connector_platform_oauth_redirect` is legacy for already-published apps.

## Retry procedure

1. Pull the updated `main`.
2. Stop Aki and run `reset-chatgpt-oauth.bat`.
3. Delete the existing Aki connector from ChatGPT.
4. Start Aki and create a brand-new connector using only the MCP URL.
5. Run `view-logs.bat` while connecting. Expected healthy sequence: `/register` (fresh DCR) → `/authorize` → `/token` → `/mcp`.
