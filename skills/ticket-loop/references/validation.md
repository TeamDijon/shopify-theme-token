# Validation — Diamond 2 converges

Confirm the shipped code against the spec's API matrix. The matrix runs through the generic
`?view=validation` slot via generate-and-drop: a colocated per-element source is staged into the
slot, exercised (visual walk + Playwright), then dropped. The fixture is ephemeral; only the
colocated source is committed.

## Inputs

- The spec's `Validation` section: tier sub-shape, API matrix, edge cases, showcase intent,
  assertions.
- The shipped implementation file(s).
- The committed generic harness `sections/validation.liquid` (settings-driven; you do not edit it
  per element).
- `validation-contract.md` for per-tier matrix expectations; `validation.md` for suite chrome.

## The generate-and-drop lifecycle

1. **Author/update the colocated source** `snippets/<el>.validation.json` — `{ settings, blocks,
   block_order }`:
   - `settings.title`, `settings.description` (richtext).
   - `settings.harness_layout`: `grid` (default; block-level elements on the production
     theme-root bleed grid) | `stack` (flush-start column, for content-sized / inline-flex
     elements like button).
   - `settings.max_inline_size` (px; 800–1920).
   - `blocks`: one entry per matrix cell (state × variant × edge case), keyed by a label id; each
     names a real block `type`, so the row renders the production path, not a mock.
   - `block_order`: the visual order of the rows.
2. **Generate:** `npm run validation:generate <el>` (→ `node .scripts/validation-generate.mjs
   <el>`). It globs the source across `snippets/`/`blocks/`/`assets/`, wraps it into
   `templates/index.validation.json` (gitignored), and prints the reach URL. Section type is
   always the generic `validation` harness.
3. **Sync:** `theme dev` hot-syncs the generated template. Reach it at `/?view=validation`.
4. **Visual walk:** open `?view=validation`, step every row, confirm each matches the spec's prose
   expectation. Visual review catches what an assertion suite structurally cannot — layout and
   scope regressions that computed-style / DOM assertions miss.
5. **Playwright:** run the colocated `snippets/<el>.test.js` against `?view=validation` for
   computed-style / DOM-state assertions beyond eyeballing. Screenshots under `.playwright-mcp/`.
6. **Verify each assertion** from the spec's `Assertions` list. A failed assertion is a build
   defect, not an intent question — it reopens Diamond 2 (back to `implementation`), then
   validation re-runs; it does not wait for `audit`.
7. Run `theme-check` — zero offenses.
8. **Drop:** `npm run validation:clean` (→ removes `templates/index.validation.json`; idempotent,
   so a failed mid-run drop is safe to re-run). Confirm `git status` is clean.

## Colocated source + test

Both sit beside the logic owner — `snippets/<el>.validation.json` + `snippets/<el>.test.js` —
committed on the `loop/<slug>` branch, discovered by glob. The generated template is never
committed.

## Scope of the generic slot

The generic `?view=validation` harness renders its matrix as real `@theme` blocks via
`content_for`, so the JSON-only source covers exactly the **block-backed** typologies —
Tier 2 primitive block-half and Tier 3 presets. That is the full set generate-and-drop migrates.

Outside that scope, and not expressible through this slot:

- **Metaobject / substrate showcase** (Tier 1a) — stays committed as a persistent deliverable,
  not generate-and-drop. `theme-color`, `button-style`, and the other substrate reference pages
  keep their committed `sections/validation--<tier>--<name>.liquid` + template and are **not**
  dropped.
- **Render-matrix + custom-DOM typologies** — Tier 2 snippet-half, utility-snippet (1b),
  utility-css (1c), specialized section (Tier 4) — need bespoke `.liquid` markup a block matrix
  can't express. None ship today; supporting them is a future generator extension.
- **Utility JS** (1d) — Vitest, never a Liquid page.

## Done state

- Colocated source exercises every matrix cell + edge case the spec names.
- Visual walk confirms the showcase intent; Playwright assertions pass; theme-check clean.
- Generated fixture dropped — `git status` clean. Source + test committed on `loop/<slug>`.
- The spec's `Validation` section reflects any matrix additions discovered while authoring the
  source, so spec and fixture stay in sync.
