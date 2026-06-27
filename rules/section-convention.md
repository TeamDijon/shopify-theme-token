---
paths:
  - "sections/*.liquid"
---

# Section convention

Before authoring a new section, walk the decision flow in `.context/docs/composition-strategy.md`. Many archetypes are L2 presets of existing blocks rather than new sections; the distinction between L2 presets on `section.liquid` and Beyond-L2 specialized sections is laid out there.

## Structure

Every section file has:

1. **Version header** — `{% # <Name> vX.Y.Z %}`
2. **Changelog block** — `{% comment %}` with schema/markup changes; see `.context/docs/versioning-and-changelog.md` for format. Omit on v1.0.0 only; required from any subsequent version.
3. **Body** — see patterns below
4. **`{% schema %}`** — see Schema requirements

## Body patterns

Section CSS and JS live in dedicated `assets/<name>.css` and `assets/<name>.js` files, loaded via `{% render 'utility--asset-loader', name: '<name>' %}`. Per-instance Liquid-computed values go through `utility--dynamic-style`. See `.context/docs/asset-loading.md` for the file-vs-inline rule across consumer types, and `.context/docs/css-standards.md` for component-rooted CSS naming (no BEM `__element`, descendants via `& .name` / `& > tag`).

### Standard section

When the section is a merchant-composable container that renders blocks, no bespoke JS needed:

1. **Liquid block** — resolve `section.settings.*`, compute `base_selector = 'shopify-section-' | append: section.id`
2. **`<token-section>` custom element wrapper** — the generic base element; carries `theme-root,color-scheme:<id>` in `data-modifiers`. The `theme-root` modifier gates the section's named-line bleed grid and rhythm cascade (see `.context/docs/theme-root.md`). No `layout` modifier — the section is always a bleed grid; row / multi-track compositions live inside container blocks (`group` / `columns`).
3. **`{% content_for 'blocks' %}`** inside the wrapper
4. **Dynamic style** — see `.context/docs/dynamic-style-pattern.md`

### Specialized section

When the section has bespoke JS (cart, header, footer, etc.), the root element is a specialized custom element extending `BaseComponent`, named `<theme-<name>>`:

1. Liquid block with `base_selector`
2. `<theme-<name>>` as the body root (no `<token-section>` wrapping it). Carries `theme-root` in `data-modifiers` for scheme tokens + bleed-grid / rhythm matching; overrides `display` in per-section CSS to opt out of the bleed grid when the section has its own layout (see `.context/docs/theme-root.md` § Specialized-section opt-out)
3. Custom markup driven by settings/blocks as needed
4. Dynamic style if per-instance CSS values apply

Examples: `<token-cart>`, `<token-header>`, `<token-footer>`. The corresponding JS class is defined in `assets/<name>.js` and extends `BaseComponent` (see `.context/rules/js-asset-convention.md`). For the full worked example (Liquid + JS pair, patterns to follow, patterns to avoid), see `.context/docs/specialized-section-pattern.md`.

## Architecture

A rendered section produces two nested wrappers:

```html
<section class="shopify-section shopify-section--<name>">
  <token-section data-modifiers="theme-root,color-scheme:scheme-2">
    <!-- content -->
  </token-section>
</section>
```

The two wrappers serve different audiences and have different blast radii. Each layer's job follows from its scope.

- **Outer `<section class="shopify-section ...">`** — Shopify wraps every section, ours and apps', in this. **Universal scope.** Anything we put on `.shopify-section` propagates to app sections too, so only outer-flow concerns belong here: anchor scrolling (`scroll-margin-block-start`), scroll-behavior, inter-section spacing if ever needed. **No typography, background, or transitions** — those would bleed into apps. The schema's `"class": "shopify-section--<name>"` adds a per-section identity hook used rarely, only for outer-level overrides that *can't* live on the inner element (typically `position: sticky` for header sections, `z-index` overlaps, document-flow positioning). Most sections add no rule at this layer.
- **Inner `<token-section>` / `<theme-<name>>`** — our domain. **Bleed grid + rhythm cascade + JS runtime live here.** The `theme-root` modifier gates section's named-line bleed grid (`grid-template-columns: [bleed-start] 1fr [content-start] ... [content-end] 1fr [bleed-end]`), the bleed-direction grid-column rules, and the block-rhythm cascade. Plus the JS runtime wiring (`events`, `observers`, `cache`, `modifiers` managers via `BaseComponent`). See `.context/docs/theme-root.md` for the contract (identity, bleed grid, rhythm scope).

