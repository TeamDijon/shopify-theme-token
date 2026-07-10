# utility--structured-data

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--structured-data.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--structured-data.liquid` v2.1.0 (schema.org JSON-LD orchestrator)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- `snippets/utility--json-ld.liquid` — wraps each captured schema in a JSON-LD script tag
- Shopify globals — `shop.*`, `shop.brand.*`, `request.origin`, `request.page_type`, `routes.search_url`, `page_title`, `canonical_url`, `product.*`, `collection.*`, `page.*`, `article.*`, `blog.*`, `cart.currency.iso_code`, `settings.favicon`
- Optional metafield: `breadcrumb.collection` namespace per `.context/docs/metafield-patterns.md`

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — head spine stage 9

## Purpose

Emits site-wide schema.org JSON-LD blocks in `<head>` — Organization + WebSite + BreadcrumbList on every page; Product or ProductGroup on product pages. All top-level entities carry an absolute `@id` so crawlers can graph-merge nodes emitted across pages (e.g. the Organization node from index merges with the Offer's `seller` reference on product). Per-Offer `seller` references the Organization `@id`; the WebSite's `publisher` references the same.

Each schema is built via `{% capture %}` with readable JSON, wrapped via `utility--json-ld`, accumulated into `schema_list`, iterated once at the end. Adding a new site-wide schema is one capture + one render + one concat — the orchestrator is extension-friendly.

Section- or block-scoped schemas (Article, FAQPage, Event) can be emitted inline from those files; multiple JSON-LD blocks on a single page is valid per schema.org.

## API

No params. Reads Shopify Liquid globals + the `breadcrumb.collection` metafield convention.

## Output shape

Always-emitted three blocks (one `<script>` per schema):

```html
<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "<origin>#organization",
  "name": "<shop.name>",
  "logo": "<shop.brand.logo or settings.favicon, 512px>",
  "description": "<shop.brand.short_description>",
  "slogan": "<shop.brand.slogan>",
  "sameAs": [<shop.brand.metafields.social_links>],
  "url": "<origin>"
}</script>

<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "<origin>#website",
  "name": "<shop.name>",
  "url": "<origin>",
  "publisher": { "@id": "<origin>#organization" },
  "potentialAction": { … Sitelinks Searchbox … }
}</script>

<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": "<origin>#breadcrumb",
  "itemListElement": [ … per page type … ]
}</script>
```

Product pages add a fourth block — `Product` (single-variant) or `ProductGroup` (multi-variant with per-variant `Product` + `Offer` nodes).

## Schemas

### Organization (always)

| Field | Source | Fallback |
|---|---|---|
| `@id` | `request.origin + '#organization'` | — |
| `name` | `shop.name` | — |
| `logo` | `shop.brand.logo` at 512px | `settings.favicon` at 512px, else omit |
| `description` | `shop.brand.short_description` | omit if blank |
| `slogan` | `shop.brand.slogan` | omit if blank |
| `sameAs` | `shop.brand.metafields.social_links` map | omit if empty |
| `url` | `request.origin` | — |

### WebSite (always)

Sitelinks Searchbox `potentialAction` configured:

```json
"potentialAction": {
  "@type": "SearchAction",
  "name": "Search <shop.name>",
  "target": {
    "@type": "EntryPoint",
    "name": "Search entry point",
    "urlTemplate": "<origin><search_url>?q={search_term_string}"
  },
  "query-input": "required name=search_term_string"
}
```

`publisher` references the Organization node via `@id`.

### BreadcrumbList (always)

Position 1 is always the shop's home page (`@id: origin`, `name: shop.name`).

| Page type | Trail after position 1 |
|---|---|
| `index` | — (stops at position 1) |
| `page` | Position 2: `page.title`, `@id: canonical_url` |
| `article` | Position 2: `article.title`, `@id: canonical_url` |
| `blog` | Position 2: `blog.title`, `@id: canonical_url` |
| `collection` | Position 2…N: ancestor chain via the `breadcrumb.collection` metafield (up to 10 levels) |
| `product` | Position 2…N: collection ancestor chain (same metafield) + final position: `product.title` |
| Other | Position 2: `page_title`, `@id: canonical_url` |

Collection-ancestor chain: each collection's `breadcrumb.collection` metafield (reference to its parent collection) is walked up to 10 levels to construct the breadcrumb trail. For products, the resolution starts with `product.metafields.breadcrumb.collection.value | default: product.collections[0] | default: collection`. See `.context/docs/metafield-patterns.md` for the metafield convention.

### Product / ProductGroup (product pages only)

Single-variant → `@type: Product`. Multi-variant → `@type: ProductGroup` with `hasVariant` array of per-variant `Product` nodes, each carrying its own `Offer`.

| Field | Source / behavior |
|---|---|
| `@type` | `Product` (single-variant) or `ProductGroup` (multi-variant) |
| `@id` | `canonical_url + '#product'` |
| `productGroupID` (ProductGroup) | `product.id` |
| `productID` (Product) | `product.id` |
| `name` | `product.metafields.seo.title.value or product.title` |
| `description` | `product.description | strip_html` |
| `url` | `product.url` prefixed with `request.origin` |
| `brand` | `{ @type: Brand, name: product.vendor }` if vendor non-blank |
| `category` | `product.category.name or product.type` if non-blank |
| `image` | Featured image as `ImageObject` with width + height as `QuantitativeValue` (unitCode `E37` — UN/CEFACT pixel unit) |
| `hasVariant` (ProductGroup) | Per-variant `Product` node with its own `Offer` |
| `offers` (Product) | Single `Offer` with price + availability + condition + seller reference |

Per-Offer fields:

- `price`: `variant.price | divided_by: 100.0` (Shopify exposes price as cents; schema.org expects decimal currency)
- `priceCurrency`: `cart.currency.iso_code` (multi-currency Markets-aware)
- `availability`: `https://schema.org/InStock` or `https://schema.org/OutOfStock` (referenced by `@id` per schema.org's enumeration-binding convention)
- `itemCondition`: `https://schema.org/NewCondition` (fixed)
- `seller`: `{ @id: origin + '#organization' }` (graph-merge reference)

