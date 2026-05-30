# Shopify Theme Token

## Context system

This project uses `.context/` — a git worktree pinned to an orphan `context` branch with its own remote (`origin/context`).

A `SessionStart` hook runs `git -C .context pull --ff-only` automatically. If it fails or reports conflicts, STOP and report before proceeding.

## Doc placement guideline

A pattern earns its own file in `.context/docs/` when it's referenced from 2+ rules. Otherwise, inline the pattern in the single rule that needs it.

**Exception:** `.context/docs/architecture.md` is the orientation doc (repo layout, render model, asset pipeline, CSS layers, conventions). It's an entry point, not a referenced pattern, and is exempt from the 2+ rule guideline.

## Rule "Related" sections

List only references the body doesn't already make. If everything's already inline, drop the section.

## Codebase architecture

For the high-level map (repo layout, render model, asset pipeline, CSS layers, conventions), see `.context/docs/architecture.md`.

## Always-on Liquid context budget

Stay under ~400 lines per Liquid edit (auto-loaded `**/*.liquid` rules + the matching convention for `snippets/`/`blocks/`/`sections/`). Trim or reorganize an existing rule before adding above the cap.

### Current measurement (manually maintained — re-tally on any rule edit)

Tally as of 2026-05-27. Update the table when adding/removing/resizing rules in `.context/rules/`.

**Always-on for any Liquid edit** (`**/*.liquid` globs):

| Rule | Lines |
|---|---|
| `a11y-conventions.md` | 42 |
| `liquid-array-building.md` | 37 |
| `liquid-date-arithmetic.md` | 70 |
| `liquid-date-translation.md` | 75 |
| `liquid-filter-gotchas.md` | 20 |
| `liquid-object-construction.md` | 32 |
| **Subtotal** | **276** |

**Plus the matching domain rule:**

| Editing | Adds | Total |
|---|---|---|
| `snippets/*.liquid` | `snippet-convention.md` (84) | **360** |
| `blocks/*.liquid` | `block-convention.md` (100) | **376** |
| `sections/*.liquid` | `section-convention.md` (131) | **407** |

**Non-Liquid edits** (no `**/*.liquid` group loads):

| Editing | Rule | Lines |
|---|---|---|
| `assets/*.js` | `js-asset-convention.md` | 53 |
| `assets/icon-*.svg` | `icon-convention.md` | 71 |
| `.context/docs/**`, `.context/rules/**` (`.md`) | `reference-voice.md` | 21 |
| `.context/docs/specs/**` (`.md`) | `reference-voice.md` (21) + `spec-convention.md` (119) | 140 |

Section edits now sit slightly over the cap (407/~400). The recent +12 lines on section-convention.md include the container-patterns cross-reference plus linter reflow. Worth a trim pass when convenient — drop redundant intro lines or move the Example block to a separate doc.
