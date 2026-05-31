# section

**Layer**: section host (Tier 3 host per `validation-contract.md`; carries L2 presets)

**Type**: section host (`sections/section.liquid`)

**Status**: shipped

**Implementation**: `sections/section.liquid` v1.3.0 (render surface + schema)

**Reconciled**: 2026-05-31

**Depends on**: `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `spacing` metaobject (optional), `theme_color` color schemes, `layer-theme.css` substrate rules per `theme-root.md`

**Consumers**: every merchant-composable page that adds a generic section via the editor; hosts L2 presets defined in the `presets` array; reachable on `templates/*.json` page templates outside of `header` / `footer` section groups

## Purpose

The canonical merchant-composable section host. Renders `<theme-section>` as the inner element with the `theme-root` modifier identity, exposes the section's `layout` / `content_width` / `block_rhythm` / `color_scheme` settings, and accepts the 9 L1 blocks plus `@app` blocks for composition. The single section file the general theme ships; L2 presets attach as `presets[]` entries on its schema, sharing one host file instead of forking per archetype. Specialized sections (header, footer, future cart) are *not* this — they're separate files with their own custom element per `composition-strategy.md` Beyond-L2.

## Architecture

A rendered section produces two nested wrappers:

```html
<section class="shopify-section shopify-section--section">
  <theme-section data-modifiers="theme-root,layout:column,color-scheme:scheme-1">
    <!-- block content -->
  </theme-section>
</section>
```

The outer `.shopify-section` is Shopify's universal section wrapper — outer-flow concerns only (anchor scrolling, document-flow positioning). The inner `<theme-section>` is the theme-root: appearance defaults, layout preset, block-rhythm cascade, custom-element JS runtime. See `section-convention.md` § Architecture for the two-wrapper split rationale and `theme-root.md` for the theme-root contract.

## API

Section settings — appear in the editor sidebar:

| Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `layout` | select (`column` / `row` / `columns_2` / `columns_3` / `columns_4`) | no | `"column"` | Picks the implicit-container layout preset. Emitted as `layout:<value>` in `data-modifiers`; substrate CSS in `layer-theme.css` gates layout rules on the modifier. See `theme-root.md` § Layout enum for behavior per preset. |
| `content_width` | metaobject (`content_width`) | no | blank → 125rem substrate default | Caps `max-inline-size`. Emitted as `--content-width: <value>px` in the section's dynamic style. Cascades to descendants as the bleed cap (`container-patterns.md` § Content cap and convergence). |
| `block_rhythm` | metaobject (`spacing`) | no | blank → 0 | Vertical rhythm between direct block children. Emits `--block-rhythm-mobile` / `--block-rhythm-desktop` CSS variables; the rhythm cascade rule in `layer-theme.css` applies them via `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child)` (see `theme-root.md` § Rhythm scope). |
| `color_scheme` | color_scheme | yes (schema-defaulted) | `"scheme-1"` | Section's color scheme. Emitted as `color-scheme:<id>` in `data-modifiers`; the per-scheme rules in `utility--css-variables` re-emit `--color-role-*` tokens scoped to the modifier-bearing element. |

## Block whitelist

The section accepts an **explicit whitelist** of the 9 shipped L1 blocks plus `@app`:

```
spacer, separator, title, richtext, button, media, embed, group, columns, @app
```

No `@theme` wildcard. New L1 blocks ship with an entry added here; see `composition-strategy.md` § Block whitelisting and each block spec's `Whitelisted by` field for the checklist.

## Output shape

```liquid
<theme-section data-modifiers="theme-root,layout:{{ layout }},color-scheme:{{ section.settings.color_scheme }}">
  {% content_for 'blocks' %}
</theme-section>
```

`<theme-section>` is the generic custom element (extends `BaseComponent`) defined in `assets/section.js`. Carries `theme-root` as a static identity marker plus the section's `layout` and `color-scheme` modifiers. The block-rhythm cascade and layout presets match against `[data-modifiers*='theme-root']` / `[data-modifiers*='theme-root'][data-modifiers*='layout:<preset>']` rules in `layer-theme.css`.

`{% content_for 'blocks' %}` renders the whitelisted child blocks the merchant has added. Empty section (no blocks) still renders the wrapper — useful for visual structure during composition.

## CSS

Section-specific CSS is minimal — most behavior comes from substrate rules matching the theme-root modifier. The section's own `{% stylesheet %}` block is empty in v1.3.0.

The substrate rules that match are in `layer-theme.css` under `@layer theme`:

- `[data-modifiers*='theme-root']` — appearance defaults (typography, color, transitions, form-input styling)
- `[data-modifiers*='theme-root'][data-modifiers*='layout:<preset>']` — layout preset (`column` / `row` / `columns_N`)
- `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child)` — block-rhythm cascade

The outer `.shopify-section` adds no theme-managed rules per the two-wrapper split (`section-convention.md` § Architecture).

## CSS custom properties (emitted)

Per-instance vars emitted into the section's dynamic style block (scoped to `#shopify-section-<section.id>`):

| Variable | Source | Default |
|---|---|---|
| `--content-width` | `content_width.width.value` (px) when setting populated | 125rem (substrate default in `layer-base.css`) |
| `--block-rhythm-mobile` | `block_rhythm.mobile_value.value` (px) when setting populated | `0rem` (substrate default in the rhythm cascade rule) |
| `--block-rhythm-desktop` | `block_rhythm.desktop_value.value` (px) when setting populated | `0rem` |

Modifier-driven (not vars): `layout:<preset>`, `color-scheme:<id>` — matched by selectors, not consumed as `var()`.

## Behavior

- **Static `theme-root` modifier.** Authored directly in the markup — `<theme-section data-modifiers="theme-root,...">`. Not a setting; not a computed value. Substrate appearance and rhythm rules all match `[data-modifiers*='theme-root']`, so the section inherits theme defaults by carrying the marker. See `theme-root.md` § Identity.
- **Layout enum picks an implicit-container preset.** Each preset bundles direction + theme-default gap + theme-default stack-below into a single setting (`theme-root.md` § Layout enum). `column` (default) is `display: flow-root` — children stack vertically via the block-rhythm cascade. `row` / `columns_2` / `columns_3` / `columns_4` apply flex / grid layouts. Specialized sections opt out by omitting the `layout:` modifier; this section always emits one (default `column`).
- **`content_width` cascades as the bleed cap.** The section's `--content-width` is the single ceiling for both content sizing and bleed sizing on its descendants (`container-patterns.md` § Content cap and convergence). A 60rem-content section gets 60rem bleed bands inside `group`/`columns`/`media` children.
- **`block_rhythm` is the section-level rhythm baseline.** Per-block top-margin overrides (`--mobile-margin-block-start` / `--desktop-margin-block-start` from `utility--block-layout-vars`) fall through to the section rhythm via the var chain in the rhythm cascade rule. The rhythm applies to direct children only (`> .shopify-block:not(:first-child)`); container blocks (`group`, `columns`, `media`) use their own `gap` setting for between-child spacing — see `theme-root.md` § Rhythm scope.
- **Color-scheme override.** `color-scheme:<id>` on the section root activates that scheme's `--color-role-*` tokens, scoped via the per-scheme selectors in `utility--css-variables`. Block-level color-scheme overrides (on `group`/`columns`/`media`/etc.) re-emit the tokens for their subtree.
- **Empty section renders the wrapper.** `{% content_for 'blocks' %}` against zero blocks emits nothing inside the wrapper; the `<theme-section>` outer + the `.shopify-section` wrapper still render, including all dynamic-style emission. Sections in the editor without blocks remain selectable.
- **`disabled_on` excludes header / footer groups.** The section is not addable inside section groups for header / footer (those groups have their own specialized sections). Page-level template positions remain addable.
- **No `presets[]` in this spec.** The schema's `presets` array lists L2 preset entries — each preset is its own spec at Tier 3 per `validation-contract.md`. This spec covers the host; presets attach via `presets[]` entries and ship with their own preset specs.

## Locale keys

Schema strings under `sections.section.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `sections.section.name`
- `sections.section.settings.layout.{content,label,info,options.{column,row,columns_2,columns_3,columns_4}}`
- `sections.section.settings.content_width.{label,info}`
- `sections.section.settings.block_rhythm.{label,info}`
- `sections.section.settings.appearance.content` (group header)
- `sections.section.settings.color_scheme.label`
- `sections.section.presets.section.name`

No runtime strings; the section emits no user-visible chrome of its own.

## Validation

Per `validation-contract.md` Tier 3 (preset / L2). The host section itself is exercised through its presets; there is no dedicated "section host" validation page in the current contract. Each preset's validation page configures the section's settings (`layout`, `content_width`, `block_rhythm`, `color_scheme`) and renders the preset's block composition end-to-end.

- **Tier**: section host — Tier 3 via its preset entries (proto-presets `hero`, `content`, `columns-features`, `cta-banner` exist today; full L2 preset specs come from the preset-authoring pass).
- **Page(s)**: `validation--preset--*` series (per preset).
- **API surface exercised through presets**:
  - **Layout matrix**: `column`, `row`, `columns_2`, `columns_3`, `columns_4` — verify substrate rules in `layer-theme.css` apply per modifier; the `column` baseline is the default; the four non-column variants apply their layout preset.
  - **content_width × layout interaction**: a section with a non-default `content_width` propagates the cap through to descendant blocks and to bleed-extending children (the cap is the bleed boundary).
  - **block_rhythm cascade**: section with a populated `block_rhythm` shows rhythm spacing between direct children; nested blocks (children of `group`/`columns`/`media`) do not receive rhythm — they use the parent's gap. Verifies the `> .shopify-block:not(:first-child)` selector limits scope to one level deep.
  - **color_scheme override**: section with a non-default scheme renders descendant blocks with the scheme's `--color-role-*` tokens; a block-level color-scheme override (on a `group`/`columns`) re-emits within its subtree.
  - **Empty section**: section with zero blocks renders the wrappers + dynamic style; no inner content; remains selectable in the editor.
  - **disabled_on**: section is not offered inside header / footer section groups in the editor; addable on page-level templates.
- **Edge cases**:
  - `content_width` blank → falls through to the 125rem substrate default; no `--content-width` declaration emitted in the dynamic style block.
  - `block_rhythm` blank → no `--block-rhythm-*` declarations; rhythm cascade rule's `0rem` fallback applies (no inter-block spacing).
  - `layout: columns_N` on a section narrower than the preset's stack threshold → preset stacks per `theme-root.md` § Layout enum.
  - App block (`@app`) inserted alongside theme blocks → app block renders inside `<theme-section>` and inherits theme-root appearance defaults; section's block-rhythm cascade applies to it via the direct-child selector.
- **Visual showcase**: each preset's validation page surfaces the section host's behavior implicitly by exercising the preset's expected configuration. Reader confirms layout preset renders correctly, content_width caps as expected, block_rhythm spacing applies between siblings, color scheme cascades.
- **Assertions** (prose; Playwright once installed):
  - `<theme-section>` carries `data-modifiers` with `theme-root` + `layout:<preset>` + `color-scheme:<id>`
  - Computed `display` on `<theme-section>` matches the layout preset (`flow-root` for column; `flex` / `grid` for the others)
  - Direct-child `.shopify-block` (non-first) computed `margin-block-start` matches the rhythm cascade values per breakpoint
  - `--content-width` resolves to the configured px value (or 125rem default)
  - Color-scheme tokens (`--color-role-*`) resolve to the scheme's configured colors
- **Unit scope**: none — `<theme-section>` extends `BaseComponent` (the four managers run as a side-effect of registration), but the section itself ships no behavior beyond construction. JS coverage lives at the substrate Tier 1d level.

## Out of scope

- **`<theme-section>` JS implementation** — covered by the `BaseComponent` spec and the four manager specs. The section file only declares the custom element root.
- **Per-preset content composition** — each L2 preset entry has its own spec describing its block composition, settings defaults, and validation page. This spec covers the host, not the catalog of presets.
- **Specialized section identity** — `<theme-cart>`, `<theme-header>`, `<theme-footer>` are Beyond-L2 sections with their own files and their own specs. They share the `theme-root` identity but own their layout via per-section CSS (see `theme-root.md` § Layout opt-out and `specialized-section-pattern.md`).
- **Layout setting evolution** — the `layout` enum (column/row/columns_N) is planned to be dropped in the subgrid migration (see `subgrid-migration.md`). The section becomes an always-bleed-grid with named lines; container blocks declare `grid-column` instead of layout flowing from the section setting. This spec describes the today-state.
- **Container-style at the section level** — `container_style` is a container-block concern (`group`/`columns`/`media`), not a section concern. A merchant wanting card-styled chrome around a section's content wraps the section's children in a `group` with `container_style: card`.
- **Section-level bleed setting** — bleed is a container-block concern under the strict container-only bleed model (see `subgrid-migration.md`). Sections don't declare bleed; their children (specifically the container blocks) do.

## Related

- Theme-root contract (identity, layout enum, layout opt-out, rhythm scope, specialized-section pattern): `.context/docs/theme-root.md`
- Section convention (file structure, two-wrapper architecture, naming, schema requirements): `.context/rules/section-convention.md`
- Composition strategy (layer model, block whitelisting, leaf-vs-wrapped composition): `.context/docs/composition-strategy.md`
- Container patterns (gutter / gap / bleed model, content cap and convergence): `.context/docs/container-patterns.md`
- Subgrid migration (planned future state — section becomes a named-line grid, layout enum drops): `.context/docs/subgrid-migration.md`
- Validation contract (Tier 3 preset validation via the section's preset entries): `.context/docs/validation-contract.md`
- Schema conventions (section base settings, block-level color scheme override, top-spacing pair): `.context/docs/schema-conventions.md`
