# OAuth authorization-server discovery hang fix

Branch: `oauth-discovery-direct-fix`

## Evidence
On Windows, all three requests below were tested against the running Aki instance:

- `/.well-known/oauth-protected-resource/mcp` -> immediate HTTP 200
- `/.well-known/oauth-authorization-server` -> connected but timed out with 0 bytes, including on `127.0.0.1:9999`
- `/.well-known/openid-configuration` -> same timeout

Because the failure reproduces on loopback, Tailscale/Funnel is not the cause. The hang is isolated to Aki's authorization-server metadata handler path.

## Scope
- [x] Return authorization-server/OIDC metadata directly from `gatekeeper.js`, bypassing the hanging shared metadata wrapper.
- [x] Keep protected-resource metadata behavior from PR #3 unchanged.
- [x] Add startup loopback discovery self-checks with a 2.5s timeout.
- [x] Extend regression coverage to both RFC 8414 and OIDC discovery URLs.
- [x] Merge PR #4 into `main`.
- [ ] Retest on the Windows machine.

## Expected result
Both local commands must return immediately with HTTP 200 JSON:

`curl.exe -i --max-time 5 http://127.0.0.1:9999/.well-known/oauth-authorization-server`

`curl.exe -i --max-time 5 http://127.0.0.1:9999/.well-known/openid-configuration`
