# text-style

**Layer**: substrate

**Type**: metaobject (`text_style`)

**Status**: shipped

**Implementation**:
- `snippets/utility--css-variables.liquid` v1.14.1 (CSS variable emitter — text-style block; per-entry `:root` declarations + auto-bind selector rule)
- Metaobject definition itself — created per `metaobject-definitions.md` § `text_style`

**Reconciled**: 2026-06-27 (pin v1.14.0 → v1.14.1 — fixed the `--base-*` alias emission in the text-style block: the `base_text_style` match now compares by `.system.id` instead of object identity, which never held across drop instances. `base_text_style` resolves from `settings.base_text_style`, a metaobject reference setting stored as the entry handle. Per-entry `:root` declarations + auto-bind selector rule otherwise unchanged since v1.11.0)

**Reviewed**: 2026-05-31

**Depends on**:
- `typeface` metaobject (via the `font_family` reference field — entry's name flows into the emitted CSS `font-family` chain)
- Theme settings: `base_text_style` (singular text_style picker; selects which entry emits `--base-*` aliases), `mono_font` / `serif_font` / `sans_serif_font` (fallback family resolution per `font_fallback_family`)

**Consumers**:
- `snippets/utility--css-variables.liquid` — iterates `metaobjects.text_style.values`, emits the per-entry CSS variables + selector rule
- `snippets/title.liquid` + `blocks/title.liquid` — block-level consumer; the `text_style` picker setting selects an entry whose handle is emitted as `text-style:<handle>` in the rendered element's `data-modifiers`
- `snippets/utility--font-preload.liquid` — reads text_style entries to determine which typefaces need preload hints
- Selector consumers (any element): tag binding via `h1`–`h6` handles, modifier binding via `[data-modifiers*='text-style:<handle>']`
- Theme setting consumer: `base_text_style` (in `config/settings_schema.json`) — singular picker that drives the `--base-*` alias emission

## Purpose

A reusable typography style — one entry defines a complete set of CSS typography properties (font-family chain, style, weight, mobile + desktop size, line-height, letter-spacing, transform, decoration), and the entry's handle becomes the consumption surface across two selector forms (tag for `h1`–`h6` handles, `[data-modifiers*='text-style:<handle>']` for the unified modifier surface).

The metaobject is the design system's typography catalog. Per-block "use this style" decisions are picker settings on consuming blocks; per-element "be styled like this" decisions are the handle written into one of the three selectors. One catalog, two surfaces: setting-driven (block authoring) and selector-driven (substrate auto-bind for `h1`–`h6` + utility classes for anything).

Two load-bearing handle conventions:

1. **`h1`–`h6` auto-bind** — entries with these handles get a matching tag selector added to their rule block. `<h1>` reads its typography from the `h1` entry automatically; merchants seeding heading styles use these handles by convention.
2. **`base_text_style` binding** — one entry (referenced by the `base_text_style` theme setting) emits an extra block of `--base-*` aliases (`--base-font-family`, `--base-font-size`, etc.). The substrate body rule in `layer-theme.css` consumes the aliases, so the picked entry becomes the document's default body typography.

Both conventions live in the *handle* and the *setting*, not the metaobject schema. A project's seeding step is where they're operationalized (recommended seeds in `metaobject-definitions.md` § text_style).

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name in admin (e.g., `Heading 1`, `Body`, `Eyebrow`). `system.handle` is derived from it *on entry creation only* — subsequent renames in admin do not update the handle. See Behavior § cross-cutting key. |
| `font_family` | Metaobject reference (→ `typeface`) | no | Resolves to a `typeface` entry whose `name.value` becomes the primary font in the emitted `font-family` chain. Falls back to `settings.base_text_style.font_family.value.name.value` when blank, then to `system-ui` as a terminal anchor. |
| `font_fallback_family` | Single line text | no | One of `sans-serif` / `serif` / `mono`. Selects which theme-settings font (`settings.sans_serif_font` / `serif_font` / `mono_font`) appends as the family + generic-fallback pair after the primary. Defaults to `sans-serif` when blank. |
| `font_style` | Single line text | no | CSS `font-style` value. One of `normal` / `italic` / `oblique`. Defaults to `normal`. |
| `weight` | Single line text | no | Static font weight as a `[1-9]00` string. Regex-validated to canonical 100-step values. Defaults to `400`. |
| `mobile_font_size` | Number (decimal) | no | Font size in **pixels** at viewports `< 48rem`. Converted to rem at the 16px divisor at emission. |
| `desktop_font_size` | Number (decimal) | no | Font size in **pixels** at viewports `>= 48rem`. Converted to rem. |
| `line_height` | Number (decimal) | no | Unitless multiplier. Defaults to `1.5` when blank. |
| `letter_spacing` | Number (decimal) | no | Letter spacing in **pixels**. Converted to rem at emission. Defaults to `0`. |
| `uppercase` | Boolean | no | When true, the emitted `text-transform: uppercase`. When false / blank → `text-transform: none`. |
| `underline` | Boolean | no | When true, the emitted `text-decoration: underline`. When false / blank → `text-decoration: none`. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

The `weight` field is text-typed (rather than integer) so the regex validates the canonical 100-step values; Liquid coerces with `| default: '400'`.


## Output shape

The emitter (`utility--css-variables`) writes one block per entry: a `:root` rule with eight per-handle custom properties plus optional `--base-*` aliases plus an optional desktop `@media` override, followed by a selector rule binding the properties:

```css
:root {
  --<handle>-font-family: <primary>, <fallback-family>, <fallback-families-list>;
  --<handle>-font-style: <style>;
  --<handle>-font-size: <mobile-rem>rem;
  --<handle>-line-height: <decimal>;
  --<handle>-font-weight: <weight>;
  --<handle>-letter-spacing: <rem>;
  --<handle>-text-transform: <transform>;
  --<handle>-text-decoration: <decoration>;

  /* When this entry matches settings.base_text_style: */
  --base-font-family: var(--<handle>-font-family);
  --base-font-style: var(--<handle>-font-style);
  --base-font-size: var(--<handle>-font-size);
  --base-line-height: var(--<handle>-line-height);
  --base-font-weight: var(--<handle>-font-weight);
  --base-letter-spacing: var(--<handle>-letter-spacing);
  --base-text-transform: var(--<handle>-text-transform);
  --base-text-decoration: var(--<handle>-text-decoration);

  /* When mobile_font_size != desktop_font_size: */
  @media (width >= 48rem) {
    --<handle>-font-size: <desktop-rem>rem;
  }
}

h1, /* one of h1..h6, only when handle matches a heading tag */
[data-modifiers*='text-style:<handle>'] {
  font-family: var(--<handle>-font-family);
  font-style: var(--<handle>-font-style);
  font-size: var(--<handle>-font-size);
  line-height: var(--<handle>-line-height);
  font-weight: var(--<handle>-font-weight);
  letter-spacing: var(--<handle>-letter-spacing);
  text-transform: var(--<handle>-text-transform);
  text-decoration: var(--<handle>-text-decoration);
}
```

`utility--css-variables.spec.md` owns the full emission contract (selector union for the default scheme, gradient interpolation, etc.); this spec describes only the text_style block's shape.

## CSS

N/A at the metaobject layer — the rules live in `utility--css-variables`'s emitted output. The metaobject contributes the data; the snippet composes the rules.

## CSS custom properties (exposed)

Per text_style entry (8 properties):

| Variable | Type | Source field |
|---|---|---|
| `--<handle>-font-family` | comma-separated font list | `font_family.value.name.value` + fallback chain |
| `--<handle>-font-style` | `normal` / `italic` / `oblique` | `font_style.value` |
| `--<handle>-font-size` | rem | `mobile_font_size.value ÷ 16` (with `@media` desktop override when mobile != desktop) |
| `--<handle>-line-height` | unitless decimal | `line_height.value` |
| `--<handle>-font-weight` | `100`–`900` | `weight.value` |
| `--<handle>-letter-spacing` | rem | `letter_spacing.value ÷ 16` |
| `--<handle>-text-transform` | `none` / `uppercase` | `uppercase.value` (boolean) |
| `--<handle>-text-decoration` | `none` / `underline` | `underline.value` (boolean) |

Plus `--base-*` aliases (same eight names, prefixed `--base-` instead of `--<handle>-`) when the entry matches `settings.base_text_style`.

## Behavior

- **`h1`–`h6` auto-bind.** Entries with `system.handle` exactly equal to `h1`, `h2`, `h3`, `h4`, `h5`, or `h6` get the matching bare HTML tag selector prepended to their rule block. A merchant naming a heading style `h1` wires it to every `<h1>` in the document without any attribute. Handles outside the heading set (`hero-display`, `eyebrow`, `caption`, etc.) require `[data-modifiers*='text-style:<handle>']` to apply.
- **`base_text_style` binding.** Exactly one entry — the one referenced by the `base_text_style` setting in `settings_data.json` — emits the `--base-*` alias block. Consumers reading `var(--base-font-family)` get the project's default body typography. The substrate body rule (in `layer-theme.css`) is the canonical consumer; the rule reads every `--base-*` variable, so `<body>` and its descendants inherit the picked entry.
- **Three-layer font-family fallback.** The emitted `font-family` value is a comma-separated list of three layers: (1) the entry's `font_family.value.name.value` (or `default_font_family` when blank — see next bullet), (2) the family name from the theme-settings font selected by `font_fallback_family` (e.g., `settings.sans_serif_font.family`), (3) the generic-fallback families listed by that same theme font (e.g., `system-ui, sans-serif`). When the entry has no `font_family` and `base_text_style` also has no `font_family`, the primary layer falls through to the literal `system-ui`.
- **`default_font_family` hoist.** The emitter hoists the base text_style's font_family (with `system-ui` terminal fallback) into a single Liquid assign at the top of the text_style loop, so every entry without its own `font_family` reuses the same default without re-reading the base entry per iteration.
- **`font_fallback_family` map.** The string value selects one of three theme-settings fonts: `mono` → `settings.mono_font`, `serif` → `settings.serif_font`, anything else (including blank) → `settings.sans_serif_font`. The selected font contributes both its `.family` and its `.fallback_families` to the chain.
- **Px-to-rem at the 16px divisor.** `mobile_font_size`, `desktop_font_size`, and `letter_spacing` are stored in pixels (merchant-facing UX) and emitted in rem (CSS reads). The conversion is `value ÷ 16.0 | round: 3` in Liquid. The divisor is fixed; rem stays semantic regardless of the merchant's chosen base font-size.
- **Font-size collapse on equality.** When `mobile_font_size == desktop_font_size`, no `@media (width >= 48rem)` override emits — the single rem value covers both breakpoints. When they differ, the `@media` override fires to swap the value.
- **Font-size zero fallbacks.** When both `mobile_font_size` and `desktop_font_size` are `0` (blank or zero) → both fall through to `1rem`. When only one is `0`, the other backfills (a single-breakpoint declaration becomes both breakpoints). The 16px-equivalent default mirrors the metaobject definition's "defaults to 16px when both are blank" note.
- **`line_height` zero fallback.** Blank `line_height` (resolves to `0`) falls through to `1.5` (the typographic default).
- **`weight` default.** Blank `weight` falls through to `'400'` (regular). The text-typed field's regex (`^[1-9]00$`) prevents arbitrary numeric values; only the canonical 100-step weights validate.
- **Boolean → CSS keyword mapping.** `uppercase.value == true` → `text-transform: uppercase`; otherwise `none`. `underline.value == true` → `text-decoration: underline`; otherwise `none`. False, blank, and missing field all resolve to the `none` branch.
- **`system.handle` is the cross-cutting key.** The same string drives: the CSS variable prefix, the auto-bind tag selector (when in `h1`–`h6`), and the `text-style:<handle>` modifier token. Renaming a handle moves all three. The metaobject's `name` field is decorative; only `system.handle` is load-bearing.
- **Handle is set on creation, not synced.** Shopify derives `system.handle` from `name` at the moment of entry creation, then decouples them. A merchant renaming the display `name` afterward does NOT update the handle — and thus does NOT update the emitted CSS variable name or selector. Changing a handle requires deleting + re-creating the entry (with the desired name → handle derivation), then re-binding any settings that referenced the old handle. Treat handles as load-bearing identifiers fixed at creation; avoid renames that imply handle changes.

## Seed entries

Recommended catalog (full details in `metaobject-definitions.md` § text_style). The `h1`–`h6` + `body` set is required (heading auto-bind + the `base_text_style` setting target); the rest are optional editorial roles that recur across archetypes and earn their place when a project calls for them.

| Handle | Name | mobile/desktop size | line-height | weight | Role |
|---|---|---|---|---|---|
| `h1` | H1 | 32 / 48 | 1.2 | 700 | **Required** — auto-bind to `<h1>` |
| `h2` | H2 | 28 / 40 | 1.25 | 700 | **Required** — auto-bind to `<h2>` |
| `h3` | H3 | 24 / 32 | 1.3 | 600 | **Required** — auto-bind to `<h3>` |
| `h4` | H4 | 20 / 24 | 1.4 | 600 | **Required** — auto-bind to `<h4>` |
| `h5` | H5 | 18 / 20 | 1.4 | 600 | **Required** — auto-bind to `<h5>` |
| `h6` | H6 | 16 / 18 | 1.5 | 600 | **Required** — auto-bind to `<h6>` |
| `body` | Body | 16 / 16 | 1.5 | 400 | **Required** — `base_text_style` setting target; emits `--base-*` aliases |
| `eyebrow` | Eyebrow | 12 / 13 | 1.4 | 600 | *Optional* — small uppercase pre-headings, section labels (consume via `uppercase: true` + `letter_spacing` on the entry) |
| `lead` | Lead | 18 / 20 | 1.5 | 400 | *Optional* — long-form intro paragraph (blog articles, hero copy under titles) |
| `caption` | Caption | 13 / 14 | 1.4 | 400 | *Optional* — image captions, photo credits, footnotes, fine-print disclaimers |

After seeding, set `settings_data.json` → `current.base_text_style` to the `body` entry's GID so `--base-*` aliases populate.

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page(s)**: `sections/validation--substrate--text-style.liquid` + `templates/index.validation--substrate--text-style.json` *(planned)*. May share validation surface with `utility--css-variables`'s validation page once that lands (text-style block is one of the snippet's five emission domains).
- **API surface** (matrix to exercise):
  - **Per-entry typography catalog**: every text_style entry shown twice, once per selector form (tag binding when applicable, `[data-modifiers*='text-style:']`). Reader confirms identical typography across the two rows per entry.
  - **`h1`–`h6` auto-bind**: bare `<h1>`–`<h6>` elements rendered (no attributes, no modifiers). Reader confirms each takes the typography of the matching-handle entry.
  - **Base alias resolution**: an element styled via `font-family: var(--base-font-family)` etc. Reader confirms it inherits the typography of the entry referenced by `settings.base_text_style`.
  - **Responsive font-size switch**: viewport-cycling test showing mobile size below 48rem and desktop size at/above; verify the `@media` override fires only on entries with mismatched mobile/desktop.
  - **Font-family fallback chain**: an entry with `font_family` set, an entry with `font_family` blank but base has one (falls through default), an entry with both blank (falls through `system-ui`). Reader inspects computed `font-family` per row.
