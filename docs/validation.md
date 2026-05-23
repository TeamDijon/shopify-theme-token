# Validation suite

Visual + integration test pages for metaobjects, blocks, and section compositions. Inspired by ZAG's validation pattern, scoped to three explicit layers, never linked from production.

## Why

- **Visual regression** — render every modifier permutation per block; screenshot or eyeball against expected.
- **Cross-block integration** — compose real-world section patterns to catch cascade bugs (block_rhythm scope, focus-ring clipping, color-scheme collisions).
- **Metaobject coverage** — iterate every metaobject's entries to confirm design-system definitions render as expected.

## File structure

Three layers, each with its own naming prefix:

| Layer | Section path | Template path |
|---|---|---|
| Metaobject | `sections/validation--metaobject--<type>.liquid` | `templates/index.validation--metaobject--<type>.json` |
| Block | `sections/validation--block--<name>.liquid` | `templates/index.validation--block--<name>.json` |
| Section | `sections/validation--section--<scenario>.liquid` | `templates/index.validation--section--<scenario>.json` |

The hub at `sections/validation.liquid` (template `templates/index.validation.json`) lists anchors to every variant — manually maintained.

## URL routing

Shopify auto-matches `?view=<suffix>` to `templates/index.<suffix>.json`. So:

- `/?view=validation` → hub page
- `/?view=validation--metaobject--theme-color` → theme_color validation
- `/?view=validation--block--button` → button validation matrix
- `/?view=validation--section--hero` → hero composition test

No layout-level includes; validation pages are reachable only via explicit query strings.

## Production-leak strategy

Validation files commit to `main` but **never link from production templates or menus**. Three protections:

1. **Querystring-only routing** — no anchor or link from any production page to any validation page. Customers and crawlers can't reach them.
2. **Hub is unlinked too** — `?view=validation` is a known URL only to authors.
3. **Pre-deploy strip (future)** — when CI deploys the theme to Shopify staging/production, strip `validation--*.{liquid,json}` before push. Document this when CI is set up.

For v1, accept that validation files ship with the published theme. Footprint is minor and they're inert without the URL.

## Section schema conventions

Validation sections aren't merchant-addable. Differences from standard section convention:

- `"class": "shopify-section--validation--<layer>--<name>"`
- **Omit `"presets"` entirely** — not addable from the editor.
- **Omit `"disabled_on"`** — irrelevant since it's not addable.
- `"settings"` — minimal. Usually a single `max_inline_size` (`type: range`) for layout control. Don't expose merchant-facing controls; the section is for theme authors.
- **Literal English labels** — these never ship to merchants. Skip `t:` keys to keep the locale files lean.
- Each section owns its `{% stylesheet %}` block, wrapped in `@layer components` like every other component CSS.

## Block validation: schema-driven matrix

Block-layer validation sections (`validation--block--<name>`) accept `@theme` blocks as children, and the **template JSON** at `templates/index.validation--block--<name>.json` bakes the modifier matrix into block instances. The JSON IS the test spec — diffing it tells you what scenarios changed.

Pattern (sketch):

```json
{
  "sections": {
    "main": {
      "type": "validation--block--button",
      "blocks": {
        "primary": { "type": "button", "settings": { ... } },
        "secondary": { "type": "button", "settings": { "button_style": "..." } },
        "outline": { "type": "button", "settings": { "button_style": "..." } },
        ...
      },
      "block_order": ["primary", "secondary", "outline", "..."],
      "settings": {}
    }
  },
  "order": ["main"]
}
```

The validation section itself just renders `{% content_for 'blocks' %}` inside a labelled grid wrapper — it's a presentation harness for the matrix.

## Hub registration

After authoring a validation section, add an anchor in `sections/validation.liquid` so the hub stays current. Convention: alphabetical order within each layer subheading.

## The 21-section inventory

All three layers shipped — 21 of 21 pages live. ZAG (`shopify-theme-zag`) was the original reference for the `theme_color` and `icon` patterns; Token's pages are now authored independently and the inventory is closed.

**Layer 1 — Metaobjects (8 sections)**

`theme-color`, `icon`, `text-style`, `button-style`, `container-style`, `media-size`, `content-width`, `spacing`. Each iterates `metaobjects.<type>.values` and renders a card per entry surfacing handle + relevant fields.

**Layer 2 — Blocks (9 sections)**

`spacer`, `separator`, `title`, `richtext`, `button`, `media`, `embed`, `group`, `columns`. Each pairs with a JSON template that bakes the modifier matrix into block instances; the section harness renders them via `{% content_for 'blocks' %}` with the labelling helper.

**Layer 3 — Compositions (4 sections)**

- `hero` — media + overlaid title + button + bleed
- `content` — title + richtext + button stacked, exercises block_rhythm + top spacing
- `columns-features` — columns containing media + title + richtext per column, exercises container queries
- `cta-banner` — separator + group + button variants

These exercised the cross-block bugs caught during the initial author pass (block_rhythm layer-cascade collision, separator collapse in flex parents, group/columns self-container-query) — all three were fixed in the validation-triage commits and the pages now serve as regression guards.

## Helper snippets

Two snippets live in `snippets/` to keep the per-topic pages thin:

- **`validation--breadcrumb.liquid`** — renders a back-link to `?view=validation`. Drop into the top of every per-topic page (`{% render 'validation--breadcrumb' %}`). The hub itself skips it.
- **`validation--block-labels.liquid`** — for the 9 block-validation pages. Iterates `section.blocks` and emits an inline `<style>` block that sets a `--block-label` CSS custom property on each rendered block to its merchant-facing short id. The consuming page's stylesheet reads it via `content: var(--block-label)` on a `::before` pseudo-element so each block in the matrix is labelled. Liquid does the id-cleaning because Shopify wraps each block id as `<random>__<key>` and `section.blocks[i].id` further appends a `-1` instance suffix that's stripped at render time — neither is substringable in pure CSS. Render once per page after `{% content_for 'blocks' %}`: `{% render 'validation--block-labels', section: section %}`.

## Working with Playwright MCP

When Playwright MCP is configured, the feedback loop becomes:

1. Author/edit a validation section
2. Ensure `shopify theme dev` is running locally (default at `http://127.0.0.1:9292`)
3. `browser_navigate` to `http://127.0.0.1:9292/?view=validation--<topic>`
4. `browser_screenshot` for visual check
5. `browser_axe` for a11y audit on the rendered page
6. `browser_evaluate` to inspect computed styles when verifying CSS variables resolved correctly

If no MCP available, fallback: author asks the user to load the URL and report findings.

## Related

- `block-convention.md` — block structure (validation sections compose them)
- `section-convention.md` — section structure (validation sections are simplified standard sections)
- `design-system-metaobjects.md` — metaobject types and consumption fields
- `asset-loading.md` — where component CSS lives
