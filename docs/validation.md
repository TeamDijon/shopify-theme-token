# Validation suite

Visual and integration test pages for metaobjects, block primitives, and section compositions. Each element's contract, test, and validation source colocate beside the code and are discovered by glob — no index. Validation never links from production.

Coverage:

- **Visual regression** — render every modifier permutation per element; eyeball or assert against expected.
- **Cross-block integration** — compose section patterns to catch cascade bugs (block-rhythm scope, focus-ring clipping, color-scheme collisions).
- **Metaobject coverage** — iterate a metaobject type's entries to confirm design-system definitions render as expected.

## Three surfaces

Validation runs through three surfaces. Each element's shape picks one; the split is deliberate and the surfaces stay separate.

| Surface | What it's for | Source · test · template | Reached at |
|---|---|---|---|
| **Generate-and-drop** (default) | Block-composable elements: block primitives and L2 preset compositions | Colocated source `<name>.validation.json` (`{ settings, blocks, block_order }`) + test `<name>.test.js`; the template is generated on demand into the single gitignored slot `templates/index.validation.json`, rendered by the generic harness `sections/validation.liquid`, then removed | `/?view=validation` |
| **Per-snippet committed harness** | Snippet-only primitives whose case matrix is Liquid `{% render %}` logic, not block data (`image`, `video`) | Colocated source `snippets/<name>.validation.json` (names `"harness": "validation--primitive--<name>"`) + test `snippets/<name>.test.js`; the committed harness section `sections/validation--primitive--<name>.liquid` stays; the template still generate-and-drops | `/?view=validation` |
| **Permanent page showcase** | Substrate metaobjects (design tokens) | Bare `sections/<name>.liquid` + committed `templates/page.<name>.json`; spec `sections/<name>.spec.md`; no test (eyeballed) | A Page with the `page.<name>` template assigned in admin |

### Where each element lives

- **Block primitives** — `button`, `columns`, `embed`, `group`, `media`, `richtext`, `separator`, `spacer`, `title`: source + test at `snippets/<name>.{validation.json,test.js}` (generate-and-drop).
- **Preset compositions** (L2 on `section.liquid`) — `hero`, `content`, `columns-features`, `cta-banner`: source + test at `sections/section--<preset>.{validation.json,test.js}`, sorting beside `section.liquid` / `section.spec.md` (generate-and-drop).
- **Snippet-only primitives** — `image`, `video`: source + test at `snippets/<name>.{validation.json,test.js}`, pointing at a committed harness section.
- **Substrate metaobjects** — `theme-color`, `button-style`, `container-style`, `content-width`, `gradient`, `icon`, `media-size`, `spacing`, `text-style`: bare `sections/<name>.liquid` + `templates/page.<name>.json`.

## Generate-and-drop lifecycle

The generic `?view=validation` slot is a single template, so generate-and-drop elements stage through it one at a time.

1. **Generate** — `node .scripts/validation-generate.mjs <name>` (`npm run validation:generate`) locates `<name>.validation.json` by name across `snippets/`, `blocks/`, `sections/`, `assets/`, `layout/`, wraps it in the Shopify template envelope (`{ sections: { main: { type: <harness>, ...source } }, order: ["main"] }`), and writes `templates/index.validation.json`. The source's `type` defaults to the generic `validation` harness; a `"harness"` key overrides it for the per-snippet committed harnesses.
2. **Render** — `sections/validation.liquid` renders the matrix at `/?view=validation`. Shopify auto-matches `?view=validation` to `templates/index.validation.json`.
3. **Test** — the colocated `<name>.test.js` (Playwright) navigates to `/?view=validation` and asserts.
4. **Drop** — `node .scripts/validation-clean.mjs` (`npm run validation:clean`) removes the generated template. `templates/index.validation.json` is gitignored and idempotent to remove (missing file is a no-op).

## The orchestrator

