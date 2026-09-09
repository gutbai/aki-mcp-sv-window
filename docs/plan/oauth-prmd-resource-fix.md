# OAuth protected-resource metadata resource fix

## Scope
- [ ] Make RFC 9728 protected-resource metadata return a `resource` value matching the exact metadata URL variant ChatGPT fetched.
- [ ] Keep `/mcp` 401 challenge pointing to the path-specific PRMD document.
- [ ] Add regression coverage for root and `/mcp` PRMD variants.
- [ ] Review OAuth authorization-server discovery aliases for issuer consistency.
- [ ] Merge after review.

## Evidence
OpenAI's current auth docs require protected resource metadata and say ChatGPT uses the exact `resource` value through the OAuth flow. RFC 9728 requires the returned `resource` to be identical to the resource identifier from which the `.well-known` URL was derived. Aki currently returns `${origin}/mcp` from both the root and `/mcp` metadata endpoints, making the root endpoint invalid under RFC 9728 validation.
