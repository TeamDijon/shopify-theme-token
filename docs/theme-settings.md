# Theme settings

The contract for `config/settings_schema.json` — the theme-editor "Theme settings" panel. Each entry exposes one merchant input that downstream Liquid / CSS / JS consumes via `settings.<id>`. This doc names every setting, its consumers, and the convention rules; spec-level detail (color schemes' role mapping, text-style metaobject contract, etc.) lives in the consumer specs.

## File layout

`config/settings_schema.json` is a JSON array. The first entry is the `theme_info` metadata; subsequent entries are "setting groups" — each rendered as a panel in the editor's Theme settings sidebar. Inside a group, the `settings` array lists the individual inputs.

```json
[
  { "name": "theme_info", "theme_name": "Token", "theme_version": "0.1.0", "theme_author": "Virgil Dubois", … },
  { "name": "t:spacing.name", "settings": [ … ] },
  { "name": "t:colors.name", "settings": [ … ] },
  { "name": "t:typography.name", "settings": [ … ] },
  { "name": "t:favicon.name", "settings": [ … ] }
]
```

Four merchant-facing groups: **Spacing**, **Colors**, **Typography**, **Favicon**. Order is the order the editor sidebar renders.

## `theme_info` metadata

Single object at the head of the array; not exposed as `settings.*`. Shopify reads it for the Theme Library entry, store-side version display, and the Support / Documentation links rendered in the editor's theme card.

| Field | Value |
|---|---|
| `theme_name` | `"Token"` |
| `theme_version` | `"0.1.0"` |
| `theme_author` | `"Virgil Dubois"` |
| `theme_documentation_url` | `"https://shopify.dev/docs/storefronts/themes"` |
| `theme_support_url` | `"https://github.com/TeamDijon"` |

Bump `theme_version` when cutting a public release; the merchant-facing version chip in the admin renders from this field.

## Settings catalog

### Spacing group (`t:spacing.name`)

| ID | Type | Default | Consumed by |
|---|---|---|---|
| `mobile_gutter` | range (0–100, step 2, unit px) | 16 | `snippets/utility--css-variables.liquid` — emitted as `--gutter` (mobile branch) |
| `desktop_gutter` | range (0–100, step 2, unit px) | 24 | `snippets/utility--css-variables.liquid` — emitted as `--gutter` (desktop branch, inside `@media`) |

Subsection header before the two ranges: `t:spacing.gutter.content`. The two range inputs feed the bleed-grid's gutter named columns (see `.context/docs/container-patterns.md` § Bleed grid). Px input, rem emission — per `.context/docs/px-rem-emission.md`.

### Colors group (`t:colors.name`)

| ID | Type | Default / Notes | Consumed by |
|---|---|---|---|
| `color_schemes` | color_scheme_group | 14 colors per scheme definition (see Color scheme definition below) | `snippets/utility--css-variables.liquid` — `{% for scheme in settings.color_schemes %}` emits one rule block per scheme: `[data-modifiers*='color-scheme:<id>'] { … }`. Cross-references the `--color-role-*` namespace contract in `color-scheme.spec.md`. |
| `meta_theme_color` | metaobject reference (`theme_color`) | optional | `snippets/utility--meta-theme-color.liquid` — emits `<meta name="theme-color">` from the picked palette entry, supporting the mobile browser UI's chrome color |

#### Color scheme definition

The `color_scheme_group` exposes 14 per-scheme color fields, grouped by subsection headers. Each scheme entry in the editor renders the same 14 inputs:

**Base palette** (no subsection header — top of each scheme):

| Field ID | Type | Default | Alpha |
|---|---|---|---|
| `background` | color | `#FFFFFF` | yes |
| `background_gradient` | color_background | — | — |
| `foreground` | color | `#1A1A1A` | yes |
| `foreground_heading` | color | `#000000` | yes |
| `primary` | color | `#000F9F` | yes |
| `border` | color | `#E6E6E6` | yes |
| `shadow` | color | `#000000` | yes |

**Primary button** (subsection header `t:colors.scheme.primary_button_header`):

| Field ID | Default |
|---|---|
| `primary_button_background` | `#000F9F` |
| `primary_button_text` | `#FFFFFF` |
| `primary_button_border` | `#000F9F` |

**Secondary button** (subsection header `t:colors.scheme.secondary_button_header`):

| Field ID | Default |
|---|---|
| `secondary_button_background` | `#FFFFFF` |
| `secondary_button_text` | `#000000` |
| `secondary_button_border` | `#000000` |

**Inputs** (subsection header `t:colors.scheme.inputs_header`):

| Field ID | Default |
|---|---|
| `input_background` | `#FFFFFF` |
| `input_text` | `#1A1A1A` |
| `input_border` | `#E6E6E6` |

#### Scheme role mapping

The `color_scheme_group` carries a `role` object naming which fields fulfill Shopify's standard role slots. Shopify reads these roles for its `color-scheme` admin features (rich text editor preview, settings cascade); they're a Shopify-side contract distinct from the theme's `--color-role-*` CSS namespace.

```json
"role": {
  "text": "foreground",
  "background": { "solid": "background", "gradient": "background_gradient" },
  "links": "primary",
  "icons": "foreground",
  "primary_button": "primary_button_background",
  "on_primary_button": "primary_button_text",
  "primary_button_border": "primary_button_border",
  "secondary_button": "secondary_button_background",
  "on_secondary_button": "secondary_button_text",
  "secondary_button_border": "secondary_button_border"
}
```

#### Theme color metaobject (separate from schemes)

After the `color_schemes` setting, a header (`t:colors.meta_theme_color.header`) introduces the `meta_theme_color` setting — a metaobject reference of type `theme_color`. The merchant picks one palette entry to drive the `<meta name="theme-color">` tag; consumers other than `utility--meta-theme-color` don't read this setting.

### Typography group (`t:typography.name`)

| ID | Type | Default / Notes | Consumed by |
|---|---|---|---|
| `base_text_style` | metaobject reference (`text_style`) | — | `utility--css-variables.liquid` — emits the `--base-*` text-style aliases consumed by the body rule. `utility--font-preload.liquid` reads `settings.base_text_style.font_family.value` to determine which font face to preload. See `text-style.spec.md`. |
| `mono_font` | font_picker | default `mono`, `visible_if: {{ false }}` | `utility--css-variables.liquid` — fallback `font_family` value when a `typeface` metaobject entry has its `font_family` field blank. Hidden from the editor; remains accessible to Liquid via `settings.mono_font.family`. |
| `sans_serif_font` | font_picker | default `sans-serif`, `visible_if: {{ false }}` | Same — fallback for sans-serif typeface entries |
| `serif_font` | font_picker | default `serif`, `visible_if: {{ false }}` | Same — fallback for serif typeface entries |

#### `font_picker` workaround

Three font fallbacks (`mono`, `sans_serif`, `serif`) are exposed via `font_picker` settings hidden behind `visible_if: {{ false }}`. The schema entry exists purely so Liquid can read `settings.<id>` as a font object with `.family`, `.fallback_families`, etc. — Shopify's `font_picker` resolves a font handle into a runtime font object, which the theme's `typeface` metaobject entries fall back to when their own `font_family` field is blank. Hidden from the editor — merchants pick fonts through the `typeface` metaobject catalog instead.

Each carries `info: "t:typography.fonts.workaround_info"` documenting the workaround in the schema-locale file. The `default` field is the font handle Shopify's font library indexes; values must match Shopify's known generic-family handles (`mono`, `sans-serif`, `serif`).

### Favicon group (`t:favicon.name`)

| ID | Type | Default | Consumed by |
|---|---|---|---|
| `favicon` | image_picker | — | `layout/theme.liquid` + `layout/landing.liquid` — emit `<link rel="shortcut icon">` at 32×32 PNG when set. `utility--structured-data.liquid` — falls back to the favicon at 512px as the `logo` for the organization-shape structured-data graph when no merchant-chosen logo override exists. |

## Translation keys

Every `label`, `info`, and group `name` uses a `t:` key, resolved against `config/settings_schema.json`'s sibling `<lang>.schema.json` locale files. Schema locale files structure their tree to mirror the path of the keys — e.g. `t:typography.fonts.mono_label` lives at `typography.fonts.mono_label` inside `en.default.schema.json`.

Per `.context/docs/locale-conventions.md` § Schema files, the editor may overwrite these files when merchants change strings through admin UI — agents edit sparingly.

The header content fields (`t:colors.scheme.primary_button_header`, `t:colors.scheme.inputs_header`, etc.) reference subsection-header strings inside the schema locale's `colors.scheme.*` namespace.

## Naming conventions

- **Setting IDs** are snake_case (`mobile_gutter`, `meta_theme_color`, `base_text_style`).
- **Per-domain prefix** when an ID would otherwise collide across domains (`primary_button_background` vs `secondary_button_background`).
- **Range steps** are `2` for px ranges feeding visual spacing — gives merchants 0–100 in 50 ticks, finer than the Shopify-default `5` but coarser than `1`.
- **Range units** match the input semantic (px for spacing).
- **Subsection headers** group ≥ 3 related fields. Below 3 fields, no header — flat list.

## Consumer cross-reference

Direct consumers of `settings.*` across the theme:

| Consumer | Settings read | Role |
|---|---|---|
| `snippets/utility--css-variables.liquid` | `color_schemes`, `base_text_style`, `mono_font`, `sans_serif_font`, `serif_font`, `mobile_gutter`, `desktop_gutter` | Substrate CSS variable emitter — five domains |
| `snippets/utility--font-preload.liquid` | `base_text_style.font_family.value` | Resolves the base typeface's font + emits `<link rel="preload">` |
| `snippets/utility--meta-theme-color.liquid` | `meta_theme_color` | Emits `<meta name="theme-color">` from the picked palette entry |
| `snippets/utility--structured-data.liquid` | `favicon` (fallback path) | Uses 512px favicon as `logo` when no merchant-chosen logo override exists |
| `layout/theme.liquid` + `layout/landing.liquid` | `favicon` | Emit `<link rel="shortcut icon">` at 32×32 PNG |

Adding a new direct consumer: add the row above when authoring; the table is the manual drift defense against undocumented `settings.*` reads.

## Settings vs metaobjects

Theme settings are merchant-facing flat scalars (color, range, image, font, single metaobject reference). Anything richer — variants, catalogs, multi-field entries — lives in metaobjects per `.context/docs/metaobject-definitions.md`. The boundary:

- **Setting** when one value applies globally — favicon, base text style choice, gutter sizes.
- **Metaobject** when merchants compose a catalog — color schemes are the exception (Shopify gives `color_scheme_group` a native multi-entry surface in settings).

`color_schemes` lives in settings because Shopify exposes a dedicated `color_scheme_group` input type with admin-side color-resolution behavior. Re-modeling schemes as a `color_scheme` metaobject would lose the admin integrations (rich text editor preview, role cascade).

## Related

- `.context/docs/locale-conventions.md` — schema locale file structure (where `t:` keys resolve)
- `.context/docs/metaobject-definitions.md` — the parallel surface for catalog-shaped content; boundary documented above
- `color-scheme.spec.md` — the `--color-role-*` namespace contract; consumes `color_schemes`
- `text-style.spec.md` — the typography metaobject; `base_text_style` setting picks one entry
- `theme-color.spec.md` — the named-color metaobject; `meta_theme_color` setting picks one entry
- `font-system.spec.md` — the font / typeface metaobjects; `mono_font` / `sans_serif_font` / `serif_font` are the hidden fallback resolvers
