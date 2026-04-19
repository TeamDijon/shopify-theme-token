# Design-system metaobjects

The project exposes metaobject definitions that encode reusable design decisions. Block schemas should prefer a metaobject reference over free-form values when a matching metaobject exists.

This doc is the single source of truth for which metaobjects exist, their accessible fields, and how to use them in schemas and Liquid. Populate as metaobjects are added; an undocumented metaobject should not be consumed by a block schema.

## Catalog

| `metaobject_type` | Common settings `id` | Observed access fields | Used for |
|---|---|---|---|
| `button_style` | `button_style` | `.system.handle` | Button visual variant (e.g. `solid-primary`, `solid-secondary`, `outline`, `ghost`, `text-link`) |
| `content_width` | `content_width` | `.width.value` (numeric px) | Max inline-size of a component |
| `icon` | `icon` | `.file_name.value`, `.preset.value` | Consumed by `snippets/icon.liquid`; references `assets/icon-*.svg` by `file_name` |
| `theme_color` | `content_color`, others | TBD — document as fields are accessed | Color token from the palette |

## Schema usage

```json
{
  "type": "metaobject",
  "metaobject_type": "button_style",
  "id": "button_style",
  "label": "Style"
}
```

## Liquid usage

Always guard with a blank check before accessing nested fields. Metaobject references can be blank even when a setting exists.

```liquid
{% if button_style != blank %}
  {{ button_style.system.handle }}
{% endif %}
```

When the value is passed through the modifier system, emit as `<key>:<handle>` — see `.context/docs/modifier-system.md`.

## Adding a new metaobject

1. Create the metaobject definition in the Shopify admin
2. Document it in the catalog above with its fields and intended use
3. Only then reference it in a block schema
