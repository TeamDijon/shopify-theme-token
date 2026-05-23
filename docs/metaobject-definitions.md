# Metaobject definitions

The metaobject **type definitions** the theme expects to exist in the Shopify admin. Designed as input for an agent (or human) creating definitions on a fresh store before the theme is installed.

**No entries are strictly required.** The theme renders gracefully without any entries — typography falls back to system fonts, no custom colors emit, etc. What matters at minimum is the *definitions* exist so:

- Schema-level metaobject pickers (`"type": "metaobject", "metaobject_type": "<type>"`) show without errors in the theme editor
- Liquid utilities iterating `metaobjects.<type>.values` return an empty list rather than failing

**For a usable design system, a recommended seed set exists per type** (see "Recommended entries" subsections below). An agent doing a full setup should provision both the definitions and the recommended entries. Merchant-specific types (`typeface`, `font`, `icon`) are populated based on the assets the store ships with — see each type's notes.

For the consumption-side reference (which Liquid utilities access which fields, schema usage patterns), see `design-system-metaobjects.md`. This doc and that one are kept separate on purpose: definitions for setup, consumption for development.

## Type-level metadata convention

Every type below uses these defaults at the type level. Per-type sections only call out deviations.

- **`displayNameKey`:** `name` — Shopify uses the `name` field as the entry's display label and as the source for `system.handle`.
- **Access controls:**
  - `admin`: `PUBLIC_READ_WRITE`
  - `storefront`: `PUBLIC_READ`
- **Capabilities:**
  - `publishable`: enabled
  - `translatable`: enabled
  - `renderable`: disabled
  - `onlineStore`: disabled

## `name` field convention

Every type has a `name` field with this base configuration:

- **Type:** Single line text
- **Cardinality:** One
- **Required:** no
- **Validation:** *(none)*

It serves as the type's display-name source (`displayNameKey: name`). Shopify auto-generates `system.handle` from this value when set; if blank, Shopify generates a handle from another source. The `name` field is never read by Liquid — only `system.handle` is consumed.

The field's **description** varies per type and is documented in each type section.

## Creation order

References between types impose this order:

1. **`font`** — no dependencies
2. **`typeface`** — references `font` via the `font_list` field
3. **`text_style`** — references `typeface` via the `font_family` field
4. **`theme_color`, `content_width`, `icon`, `button_style`, `container_style`, `media_size`, `spacing`** — independent; create in any order

## Setup via GraphQL

Setup is intended to be agent-driven. The Shopify Admin GraphQL API exposes the full lifecycle (create / update / delete) for both definitions and entries.

### Authentication

```
POST https://<store-handle>.myshopify.com/admin/api/2026-04/graphql.json
Content-Type: application/json
X-Shopify-Access-Token: shpca_<token>
```

Token must come from a custom app installed on the store (or a theme-development collaborator) with these scopes:

- `write_metaobject_definitions` — manage type definitions
- `write_metaobjects` — manage entries
- `read_metaobjects` — query existing state (implied by write)

### Key operations