- **Edge cases**:
  - Entry with both `mobile_font_size` and `desktop_font_size` blank → both fall through to `1rem`; no `@media` override emitted
  - Entry with only one of `mobile_font_size` / `desktop_font_size` set → unset one backfills from the set one
  - Entry with blank `line_height` → falls through to `1.5`
  - Entry with blank `weight` → falls through to `400`
  - Entry with blank `font_family` and base has a font_family → primary layer = base's font; fallback chain still applies
  - Entry with blank `font_family` AND base has no font_family → primary layer = `system-ui`
  - Entry with `uppercase: true` + `underline: true` → emits both `text-transform: uppercase` and `text-decoration: underline`
  - Off-list `font_fallback_family` value (would require schema bypass — validation should prevent) → falls to the `sans` branch
- **Visual showcase**: a table-row layout with one row per entry: handle name (admin name in column 1), live rendered sample text in column 2 ("The quick brown fox…"), source fields summary in column 3 (size pair, weight, line-height, fallback family). Plus a banner row for `<body>` showing the base alias resolution. Plus per-viewport switching cells for entries with responsive sizes.
- **Assertions** (prose; Playwright once installed):
  - Computed `font-family` on a tag-bound element (e.g., `<h1>`) starts with the entry's resolved primary font; the chain matches the fallback layers in order.
  - Computed `font-size` matches the mobile rem at narrow viewport and desktop rem at wide viewport (when they differ).
  - Computed `font-family` on the body element matches the entry referenced by `settings.base_text_style`.
  - A bare tag (e.g., `<h1>`) and `[data-modifiers*='text-style:h1']` produce identical computed typography.
