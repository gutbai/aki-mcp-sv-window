# OAuth protected-resource metadata resource fix

## Scope
- [x] Make RFC 9728 protected-resource metadata return a `resource` value matching the exact metadata URL variant ChatGPT fetched.
- [x] Keep `/mcp` 401 challenge pointing to the path-specific PRMD document.
- [x] Add regression coverage for root and `/mcp` PRMD variants.
- [x] Review OAuth authorization-server discovery aliases for issuer consistency.
- [x] Merge after review (PR #3).

## Evidence
OpenAI's current auth docs require protected resource metadata and say ChatGPT uses the exact `resource` value through the OAuth flow. RFC 9728 requires the returned `resource` to be identical to the resource identifier from which the `.well-known` URL was derived. Aki previously returned `${origin}/mcp` from both the root and `/mcp` metadata endpoints, making the root endpoint invalid under RFC 9728 validation.

## Result
- `/.well-known/oauth-protected-resource` -> `resource = origin`
- `/.well-known/oauth-protected-resource/mcp` -> `resource = origin + /mcp`
- removed the misleading `/.well-known/oauth-authorization-server/mcp` alias because the authorization-server issuer is the root origin
- added `test/oauth-discovery.test.js`
