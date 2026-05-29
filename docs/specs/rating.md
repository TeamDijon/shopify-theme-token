# rating

**Layer**: 1
**Type**: block (`blocks/rating.liquid`) + matching snippet (`snippets/rating.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: `snippets/star-rating.liquid` (spec'd, not yet implemented), `accessibility.star_rating` locale keys (owned by `star-rating` spec), `snippets/utility--json-ld.liquid` (shipped) for AggregateRating emission
**Consumers**: PDP (next to product title), product cards (planned), `testimonial` L1 block (optional embedded rating)

## Purpose

Merchant-addable block exposing rating + review count display on product surfaces. Resolves a numeric rating + optional count from one of three sources (manual / product metafield / auto) and renders via the `star-rating` L0 snippet. Consume `star-rating` directly when embedding inside another primitive's render output (testimonial, product-card); use this block when the merchant configures a rating in the page composition.

## API

| Setting | Type | Required | Notes |
|---|---|---|---|
| `metafield_namespace` | text | yes | Default `reviews` (Shopify Reviews app convention). Edit for third-party apps (`judgeme`, `loox`, `yotpo`). Schema `default` populates on block injection so the field is never blank by default. |
| `metafield_rating_key` | text | yes | Default `rating`. Schema-defaulted on injection. |
| `metafield_count_key` | text | no | Default `rating_count`. Schema-defaulted on injection. Blank → no count rendered. |
| `override` | checkbox | no | Default false. When true, exposes manual `rating` + `count` fields and lets them override the metafield value. |
| `rating` | range (0–5, step 0.5) | no | Manual override value. Visible only when `override=true` (via schema `visible_if`). |
| `count` | number | no | Manual override count. Visible only when `override=true`. Blank → no count rendered. |
| `product` | product | no | Optional manual product override. When set, ratings are read from this product instead of the rendering context. Blank → auto-resolve from context. |
| `link` | url | no | Optional link target (typically `#reviews` anchor on PDP). |
| `show_count` | checkbox | no | Default true. Hides count even when resolved. |
| `size` | select (`small` / `default` / `large`) | no | Default `default`. Maps to `--rating-star-size`. |
| `color_scheme` | color_scheme | no | Standard appearance setting. |
| `mobile_margin_block_start` | range | no | Standard top-spacing. |
| `desktop_margin_block_start` | range | no | Standard top-spacing. |

The block-backed snippet root accepts these via `block.settings.*` per `block-convention.md`.

## Output shape

```html
<div class="shopify-block shopify-block--rating"
     data-modifiers="size:default color-scheme:scheme-1"
     {{ block.shopify_attributes }}>
  {% if link %}<a href="{{ link }}" class="rating__link">{% endif %}
    {% render 'star-rating', rating: resolved_rating, count: resolved_count %}
  {% if link %}</a>{% endif %}
</div>
```

When source resolves to blank, the block renders nothing (early-exit `break`).

## CSS

```css
.shopify-block--rating {
  --star-size: var(--rating-star-size, 1rem);

  &[data-modifiers~='size:small'] { --rating-star-size: 0.75rem; }
  &[data-modifiers~='size:large'] { --rating-star-size: 1.5rem; }

  & .rating__link {
    text-decoration: none;
    color: inherit;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--rating-star-size` | Re-exposed `--star-size` for theme-level overrides | `1rem` (default) / `0.75rem` (small) / `1.5rem` (large) per size modifier |

## Behavior

- **Resolution precedence** — single linear chain:
  1. **Override** — if `override=true` AND manual `rating` is set, use manual `rating` + `count`
  2. **Metafield** — look up `product.metafields[metafield_namespace][metafield_rating_key]` and the optional count key. Requires `product` context (PDP or product card)
  3. **Hidden** — if neither resolves, block renders nothing
- **Override checkbox semantics**: a UI + safety control. Unchecking it ignores any residual manual `rating`/`count` left in the block settings, falling cleanly back to metafield resolution. Checking it with blank manual values still falls through to metafield (override is a license to override, not a forced manual mode).
- **Product resolution**: `block.settings.product` takes precedence when set. Blank → auto-resolves from the rendering context (PDP template carries `product` automatically; product-card snippet passes it explicitly). Outside product context with `product` blank → metafield path falls back to blank. The manual product picker enables "best seller" / "social proof" placements in editorial sections where no ambient product exists.
- **Blank fallback**: all paths blank → block renders nothing (empty container would be cosmetically wrong)
- **Link wrapping**: when `link` is set, the entire star-rating + count is wrapped in `<a>`. Hover/focus styles target the link, not the inner svg
- **Structured data**: when a rating resolves, the block emits AggregateRating JSON-LD via `utility--json-ld`, scoped to the resolved product (BACKLOG C7 resolved by this spec). Ships in the same PR as the block.
- **A11y**: `aria-label` carried by `star-rating` snippet (passes through). Link target inherits the snippet's label
- **Reduced motion / forced colors**: inherits from `star-rating` snippet + global `core.css`

## Locale keys to add

None — `star-rating` L0 owns the SR-only aria-label strings (`accessibility.star_rating` / `accessibility.star_rating_count_suffix`).

## Validation

Per `validation-contract.md`:

- **Tier**: primitive (Tier 2)
- **Page**: `sections/validation--primitive--rating.liquid` + `templates/index.validation--primitive--rating.json`
- **API surface** *(block-backed only; no snippet half — `star-rating` L0 is the consumed snippet, validated at its own primitive page)*:
  - default state: `override=false` × metafield filled × product context → metafield value renders
  - `override=false` × metafield blank → block hidden
  - `override=true` × manual rating ∈ {0, 2.5, 5} × count ∈ {0, 42} → manual values render
  - `override=true` × manual blank × metafield resolves → metafield fall-through
  - `override=true` × manual blank × metafield blank → block hidden
  - `product` blank × PDP context → auto-resolves to current product
  - `product` set × outside PDP context → uses picker's product
  - `product` set × inside PDP context → uses picker's product (overrides ambient)
  - link blank vs link set
  - size ∈ {small, default, large}
  - `show_count=false`
- **Edge cases**:
  - all paths blank → block renders nothing
  - rating > 5 → clamped by `star-rating` L0
  - metafield missing on product → metafield path falls back to blank
  - no product context (outside PDP/card) with `product` blank → metafield path falls back to blank
  - decimal precision: rating=2.7 → renders as 2.5 (per `star-rating` L0's half-star resolution)
  - residual manual values when `override=false` → ignored entirely; resolution skips manual
  - AggregateRating JSON-LD only emits when rating actually resolves (no schema for blank/hidden states)
- **Visual showcase**: matrix of blocks demonstrating sizes, with/without count, with/without link, source variants. Page intent: a reader confirms every settings combination renders correctly.
- **Assertions**: prose — each cell renders the correct DOM (link wrapper present when link set, star count matches resolved rating, count text present/absent per `show_count`). Selectors + expectations once Playwright lands.
- **Unit scope**: none (no JS)

## Implementation-time decisions

- Setting help text should document alternative metafield namespace conventions (`judgeme`, `loox`, `yotpo`) so merchants know the field is editable.
- Block icon for the editor — pick from existing icon library or add new.

## Out of scope

- Interactive star-picker (review submission flow) — separate primitive if ever needed
- Multi-rating aggregation (quality + value + comfort scored separately) — different block
- Variant-level ratings — rating is product-level, not variant-level
- Live update via fetch (refreshing rating when new review submitted) — defer to per-project
- Direct third-party review API integration (Yotpo, Judge.me, Loox) — relies on those apps populating the product metafield, which they typically do; the `metafield` source supports them by configuration