**Base appearance defaults — typography, transitions, form inputs — live on `<body>`, cascading to chrome + theme-roots + app sections alike.** Background + foreground color are the split: `<body>` paints the base scheme (chrome + apps inherit it); each theme-root re-paints its own scheme `background` + `color` so a section-level `color_scheme` override renders a real band — see `.context/docs/theme-root.md` § Scheme paint. Apps with their own styling override per normal cascade. See `.context/docs/subgrid-migration.md` § Body-level appearance for the rationale.

## Naming

- Namespace: `theme-` (e.g. `<token-section>`, `<token-cart>`, `<token-header>`)
- Specialized elements match the section filename: `sections/cart.liquid` → `<token-cart>` → `assets/cart.js` defining a class extending `BaseComponent`

## Schema requirements

- `"tag": "section"`, `"class": "shopify-section--<name>"` — per-section outer hook. Reserved for outer-level overrides only (e.g. `position: sticky` for the header section). Theme-wide content styling goes on the inner `theme-*` root, not here — see Architecture.
- `"blocks"` — **explicit whitelist** of block types the section accepts, plus `{ "type": "@app" }` when app blocks should compose. No `@theme` wildcards. The general theme's `section.liquid` whitelists the 9 shipped L1 blocks (`spacer`, `separator`, `title`, `richtext`, `button`, `media`, `embed`, `group`, `columns`) + `@app`. Specialized sections own narrower whitelists naming the blocks they compose. See `.context/docs/composition-strategy.md` Block whitelisting for the convention's full rationale.
- `"disabled_on"` — restrict where the section can appear (e.g. `{ "groups": ["header", "footer"] }` for content sections)
- Base settings (Layout + Appearance) — see `.context/docs/schema-conventions.md#section-base-settings`. Required for merchant-addable standard sections; optional for specialized or static sections. Section settings are `content_width` + `block_rhythm` + `color_scheme`; no `layout` setting (section is always a bleed grid — see `.context/docs/theme-root.md`)
- `"presets"` — include one or more when the section is merchant-addable via the editor. Omit (or use `[]`) when the section is pinned via section groups (header, footer, etc.) or set via code

## Example (standard section)

```liquid
{% # Section v1.1.0 %}

{% comment %}
  Changelog
  - v1.1.0 — add `content_width` setting
  - v1.0.0 — initial
{% endcomment %}

{% liquid
  assign content_width = section.settings.content_width
  assign base_selector = 'shopify-section-' | append: section.id
%}

<token-section data-modifiers="theme-root,color-scheme:{{ section.settings.color_scheme }}">
  {% content_for 'blocks' %}
</token-section>

{% capture dynamic_style %}
  {% if content_width and content_width != blank %}
    --content-width: {{ content_width.width.value }}px;
  {% endif %}
{% endcapture %}
{% render 'utility--dynamic-style', base_selector: base_selector, css_content: dynamic_style %}

{% schema %}
{
  "name": "Section",
  "tag": "section",
  "class": "shopify-section--section",
  "blocks": [
    { "type": "spacer" },
    { "type": "separator" },
    { "type": "title" },
    { "type": "richtext" },
    { "type": "button" },
    { "type": "media" },
    { "type": "embed" },
    { "type": "group" },
    { "type": "columns" },
    { "type": "@app" }
  ],
  "disabled_on": { "groups": ["header", "footer"] },
  "settings": [ ... ],
  "presets": [{ "name": "Section" }]
}
{% endschema %}
```

## Related

- Theme-root contract (`theme-root` modifier, bleed grid, specialized-section opt-out, rhythm scope): `.context/docs/theme-root.md`
- Modifier system: `.context/docs/modifier-system.md`
- Design-system metaobjects: `.context/docs/design-system-metaobjects.md`
- Locale conventions (incl. `t:` prefix for schema translations): `.context/docs/locale-conventions.md`
- Container patterns (horizontal sizing, gutter / gap / inner padding, bleed model): `.context/docs/container-patterns.md`
