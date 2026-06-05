# section

**Layer**: 3

**Type**: section host (`sections/section.liquid`)

**Status**: shipped

**Implementation**: `sections/section.liquid` v1.7.0 (render surface + schema)

**Reconciled**: 2026-06-05

**Reviewed**: pending

**Depends on**: `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `spacing` metaobject (optional), `theme_color` color schemes, `layer-theme.css` substrate rules per `theme-root.md`

**Consumers**: every merchant-composable page that adds a generic section via the editor; hosts L2 presets defined in the `presets` array; reachable on `templates/*.json` page templates outside of `header` / `footer` section groups

## Purpose

The canonical merchant-composable section host. Renders `<token-section>` as the inner element with the `theme-root` modifier identity, exposes the section's `content_width` / `block_rhythm` / `color_scheme` settings, and accepts the 9 L1 blocks plus `@app` blocks for composition. The single section file the general theme ships; L2 presets attach as `presets[]` entries on its schema, sharing one host file instead of forking per archetype. Specialized sections (header, footer, future cart) are *not* this — they're separate files with their own custom element per `composition-strategy.md` Beyond-L2.

<!-- REVIEW: Spec - Per the promoted template:design-principle-upfront-purpose, would the lead read better starting with the distinctive principle? Draft: "One section host file shared by every L2 preset — the general theme has no per-archetype section file. The host renders <token-section> with the theme-root modifier identity, exposes content_width / block_rhythm / color_scheme settings, and whitelists the 9 L1 blocks + @app for composition. L2 presets attach as presets[] schema entries instead of forking new files; specialized sections (header, footer, future cart) are Beyond-L2 with their own custom element." Question: keep current framing, swap to the draft, or split the difference (lead with principle then describe)? -->


## Architecture

A rendered section produces two nested wrappers:

```html
<section class="shopify-section shopify-section--section">
  <token-section data-modifiers="theme-root,color-scheme:scheme-1">
    <!-- block content -->
  </token-section>
</section>
```

The outer `.shopify-section` is Shopify's universal section wrapper — outer-flow concerns only (anchor scrolling, document-flow positioning). The inner `<token-section>` is the theme-root: bleed grid, block-rhythm cascade, custom-element JS runtime. See `section-convention.md` § Architecture for the two-wrapper split rationale and `theme-root.md` for the theme-root contract.

## API

Section settings — appear in the editor sidebar:

| Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `content_width` | metaobject (`content_width`) | no | blank → 125rem substrate default | Caps the section's center grid track (`min(--content-width, 100% - 2 × --gutter)`). Emitted as `--content-width: <value>rem` in the section's dynamic style (px input from setting, rem at emission per `px-rem-emission.md`). Cascades to descendants as the bleed cap (`container-patterns.md` § Content cap and convergence). |
| `block_rhythm` | metaobject (`spacing`) | no | blank → 0 | Vertical rhythm between direct block children. Emits `--block-rhythm: var(--spacing-<picked-handle>)` (responsive resolution baked into the spacing token's @media branch); the rhythm cascade rule in `layer-theme.css` applies it via `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child)` (see `theme-root.md` § Rhythm scope). |
| `color_scheme` | color_scheme | yes (schema-defaulted) | `"scheme-1"` | Section's color scheme. Emitted as `color-scheme:<id>` in `data-modifiers`; the per-scheme rules in `utility--css-variables` re-emit `--color-role-*` tokens scoped to the modifier-bearing element. |

The section has no `layout` setting — token-section is always a bleed grid; merchants wanting row / multi-track compositions wrap children in a `group` or `columns` block. See `subgrid-migration.md` § Open questions for the rationale.

## Block whitelist

The section accepts an **explicit whitelist** of the 9 shipped L1 blocks plus `@app`:

```
spacer, separator, title, richtext, button, media, embed, group, columns, @app
```

No `@theme` wildcard. New L1 blocks ship with an entry added here; see `composition-strategy.md` § Block whitelisting and each block spec's `Whitelisted by` field for the checklist.

## Output shape

```liquid
<token-section data-modifiers="theme-root,color-scheme:{{ section.settings.color_scheme }}">
  {% content_for 'blocks' %}
</token-section>
```

`<token-section>` is the generic custom element (extends `BaseComponent`) defined in `assets/section.js`. Carries `theme-root` as a static identity marker plus the section's `color-scheme` modifier. The bleed grid, bleed-direction rules, and rhythm cascade match against `[data-modifiers*='theme-root']` in `layer-theme.css`.

`{% content_for 'blocks' %}` renders the whitelisted child blocks the merchant has added. Empty section (no blocks) still renders the wrapper — useful for visual structure during composition.

## CSS

Section-specific CSS is minimal — most behavior comes from substrate rules matching the theme-root modifier. The section's own `{% stylesheet %}` block is empty.

The substrate rules that match are in `layer-theme.css` under `@layer theme`:

- `[data-modifiers*='theme-root']` — bleed grid (`display: grid` + four named columns); rhythm cascade
- `[data-modifiers*='theme-root'] > *` — default `grid-column: content-start / content-end`
- `[data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:<value>']` — bleed-direction grid-column rules
- `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child)` — block-rhythm cascade

Appearance defaults (typography, color, background, transitions, form-input styling) live on `<body>` — they cascade to chrome elements (header / footer / app sections) and theme-roots alike. See `subgrid-migration.md` § Body-level appearance.

The outer `.shopify-section` adds no theme-managed rules per the two-wrapper split (`section-convention.md` § Architecture).

## CSS custom properties (exposed)

Per-instance vars emitted into the section's dynamic style block (scoped to `#shopify-section-<section.id>`):

| Variable | Source | Default |
|---|---|---|
| `--content-width` | `content_width.width.value` (px input, rem-emitted via `divided_by: 16.0 | round: 3`) when setting populated | 125rem (substrate default in `layer-base.css`) |
| `--block-rhythm` | `var(--spacing-<block_rhythm.system.handle>)` when setting populated; resolves responsively through the spacing token's @media branch | `0rem` (substrate default in the rhythm cascade rule) |

Modifier-driven (not vars): `theme-root` (identity, matches bleed-grid + rhythm selectors), `color-scheme:<id>` (matches per-scheme tokens). Children's bleed modifiers (`bleed-desktop:<value>`, `bleed-mobile:<value>`) match section's grid-column rules — emitted by container blocks, not by the section itself.

## Behavior

- **Static `theme-root` modifier.** Authored directly in the markup — `<token-section data-modifiers="theme-root,...">`. Not a setting; not a computed value. Substrate bleed-grid and rhythm rules all match `[data-modifiers*='theme-root']`, so the section participates in the bleed model by carrying the marker. See `theme-root.md` § Identity.
- **Always a bleed grid.** Theme-section resolves as `display: grid` with named columns (`bleed-start` / `content-start` / `content-end` / `bleed-end`). No `layout` setting — the section's role is the bleed grid; row / multi-track compositions live inside container blocks (`group` / `columns`). See `theme-root.md` § Bleed grid.
- **`content_width` caps the center track.** The section's `--content-width` caps the center track via `min(--content-width, 100% - 2 × --gutter)`; bleeding children spanning `bleed-start / bleed-end` reach viewport edges. A 60rem-content section gets 60rem-wide content + full-viewport bleed (capped at viewport, not at 60rem) — see `container-patterns.md` § Content cap and convergence.
- **`block_rhythm` is the section-level rhythm baseline.** Per-block top-margin overrides (`--mobile-margin-block-start` / `--desktop-margin-block-start` from `utility--block-layout-vars`) fall through to the section rhythm via the var chain in the rhythm cascade rule. The rhythm applies to direct children only (`> .shopify-block:not(:first-child)`); container blocks (`group`, `columns`, `media`) use their own `gap` setting for between-child spacing — see `theme-root.md` § Rhythm scope.
- **Color-scheme override.** `color-scheme:<id>` on the section root activates that scheme's `--color-role-*` tokens, scoped via the per-scheme selectors in `utility--css-variables`. Block-level color-scheme overrides (on `group`/`columns`/`media`/etc.) re-emit the tokens for their subtree.
- **Empty section renders the wrapper.** `{% content_for 'blocks' %}` against zero blocks emits nothing inside the wrapper; the `<token-section>` outer + the `.shopify-section` wrapper still render, including all dynamic-style emission. Sections in the editor without blocks remain selectable.
- **`disabled_on` excludes header / footer groups.** The section is not addable inside section groups for header / footer (those groups have their own specialized sections). Page-level template positions remain addable.
- **No `presets[]` in this spec.** The schema's `presets` array lists L2 preset entries — each preset is its own spec at Tier 3 per `validation-contract.md`. This spec covers the host; presets attach via `presets[]` entries and ship with their own preset specs.

## Locale keys

Schema strings under `sections.section.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `sections.section.name`
- `sections.section.settings.layout.content` (group header — covers content_width + block_rhythm)
- `sections.section.settings.content_width.{label,info}`
- `sections.section.settings.block_rhythm.{label,info}`
- `sections.section.settings.appearance.content` (group header)
- `sections.section.settings.color_scheme.label`
- `sections.section.presets.section.name`

No runtime strings; the section emits no user-visible chrome of its own.

## Validation

Per `validation-contract.md` Tier 3 (preset / L2). The host section itself is exercised through its presets; there is no dedicated "section host" validation page in the current contract. Each preset's validation page configures the section's settings (`content_width`, `block_rhythm`, `color_scheme`) and renders the preset's block composition end-to-end.

- **Tier**: section host — Tier 3 work is parked (see `validation-contract.md` § Tier 3). No dedicated verification surface in the current contract; bleed-grid + rhythm behavior is exercised through container-block validation pages and through preset pages once Tier 3 unparks.
- **Page(s)**: future `validation--preset--*` series (per preset, when Tier 3 unparks).
- **API surface to exercise**:
  - **Bleed-grid cases**: section-bleed band; asymmetric image-left / image-right bleed; two-track band with both edges bleeding; three-track content-aligned; nested groups inside a bleeding columns (verify children don't independently bleed).
  - **content_width**: a section with a non-default `content_width` caps the center grid track; bleed children still span viewport-edge to viewport-edge.
  - **block_rhythm cascade**: rhythm applies between direct children of `<token-section>` only — nested blocks inside containers use parent's `gap`.
  - **color_scheme override**: non-default scheme cascades `--color-role-*` tokens to descendants; block-level overrides re-emit within their subtree.
  - **Empty section**: zero blocks → wrappers render, no inner content; remains selectable in editor.
  - **disabled_on**: section not offered inside header / footer section groups.
- **Edge cases**:
  - `content_width` blank → falls through to the 125rem substrate default; no `--content-width` declaration emitted in the dynamic style block.
  - `block_rhythm` blank → no `--block-rhythm` declaration; rhythm cascade rule's `0rem` fallback applies (no inter-block spacing).
  - Container block (group / columns / media) with `bleed-desktop:both` placed inside another container → outer's grid-column rule doesn't match (`>` direct-child requirement); nested container positions in parent's layout, no bleed. Strict container-only bleed model in action.
  - App block (`@app`) inserted alongside theme blocks → app block renders inside `<token-section>`, inherits body-level appearance defaults; section's block-rhythm cascade applies to it via the direct-child selector; section's `grid-column` default sits it in the content track.
- **Assertions** (prose; Playwright once installed):
  - `<token-section>` carries `data-modifiers` with `theme-root` + `color-scheme:<id>` (no `layout:` modifier)
  - Computed `display` on `<token-section>` is `grid` with the named-line template
  - Direct-child `.shopify-block` (non-first) computed `margin-block-start` matches the rhythm cascade values per breakpoint
  - Direct children with `bleed-desktop:both` have computed `grid-column-start: bleed-start` and `grid-column-end: bleed-end` at viewports ≥ 48rem
  - `--content-width` resolves to the configured px value (or 125rem default)
  - Color-scheme tokens (`--color-role-*`) resolve to the scheme's configured colors
- **Unit scope**: none — `<token-section>` extends `BaseComponent` (the four managers run as a side-effect of registration), but the section itself ships no behavior beyond construction. JS coverage lives at the substrate Tier 1d level.

## Out of scope

- **`<token-section>` JS implementation** — covered by the `BaseComponent` spec and the four manager specs. The section file only declares the custom element root.
- **Per-preset content composition** — each L2 preset entry has its own spec describing its block composition, settings defaults, and validation page. This spec covers the host, not the catalog of presets.
- **Specialized section identity** — `<token-cart>`, `<token-header>`, `<token-footer>` are Beyond-L2 sections with their own files and their own specs. They share the `theme-root` identity but own their layout via per-section CSS (see `theme-root.md` § Specialized-section opt-out and `specialized-section-pattern.md`).
- **Container-style at the section level** — `container_style` is a container-block concern (`group`/`columns`/`media`), not a section concern. A merchant wanting card-styled chrome around a section's content wraps the section's children in a `group` with `container_style: card`.
- **Section-level bleed setting** — bleed is a container-block concern under the strict container-only bleed model (see `subgrid-migration.md`). Sections don't declare bleed; their children (specifically the container blocks) do.

## Related

- Theme-root contract (identity, bleed grid, specialized-section opt-out, rhythm scope, leaf-vs-wrapped composition): `.context/docs/theme-root.md`
- Section convention (file structure, two-wrapper architecture, naming, schema requirements): `.context/rules/section-convention.md`
- Composition strategy (layer model, block whitelisting, leaf-vs-wrapped composition): `.context/docs/composition-strategy.md`
- Container patterns (gutter / gap / bleed model, content cap and convergence): `.context/docs/container-patterns.md`
- Subgrid migration (the named-line grid + strict container-only bleed model): `.context/docs/subgrid-migration.md`
- Validation contract (Tier 3 preset validation via the section's preset entries): `.context/docs/validation-contract.md`
- Schema conventions (section base settings, block-level color scheme override, top-spacing pair): `.context/docs/schema-conventions.md`
