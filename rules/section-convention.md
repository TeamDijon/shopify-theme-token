---
paths:
  - "sections/*.liquid"
---

# Section convention

## Structure

Every section file has:

1. **Version header** — `{% # <Name> vX.Y.Z %}`
2. **Changelog block** — `{% comment %}` with schema/markup changes; see `.context/docs/versioning-and-changelog.md` for format. Omit on v1.0.0 only; required from any subsequent version.
3. **Body** — see patterns below
4. **`{% schema %}`** — see Schema requirements

## Body patterns

### Standard section

When the section is a merchant-composable container that renders blocks, no bespoke JS needed:

1. **Liquid block** — resolve `section.settings.*`, compute `base_selector = 'shopify-section-' | append: section.id`
2. **`<theme-section>` custom element wrapper** — the generic base element; inlines the color-scheme modifier (see Architecture)
3. **`{% content_for 'blocks' %}`** inside the wrapper
4. **Dynamic style** — see `.context/docs/dynamic-style-pattern.md`

### Specialized section

When the section has bespoke JS (cart, header, footer, etc.), the root element is a specialized custom element extending `BaseComponent`, named `<theme-<name>>`:

1. Liquid block with `base_selector`
2. `<theme-<name>>` as the body root (no `<theme-section>` wrapping it)
3. Custom markup driven by settings/blocks as needed
4. Dynamic style if per-instance CSS values apply

Examples: `<theme-cart>`, `<theme-header>`, `<theme-footer>`. The corresponding JS class is defined in `assets/<name>.js` and extends `BaseComponent` (see `.claude/rules/js-asset-convention.md`). For the full worked example (Liquid + JS pair, patterns to follow, patterns to avoid), see `.context/docs/specialized-section-pattern.md`.

## Architecture

A rendered section produces two nested wrappers:

```html
<section class="shopify-section shopify-section--<name>">
  <theme-section data-modifiers="color-scheme:scheme-2">
    <!-- content -->
  </theme-section>
</section>
```

The two wrappers serve different audiences and have different blast radii. Each layer's job follows from its scope.

- **Outer `<section class="shopify-section ...">`** — Shopify wraps every section, ours and apps', in this. **Universal scope.** Anything we put on `.shopify-section` propagates to app sections too, so only outer-flow concerns belong here: anchor scrolling (`scroll-margin-block-start`), scroll-behavior, inter-section spacing if ever needed. **No typography, background, or transitions** — those would bleed into apps. The schema's `"class": "shopify-section--<name>"` adds a per-section identity hook used rarely, only for outer-level overrides that *can't* live on the inner element (typically `position: sticky` for header sections, `z-index` overlaps, document-flow positioning). Most sections add no rule at this layer.
- **Inner `<theme-section>` / `<theme-<name>>`** — our domain, no bleed. **All content-level appearance lives here**: typography, color, background, transitions, content-width, gutter, layout. Plus the JS runtime wiring (`events`, `observers`, `cache`, `modifiers` managers via `BaseComponent`). Theme-level defaults shared by every theme-managed root are applied via `:is(theme-section, theme-cart, theme-header, theme-footer, theme-overlay)` in `assets/core.css`; specialized sections add their own layout/behavior on top.

The split keeps app sections un-themed by default (since they only get the outer wrapper, never an inner `theme-*`), avoiding silent bleed of typography or background into app content. As new specialized sections are authored, their tag is added to the `:is()` list so the shared defaults apply.

## Naming

- Namespace: `theme-` (e.g. `<theme-section>`, `<theme-cart>`, `<theme-header>`)
- Specialized elements match the section filename: `sections/cart.liquid` → `<theme-cart>` → `assets/cart.js` defining a class extending `BaseComponent`

## Schema requirements

- `"tag": "section"`, `"class": "shopify-section--<name>"` — per-section outer hook. Reserved for outer-level overrides only (e.g. `position: sticky` for the header section). Theme-wide content styling goes on the inner `theme-*` root, not here — see Architecture.
- `"blocks"` — `[{ "type": "@theme" }, { "type": "@app" }]` for standard sections accepting any block; custom lists or `[]` for specialized/static sections
- `"disabled_on"` — restrict where the section can appear (e.g. `{ "groups": ["header", "footer"] }` for content sections)
- Base settings (Layout + Appearance) — see `.context/docs/schema-conventions.md#section-base-settings`. Required for merchant-addable standard sections; optional for specialized or static sections
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

<theme-section data-modifiers="color-scheme:{{ section.settings.color_scheme }}">
  {% content_for 'blocks' %}
</theme-section>

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
  "blocks": [{ "type": "@theme" }, { "type": "@app" }],
  "disabled_on": { "groups": ["header", "footer"] },
  "settings": [ ... ],
  "presets": [{ "name": "Section" }]
}
{% endschema %}
```

## Related

- Modifier system: `.context/docs/modifier-system.md`
- Design-system metaobjects: `.context/docs/design-system-metaobjects.md`
- Locale conventions (incl. `t:` prefix for schema translations): `.context/docs/locale-conventions.md`
