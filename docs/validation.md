# Validation suite

Visual + integration test pages for metaobjects, blocks, and section compositions. Inspired by ZAG's validation pattern, scoped to three explicit layers, never linked from production.

## Why

- **Visual regression** — render every modifier permutation per block; screenshot or eyeball against expected.
- **Cross-block integration** — compose real-world section patterns to catch cascade bugs (block_rhythm scope, focus-ring clipping, color-scheme collisions).
- **Metaobject coverage** — iterate every metaobject's entries to confirm design-system definitions render as expected.

## File structure

Four tiers per `validation-contract.md`, each with its own naming prefix:

| Tier | Section path | Template path |
|---|---|---|
| Substrate — metaobject | `sections/validation--substrate--<type>.liquid` | `templates/index.validation--substrate--<type>.json` |
| Substrate — utility snippet | `sections/validation--utility-snippet--<name>.liquid` | `templates/index.validation--utility-snippet--<name>.json` |
| Substrate — utility CSS | `sections/validation--utility-css--<concern>.liquid` | `templates/index.validation--utility-css--<concern>.json` |
| Theme-primitive (L0 + L1) | `sections/validation--primitive--<name>.liquid` | `templates/index.validation--primitive--<name>.json` |
| Preset (L2) | `sections/validation--preset--<name>.liquid` | `templates/index.validation--preset--<name>.json` |
| Specialized section (Beyond L2) | `sections/validation--section--<name>.liquid` | `templates/index.validation--section--<name>.json` |

Substrate — utility JS runs in Vitest under `tests/unit/`, not on a Liquid page; see `validation-contract.md` for the future-state harness.

The hub at `sections/validation.liquid` (template `templates/index.validation.json`) lists anchors to every variant — manually maintained.

## URL routing

Shopify auto-matches `?view=<suffix>` to `templates/index.<suffix>.json`. So:

- `/?view=validation` → hub page
- `/?view=validation--substrate--theme-color` → theme_color validation
- `/?view=validation--primitive--button` → button validation matrix
- `/?view=validation--preset--hero` → hero composition test

No layout-level includes; validation pages are reachable only via explicit query strings.

## Production-leak strategy

Validation files commit to `main` but **never link from production templates or menus**. Three protections:

1. **Querystring-only routing** — no anchor or link from any production page to any validation page. Customers and crawlers can't reach them.
2. **Hub is unlinked too** — `?view=validation` is a known URL only to authors.
3. **Pre-deploy strip (future)** — when CI deploys the theme to Shopify staging/production, strip `validation--*.{liquid,json}` before push. Document this when CI is set up.

For v1, validation files ship with the published theme. They are inert without the querystring URL.

## Section schema conventions

Validation sections aren't merchant-addable. Differences from standard section convention:

- `"class": "shopify-section--validation--<layer>--<name>"`
- **Omit `"presets"` entirely** — not addable from the editor.
- **Omit `"disabled_on"`** — irrelevant since it's not addable.
- `"settings"` — minimal. Usually a single `max_inline_size` (`type: range`) for layout control. Don't expose merchant-facing controls; the section is for theme authors.
- **Literal English labels** — these never ship to merchants. Skip `t:` keys to keep the locale files lean.
- Each section owns its `{% stylesheet %}` block, wrapped in `@layer components` like every other component CSS.

## Chrome / content decoupling

Validation surfaces render two distinct content types. They must NOT impose constraints on each other:

1. **Utility chrome** — authoring scaffolding: breadcrumb back to hub, section title, description, page-level legend. Carries its own typographic discipline (paragraph reading-width, code styling, opacity). Lives as a sibling of validation content under `<token-section>`.

2. **Validation content** — the blocks, widgets, or matrix being tested. Rendered as a direct child of `<token-section>`, inheriting only the section's production-native constraints (`--content-width` cap + `--gutter` padding). No validation-imposed wrapper between `token-section` and the validation content.

```liquid
<token-section>
  {% render 'validation--breadcrumb' %}

  <header class="validation__intro">
    <h1>{{ section.settings.title }}</h1>
    <p>{{ section.settings.description }}</p>
  </header>

  {% content_for 'blocks' %}   {# or per-tier rendering pattern (block-labels helper for Tier 2, metaobject iteration for Tier 1a, etc.) #}
</token-section>
```

**Anti-pattern**: wrapping validation content in a `.canvas` div with its own `max-inline-size` / `padding-inline`. The wrapper's constraints cascade onto every block inside — bleed math breaks (blocks bleed to the wrapper's edge, not the section's), and the page no longer represents production behavior.

The chrome's own styling MUST stay within its own selector (`.validation__intro` typography, etc.). It does not impose width/padding on the validation content. `token-section` handles those production-style:

- `max-inline-size: var(--content-width)` caps the section's content area
- `padding-inline: var(--gutter)` (mobile: `var(--mobile-gutter)`) sets the inner gutter
- Per-section `utility--dynamic-style` overrides `--content-width` when a narrower test surface is needed; token-section honors it the production way

Existing validation sections from the 21-page inventory carry the wrapper anti-pattern (token-section gets `max-inline-size` + `padding-inline` applied directly). Retrofit at next touch; tracked in `BACKLOG.md`.

## Schema-driven matrix

