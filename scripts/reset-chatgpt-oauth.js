#!/usr/bin/env node
import { getOAuthDiagnostics, resetChatGptOAuth } from './oauth.js';

const before = getOAuthDiagnostics();
console.log('[Aki] ChatGPT OAuth diagnostics before reset:');
console.log(JSON.stringify(before, null, 2));

const result = resetChatGptOAuth();
console.log(`\n[Aki] Reset complete: removed ${result.removedDcrClients} ChatGPT DCR client(s), revoked ${result.revokedAccess} access token(s).`);
console.log('[Aki] IMPORTANT: delete the existing Aki connector in ChatGPT, create it again from the MCP URL, then reconnect.');
console.log('[Aki] On a fresh current connection the authorize URL should use https://chatgpt.com/connector/oauth/{callback_id}, not connector_platform_oauth_redirect.');