| Operation | Purpose | Docs |
|---|---|---|
| `metaobjectDefinitionByType(type:)` | Query a type by its `type` key | [docs](https://shopify.dev/docs/api/admin-graphql/latest/queries/metaobjectDefinitionByType) |
| `metaobjectDefinitions(first:)` | List all definitions (paginated) | [docs](https://shopify.dev/docs/api/admin-graphql/latest/queries/metaobjectDefinitions) |
| `metaobjectDefinitionCreate(definition:)` | Create a new type | [docs](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectDefinitionCreate) |
| `metaobjectDefinitionUpdate(id:, definition:)` | Add/update/delete fields on existing type, refine descriptions/validations | [docs](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectDefinitionUpdate) |
| `metaobjects(type:, first:)` | Query entries of a type | [docs](https://shopify.dev/docs/api/admin-graphql/latest/queries/metaobjects) |
| `metaobjectCreate(metaobject:)` | Create an entry | [docs](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectCreate) |
| `metaobjectDelete(id:)` | Delete an entry by GID | [docs](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectDelete) |

### Setup-time quirks

- **Idempotency:** `metaobjectDefinitionCreate` returns code `TAKEN` if the type exists. Query first via `metaobjectDefinitionByType`, branch to update vs. create.
- **Access enum asymmetry:** create input expects `access.admin` from `[MERCHANT_READ, MERCHANT_READ_WRITE]`, but the read query returns `PUBLIC_READ_WRITE`. Pass `MERCHANT_READ_WRITE` on create.
- **Capability defaults on create:** newly created definitions default to `publishable: false`, `translatable: false`, `storefront: NONE`. Follow each create with a `metaobjectDefinitionUpdate` that sets `access.storefront: PUBLIC_READ` + enables both capabilities (or omit access/capabilities from the create input — defaults will fire — and patch in a follow-up update).
- **Entries default to `DRAFT`:** on publishable types, `metaobjectCreate` creates entries with `capabilities.publishable.status: DRAFT`, which the storefront can't read. Pass `capabilities: { publishable: { status: ACTIVE } }` on create, or follow up with `metaobjectUpdate` to flip them. Initial setup should activate every seeded entry — the theme assumes ACTIVE.
- **Field operations are keyed by `key`**, not GID. `metaobjectDefinitionUpdate` accepts `fieldDefinitions` ops `create` / `update` / `delete`.
- **Bulk creates via aliases:** GraphQL aliases (`e1: metaobjectCreate(...)`, `e2: metaobjectCreate(...)`) batch many entries in one request. Each costs ~10 query points; with 2000-point budgets this comfortably handles 100+ entries per request.
- **References by GID:** `metaobject_reference` and `list.metaobject_reference` field values are GIDs (`gid://shopify/Metaobject/<numeric>`). Resolve dependencies first (e.g., create `font` entries before referencing them in `typeface.font_list`).

### Example: create a definition + seed an entry

```graphql
mutation Create {
  defn: metaobjectDefinitionCreate(definition: {
    type: "spacing"
    name: "Spacing"
    description: "A reusable spacing token for vertical rhythm. Each token carries a mobile and desktop px value."
    displayNameKey: "name"
    fieldDefinitions: [
      { key: "name", name: "Name", type: "single_line_text_field", required: false },
      { key: "mobile_value", name: "Mobile value", type: "number_decimal", required: true },
      { key: "desktop_value", name: "Desktop value", type: "number_decimal", required: true }
    ]
  }) {
    metaobjectDefinition { id type }
    userErrors { field message code }
  }
}

mutation Seed {
  e1: metaobjectCreate(metaobject: {
    type: "spacing"
    handle: "default"
    fields: [
      { key: "name", value: "Default" }
      { key: "mobile_value", value: "16" }
      { key: "desktop_value", value: "24" }
    ]
  }) {
    metaobject { id handle }
    userErrors { field message code }
  }
}
```

### Recommended setup flow for an agent

1. Query each type via `metaobjectDefinitionByType`. Branch:
   - **Missing** → `metaobjectDefinitionCreate` per the spec in this doc
   - **Present** → diff fields/descriptions; `metaobjectDefinitionUpdate` to align
2. After all definitions are present, follow up with a single update batch to enforce convention defaults (`access.storefront: PUBLIC_READ`, capabilities enabled) — these can drift on create.
3. Seed recommended entries per type (see "Recommended entries" tables below). Each `metaobjectCreate` is independent; aliases batch them.
4. Wire dependent theme settings:
   - `settings_data.json` → `current.base_text_style` = GID of the `body` text_style entry
5. Optionally verify by re-querying via `metaobjectDefinitions` + `metaobjects` and asserting against the doc.

## Per-store coupling

`settings_data.json` and any block/section settings of `"type": "metaobject"` reference entries by Shopify GID (`gid://shopify/Metaobject/<numeric-id>`). GIDs are **store-specific** — the same `theme_color` handle (`accent`) gets a different numeric id on every store.

Practical consequence: pushing this theme to a new store (staging, prod, a fresh dev shop) without a rebind step leaves every metaobject-typed setting pointing at GIDs from the source store. The settings resolve to nothing and silently fall back to defaults (system font, no custom colors, etc.). Theme-check doesn't catch it; the editor shows blank pickers.

**Recovery procedure (post-seeding on a new store):**

1. Seed the metaobject definitions and entries per this doc.
2. Re-bind theme-settings via Shopify admin → **Theme settings**: open every section with metaobject pickers and re-select each entry. Or update `settings_data.json` directly — set `current.base_text_style` to the new store's `body` entry GID and remove any other stale GID references.
3. Re-bind per-section block settings: any block with metaobject-typed settings (e.g. `media`'s `media_size`, `title`'s `text_style`, `separator`'s `line_color`) needs the entry re-picked in the editor on each page that uses it.

When promoting becomes routine, a script in `bin/` that maps GIDs by handle (query both stores → diff → rewrite `settings_data.json`) is the standard upgrade path. For a single-store setup, the manual rebind is fine.

## Type definitions

### `theme_color`

**Type:**

| Setting | Value |
|---|---|
| Type key | `theme_color` |
| Display name | Theme color |
| Description | Color reference to be used on the theme data/settings |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Name used to reference the theme color"*.

#### `hex_code` — Hexadecimal code (required)

- Type: Color
- Cardinality: One
- Description: The hex code associated with the color
- Validation: *(none)*

**Runtime notes:**

- `hex_code.value` is read by `utility--css-variables` and emitted as `--color-<system.handle>`.
- Consumers reading a single entry (block/section settings) should reference the global CSS variable `var(--color-<system.handle>)` rather than re-extracting `hex_code.value`. The hex is only re-extracted in non-CSS contexts (e.g. the `<meta name="theme-color">` tag).

**Recommended entries** (palette is intentionally tame — extend per-store as needed):

| Handle | Name | hex_code |
|---|---|---|
| `white` | White | `#ffffff` |
| `off-white` | Off white | `#faf8f5` |
| `black` | Black | `#1a1a1a` |
| `muted` | Muted | `#6b6b6b` |
| `accent` | Accent | `#c2410c` |

### `typeface`

**Type:**

| Setting | Value |
|---|---|
| Type key | `typeface` |
| Display name | Typeface |
| Description | Collection of fonts used in the theme |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display name of the typeface (e.g., Helvetica, Inter). Used as the `font-family` value in CSS."*

#### `font_list` — Fonts

- Type: List of metaobject references (→ `font`)
- Cardinality: List
- Required: no
- Description: *"Fonts (weight/style variants) that make up this typeface. Each font emits one `@font-face` declaration."*
- Validation: `metaobject_definition_id` pinned to the `font` type

**Runtime notes:**

- `name.value` is read by `utility--font-face` and emitted as the quoted `font-family` value in `@font-face` rules. Also accessed indirectly via `text_style.font_family.value.name.value` in `utility--css-variables` to compose the `--<style>-font-family` CSS variable.
- `font_list.value` is iterated by `utility--font-face` to emit one `@font-face` per referenced font. Typefaces with a blank `name` or empty `font_list` are skipped.

**Recommended entries:** store-specific. Seeds depend on the typefaces and font files the theme ships with. No canonical set.

### `font`

**Type:**

| Setting | Value |
|---|---|
| Type key | `font` |
| Display name | Font |
| Description | A single font variant (one weight/style combination, or a variable-font weight range) used by a typeface |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this font in the admin (e.g., 'Helvetica Bold'). Not read by the theme code."*

#### `asset_list` — Assets (required)

- Type: List of file references
- Cardinality: List
- Description: *"Font files. Prefer `.woff2` and `.woff` for performance; `.otf` and `.ttf` also supported."*
- Validation: *(none)* — Shopify file-reference validation only supports `image`/`video`/`all` categories, so font extensions can't be enforced at the definition level. The Liquid emitter handles all four extensions (woff2/woff/otf/ttf) via `format(...)` mapping; other types yield a bogus format string that browsers silently drop.

#### `style` — Style

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"CSS font-style. Defaults to `normal` when blank."*
- Validation: `choices: ["normal", "italic", "oblique"]`

#### `weight` — Weight

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Static weight (100-900). Leave blank for variable fonts (uses the range fields below)."*
- Validation: `regex: ^[1-9]00$` (canonical 100-step weights only)

#### `weight_range_start` — Weight range start

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Variable font weight range start (100-900). Only used when `Weight` is blank."*
- Validation: `regex: ^[1-9]00$`

#### `weight_range_end` — Weight range end

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Variable font weight range end (100-900). Only used when `Weight` is blank."*
- Validation: `regex: ^[1-9]00$`

**Runtime notes:**

- Weight is stored as text+regex (not `number_integer`) to enforce 100-step canonical values; `utility--font-face` coerces with `| plus: 0` for the comparison.
- **Variable-font mode trigger:** `weight` blank → `"" | plus: 0` → `0` → the `< 100` branch fires and the range fields are read. The blank-weight path is the only way to enter variable mode — the regex blocks any explicit `< 100` value.
- A font is skipped (no `@font-face` emitted) if its `asset_list` is empty, or if it's in variable mode with missing/invalid range bounds.
- `name` is never read; only the other fields are consumed.

**Recommended entries:** store-specific. One entry per font file (or variable-font range) the theme ships. No canonical set.

### `text_style`

**Type:**

| Setting | Value |
|---|---|
| Type key | `text_style` |
| Display name | Text style |
| Description | A reusable typography style applied to elements via `data-text-style` or modifiers |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this text style (e.g., 'Heading 1', 'Body', 'Caption')."*

#### `font_family` — Font family

- Type: Metaobject reference (→ `typeface`)
- Cardinality: One
- Required: no
- Description: *"Typeface to use. Falls back to the first text style's font when blank."*
- Validation: `metaobject_definition_id` pinned to the `typeface` type

#### `font_fallback_family` — Fallback family

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Generic CSS fallback used while the typeface loads. Defaults to `sans-serif` when blank."*
- Validation: `choices: ["sans-serif", "serif", "mono"]`

#### `font_style` — Style

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"CSS font-style. Defaults to `normal` when blank."*
- Validation: `choices: ["normal", "italic", "oblique"]`

#### `weight` — Weight

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Static font weight (100-900). Defaults to 400 when blank."*
- Validation: `regex: ^[1-9]00$`

#### `mobile_font_size` — Mobile font size

- Type: Number (decimal)
- Cardinality: One
- Required: no
- Description: *"Font size in px on mobile. Defaults to 16px when both mobile and desktop are blank."*
- Validation: *(none)*

#### `desktop_font_size` — Desktop font size

- Type: Number (decimal)
- Cardinality: One
- Required: no
- Description: *"Font size in px on desktop (≥768px). If blank, inherits the mobile size."*
- Validation: *(none)*

#### `line_height` — Line height

- Type: Number (decimal)
- Cardinality: One
- Required: no
- Description: *"Line height as a multiplier (e.g., 1.5). Defaults to 1.5 when blank."*
- Validation: *(none)*

#### `letter_spacing` — Letter spacing

- Type: Number (decimal)
- Cardinality: One
- Required: no
- Description: *"Letter spacing in px. Defaults to 0 when blank."*
- Validation: *(none)*

#### `uppercase` — Uppercase

- Type: Boolean
- Cardinality: One
- Required: no
- Description: *"If enabled, transforms text to uppercase."*
- Validation: *(none)*

#### `underline` — Underline

- Type: Boolean
- Cardinality: One
- Required: no
- Description: *"If enabled, adds underline decoration."*
- Validation: *(none)*

**Runtime notes:**

- The entry's `system.handle` is the prefix for emitted CSS variables: `--<handle>-font-family`, `--<handle>-font-size`, `--<handle>-line-height`, `--<handle>-font-weight`, `--<handle>-letter-spacing`, `--<handle>-text-transform`, `--<handle>-text-decoration`, `--<handle>-font-style`.
- The same handle is also the value for the `[data-text-style="<handle>"]` and `[data-modifiers*="text-style:<handle>"]` selectors that apply the style.
- **`h1`-`h6` auto-bind:** entries with handles `h1`, `h2`, `h3`, `h4`, `h5`, or `h6` get auto-applied to the matching bare HTML element (`h1 { ... }`). Naming heading entries with these handles wires them up to the document automatically — no `data-text-style` attribute needed.
- **`--base-*` aliases:** when an entry matches the `base_text_style` setting, all its properties are re-exported as `--base-font-family`, `--base-font-size`, etc. Any element can `var(--base-font-family)` to inherit "the theme's default body typography" without referencing a specific handle.
- Px-to-rem conversion (mobile/desktop font size, letter spacing) happens in Liquid via `÷ 16.0`. Merchants enter px; the CSS receives rem.
- `weight` is stored as text+regex (matching `font.weight`) to enforce canonical 100-step values; Liquid coerces with `| default: '400'`.

**Recommended entries** (h1–h6 use auto-bind handles; `body` is the canonical handle for the `base_text_style` setting):

| Handle | Name | mobile_font_size | desktop_font_size | line_height | weight |
|---|---|---|---|---|---|
| `h1` | H1 | 32 | 48 | 1.2 | 700 |
| `h2` | H2 | 28 | 40 | 1.25 | 700 |
| `h3` | H3 | 24 | 32 | 1.3 | 600 |
| `h4` | H4 | 20 | 24 | 1.4 | 600 |
| `h5` | H5 | 18 | 20 | 1.4 | 600 |
| `h6` | H6 | 16 | 18 | 1.5 | 600 |
| `body` | Body | 16 | 16 | 1.5 | 400 |

All entries point `font_family` at the same typeface (e.g., the merchant's primary sans-serif) and use `font_fallback_family: sans-serif`. Tune per-store post-seed.

After seeding, set `settings_data.json` → `current.base_text_style` to the `body` entry's GID so `--base-*` aliases populate.

### `content_width`

**Type:**

| Setting | Value |
|---|---|
| Type key | `content_width` |
| Display name | Content width |
| Description | A reusable max-width constraint applied to a section's content area |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this content width (e.g., 'Narrow', 'Wide', 'Full bleed')."*

#### `width` — Width (required)

- Type: Number (decimal)
- Cardinality: One
- Description: *"Maximum content width in px. Used as the section's `max-inline-size`."*
- Validation: *(none)*

**Runtime notes:**

- Read by `sections/section.liquid` via the section's `content_width` setting; emitted as `--content-width: <value>px` into the section's dynamic style.
- When no entry is selected, [core.css](assets/core.css) falls back to `var(--content-width, 125rem)` — the **2000px theme default**, which acts as a big-screen protection. Most screens (≤1920px) render full-width within this cap. The outer `3200px` background-stop guard lives elsewhere in `core.css`.

**Recommended entries** (no `default` entry — blank section setting falls through to the 2000px CSS fallback):

| Handle | Name | width |
|---|---|---|
| `narrow` | Narrow | 600 |
| `reading` | Reading | 680 |
| `medium` | Medium | 1000 |
| `wide` | Wide | 1400 |

### `icon`

**Type:**

| Setting | Value |
|---|---|
| Type key | `icon` |
| Display name | Icon |
| Description | An SVG icon reference. Resolves to `assets/icon-<file_name>.svg` |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this icon (e.g., 'Chevron', 'Cart', 'Search')."*

#### `file_name` — File name (required)

- Type: Single line text
- Cardinality: One
- Description: *"SVG file slug (e.g., `chevron` for `assets/icon-chevron.svg`)."*
- Validation: `regex: ^[a-z0-9-]+$` (lowercase slug, no extension or prefix)

#### `preset` — Preset

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Optional CSS hook. Emitted as `data-preset` on the SVG root for CSS targeting."*
- Validation: *(none)*

**Runtime notes:**

- Read by `snippets/icon.liquid` via the dual-API pattern: caller passes either an `icon` metaobject reference (from a schema setting or `metaobjects.icon.<handle>`) or the primitive `file_name` string directly.
- The snippet resolves to `assets/icon-<file_name>.svg` and inlines it via `utility--inline-asset` (yields empty markup if the SVG is missing — no broken render).
- `preset.value` (or the `preset` arg) is emitted as `data-preset="<value>"` on the SVG root, providing a CSS hook (e.g., `[data-preset="inline-badge"] { ... }`).
- The `file_name` regex prevents typos like `Chevron`, `arrow.svg`, or `my icon` from saving — only lowercase slugs are accepted.

**Recommended entries:** one entry per `assets/icon-*.svg` file in the theme. Handle = file_name = the slug between `icon-` and `.svg` (e.g., `arrow` for `assets/icon-arrow.svg`). Display name = title-cased version (e.g., `Arrow`). An agent should enumerate the assets directory at setup time rather than rely on a static list — the icon set evolves with the theme.

### `button_style`

**Type:**

| Setting | Value |
|---|---|
| Type key | `button_style` |
| Display name | Button style |
| Description | A named button variant. The handle is consumed via `[data-modifiers*='button-style:<handle>']` selectors in the button block |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this button style (e.g., 'Solid primary', 'Outline secondary'). The auto-generated handle is what the CSS targets."*

**Runtime notes:**

- Consumed by `snippets/button.liquid`. Each entry's `system.handle` is appended to `data-modifiers` as `button-style:<handle>`, which the snippet's `{% stylesheet %}` block targets via `[data-modifiers*='button-style:<handle>']`. See [`modifier-system.md`](modifier-system.md) for why static visual variants belong in `data-modifiers` rather than CSS classes.
- Handle set is a **3×3 family/variant matrix**: family `solid-` / `outline-` / `link-` × variant `-primary` (accent) / `-secondary` (black) / `-tertiary` (white). The button snippet's CSS uses CSS custom properties to compose these — families set bg/border/decoration/padding, variants set the color token. Off-list handles fall through to the default `solid-primary` appearance. New variants are added by extending `snippets/button.liquid`'s stylesheet, not the metaobject schema.
- **No additional fields needed** — the named-variant pattern is sufficient. The CSS for each variant lives in the button snippet's `{% stylesheet %}` block, not in field values.

**Recommended entries** (the full 3×3 matrix the snippet's stylesheet covers):

| Handle | Name |
|---|---|
| `solid-primary` | Solid primary |
| `solid-secondary` | Solid secondary |
| `solid-tertiary` | Solid tertiary |
| `outline-primary` | Outline primary |
| `outline-secondary` | Outline secondary |
| `outline-tertiary` | Outline tertiary |
| `link-primary` | Link primary |
| `link-secondary` | Link secondary |
| `link-tertiary` | Link tertiary |

### `container_style`

**Type:**

| Setting | Value |
|---|---|
| Type key | `container_style` |
| Display name | Container style |
| Description | A named container variant. The handle is consumed via `[data-modifiers*='container-style:<handle>']` selectors in the container/group block |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this container style (e.g., 'Card', 'Outlined', 'Elevated'). The auto-generated handle is what the CSS targets."*

**Runtime notes:**

- Currently has no consumers in this theme — the container/group block is not yet implemented.
- Same named-selector pattern as [`button_style`](#button_style): the entry's `system.handle` is appended to a `data-modifiers` attribute as `container-style:<handle>`, which CSS rules in the container snippet target via `[data-modifiers*='container-style:<handle>']`.
- Conventional handle suggestions: `card`, `outlined`, `elevated`, `flat`. Final set will be settled when the container block is built.
- **No additional fields needed** — the named-variant pattern bundles its visual configuration (border, radius, shadow, padding) into the CSS rule, not into field values.

**Recommended entries:** none yet — defer until the container/group block defines the canonical variant set.

### `media_size`

**Type:**

| Setting | Value |
|---|---|
| Type key | `media_size` |
| Display name | Media size |
| Description | A sizing constraint applied to a media block. Determines container aspect ratio, height, or fill behavior |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this media size (e.g., '16:9', 'Tall', 'Full screen', 'Fill')."*

#### `type` — Type

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"Sizing mode. Leave blank for the special `fill` entry (handle-routed)."*
- Validation: `choices: ["ratio", "relative", "fixed"]`

#### `value` — Value

- Type: Single line text
- Cardinality: One
- Required: no
- Description: *"CSS value for the chosen mode: ratio like `16/9`, viewport unit like `100svh`, or fixed like `400px`. Leave blank for `fill`."*
- Validation: *(none)*

**Runtime notes:**

- Adopted from the [Liquified.dev `media-block-spec.md`](C:/Users/troph/Desktop/MX/Code/Liquified.dev/docs/media-block-spec.md). Three sizing modes via the `type` field, plus one special handle-routed mode (`fill`), plus a "blank entry" mode for natural ratio.
- **Mode → CSS mapping** (the media block consumes this):

  | Selection | type | value | Emitted CSS |
  |---|---|---|---|
  | Block setting unset | — | — | none — image renders at natural ratio |
  | Aspect ratio | `ratio` | e.g., `16/9` | `aspect-ratio: 16/9` |
  | Relative height | `relative` | e.g., `100svh` | `block-size: 100svh` |
  | Fixed height | `fixed` | e.g., `400px` | `block-size: 400px` |
  | Fill parent | handle: `fill` | — | — | `block-size: 100%` |

- **`object-fit: cover` is hardcoded** in the media block CSS. Per-context overrides (e.g., a product gallery needing `contain`) live in the consuming block's stylesheet, not in this metaobject.

**Recommended entries** (adopted from the Liquified.dev spec):

| Handle | Name | type | value |
|---|---|---|---|
| `1-1` | 1:1 (Square) | `ratio` | `1/1` |
| `4-3` | 4:3 | `ratio` | `4/3` |
| `3-2` | 3:2 | `ratio` | `3/2` |
| `16-9` | 16:9 (Widescreen) | `ratio` | `16/9` |
| `9-16` | 9:16 (Vertical) | `ratio` | `9/16` |
| `4-5` | 4:5 (Portrait) | `ratio` | `4/5` |
| `half-screen` | Half screen | `relative` | `50svh` |
| `full-screen` | Full screen | `relative` | `100svh` |
| `fill` | Fill | *(blank)* | *(blank)* |

### `spacing`

**Type:**

| Setting | Value |
|---|---|
| Type key | `spacing` |
| Display name | Spacing |
| Description | A reusable spacing token for vertical rhythm. Each token carries a mobile and desktop px value |

Type-level metadata: follows [convention](#type-level-metadata-convention), no deviations.

**Fields:**

#### `name` — Name

Standard name field — see [convention](#name-field-convention). Description: *"Display label for this spacing (e.g., 'None', 'Tight', 'Default', 'Spacious', 'Loose')."*

#### `mobile_value` — Mobile value (required)

- Type: Number (decimal)
- Cardinality: One
- Description: *"Spacing value on mobile, in px."*
- Validation: *(none)*

#### `desktop_value` — Desktop value (required)

- Type: Number (decimal)
- Cardinality: One
- Description: *"Spacing value on desktop (≥768px), in px."*
- Validation: *(none)*

**Runtime notes:**

- Two-value-per-token design (vs. Horizon's single-value-with-global-scale): allows exotic entries like `0px` mobile / `48px` desktop without re-architecting the scale system.
- Consumed by section schemas as a `block_rhythm` setting (vertical space between child blocks) and optionally by individual blocks for top/bottom override (rare — most blocks inherit the section rhythm).
- Section CSS pattern:
  ```css
  .shopify-section {
    --block-rhythm: var(--block-rhythm-mobile, 1.5rem);
    @media (width >= 48rem) { --block-rhythm: var(--block-rhythm-desktop, 1.5rem); }

    & :where(.shopify-block) + .shopify-block { margin-block-start: var(--block-rhythm); }
  }
  ```
  The `:where()` keeps specificity at zero so per-block overrides work; the sibling combinator gets margin-collapse semantics for free.
- **Padding stays inline** as range fields on blocks where it matters (sections with backgrounds, blocks with internal padding). Padding is structural, not rhythmic, so it doesn't share the token model.

**Recommended entries:**

| Handle | Name | mobile_value | desktop_value |
|---|---|---|---|
| `none` | None | 0 | 0 |
| `tight` | Tight | 8 | 12 |
| `default` | Default | 16 | 24 |
| `spacious` | Spacious | 32 | 48 |
| `loose` | Loose | 64 | 96 |

## Related

- `design-system-metaobjects.md` — consumption reference (which Liquid utilities access which fields, schema usage patterns)
- `schema-conventions.md` — when to prefer a metaobject picker over a hardcoded select
- `.context/rules/section-convention.md` — section-level schema requirements
