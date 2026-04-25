# Shopify Theme Token

## Context system

This project uses `.context/` — a git worktree pinned to an orphan `context` branch with its own remote (`origin/context`).

A `SessionStart` hook runs `git -C .context pull --ff-only` automatically. If it fails or reports conflicts, STOP and report before proceeding.

## Doc placement guideline

A pattern earns its own file in `.context/docs/` when it's referenced from 2+ rules. Otherwise, inline the pattern in the single rule that needs it.

## Rule "Related" sections

List only references the body doesn't already make. If everything's already inline, drop the section.

## Codebase architecture

For the high-level map (repo layout, render model, asset pipeline, CSS layers, conventions), see `.context/docs/architecture.md`.
