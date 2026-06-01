# font-system

**Layer**: substrate

**Type**: metaobject + utility-snippet (`snippets/utility--font-face.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/utility--font-face.liquid` v1.2.3 (`@font-face` rule emitter — iterates typefaces + their `font_list`)
- `font` metaobject definition — created per `metaobject-definitions.md` § `font`
- `typeface` metaobject definition — created per `metaobject-definitions.md` § `typeface`

**Reconciled**: 2026-05-31

**Reviewed**: pending

**Depends on**:
- Shopify file-reference type (built-in) — `font.asset_list` accepts Shopify-uploaded font files
- Theme settings: none directly. The system is metaobject-driven; merchants seed typefaces + fonts in admin
- Caller capture pattern: `utility--core-assets.liquid` captures the snippet's output alongside `utility--css-variables` and routes through `utility--asset-loader` as inline CSS

**Consumers**:
- `snippets/utility--font-face.liquid` — the in-spec emitter (self-consuming the metaobject layer)
- `snippets/utility--css-variables.liquid` v1.11.0 — reads `text_style.font_family.value.name.value` indirectly (the typeface's `name` flows into emitted `--<style>-font-family` chains)
- `snippets/utility--font-preload.liquid` — reads typeface + font entries to emit `<link rel="preload">` head tags for above-the-fold font files
- `text_style` metaobject entries — reference typefaces via `font_family` field; the typeface's `name` becomes the primary font in the emitted `font-family` chain

## Purpose

Three-part substrate covering the theme's font catalog:

1. **`font` metaobject** — a single font variant (weight + style combination, or a variable-font weight range). Carries asset file references for the actual font files (`.woff2` / `.woff` / `.otf` / `.ttf`).
2. **`typeface` metaobject** — a font family. Has a display `name` (the CSS `font-family` value) and a list of `font` entries (one per variant the family ships).
3. **`utility--font-face.liquid`** — the emitter that walks typefaces, then their font lists, and writes one `@font-face` declaration per font file. Output is captured by `utility--core-assets` and routed through the inline-CSS asset loader.

The three are merged into one spec because they're conceptually one system: `font` is referenced only by `typeface.font_list`; `typeface` is consumed by `text_style.font_family` and emitted as `@font-face` rules; the emitter materializes typefaces into CSS. None has an independent contract.

## Schema (definition contract)

### `font` metaobject

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display label in admin (e.g., `Helvetica Bold`). Not read by theme code; admin-display only. |
| `asset_list` | List of file references | yes | Font files. Prefer `.woff2` and `.woff`; `.otf` and `.ttf` also supported. Shopify file-reference validation can't enforce font extensions; the emitter handles the four extensions via `format(...)` mapping (others yield a bogus format string that browsers silently drop). |
| `style` | Single line text | no | CSS `font-style`. Validated `choices: ["normal", "italic", "oblique"]`. Defaults to `normal` at emission. |
| `weight` | Single line text | no | Static weight `100`–`900`. Regex-validated `^[1-9]00$` (canonical 100-step values). Leave blank for variable fonts (the range fields below take over). |
| `weight_range_start` | Single line text | no | Variable-font weight range start (100–900). Read only when `weight` is blank. Regex same as `weight`. |
| `weight_range_end` | Single line text | no | Variable-font weight range end (100–900). Same regex. |

### `typeface` metaobject

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name (e.g., `Helvetica`, `Inter`). Becomes the quoted `font-family` value in emitted `@font-face` rules AND the primary entry in the emitted `--<style>-font-family` chain (via `text_style.font_family.value.name.value` in `utility--css-variables`). Load-bearing — renaming changes every CSS `font-family` consumer of this typeface. |
| `font_list` | List of metaobject references (→ `font`) | no | The font variants belonging to this typeface. Validated to the `font` type. Each entry emits one `@font-face` declaration. Empty list → typeface emits nothing (no @font-face rules; the font-family name is still resolvable in CSS but the browser can't load anything). |

Type-level metadata for both: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definitions in `metaobject-definitions.md`.

## Output shape

The emitter writes one `@font-face` rule per `font` inside each typeface's `font_list`:

```css
@font-face {
  src: url("https://cdn.shopify.com/.../helvetica-regular.woff2") format("woff2"),
       url("https://cdn.shopify.com/.../helvetica-regular.woff") format("woff");
  font-family: "Helvetica";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  src: url("https://cdn.shopify.com/.../helvetica-bold.woff2") format("woff2");
  font-family: "Helvetica";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

/* Variable font */
@font-face {
  src: url("https://cdn.shopify.com/.../inter-var.woff2") format("woff2");
  font-family: "Inter";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}
```

The emitter writes one line per `@font-face` block (single-line output, captured + minified downstream). Each rule:

- `src` — one `url(...) format(...)` per file in `asset_list`, comma-separated. The format string comes from the file extension via mapping: `woff2` → `woff2`, `woff` → `woff`, `otf` → `opentype`, `ttf` → `truetype`. Browsers fall through to the next entry when they can't load the current format.
- `font-family` — quoted (handles multi-word typeface names like `"DM Sans"`).
- `font-style` — from `font.style.value` with `'normal'` fallback.
- `font-weight` — static (a single `100`–`900` value) when `font.weight` is set, OR a range (`<start> <end>`) when `font.weight` is blank and the range fields are valid (variable-font mode).
- `font-display: swap` — fixed; renders fallback fonts immediately, swaps when the web font loads. No per-font override surface.

## CSS

N/A at the metaobject layer. The emitter writes `@font-face` rules; these go to the document's CSS via the inline-CSS asset loader.

## CSS custom properties (exposed)

The font-system itself emits no CSS variables. The typeface's `name.value` flows into `--<style>-font-family` variables via `utility--css-variables` (text-style block) — those variables are owned by `utility--css-variables.md`.

## Behavior

### Emission flow

```
metaobjects.typeface.values
  ↓ for each
  skip typefaces with blank name OR empty font_list
  ↓ for each font in typeface.font_list.value
  skip fonts with empty asset_list
  ↓
  emit @font-face block
```

### Skip rules

- **Typeface with blank `name`** → skipped entirely. The font-family can't be addressed in CSS without a name.
- **Typeface with empty `font_list`** → skipped. No fonts to emit; the typeface declares nothing.
- **Font with empty `asset_list`** → skipped (v1.2.2 fix). Without files, `src: ;` would emit invalid CSS.
- **Variable-font with invalid range** → skipped. When `weight` is blank, both `weight_range_start` and `weight_range_end` must be ≥ 100, and start < end. Any failure → continue to next font (no rule emitted for this entry).

### Variable-font detection

`font.weight` blank → `"" | plus: 0` → `0` → triggers the `font_weight < 100` branch in Liquid → reads the range fields. The regex on the `weight` field (`^[1-9]00$`) blocks any explicit value below 100, so the blank-weight path is the only way to enter variable-font mode.

Static-mode emission:
```css
font-weight: 700;
```

Variable-mode emission:
```css
font-weight: 100 900;  /* range start + end, space-separated per CSS spec */
```

### Font format mapping

Extension → CSS `format()` descriptor:

| Asset extension | Emitted `format()` |
|---|---|
| `.woff2` | `woff2` |
| `.woff` | `woff` |
| `.otf` | `opentype` |
| `.ttf` | `truetype` |
| Other / unmapped | the extension as-is (browsers silently drop unknown formats) |

The `format()` descriptor lets the browser pick the best-supported file when multiple `src` URLs are listed.

### Style default

`font.style.value` blank → `'normal'` (v1.2.3 fix prevents `font-style: ;` invalid CSS).

### `font-display: swap` is fixed

Every rule emits `font-display: swap`. No per-font / per-typeface override. Rationale: `swap` shows fallback text immediately and swaps to the web font when loaded — best for perceived performance + accessible-text-while-loading. Other strategies (`block`, `fallback`, `optional`) have specific trade-offs that don't generalize; per-project overrides would happen by writing the `@font-face` manually outside this utility.

### Font-family naming consequence

The `typeface.name.value` is the load-bearing key:

- Emitted as the `font-family` in every `@font-face` rule for the typeface's fonts
- Flows into `--<style>-font-family` variables via `text_style.font_family.value.name.value`
- Renaming the typeface in admin changes both: the `@font-face` rules emit the new name; the `text_style` variables emit the new name. CSS `font-family` references resolve consistently because both sides update together.

The `font.name` field is decorative (admin display only); only `typeface.name` is load-bearing on the CSS side.

## Recommended entries

Store-specific. Seeds depend on the typefaces and font files the theme ships with. No canonical set.

**Typical pattern per project:**

1. Seed one or more `typeface` entries with the brand fonts (e.g., `Helvetica`, `DM Sans`, `Cormorant`).
2. Per typeface, seed `font` entries for each weight + style combination shipped — usually 2–6 fonts per typeface (regular, bold, italic, bold-italic, sometimes more).
3. For variable fonts, seed one `font` entry per file with `weight` blank + `weight_range_start` + `weight_range_end` set.
4. Upload the `.woff2` (+ optional `.woff` fallback) files to each `font` entry's `asset_list`.
5. Reference the typeface from `text_style.font_family` settings to bind typography styles to specific typefaces.

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` fields for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject) for the data-layer + Tier 1b (substrate / utility-snippet) for the emitter. Shares one validation page.

- **Tier**: substrate — metaobject + utility-snippet (combined)
- **Page(s)**: `sections/validation--substrate--font-system.liquid` + `templates/index.validation--substrate--font-system.json` *(planned)*
- **API surface** (matrix to exercise):
  - **Typeface with multiple static fonts** (regular + bold + italic + bold-italic): four `@font-face` rules emit; each has the right weight/style
  - **Typeface with one variable font**: one `@font-face` rule emits with `font-weight: <start> <end>`
  - **Multi-file font** (`asset_list` has both .woff2 + .woff): one rule with two `src` entries, woff2 first
  - **`.otf` and `.ttf` files**: format() mapping verified (`opentype`, `truetype`)
  - **Typeface name with spaces** (e.g., "DM Sans"): emitted quoted; `font-family: "DM Sans"` reads correctly
  - **Text-style consumption**: a text_style references the typeface; the emitted `--<style>-font-family` chain starts with the typeface's name
- **Edge cases**:
  - Typeface with blank `name` → skipped entirely; no @font-face emission for that typeface
  - Typeface with empty `font_list` → skipped; no rules
  - Font with empty `asset_list` → skipped; no rule for that font
  - Variable font with `weight_range_start >= weight_range_end` → skipped (invalid range)
  - Variable font with `weight` value set + range fields also set → static mode wins; range ignored
  - Font with `style: 'italic'` + `weight: '700'` → emits `font-style: italic; font-weight: 700;`
  - File with unmapped extension (`.eot`, `.svg`) → emits format string as-is; browsers silently drop
- **Visual showcase**: a section displaying samples of each typeface × each font (rendered with the typeface as `font-family` + the variant's weight/style). Plus a DevTools-inspection row showing the emitted `@font-face` blocks in the rendered `<style>`. The visual surface lets a reader confirm the actual font files load + the font-family resolution chain works.
- **Assertions** (prose; Playwright once installed):
  - Computed `font-family` on a text_style-bound element starts with the typeface's `name.value`
  - For each typeface × font combination, exactly one `@font-face` rule exists in document.styleSheets (verifiable via JS query)
  - Static-weight fonts emit a numeric `font-weight`; variable-weight fonts emit a `<start> <end>` range
  - `font-display: swap` is set on every rule
  - Skipped cases (blank name, empty list, invalid range) produce no rule for the affected entry
- **Unit scope**: none (Liquid + CSS).

## Implementation-time decisions

- **`font-display` per-typeface override.** Currently all fonts emit `swap`. If a project ships icon fonts (which sometimes benefit from `block` to prevent FOUC of icons), the override path is to write the `@font-face` manually outside this utility. Adding a `font.display` field would expand the schema; defer until a real consumer needs it.
- **Subsetting / unicode-range.** Modern font subsetting + `unicode-range` descriptors are not modeled. A project shipping a Latin-only subset alongside a CJK-extended subset would need per-font `unicode-range` to control which file loads per character. Adding a `font.unicode_range` field is the schema extension path; defer.
- **Font preload coordination.** `utility--font-preload` is a sibling utility that reads the same typefaces to emit `<link rel="preload">` head tags. The two utilities run independently; per-typeface preload opt-in would require coordination (which typefaces preload, which lazy-load). Currently every typeface in the catalog gets preload hints; tighten if first-paint timing demands.
- **Variable-font axis controls beyond weight.** Real variable fonts often expose multiple axes (weight, slant, width, optical size). The current schema models weight-axis only via `weight_range_*`. Other axes (slnt, opsz, wdth) would need additional fields. Defer; standard merchant typography needs the weight axis 95% of the time.

## Out of scope

- **CSS variable emission for typography properties.** Covered by `utility--css-variables.md` (text-style block). This spec covers the `@font-face` rule emission only.
- **Font preload `<link>` tags.** Covered by `utility--font-preload.liquid` (sibling utility). It reads the same metaobjects but emits head tags instead of `@font-face` rules.
- **System fonts / fallback families.** `text_style.font_fallback_family` (mono / serif / sans) selects which theme-settings font (`settings.mono_font`, etc.) contributes the fallback layer to the emitted `font-family` chain. Those theme-settings fonts are pre-installed system / Shopify-provided fonts, not metaobject-managed.
- **`font-feature-settings` and OpenType features.** Per-font OT feature toggles (ligatures, swashes, tabular nums) are out of scope. Consumers wanting feature controls handle them at the text-style level via custom CSS, or per-element via inline-styled feature-settings.
- **Subsetting at build time.** No build-step font optimization. Merchants upload their already-subset font files; the metaobject system catalogs them.
- **Server-side font detection / fallback.** `font-display: swap` is the only fallback strategy. JS-driven font-loading API (`document.fonts.ready`, FOUT/FOIT controls) is not modeled.

## Related

- `text-style.md` — primary consumer of `typeface` (via `font_family` field). The typeface's `name` flows into emitted `--<style>-font-family` chains.
- `utility--css-variables.md` — substrate emitter for `--<style>-font-family` and `--base-*` aliases; reads `text_style.font_family.value.name.value` (which dereferences to typeface.name).
- `theme-color.md` — sibling substrate metaobject spec (for calibration on the spec shape).
- `gradient.md` — sibling substrate metaobject spec (similar metaobject-emitter pair, but emission domain is gradients in `utility--css-variables` rather than its own snippet).
- `.context/docs/metaobject-definitions.md` § `font`, § `typeface` — the setup contract (Shopify admin metaobject definition schemas).
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns.
- `.context/docs/asset-loading.md` — inline-CSS routing through `utility--core-assets`.
