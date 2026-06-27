# Shopify Theme Token

## Context system

This project uses `.context/` — a git worktree pinned to an orphan `context` branch with its own remote (`origin/context`).

A `SessionStart` hook runs `git -C .context pull --ff-only` automatically. If it fails or reports conflicts, STOP and report before proceeding.

## Doc placement guideline

A pattern earns its own file in `.context/docs/` when it's referenced from 2+ rules **or 2+ specs**. Otherwise, inline the pattern in the single rule / spec that needs it.

**Exceptions:** the orientation docs `.context/docs/architecture.md` (codebase layout) and `.context/docs/knowledge-architecture.md` (knowledge layer — rules / docs / specs / skills) are entry points, not referenced patterns, and are exempt from the 2+ guideline.

## Rule "Related" sections

List only references the body doesn't already make. If everything's already inline, drop the section.

## Codebase architecture

For the codebase-side map (repo layout, render model, asset pipeline, CSS layers, conventions), see `.context/docs/architecture.md`.

## Knowledge architecture

For the knowledge-layer map (how rules / docs / specs / skills relate, where to start by task type, content placement rules), see `.context/docs/knowledge-architecture.md`.

## Playwright debug artifacts

When using Playwright MCP tools, pass screenshot filenames with the path prefix `.playwright-mcp/` (e.g. `filename: ".playwright-mcp/subgrid-check.png"`). The folder is `.gitignored`; root-level filenames leak into `git status`. To clean accumulated artifacts, invoke the `playwright-cleanup` skill — it walks the inventory and uses individual `rm <file>` commands, never `rm -rf` or wildcards.

## Always-on Liquid context budget

Stay under ~400 lines per Liquid edit (auto-loaded `**/*.liquid` rules + the matching convention for `snippets/`/`blocks/`/`sections/`). Trim or reorganize an existing rule before adding above the cap.

### Current measurement (manually maintained — re-tally on any rule edit; `npm run check` verifies via `.scripts/context-lint.mjs`)

Tally as of 2026-06-16. Update the table when adding/removing/resizing rules in `.context/rules/`.

**Always-on for any Liquid edit** (`**/*.liquid` globs):

| Rule                            | Lines   |
| ------------------------------- | ------- |
| `a11y-conventions.md`           | 42      |
| `liquid-array-building.md`      | 37      |
| `liquid-filter-gotchas.md`      | 24      |
| `liquid-object-construction.md` | 32      |
| **Subtotal**                    | **135** |

**Plus the matching domain rule:**

| Editing             | Adds                          | Total   |
| ------------------- | ----------------------------- | ------- |
| `snippets/*.liquid` | `snippet-convention.md` (95)  | **230** |
| `blocks/*.liquid`   | `block-convention.md` (100)   | **235** |
| `sections/*.liquid` | `section-convention.md` (132) | **267** |

**Non-Liquid edits** (no `**/*.liquid` group loads):

| Editing                                                              | Rule                                                   | Lines |
| -------------------------------------------------------------------- | ------------------------------------------------------ | ----- |
| `assets/*.js`                                                        | `js-asset-convention.md`                               | 53    |
| `assets/icon-*.svg`                                                  | `icon-convention.md`                                   | 71    |
| `.context/docs/**`, `.context/rules/**`, `.context/specs/**` (`.md`) | `reference-voice.md`                                   | 23    |
| `.context/specs/**` (`.md`)                                          | `reference-voice.md` (23) + `spec-convention.md` (169) | 192   |

Date patterns (arithmetic + locale translation) moved out of the always-on set to `.context/docs/liquid-dates.md` — pulled on demand, not loaded on every Liquid edit. This dropped the section-edit total from 407 to 267, leaving headroom for the L2 / specialized-section rules to come.
