# Design-system metaobjects

The project exposes metaobject definitions that encode reusable design decisions. Block schemas should prefer a metaobject reference over free-form values when a matching metaobject exists.

This doc is the **consumption-side reference**: which metaobject types exist, which fields the Liquid utilities access, and how to use them in schemas. For the **type definitions** (field handles, types, and validations needed when creating these on a fresh Shopify store), see `metaobject-definitions.md`. The two docs are kept separate by audience: this one for developers consuming the metaobjects in code; the definitions doc for an agent or human setting up the store.

Populate as metaobjects are added; an undocumented metaobject should not be consumed by a block schema.

## Catalog

| `metaobject_type` | Common settings `id` | Observed access fields | Used for |
|---|---|---|---|
| `button_style` | `button_style` | `.system.handle` | Button visual variant (e.g. `solid-primary`, `solid-secondary`, `outline`, `ghost`, `text-link`) |
| `content_width` | `content_width` | `.width.value` (numeric px) | Max inline-size of a component |
| `icon` | `icon` | `.file_name.value`, `.preset.value` | Consumed by `snippets/icon.liquid`; references `assets/icon-*.svg` by `file_name` |
| `theme_color` | `content_color`, `meta_theme_color`, others; also iterated via `metaobjects.theme_color.values` | `.system.handle` (used for CSS variable naming: `--<handle>-color`), `.hex_code.value` (hex string) | Color token from the palette |
| `typeface` | — (iterated via `metaobjects.typeface.values`) | `.name.value`, `.asset_list.value` (size check), `.font_list.value` (list of nested `font` entries) | Font family + its variants; consumed by `snippets/utility--font-face.liquid` |
| `font` (nested inside `typeface.font_list`) | — | `.weight.value`, `.weight_range_start.value`, `.weight_range_end.value`, `.style.value`, `.asset_list.value` (list of file assets) | Single font variant; supports static weights (100–900) and variable-font ranges (`weight < 100` ⇒ use range fields) |
| `text_style` | `base_text_style` (singular); also iterated via `metaobjects.text_style.values` | `.system.handle`, `.font_family.value` (typeface ref; access `.name.value`), `.font_fallback_family.value` (`'mono'` / `'serif'` / other), `.font_style.value`, `.mobile_font_size.value` (px), `.desktop_font_size.value` (px), `.line_height.value` (pct × 100), `.weight.value`, `.letter_spacing.value` (px), `.uppercase.value` (boolean), `.underline.value` (boolean) | Typographic style definition; consumed by `snippets/utility--css-variables.liquid` which emits per-style `--<handle>-font-*` properties plus a utility rule targeting headings, `[data-text-style=<handle>]`, and `[data-modifiers*="text-style:<handle>"]` |

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

### Dual-API consumption (when a snippet accepts either)

Some snippets accept either a metaobject reference OR the primitive value(s) the metaobject would have provided. `snippets/icon.liquid` is the canonical example: it takes either an `icon` metaobject ref or a `file_name` string. Pick by what the caller has on hand — neither path is preferred:

- Caller has the metaobject (from a `"type": "metaobject"` setting, or from `metaobjects.<type>.<handle>`) → pass the ref. Snippet reads the relevant fields.
- Caller has the primitive directly (typical in hardcoded markup) → pass it. Snippet uses it as-is, bypassing the metaobject lookup.

The snippet's doc block specifies which fields the metaobject path reads, so the primitive path is one-to-one with those fields — same render output, different input shape.

## Adding a new metaobject

1. Create the metaobject definition in the Shopify admin (or via an agent following `metaobject-definitions.md`)
2. Document it in **both** docs: this one (consumption — which fields code accesses) and `metaobject-definitions.md` (creation — field handles, types, validations)
3. Only then reference it in a block schema

## Related

- `metaobject-definitions.md` — type definitions for setup (audience: agent/human creating definitions on the store)
- `schema-conventions.md` — when to prefer a metaobject picker over a hardcoded select