- **Unit scope**: none (metaobject layer; no JS).

## Out of scope

- **CSS emission mechanics** — covered by `utility--css-variables.spec.md`. This spec describes the data contract; that spec describes how the snippet composes the CSS rules.
- **`typeface` + `font` metaobject definitions + `utility--font-face.liquid` emission** — covered by the planned `font-system.spec.md` (merged spec covering all three because `font` is non-independent of `typeface`, and `utility--font-face` only emits from typeface data). This spec covers typography variables only; the font catalog itself + the `@font-face` rule emission live in the font-system spec.
- **Per-entry font weight ramps** — `weight` is a single static value per entry. Variable-font axis controls (slnt, opsz, etc.) are not modeled. A variable-font ramp would warrant a new field or a new metaobject; out of this spec's surface.
- **Letter-spacing in em / percent units** — `letter_spacing` is px-typed (converted to rem). Em-based tracking is not supported; merchant input is always pixels.
- **Multi-style composition on one element** — an element binds to one text_style at a time. Combining (e.g., "h1 weight + eyebrow letter-spacing") requires either a new entry or per-element CSS overrides.
- **Style inheritance / parent-child cascading** — text_style entries are independent. A change to the `body` entry does not propagate to `h1` automatically; the `h1` entry's own values win. The only "cascading" relationship is the explicit `base_text_style` alias emission.

## Related

- `utility--css-variables.spec.md` — the substrate emitter that materializes text_style entries into CSS. Defers definition contract to this spec.
- `theme-color.spec.md` — sibling metaobject spec (color tokens). Same metaobject-spec shape; useful as a calibration reference.
- `.context/docs/metaobject-definitions.md` § `text_style` — the setup contract (Shopify admin metaobject definition schema, field validations, recommended seed entries).
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (fallback chains, override scopes, metaobject reference fields).
- `title.spec.md` — L1 block consumer; picks a text_style via setting and emits the handle as `text-style:<handle>` in `data-modifiers`.
- `richtext.spec.md` — L1 block consumer; relies on `--base-*` aliases for body typography rather than picking a specific text_style.
