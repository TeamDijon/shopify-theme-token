# Shopify Theme Token

## Context system

This project uses `.context/` — a git worktree pinned to an orphan `context` branch with its own remote (`origin/context`).

A `SessionStart` hook runs `git -C .context pull --ff-only` automatically. If it fails or reports conflicts, STOP and report before proceeding.

## Commit messages

Do not include `Co-Authored-By: Claude …` trailers or `🤖 Generated with [Claude Code]` lines in commit messages.