## Behavior

- **Schema accumulation pattern.** Each schema captures into a string, renders through `utility--json-ld`, then concatenates onto `schema_list` (a Liquid array built via `uniq | concat:`). At the end, `for schema in schema_list reversed` iterates and emits. The `reversed` keeps the emission order matching the source order (the array building pattern prepends rather than appends — see `.context/rules/liquid-array-building.md`).
- **`@id` on every top-level entity.** Crawlers graph-merge nodes by `@id` across pages — the Organization's `@id` is the same across every page, so per-product Offer's `seller` reference and the WebSite's `publisher` reference resolve to one merged node. Stable `@id` is the load-bearing pattern.
- **Sitelinks Searchbox on every page.** WebSite's `potentialAction` declares the Sitelinks Searchbox. Google requires the schema be present on any page that could be the entry point in search results — emitting on every page satisfies the requirement.
- **Collection-ancestor walk capped at 10 levels.** The `for i in (0..9)` loop walks up to 10 ancestors before stopping. Deeper hierarchies are truncated; out of scope for typical commerce trees.
- **`unitCode: E37` on image dimensions.** UN/CEFACT-standardized pixel unit code. schema.org's `QuantitativeValue` requires a unit; `E37` is the pixel code crawlers recognize.
- **Multi-variant uses ProductGroup, not Product with `offers` array.** schema.org's ProductGroup is the canonical multi-variant shape — single Product with multiple Offers under `offers` is permitted but less rich. ProductGroup carries per-variant `Product` nodes each with their own `Offer`; the structure matches Shopify's product/variant model.
- **Routing through `utility--json-ld`.** Each capture wraps in the JSON-LD wrapper utility for content-safe minification + `<script>` tag emission. Prior versions inlined the wrapping; the v2.1.0 split was driven by the need to share the wrapper with section-scoped schemas (Article, FAQPage).
- **Stripped capture content concatenated.** Each `<script type="application/ld+json">…</script>` block accumulates as a single string into the `schema_list` array.

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## A11y

N/A — JSON-LD is consumed by crawlers, not visible content.

## Locale keys

N/A — values are sourced from Shopify globals (already localized at source) and the `breadcrumb.collection` metafield.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page emits Organization + WebSite + BreadcrumbList; product pages also emit Product / ProductGroup. Validation typically uses Google's Rich Results Test against the deployed storefront.
- **API surface** (matrix to exercise):
  - `templates/index.json` → 3 JSON-LD blocks (Organization, WebSite, BreadcrumbList with 1-position trail)
  - `templates/page.<handle>.json` → 3 blocks with BreadcrumbList showing the page in position 2
  - `templates/article.json` → 3 blocks with BreadcrumbList showing the article in position 2
  - `templates/collection.json` → 3 blocks with BreadcrumbList showing the collection-ancestor trail
  - `templates/product.json` single-variant → 4 blocks, Product schema with single Offer
  - `templates/product.json` multi-variant → 4 blocks, ProductGroup schema with `hasVariant` array
  - Multi-collection ancestor chain via `breadcrumb.collection` metafield → BreadcrumbList walks up to 10 levels
- **Edge cases**:
  - `shop.brand.logo` blank, `settings.favicon` blank → Organization emits no `logo` field
  - Multi-currency Markets store → `priceCurrency` reflects active currency
  - Product with no variants (single-variant inferred from `product.variants.size == 1`) → falls into single-variant `Product` branch
  - Variant without image → falls back to `featured_image_url`
  - Variant SKU blank → `sku` field omitted
  - Collection-ancestor chain longer than 10 → truncated at depth 10
- **Visual showcase**: Google Rich Results Test, Schema.org Validator
- **Assertions** (prose; Playwright once installed):
  - On every page, `document.querySelectorAll('script[type="application/ld+json"]').length >= 3`
  - Each parsed schema is valid JSON
  - Organization `@id` matches across all pages (same origin)
  - Product page's Offer `seller.@id` matches Organization `@id`
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Article schema.** Article-page schema is not emitted by this utility (the BreadcrumbList includes the article, but no `Article` schema block). When the article spec ships, it emits its own JSON-LD inline via `utility--json-ld`.
- **FAQPage, Event, Recipe, Review schemas.** Section / block scoped. Inline emission via `utility--json-ld`.
- **Aggregate ratings.** No `AggregateRating` on Product (no review platform integration). Adding ratings would require a review-system integration; out of scope.
- **Multi-merchant / multi-vendor.** Single Organization per storefront.
- **Locale-specific schema variants.** Crawlers infer locale from `<html lang>`; per-locale schemas are not emitted.
- **Custom `@graph` shape.** Each top-level entity emits as its own `<script>` block, not as a member of a single `@graph` array. Either shape is valid per schema.org; the per-block shape lets section-scoped schemas append without reshaping the graph.

## Related

- `utility--json-ld.spec.md` — the wrapper utility used for every schema emission
- `layout.spec.md` — head spine stage 9 consumer
- `.context/docs/metafield-patterns.md` — `breadcrumb.collection` metafield convention
- `.context/rules/liquid-array-building.md` — the `null | uniq | concat:` accumulation pattern this utility uses
- `.context/docs/theme-settings.md` — `settings.favicon` fallback path for Organization logo