`.scripts/validation-e2e.mjs` (`npm run test:e2e`) is the serialized runner. It discovers every colocated `<name>.validation.json` with a sibling `<name>.test.js`, sorts them, and loops each: generate → settle for `theme dev` sync (`VALIDATION_SETTLE_MS`, default 2000) → run the colocated test. Successive elements overwrite the single slot in place; the template is dropped once at the very end (deleting and recreating per element races `theme dev`'s remote sync). It requires `npm run dev` (`shopify theme dev`) running — tests hit the dev preview at `http://127.0.0.1:9292`.

`playwright.config.js` declares no `webServer` — it attaches to the dev server and fails fast if it's down. `testMatch` is `**/*.test.js` (colocated, glob-discovered). Two viewport projects — `desktop` (1280px) and `mobile` (390px) — straddle the `48rem` (768px) breakpoint so responsive assertions run in the right viewport. e2e is not part of `npm run check`; the static gate (context-lint + prettier + theme-check) needs no server.

## Generic harness

`sections/validation.liquid` renders one element's matrix as a labelled list inside a `<token-section data-modifiers="theme-root">` — the real production theme-root bleed grid. Settings come from the generated template:

- `title`, `description` — chrome text.
- `harness_layout` — `grid` (default; production theme-root bleed grid, for block-level elements) or `stack` (column flex, flush-start, for inline-flex / content-sized elements like `button` that don't fit the grid).
- `max_inline_size` — caps and centers the overall surface (px).
- `color_scheme` — sets a `color-scheme:<id>` modifier when a preset composition overrides the section scheme.
- `content_width` — raw CSS value (e.g. `42.5rem`) set as `--content-width` when a preset composition caps the readable track.

`color_scheme` and `content_width` carry **raw resolved values** (like `max_inline_size`): the harness reproduces the CSS a composition carries, mirroring what `section.liquid` would apply. It is a test surface, not production `section.liquid`.

### Production-faithful layout

The matrix renders as **direct children of `<token-section>`** — no presentation wrapper between the theme-root and the blocks. A wrapper's own `max-inline-size` / `padding-inline` would cascade onto every block, breaking bleed math and diverging from production. Two production behaviors depend on the direct-child relationship:

- **Painted rhythm** — the section carries a base `--block-rhythm`, so per-block top-margin overrides paint through the real rhythm rule (`[data-modifiers*='theme-root'] > .shopify-block:not(:first-child)`), which matches only direct children. Tests assert the emitted custom property; the paint is the eyeball half.
- **Native sizing / alignment** — blocks inherit only the section's production constraints (`--content-width` cap, gutter), so `content_width`, `text_align`, and bleed behave as in production rather than collapsing to content-width under a flex wrapper.

`grid` layout leaves `display` untouched: blocks are grid items in the content track (`grid-column` bleed modifiers actually paint; `content_width` self-centering distributes via grid auto-margins, so tests measure position, not the margin property). `stack` layout overrides to a flush-start column (`display: flex; flex-direction: column; align-items: flex-start; padding-inline: var(--gutter)`) for inline-flex primitives so `margin-block-start` paints between rows.

### Schema-driven matrix

The source `<name>.validation.json` bakes the test matrix into block instances — the JSON is the test spec, so diffing it shows what scenarios changed. A preset source nests its composition's inner blocks under each block (matching the `section.liquid` block tree). A metaobject page needs no matrix: its section iterates `metaobjects.<type>.values` directly.

### Helper snippets

- `snippets/validation--harness-styles.liquid` — the shared chrome (intro / empty state), the `token-section` cap, and the layout-neutral use-case indicator (dashed outline + DOM-id `::before` label). Rendered once by the harness.
- `snippets/validation--block-labels.liquid` — iterates `section.blocks` and sets a `--block-label` custom property per block to its merchant-facing short id, read via `content: var(--block-label)` on a `::before` so each block in the matrix is labelled. Liquid does the id-cleaning (Shopify wraps each block id and appends an instance suffix that pure CSS can't strip). Rendered after `{% content_for 'blocks' %}`.

## Per-snippet committed harness

`image` and `video` render via `{% render %}` with a Liquid arg matrix rather than block data, so each names a dedicated harness in its source (`"harness": "validation--primitive--<name>"`). The committed section `sections/validation--primitive--<name>.liquid` renders the arg matrix (each case tagged `data-case=<id>`); the template still generate-and-drops into the shared slot and the test hits `/?view=validation`. Source images/videos are seeded store Files (`npm run seed:assets`).

## Permanent page showcase

Substrate metaobjects render through a `page.` template so they are **merchant-browsable**: a merchant assigns the `page.<name>` template to a Page in admin and visits that page. The bare section `sections/<name>.liquid` iterates `metaobjects.<type>.values` and renders one card per entry surfacing the handle and consumed fields. These pages are eyeballed (computed-style assertion is possible but not wired); the spec colocates at `sections/<name>.spec.md`. They are not `index.*` templates and are not reached by `?view=`.

## Production-leak strategy

Validation surfaces commit to `main` but never link from production templates or menus:

- **Generate-and-drop** templates are gitignored and exist only during a test run, so nothing ships.
- **`?view=validation`** is a querystring-only route with no anchor from any production page — inert without the explicit URL.
- **`page.<name>` showcases** are merchant-addable Page templates by design; they ship, and are reachable only when a merchant assigns the template to a Page.

## Section schema conventions

The generic harness (`sections/validation.liquid`) and the committed per-snippet harnesses differ from standard section convention:

- `"class": "shopify-section--validation"` (harness) / `"shopify-section--validation--primitive--<name>"` (committed).
- **No `"presets"`** — not merchant-addable from the editor.
- **No `"disabled_on"`** — irrelevant when not addable.
- `"settings"` — author-facing only (harness layout, width, scheme, content-width); literal English labels, no `t:` keys (never ships to merchants).
- Each section owns its `{% stylesheet %}` in `@layer components`.

The metaobject showcase sections (`sections/<name>.liquid`) are bare merchant-facing sections rendered through a `page.` template and follow standard `section-convention.md`.

## Related

- `validation-contract.md` — per-tier functional contract (what each tier asserts, mapped onto the three surfaces)
- `block-convention.md` — block structure (block primitives compose them)
- `section-convention.md` — section structure (the metaobject showcases follow it)
- `design-system-metaobjects.md` — metaobject types and consumption fields
- `asset-loading.md` — where component CSS lives
