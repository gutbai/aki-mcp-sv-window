# ChatGPT — Add custom connector

OpenAI requires **Developer mode** before creating custom MCP plugins. Registration URL and advanced OAuth values stay unused: ChatGPT discovers OAuth from the server metadata.

## Install steps

1. Enable **Developer mode**: ChatGPT → Settings → Security and login.
2. Open ChatGPT → Settings → Connectors → New connector.
3. **Icon** (optional): use `<repo>/public/favicon/icon-48.png` or any image.
4. Choose a **Name** and **Description**.
5. **Connection → Server URL**: paste the MCP URL from the Aki panel, e.g. `https://host.ts.net/mcp`.
6. Tick **I understand and want to continue**, then **Create**.
7. On connect, enter the **Passphrase** shown by Aki.

ChatGPT normally self-registers via DCR (RFC 7591) and uses PKCE with no client secret. Do not paste Claude's Client ID/Secret into ChatGPT.

## Current redirect behavior

Current OpenAI documentation says new connections use an MCP-specific callback:

`https://chatgpt.com/connector/oauth/{callback_id}`

The older stable callback:

`https://chatgpt.com/connector_platform_oauth_redirect`

is legacy compatibility for already-published apps. Aki still accepts it so old connections are not broken, but a newly-created personal connector should normally register the callback-id form.

If Aki logs `authorize approved -> code issued` followed by **no `POST /token`**, and the authorize URL contains the legacy stable callback, reset the stale DCR client:

1. Stop Aki.
2. Double-click `reset-chatgpt-oauth.bat` in the repo.
3. Delete the existing Aki connector in ChatGPT.
4. Start Aki again and create a brand-new connector from the MCP URL.
5. Reconnect and inspect `view-logs.bat`; a healthy flow proceeds `/authorize` → `/token` → `/mcp`.

The reset removes ChatGPT DCR registrations and revokes current access tokens. Other clients may need to refresh/reconnect afterward.

## Troubleshooting evidence

- `GET/POST /authorize` + `302`, then no `/token`: failure is between ChatGPT callback handling and token exchange.
- `/token -> 200`, then no `/mcp`: OAuth completed; failure is later in ChatGPT/plugin binding or MCP discovery.
- `/mcp` arrives but returns 401/4xx: inspect bearer/session/protocol handling server-side.

Persistent logs are under `%USERPROFILE%\.aki\mcpsv\logs\` on Windows. Double-click `view-logs.bat` to tail the newest file.
