# Plan — context circle as a "time to /new chat" signal

updated 2026-09-07 1.14.0-unreleased

## Goal

A small circle indicator near the chat status bar whose **only** job is to tell the user *when the current chat has grown long enough that starting a new chat is wiser* — before the model's answer quality degrades on an over-long session. It pairs with the existing SUMMARIZE FOR HANDOFF button: circle goes red → summarize → new chat.

This is deliberately **not** a context-measurement feature. Prior research (`docs/research/session-context-capture.md`) proved the exact session context is server-held and not client-visible anywhere, and a /akithink pass established that the real goal only needs a **monotonic trigger + threshold**, not an accurate number. Chasing exact tokens/context was goal-substitution against a harder problem than the one that matters.

## What was ruled out (do not re-litigate)

- Exact context capture from the client — impossible (server-held, verified live).
- Reconstruct-from-wire — ruled out: every turn sends only its own message + `conversationId`, no accumulation (`tmp-probe-newwin.js`).
- `count_tokens` API preflight, tokenizer libraries — rejected (heavy, needs credentials, not needed for a trigger).
- Team-pooled `usage` millicredits delta — noisy (shared pool, `isTeamPooled=true`), not a per-conversation signal.
- Displaying tokens or "% of 1M" — forbidden: a fake-precise number misleads the new-chat decision.

## Signal

DOM conversation-text length, read **passively** inside the page (the panel already runs in the Postman renderer, so no separate CDP attach and nothing that could touch another window):

```
document.querySelector('[data-testid="ai-chat-container"] [data-testid="ai-chat-conversation-container"]').innerText.length
```

Verified monotonic and readable via `tmp-measure-dom.js` (read-only, run against a dedicated experiment window). Lossy (omits hidden system prompt + tool schema; collapsed tool-results undercount) — acceptable, because a stable undercount stays monotonic, so a calibrated threshold still fires correctly.

## Display

- **Shipped as a horizontal bar**, not a circle — mounted at the bottom of `.ai-chat-footer`'s center content (not `#aki-status-bar-slot`: that slot sits inside `.ai-chat-container`'s `overflow:hidden` clip region, where anything appended past the footer edge was invisible). Colored by char thresholds using existing design tokens (`--content-color-success` → warning → `--content-color-error`).
- Label in **KB / characters**, never tokens, never a percent-of-window.
- Thresholds are **configurable in principle** (`ctxCharAmber`/`ctxCharRed` round-trip through the existing `__cdpSaveAkiConfig` binding) but there is still no panel control to edit them — only hand-editing `data.json` reaches them today. Current defaults: green < 80k chars, amber 80k–150k, red > 150k. Seeds, not measured law — refine after real sessions.

## Implementation (in `scripts/aki-pmcontrol/scripts/cdp-autoclicker.js`)

1. `readConversationChars()` — passive read of the conversation container text length; returns 0 when no chat container (idempotent, safe every tick).
2. `renderContextBar()` — computes color from thresholds, renders the bar + KB/char label into `.ai-chat-footer`; called from `renderStatusBarUsage()`, which already runs each 400ms `runLoop` tick, so no new interval.
3. Threshold values live in `config` (`ctxCharAmber`/`ctxCharRed`) and persist through the existing save path — no panel input added yet (see Checklist).
4. No new daemon code — page-side only. `index.js` untouched.

## Checklist

- [x] `readConversationChars()` passive reader (static-verified: pure DOM read, no side effects).
- [x] `renderContextBar()` + footer markup + threshold coloring.
- [ ] Panel control to edit `ctxCharAmber`/`ctxCharRed` (persistence plumbing exists; only the input UI is missing).
- [ ] Runtime check on the **experiment window only** (never the live chat window): bar appears, color crosses thresholds as the conversation grows. Owner-run — the daemon must be relaunched to load the new panel bundle (current daemon runs the old bundle).
- [x] CHANGELOG `[Unreleased]` entry — added alongside this update.

## Non-goals

- Any token/context accuracy beyond "monotonic enough to threshold".
- Auto-summarize / auto-new-chat automation (separate, still deferred — depends on how well the threshold behaves in practice).
- Expanding collapsed tool-result DOM nodes: optional later sharpening of threshold calibration, not part of this plan.
