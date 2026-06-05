# utility--open-graph

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--open-graph.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--open-graph.liquid` v1.2.0 (head meta emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: Liquid globals `page_title`, `page_description`, `page_image`, `canonical_url`, `request.origin`, `request.page_type`, `request.locale.iso_code`, `localization.available_languages`, `shop.*`, `product.*` (product pages), `article.*` (article pages), `cart.currency.iso_code`

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — head spine stage 10

## Purpose

Emits Open Graph + Twitter Card `<meta>` tags for link-preview rendering across social platforms. Covers site-wide defaults plus product- and article-specific fields branching on `request.page_type`. Section- or block-scoped overrides (e.g. a specialized hero section emitting its own `og:image`) can be added inline by those files — multiple OG sets on one page is technically valid, social platforms use the first found.

The utility runs unconditionally on every page; per-page-type branching is internal.

## API

No params. Reads Shopify Liquid globals + theme settings.

## Output shape

Always-emitted core:

```html
<meta property="og:site_name" content="{{ shop.name }}">
<meta property="og:url" content="<canonical_url or request.origin>">
<meta property="og:title" content="<page_title or shop.name>">
<meta property="og:type" content="<website | product | article | product.group>">
<meta property="og:description" content="<page_description or shop.description or shop.name>">
<meta property="og:locale" content="<iso>">
<!-- per alternate locale, when localization has >1 language -->
<meta property="og:locale:alternate" content="<other-iso>">
```

Product pages add:

```html
<meta property="og:price:amount" content="<money>">
<meta property="og:price:currency" content="<iso>">
```

Article pages add:

```html
<meta property="og:article:author" content="<author>">
<meta property="og:article:published_time" content="<ISO 8601>">
<meta property="og:article:modified_time" content="<ISO 8601>">
```

When `page_image` is non-blank:

```html
<meta property="og:image" content="https:…/<image>?width=1200">
<meta property="og:image:secure_url" content="https:…/<image>?width=1200">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="<proportional>">
<meta property="og:image:alt" content="<image.alt or shop.name>">
```

Twitter Card tags (always):

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<page_title>">
<meta name="twitter:description" content="<description>">
<!-- when page_image -->
<meta name="twitter:image" content="https:…/<image>">
<meta name="twitter:image:alt" content="<image.alt or shop.name>">
```

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## Behavior

- **`og:type` dispatch on `request.page_type`.**
  - `product` → `og:type = product`, adds price meta
  - `article` → `og:type = article`, adds author + timestamp meta
  - `collection` → `og:type = product.group`
  - `password` → `og:type` stays `website`, but `og:url` is forced to `request.origin` (password pages have no real URL to share)
  - All others → `og:type = website`
- **Title fallback chain.** `page_title → shop.name`.
- **URL fallback.** `canonical_url → request.origin`. Password-page override (above) supersedes the canonical.
- **Description fallback chain.** `page_description → shop.description → shop.name`. Always non-blank.
- **`og:locale` + alternates.** Primary locale always emitted. When `localization.available_languages.size > 1`, every non-primary language emits an `og:locale:alternate`. The current locale is excluded from the alternates iteration.
- **`og:image` width pinning.** Image is served at width `1200`, height computed proportionally (`1200 × original_height / original_width`). Pinning prevents the previous bug where original dimensions were declared while serving an unsized URL.
- **HTTPS prefix on image URLs.** `prepend: 'https:'` on `image_url` ensures the URL is absolute https — `image_url` returns a protocol-relative URL by default; social platforms prefer absolute https.
- **Twitter uses `name=`, not `property=`.** Per Twitter's own spec, `twitter:*` tags use the `name` attribute; OG uses `property`. The split is intentional.
- **Escape on merchant-supplied strings.** Every interpolated user-typed string (`shop.name`, `page_title`, `page_description`, `article.author`, `image.alt`) passes through `| escape` to defend against attribute breakout. Numeric / IS standardized values (`page_image.height`, `cart.currency.iso_code`) skip escape.
- **`twitter:card = summary_large_image` fixed.** No fallback to `summary`; large-image cards render the OG image at full preview width.

## A11y

N/A — meta tags consumed by social-platform crawlers, not visible content.

## Locale keys

N/A — values come from Shopify globals + settings, already-localized at source.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page; validation typically uses social-platform link-preview validators against the shipped storefront
- **API surface** (matrix to exercise):
  - `templates/index.json` → `og:type = website`, no price/article meta
  - `templates/product.json` → `og:type = product`, price + price:currency emitted
  - `templates/article.json` → `og:type = article`, author + published_time + modified_time emitted
  - `templates/collection.json` → `og:type = product.group`
  - `templates/password.json` → `og:type = website`, `og:url = request.origin`
  - Multi-language store → `og:locale:alternate` per non-current language
  - `page_image` set → all 5 og:image meta tags + 2 twitter:image tags emitted; height computed proportionally to 1200 width
  - `page_image` blank → no og:image / twitter:image tags
- **Edge cases**:
  - `shop.name` containing `"` or `<` → escaped to `&quot;` / `&lt;` in rendered attributes
  - Product with currency-converted price (multi-currency Markets) → `og:price:amount` reflects the converted price; `og:price:currency` matches `cart.currency.iso_code`
  - Article with blank author → `og:article:author` emitted as empty string (Shopify-side data sanitization)
- **Visual showcase**: Facebook's Sharing Debugger + Twitter's Card Validator against the deployed storefront
- **Assertions** (prose; Playwright once installed): page header carries the expected count of OG + Twitter meta tags per page type
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Per-section overrides.** Sections / blocks can emit their own OG meta inline if needed; the utility does not coordinate with section-level OG. Social platforms use first-found by tag name; sections must emit before this utility's tags or rely on social-platform-specific de-duplication.
- **Product schema fields beyond price.** `og:availability` / `og:product:condition` / variant-aware OG are not emitted. Structured-data (JSON-LD) is the canonical surface for richer product metadata — see `utility--structured-data.md`.
- **Article tags / sections.** `og:article:tag` / `og:article:section` are not emitted. The current article surface is title + author + timestamps.
- **Per-page-type Twitter card type.** All pages emit `summary_large_image`. Per-page-type variants (`player` for videos, `app` for app-card use) are out of scope.
- **Multi-image OG.** One image (the `page_image`) per page. Multi-image carousels in link previews would require multiple `og:image` tags + variant selectors; out of scope.

## Related

- `.context/specs/utility--structured-data.md` — sibling SEO emitter; JSON-LD shape is richer for product / article metadata
- `.context/specs/layout.md` — head spine stage 10 consumer
- `.context/docs/theme-settings.md` — `settings.favicon` is the structured-data fallback logo (not the OG image source)
