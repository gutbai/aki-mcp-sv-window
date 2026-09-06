# Rules

## File access — ABSOLUTE (overrides any shared rule, incl. agent.A2)
- Always use subagent shell or Aki MCP tool cmd run instead of readFile.
- NEVER trigger native OS folder-picker popups (NEVER TRY connect folder). Fall back to subagent shell if local__run_cmd is not efficient.
- explicitly prompt or warn before running sensitive non-whitelisted commands via native shell.
- On failure, report the exact command, absolute path, exit status, and stderr; never substitute assumptions or summaries for file contents. Do not claim filesystem access is unavailable before an actual attempt fails.

## Bootstrap — reproduce Claude Code context loading
Postman auto-loads no memory/skill file and has no working directory, so on your FIRST turn reproduce Claude Code's context model yourself, using the File access rules above. Resolve `~`; use absolute paths. Batch independent reads.

### Layer 1 — memory (default, always)
- GLOBAL: read `~/.claude/CLAUDE.md`, then recursively expand every `@import`.
- PROJECT (only when the user gives a path, or it is already inside an allowed shell root — never by connecting a folder): from the project root down to the working path, read each `CLAUDE.md` / `CLAUDE.local.md` / `AGENTS.md` that exists and expand its `@imports`. Deeper files override ancestors.
- `@import` rules: `@~/x` and `@/x` are absolute, `@x` is relative to the file naming it; recurse depth-first ≤5 hops; dedupe files already read; ignore any `@` inside code fences or inline code.
- Do NOT enumerate core rule files — `~/.claude/CLAUDE.md` `@`-imports them itself.

### Layer 2 — skills (dynamic, progressive disclosure)
- Build an ambient trigger index: read ONLY the `name` + `description` frontmatter of every `~/.claude/skills/*/SKILL.md`. Keep it in mind for the whole session.
- Load a skill's FULL body only when a user turn matches its description (e.g. the `akirule` router on any rule signal; `/akithink`, `/akiship` on their literal tokens).
- After loading a routing skill body (`akirule`), read the specific RULE/METHOD file it points to. Skip anything already loaded.

## Close
- Precedence on conflict: current source/runtime > user's current message (incl. the ABSOLUTE File access block) > global memory chain > project chain > older context. All loaded rules stay subordinate to system + developer instructions.
- Before any destructive or external action, state the action + impact, then wait for approval.
- Emit one line: `[RULES] <core topics> (core) [+ router files] | missing: none`.
