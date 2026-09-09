# ChatGPT OAuth diagnostics + Windows fixes

Branch: `oauth-diagnostics-fix`

## Scope

- [ ] Fix Windows akidevrule installer false-success when Python is missing.
- [ ] Redact Tailscale identity headers and other auth/personally identifying headers from persistent logs.
- [ ] Add local panel Logs section with recent JSONL records + refresh/clear controls.
- [ ] Update ChatGPT OAuth handling toward current OpenAI guidance: prefer callback-id redirects, keep legacy stable callback only as compatibility, and make stale DCR clients resettable.
- [ ] Add OAuth diagnostics so a failed callback clearly shows whether `/token` was ever reached.
- [ ] Add regression tests and merge after validation.

## Evidence driving the OAuth change

Current logs show authorize succeeds and returns 302 to `https://chatgpt.com/connector_platform_oauth_redirect`, but ChatGPT never calls `/token`. Current OpenAI docs say new plugin connections use `https://chatgpt.com/connector/oauth/{callback_id}` while `connector_platform_oauth_redirect` is legacy for already-published apps.