Tiers 2, 3, and 4 share one pattern: the validation section accepts `@theme` blocks (Tiers 2 + 3) or declares its own inline-block schema (Tier 4 / Framing-A), and the **template JSON** bakes the test matrix into block instances. The JSON IS the test spec — diffing it tells you what scenarios changed.

Tier 1a (metaobject) iterates `metaobjects.<type>.values` directly; the JSON template carries only section settings, no per-entry matrix.

Pattern (Tier 2 sketch):

```json
{
  "sections": {
    "main": {
      "type": "validation--primitive--button",
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

The validation section renders `{% content_for 'blocks' %}` inside a labelled wrapper — a presentation harness for the matrix.

## Hub registration

After authoring a validation section, add an anchor in `sections/validation.liquid` so the hub stays current. Convention: alphabetical order within each layer subheading.

## The 21-section inventory

21 of 21 pages live. File names predate the four-tier contract; renames pending retrofit per `BACKLOG.md`.

**Metaobjects — Tier 1a / substrate (8 sections, `--metaobject--*` today)**

`theme-color`, `icon`, `text-style`, `button-style`, `container-style`, `media-size`, `content-width`, `spacing`. Each iterates `metaobjects.<type>.values` and renders a card per entry surfacing handle + relevant fields.

**Blocks — Tier 2 / primitive (9 sections, `--block--*` today)**

`spacer`, `separator`, `title`, `richtext`, `button`, `media`, `embed`, `group`, `columns`. Each pairs with a JSON template that bakes the modifier matrix into block instances; the section harness renders them via `{% content_for 'blocks' %}` with the labelling helper.

**Compositions — Tier 3 / preset (4 sections, `--section--*` today)**

- `hero` — media + overlaid title + button + bleed
- `content` — title + richtext + button stacked, exercises block_rhythm + top spacing
- `columns-features` — columns containing media + title + richtext per column, exercises container queries
- `cta-banner` — separator + group + button variants

These compositions cover the cross-block interactions: block_rhythm layer-cascade collision, separator collapse in flex parents, group/columns self-container-query. They serve as regression guards.

## Helper snippets

Two snippets live in `snippets/` to keep the per-topic pages thin:

- **`validation--breadcrumb.liquid`** — renders a back-link to `?view=validation`. Drop into the top of every per-topic page (`{% render 'validation--breadcrumb' %}`). The hub itself skips it.
- **`validation--block-labels.liquid`** — for the 9 block-validation pages. Iterates `section.blocks` and emits an inline `<style>` block that sets a `--block-label` CSS custom property on each rendered block to its merchant-facing short id. The consuming page's stylesheet reads it via `content: var(--block-label)` on a `::before` pseudo-element so each block in the matrix is labelled. Liquid does the id-cleaning because Shopify wraps each block id as `<random>__<key>` and `section.blocks[i].id` further appends a `-1` instance suffix that's stripped at render time — neither is substringable in pure CSS. Render once per page after `{% content_for 'blocks' %}`: `{% render 'validation--block-labels', section: section %}`.

## Executable assertion layer

Each spec's prose assertions convert into committed Playwright specs under `.tests/e2e/<page>.spec.js`, one file per validation page, named for the page suffix (`primitive--button.spec.js` → `?view=validation--primitive--button`).

- **Runner**: `@playwright/test` (devDep). Run with `npm run test:e2e`.
- **Config** (`playwright.config.js`): `baseURL` is the dev server (`http://127.0.0.1:9292`); two viewport projects — `desktop` (1280px) and `mobile` (390px) — straddle the `48rem` breakpoint so responsive assertions run in the right viewport. No `webServer` is declared: the config attaches to the dev server you run (`npm run dev`) and fails fast if it's down, rather than spawning its own.
- **Gate**: e2e is **not** part of `npm run check`. The static gate (context-lint + prettier + theme-check) stays offline; e2e needs a live server and the seeded store. Run it separately.
- **Tier scoping**: a spec asserts only what its page's tier owns — emitted attributes / modifiers / custom properties for a primitive, the cascade-applied result for a preset/section. See `validation-contract.md` § Tier 2 Boundary.
- **Seed dependency**: tests rely on Token's shipped seed catalog (handles like `icon/arrow`, `button_style/link-primary`). Each spec's Validation § names the handles its tests require; a test needing an unseeded handle is a seed-set gap to surface, not a workaround to engineer.
- **Reference**: `.tests/e2e/primitive--button.spec.js` + `.context/specs/button.md` § Validation are the worked example new pages follow.

## Working with Playwright MCP

The Playwright MCP is the interactive authoring / debug aid (the committed `.tests/e2e/` suite above is the persistent layer). When iterating on a page, the feedback loop is:

1. Author/edit a validation section
2. Ensure `shopify theme dev` is running locally (default at `http://127.0.0.1:9292`)
3. `browser_navigate` to `http://127.0.0.1:9292/?view=validation--<topic>`
4. `browser_screenshot` for visual check
5. `browser_axe` for a11y audit on the rendered page
6. `browser_evaluate` to inspect computed styles when verifying CSS variables resolved correctly

If no MCP available, fallback: author asks the user to load the URL and report findings.

## Related

- `validation-contract.md` — per-tier functional contract (what each tier validates, harness shape, current-state gaps)
- `block-convention.md` — block structure (validation sections compose them)
- `section-convention.md` — section structure (validation sections are simplified standard sections)
- `design-system-metaobjects.md` — metaobject types and consumption fields
- `asset-loading.md` — where component CSS lives
