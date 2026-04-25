# Metaobject definitions

The metaobject **type definitions** the theme expects to exist in the Shopify admin. Designed as input for an agent (or human) creating definitions on a fresh store before the theme is installed.

**No entries are required.** The theme renders gracefully without any entries — typography falls back to system fonts, no custom colors emit, etc. What matters is the *definitions* exist so:

- Schema-level metaobject pickers (`"type": "metaobject", "metaobject_type": "<type>"`) show without errors in the theme editor
- Liquid utilities iterating `metaobjects.<type>.values` return an empty list rather than failing

For the consumption-side reference (which Liquid utilities access which fields, schema usage patterns), see `design-system-metaobjects.md`. This doc and that one are kept separate on purpose: definitions for setup, consumption for development.

## Creation order

References between types impose this order:

1. **`font`** — no dependencies
2. **`typeface`** — references `font` via the `font_list` field
3. **`text_style`** — references `typeface` via the `font_family` field
4. **`theme_color`, `content_width`, `icon`, `button_style`** — independent; create in any order

## Type definitions

### `theme_color`

Display name: Theme color (singular) / Theme colors (plural).

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `name` | Name | `single_line_text_field` | yes | Editor-visible label |
| `hex_code` | Hex code | `color` | yes | CSS value for `--<handle>-color` |

The entry's `system.handle` (auto-generated from the name) is used as the CSS variable suffix in `utility--css-variables`.

### `typeface`

Display name: Typeface / Typefaces.

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `name` | Name | `single_line_text_field` | yes | Used as the quoted `font-family` value in `@font-face` rules |
| `asset_list` | Assets | `list.file_reference` | recommended | Non-empty check at runtime; entry is skipped if empty. Configure file-type validation to accept `woff2`, `woff`, `otf`, `ttf` |
| `font_list` | Fonts | `list.metaobject_reference` (→ `font`) | recommended | Each referenced `font` emits one `@font-face` declaration. Skipped if empty |

### `font`

Display name: Font / Fonts.

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `weight` | Weight | `number_integer` | yes | Static weight (100–900). Use a value `< 100` (e.g. `0`) to flag variable-font range mode |
| `weight_range_start` | Weight range start | `number_integer` | no | Required when `weight < 100`; emitted as start of the `font-weight: <start> <end>` range |
| `weight_range_end` | Weight range end | `number_integer` | no | Paired with `weight_range_start`; entry is skipped if either is missing or invalid in range mode |
| `style` | Style | `single_line_text_field` with choices `normal`, `italic` | yes | Emitted as `font-style` |
| `asset_list` | Assets | `list.file_reference` | yes | Each file becomes one `src: url(...) format(...)` entry; format auto-detected from extension. Configure file-type validation to accept `woff2`, `woff`, `otf`, `ttf` |

### `text_style`

Display name: Text style / Text styles.

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `font_family` | Font family | `metaobject_reference` (→ `typeface`) | no | If blank, falls back to the first text_style's font_family |
| `font_fallback_family` | Fallback family | `single_line_text_field` with choices `mono`, `serif`, `sans-serif` | no | Maps to the matching theme setting (`mono_font` / `serif_font` / `sans_serif_font`); defaults to `sans-serif` |
| `font_style` | Style | `single_line_text_field` with choices `normal`, `italic` | no | Defaults to `normal` |
| `mobile_font_size` | Mobile font size | `number_decimal` | no | Px; converted to rem via `÷ 16.0`. If both mobile and desktop are 0, defaults to 1rem |
| `desktop_font_size` | Desktop font size | `number_decimal` | no | Px; same conversion. If only one of mobile/desktop is set, the other inherits it |
| `line_height` | Line height | `number_decimal` | no | Percentage × 100 (e.g. `150` for 1.5); converted via `÷ 100.0`; defaults to 1.5 if 0 |
| `weight` | Weight | `number_integer` | no | 100–900; defaults to 400 |
| `letter_spacing` | Letter spacing | `number_decimal` | no | Px; converted to rem via `÷ 16.0` |
| `uppercase` | Uppercase | `boolean` | no | Maps to `text-transform: uppercase` |
| `underline` | Underline | `boolean` | no | Maps to `text-decoration: underline` |

The entry's `system.handle` is the prefix for emitted CSS variables (`--<handle>-font-family`, `--<handle>-font-size`, etc.) and the value for the `[data-text-style="<handle>"]` and `[data-modifiers*="text-style:<handle>"]` selectors.

### `content_width`

Display name: Content width / Content widths.

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `width` | Width | `number_decimal` | yes | Px; emitted as `--content-width: <value>px` |

### `icon`

Display name: Icon / Icons.

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `file_name` | File name | `single_line_text_field` | yes | Slug without `icon-` prefix or `.svg` suffix; resolves to `assets/icon-<file_name>.svg`. Type a value that matches an existing SVG in the theme's assets |
| `preset` | Preset | `single_line_text_field` | no | Optional CSS hook; emitted as `data-preset="<value>"` on the rendered SVG root for CSS targeting |

### `button_style`

Display name: Button style / Button styles.

The theme currently accesses only `system.handle` on this type. No custom fields are required by the code as of today. Recommended for editor UX:

| Field handle | Display name | Type | Required | Notes |
|---|---|---|---|---|
| `name` | Name | `single_line_text_field` | yes | Editor-visible label |

Expand this type's fields when the future button block consumes more (e.g., `border_radius`, `border_width`, color references, etc.).

## Related

- `design-system-metaobjects.md` — consumption reference (which Liquid utilities access which fields, schema usage patterns)
- `schema-conventions.md` — when to prefer a metaobject picker over a hardcoded select
- `.context/rules/section-convention.md` — section-level schema requirements
