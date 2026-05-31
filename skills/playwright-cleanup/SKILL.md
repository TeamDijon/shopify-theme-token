---
name: playwright-cleanup
description: List and remove Playwright debug artifacts — `.playwright-mcp/` snapshots, console logs, and screenshots; plus root-level `*.png` files left by Playwright tool calls that used a bare filename. Walks the inventory and proposes individual or small-batch `rm` commands; never uses `rm -rf` or wildcard globs (hallucination-safe). Invoke when the working tree shows Playwright noise, before a commit where the tree should be clean, or when a session has accumulated more than a few MB of artifacts.
tools: Bash, Glob, Read
---

# Playwright cleanup

Playwright debug noise that accumulates over a session:

- **`.playwright-mcp/`** — Playwright MCP auto-saves snapshots (`page-*.yml`), console logs (`console-*.log`), and tool-emitted screenshots. The folder is `.gitignored` but bloats on disk over sessions.
- **Root-level `*.png`** — when a Playwright `take_screenshot` call uses a relative filename without a path prefix, the file lands at the repo root and shows up in `git status` as untracked.

The lasting fix is upstream: future Playwright calls should pass a path like `.playwright-mcp/<name>.png` so the file lands inside the gitignored folder. This skill cleans up after the fact.

## Workflow

1. **Inventory** — run, in order:
   - `ls .playwright-mcp/ 2>/dev/null | head -50` to list current artifacts (head-cap so very large folders don't drown context).
   - `du -sh .playwright-mcp/ 2>/dev/null` to report total size.
   - `ls *.png 2>/dev/null` for root-level debug screenshots (do not include `assets/icon-*.svg` or any tracked image — only repo-root pngs).
   - `git status --short` to identify untracked debug files.
2. **Categorize** — group findings:
   - Playwright snapshots / console logs (`.playwright-mcp/page-*.yml`, `console-*.log`)
   - Playwright screenshots inside `.playwright-mcp/`
   - Stray screenshots at repo root (each one named individually)
3. **Propose** — present a `before → after` table per category. For root-level pngs, list every filename. For `.playwright-mcp/` contents, list filenames in batches of 5–10 if the folder is large.
4. **Delete on approval** — use individual `rm <file>` commands. Multiple files per command is fine; `rm a.png b.png c.png`. **Never** `rm -rf`, **never** `rm *.png` or wildcard globs — the file list must be explicit so an off-by-one or hallucinated name fails loudly. If the user wants to keep some files, edit the list before the rm.
5. **Report** — print the post-cleanup `du -sh .playwright-mcp/` and `git status --short` lines so the user can verify the tree is clean.

## Safety rules

- No `rm -rf`. No wildcards. No `find … -delete`. Only `rm <explicit-file-1> <explicit-file-2> …`.
- Never delete files under `assets/`, `snippets/`, `blocks/`, `sections/`, `templates/`, `locales/`, `config/`, `layout/`, `.context/` — those are the theme's source.
- Never delete `.playwright-mcp/` itself (the folder); just its contents. The folder regenerates on the next Playwright tool call regardless.
- If a `*.png` at the repo root is referenced by any tracked file (`git grep <name>.png` shows a match), keep it and report — it may be intentional documentation.

## Follow-up — prevent the next round

When you're done cleaning, suggest to the user that future Playwright screenshot calls should pass `filename: ".playwright-mcp/<name>.png"` so artifacts land inside the gitignored folder by default. The CLAUDE.md guidance lives under the project's Playwright section once added.
