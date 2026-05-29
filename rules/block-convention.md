---
paths:
  - "blocks/*.liquid"
---

# Block convention

Blocks are thin wrappers. They declare the schema and render a matching snippet — they contain no rendering logic.

Before authoring a new block, walk the decision flow in `.context/docs/composition-strategy.md`. Many UI patterns are better expressed as snippets consumed by specialized sections; not everything that looks like a primitive belongs at the theme-block layer.

## Structure (in order)

1. **Version header** — `{% # <Name> block vX.Y.Z %}`
2. **Changelog block** — `{% comment %}` with schema/setting changes (see "Changelog" below). Omit on v1.0.0 only; required from any subsequent version.
3. **Render call** — `{% render '<same-name>', section: section, block: block %}` where `<same-name>` is the matching file in `snippets/`. Container blocks accepting nested children precede this with `{% capture contents %}{% content_for 'blocks' %}{% endcapture %}` and pass `contents: contents` as an extra render argument.
4. **`{% schema %}` block**

A block file's only Liquid is what's described above — no conditionals, no HTML, no rendering logic.

## Changelog

See `.context/docs/versioning-and-changelog.md` for format and policy.

- Location: `{% comment %}` block between the version header and the render call
- Interface-change trigger: new/removed/renamed settings, changed defaults, new presets

## Schema requirements

- `"name"` — short title shown in the editor
- `"tag": null` — the snippet controls the outer element
- `"blocks"` — `[]` for leaf blocks; for container blocks (`group`, `columns`, `media`), an **explicit whitelist** of nested block types. No `@theme` wildcards. The set varies by container — `group` and `columns` accept the full L1 roster; `media` accepts a narrower set for overlay content. See `.context/docs/composition-strategy.md` Block whitelisting.
- `"settings"` — see patterns below
- `"presets"` — at least one, with `"name"` and a `"category"`

## Naming

Block filenames are flat with no underscore prefix. Token does not use Shopify's underscore-prefixed private-block convention — visibility is determined by whitelist membership in each consumer's schema, not by filename. A block intended for a single consumer lives in `blocks/<name>.liquid` like any other and is listed only in that consumer's whitelist.

## Settings patterns

- Group related settings with `{ "type": "header" }` separators and short `{ "type": "paragraph" }` hints
- Prefer metaobjects over free-form values when a matching one exists — see `.context/docs/design-system-metaobjects.md`
- For recurring schema shapes (top-spacing pair, etc.), see `.context/docs/schema-conventions.md`

## Block-backed snippet root

The matching snippet — not the block file — renders the block's root element (`"tag": null` means Shopify adds no wrapper, so the snippet owns the root). That root must carry:

- `class="shopify-block shopify-block--<name>"` — base + identity class (the identity class is the CSS style hook)
- `{{ block.shopify_attributes }}` — Shopify editor integration (block select/insert). Emit directly on the root; in a non-block (direct `{% render %}`) call `block` is nil, so it renders blank — safe. (Don't alias it to a bare `shopify_attributes` variable — theme-check flags the standalone read.)
- `id="{{ base_selector }}"` — unique id from `utility--base-selector`, for `utility--dynamic-style` scoping
- `{{ modifiers }}` — rendered `data-modifiers`, when the block emits any

Sub-component primitives (no block — e.g. `star-rating`, `badge`) carry none of these; they use a clean `.<name>` root. See `.context/docs/composition-strategy.md`.

## Styles and scripts

Block CSS lives in a `{% stylesheet %}` block inside the matching snippet (the block file itself contains only the schema + render call). Block JS lives in a `{% javascript %}` block in the same snippet. For Liquid-computed per-instance values, render the dynamic-style trio:

- `utility--base-selector` — computes the unique DOM `id` used as the scoping selector.
- `utility--block-layout-vars` — emits the shared per-instance variables every block exposes (`--content-width`, `--mobile-margin-block-start`, `--desktop-margin-block-start`) with the canonical px→rem conversion.
- `utility--dynamic-style` — wraps the captured CSS in `#<base-selector> { … }` and routes it through the asset loader.

All three are mandatory companions in every shipped L1 block snippet — calling them together avoids drift on px-to-rem divisors, breakpoint thresholds, and scoping conventions. See `.context/docs/asset-loading.md` for the file-vs-inline decision rule across all consumer types, and `.context/docs/css-standards.md` for component-rooted CSS naming (no BEM `__element`, descendants via `& .name` / `& > tag`).

## Example

```liquid
{% # Button block v1.1.0 %}

{% comment %}
  Changelog
  - v1.1.0 — add `icon` setting
  - v1.0.0 — initial
{% endcomment %}

{% render 'button', section: section, block: block %}

{% schema %}
{
  "name": "Button",
  "tag": null,
  "blocks": [],
  "settings": [
    { "type": "header", "content": "Button" },
    { "type": "text", "id": "content", "label": "Label", "default": "Button" },
    { "type": "url", "id": "link", "label": "Link" }
  ],
  "presets": [
    { "name": "Button", "category": "Action" }
  ]
}
{% endschema %}
```

## Related

- Locale conventions (incl. `t:` prefix for schema translations): `.context/docs/locale-conventions.md`
