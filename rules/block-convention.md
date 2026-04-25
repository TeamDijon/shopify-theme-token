---
paths:
  - "blocks/*.liquid"
---

# Block convention

Blocks are thin wrappers. They declare the schema and render a matching snippet — they contain no rendering logic.

## Structure (in order)

1. **Version header** — `{% # <Name> block vX.Y.Z %}`
2. **Changelog block** — `{% comment %}` with schema/setting changes (see "Changelog" below). Omit on v1.0.0 only; required from any subsequent version.
3. **Render call** — `{% render '<same-name>', section: section, block: block %}` where `<same-name>` is the matching file in `snippets/`
4. **`{% schema %}` block**

A block file must contain only these four things. No conditionals, no HTML, no additional Liquid beyond the render call.

## Changelog

See `.context/docs/versioning-and-changelog.md` for format and policy.

- Location: `{% comment %}` block between the version header and the render call
- Interface-change trigger: new/removed/renamed settings, changed defaults, new presets

## Schema requirements

- `"name"` — short title shown in the editor
- `"tag": null` — the snippet controls the outer element
- `"blocks": []` — unless the block intentionally nests children
- `"settings"` — see patterns below
- `"presets"` — at least one, with `"name"` and a `"category"`

## Settings patterns

- Group related settings with `{ "type": "header" }` separators and short `{ "type": "paragraph" }` hints
- Prefer metaobjects over free-form values when a matching one exists — see `.context/docs/design-system-metaobjects.md`
- For recurring schema shapes (top-spacing pair, etc.), see `.context/docs/schema-conventions.md`

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
