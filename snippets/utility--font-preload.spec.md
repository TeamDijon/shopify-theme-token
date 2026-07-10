# utility--font-preload

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--font-preload.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--font-preload.liquid` v1.0.1 (head-tag emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- `settings.base_text_style` (a `text_style` metaobject reference)
- Walks `base_text_style.font_family.value` → `font_list.value[]` → `asset_list.value[]` per the `typeface` + `font` metaobject schemas
- Same `asset.url` source as `utility--font-face` (the `@font-face`-emitting sibling)

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — head spine stage 3

## Purpose

Emits `<link rel="preload" as="font">` for the first `.woff2` asset of the base typeface — so the browser starts the font fetch before the inlined `@font-face` block parses, cutting FOUT swap delay. Emits nothing when no base typeface is configured or no woff2 asset exists in the typeface's font list.

`crossorigin` matches the `@font-face` fetch (Shopify's font CDN serves with CORS) so no double download. The URL is the same `asset.url` that `utility--font-face` emits — preload + face-block target the same byte-identical CDN response.

## API

No params. Reads `settings.base_text_style` (the merchant's picked `text_style` metaobject entry).

## Output shape

```html
<link rel="preload" as="font" type="font/woff2" href="<asset.url>" crossorigin>
```

One tag, one woff2 asset (the first found across the typeface's font list). No emission when no woff2 exists.

## Behavior

- **Walk into the base typeface.** Resolve `settings.base_text_style → font_family.value` to the `typeface` metaobject, then iterate its `font_list.value` (an array of `font` metaobject references).
- **Per-font woff2 search.** Each `font` entry's `asset_list.value` carries its asset files (woff2, woff, otf, ttf per `font-system.spec.md`). Iterate; pick the first asset whose extension is `woff2`. Extension extraction: `asset.url | split: '.' | last | split: '?' | first` — strips trailing query strings before checking the extension.
- **Early-`break` on first match.** Once a woff2 is found, both the inner loop (assets) and the outer loop (fonts in the typeface) break. The preload tag points at the first woff2 in the first eligible font, not every font.
- **Skip empty `asset_list`.** A font entry with no assets is skipped via `continue`.
- **No emission when no woff2 found.** Early `break` when `preload_url` remains blank after the walk.
- **`crossorigin` is mandatory.** Font preload requires `crossorigin` to deduplicate against the `@font-face` fetch — without it, the browser fetches twice (once for the preload's anonymous request, once for the `@font-face`'s CORS request). Shopify's font CDN serves with CORS, so the preload's CORS fetch matches the face-block's.
- **`AssetPreload` theme-check suppression.** The check requires `preload_tag` (a Shopify-built-in filter) with an `asset_url`-family input and would emit `crossorigin` automatically — but for metaobject-hosted font URLs, the input is `asset.url` (a metaobject field, not an asset filter), and the manual link is the correct shape. The disable / enable comments are scoped to the single `<link>` tag.
- **Single typeface preload.** Only the base typeface preloads. Other typefaces (heading, mono, accents) load via the inline `@font-face` block; their fetch starts when CSS parses, not at HTML parse time.

## CSS

N/A — head-tag emission.

## CSS custom properties (exposed)

N/A.

## A11y

N/A — preload hints are network-tier optimization, not content.

## Locale keys

N/A — no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page (every layout call); validated indirectly via DevTools Network panel
- **API surface** (matrix to exercise):
  - `settings.base_text_style` set, typeface has a woff2 → one `<link rel="preload" as="font" type="font/woff2" crossorigin>` emitted
  - `settings.base_text_style` blank → no preload tag
  - Base typeface configured with no woff2 (only woff / otf / ttf assets) → no preload tag (woff2-only by design)
  - Base typeface has multiple fonts with woff2 → only the first woff2 across all fonts is preloaded
- **Edge cases**:
  - Asset URL containing query string → extension extraction strips the `?…` suffix before checking
  - Asset URL with unusual extension casing (`.WOFF2`) → does not match `woff2`; preload omitted (case-sensitive comparison). Out of scope; Shopify normalizes to lowercase
- **Visual showcase**: DevTools Network panel shows the woff2 starting to fetch before the `<style>` block carrying `@font-face` parses
- **Assertions** (prose; Playwright once installed): when base typeface is set, exactly one `<link rel="preload" as="font">` tag exists in head; its `href` matches the asset URL used by the corresponding `@font-face` rule
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Preload of secondary typefaces.** Only the base typeface preloads. Heading / mono / accent typefaces wait for the inlined `@font-face` block. Per-typeface preload opt-in is out of scope.
- **Preload of additional formats.** woff2-only. Older formats (woff / otf / ttf) are fallback-only in `@font-face` and don't warrant preload.
- **Conditional preload by page weight.** Some pages may not need the base typeface immediately (e.g. minimal landing). Per-template preload toggling is out of scope.
- **`fetchpriority` adjustment.** The preload uses default priority. `fetchpriority="high"` on font preloads has mixed browser support and unclear gains.
- **Multi-variant preload (e.g. weight 400 + weight 700).** Single woff2 per page. Bold-weight preload would require a second walk; out of scope.

## Related

- `font-system.spec.md` — the typeface + font metaobjects this utility walks; `utility--font-face` is the sibling emitter (`@font-face` rules)
- `text-style.spec.md` — the metaobject `settings.base_text_style` references
- `layout.spec.md` — head spine stage 3 consumer
- `.context/docs/theme-settings.md` — documents the `settings.base_text_style` interface
