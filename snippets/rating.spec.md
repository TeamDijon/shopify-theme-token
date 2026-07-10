# rating

**Layer**: 1

**Type**: block (`blocks/rating.liquid`) + matching snippet (`snippets/rating.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- `snippets/star-rating.liquid` (L0, planned — owns the visual rendering + SR-only label)
- `snippets/utility--json-ld.liquid` (planned — emits structured-data `<script type="application/ld+json">` blocks; AggregateRating emission)
- `snippets/utility--base-selector.liquid` (shipped — block scoping)
- `snippets/utility--modifiers.liquid` (shipped — data-modifiers emission)
- `snippets/utility--block-layout-vars.liquid` (shipped — top-spacing + content-width plumbing)
- `snippets/utility--dynamic-style.liquid` (shipped — per-instance CSS variable injection)
- Locale keys are owned by `star-rating.spec.md` (`accessibility.star_rating.*`); this block adds none.

**Consumers**: product surfaces — primarily PDP (placed near the product title), secondarily product cards (planned), and the `testimonial` L1 block (planned — embedded rating alongside quote). Editorial placements (best-seller callouts, social-proof strips) use the manual `product` picker to render any product's rating in any section.

**Whitelisted by**: `sections/section.liquid` (the canonical merchant-composable section host) + `blocks/group.liquid` + `blocks/columns.liquid` (nested composition inside container blocks on PDP). Not whitelisted by `blocks/media.liquid` (rating doesn't compose semantically inside a media-as-container surface).

## Purpose

Merchant-addable block that exposes product rating + review count display on product surfaces. Resolves a numeric rating + optional count from one of three sources (manual override / product metafield / auto-context) and renders via the `star-rating` L0 snippet. Emits AggregateRating JSON-LD when a rating resolves.

The block is the merchant-composable surface; consumers embedding star-rating inside another block's render output (testimonial, product-card primitive) call `snippets/star-rating.liquid` directly — they don't go through this block.

## API

Block schema settings (consumed via `block.settings.*` per `block-convention.md`):

| Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `metafield_namespace` | text | yes | `'reviews'` | Shopify Reviews app convention; schema-defaulted on block injection. Edit per third-party app: `judgeme` / `loox` / `yotpo` / etc. Setting `info` text lists common alternatives. |
| `metafield_rating_key` | text | yes | `'rating'` | Schema-defaulted. Path is `product.metafields[namespace][key]`. |
| `metafield_count_key` | text | no | `'rating_count'` | Schema-defaulted. Blank → no count rendered (even when metafield contains one). |
| `override` | checkbox | no | `false` | When `true`, exposes manual `rating` + `count` fields below; lets them override the metafield resolution. Schema `visible_if` gates the manual fields on this checkbox. |
| `rating` | range | no | — | Manual override (0–5, step 0.5). Visible only when `override=true`. |
| `count` | number | no | — | Manual override count. Visible only when `override=true`. Blank → no count rendered. |
| `product` | product | no | blank | Optional manual product override. When set, ratings are read from this product instead of the rendering context. Enables editorial placements where no ambient product exists. |
| `link` | url | no | blank | Optional link target. When set, wraps the star-rating in `<a>`. Typical PDP value: `#reviews` (anchors to the review-list section below the product). |
| `show_count` | checkbox | no | `true` | When `false`, hides the count even when resolved. |
| `size` | select | no | `'default'` | One of `small` / `default` / `large`. Emits `size:<value>` modifier; CSS maps to `--rating-star-size`. |
| `color_scheme` | color_scheme | no | (scheme inherited) | Standard appearance setting; emits `color-scheme:<id>` modifier per the schema-conventions block-level color-scheme override pattern. |
| `mobile_margin_block_start` | range (0–100, step 2, px) | no | `0` | Standard top-spacing setting; routes through `utility--block-layout-vars` → `--mobile-margin-block-start`. |
| `desktop_margin_block_start` | range | no | `0` | Same as mobile pair. |

## Output shape

```html
<div class="shopify-block shopify-block--rating"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="size:default,color-scheme:scheme-1">
  <a href="#reviews" class="rating-link">  <!-- only when `link` is set -->
    <span class="star-rating">
      <span class="sr-only">3.5 out of 5 stars, based on 24 reviews</span>
      <svg data-name="star" data-preset="full" aria-hidden="true">…</svg>
      <!-- ...4 more star SVGs... -->
      <span class="rating-count">24</span>
    </span>
  </a>  <!-- closing link wrapper -->
</div>
```

When no source resolves, the block emits no markup (snippet `break`s). When `link` is blank, the inner `<a>` wrapper is omitted (just the `<span class="star-rating">` sits as the direct child).

`data-modifiers` is comma-separated per `modifier-system.md`. The `size:<value>` and `color-scheme:<id>` modifiers always emit (defaults included).

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name`:

```css
.shopify-block--rating {
  --star-size: var(--rating-star-size, 1rem);

  &[data-modifiers*='size:small']   { --rating-star-size: 0.75rem; }
  &[data-modifiers*='size:default'] { --rating-star-size: 1rem; }
  &[data-modifiers*='size:large']   { --rating-star-size: 1.5rem; }

  & .rating-link {
    text-decoration: none;
    color: inherit;
    display: inline-block;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }
}
```

`--star-size` is the variable `star-rating` reads internally; the block re-exposes it as `--rating-star-size` (matching the block's namespacing) and maps the `size:<value>` modifier onto rem values. Per-project overrides set `--rating-star-size` to a custom value.

The `:focus-visible` on the link uses the substrate's body-level focus-visible pattern by default — explicit visible focus on the wrapping anchor when it's keyboard-reached.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--rating-star-size` | Star dimensions (square); maps to `--star-size` read by `star-rating` | `1rem` (default) / `0.75rem` (small) / `1.5rem` (large) per size modifier |

Other star-rating variables (`--count-size`, `--count-color`) inherit defaults from the L0 snippet; per-block override available by setting them on the block root.

## Behavior

### Resolution precedence (single linear chain)

1. **Override path** — when `override=true` AND manual `rating` is set, use manual `rating` + `count`. Manual values can be 0 (which renders as 5 empty stars; semantically different from "no rating available").
2. **Metafield path** — look up `product.metafields[metafield_namespace][metafield_rating_key]`; the count key is optional. Requires `product` context: either the block's manual `product` picker is set, or the ambient context provides one (PDP, product card render).
3. **Blank** — neither path resolves → snippet `break`s; block emits no markup.

### Override checkbox semantics

`override` is both a UI gate (toggles visibility of the manual fields via schema `visible_if`) and a safety control. Three interaction patterns:

- `override=true` + manual filled → manual wins (full override)
- `override=true` + manual blank → falls through to metafield (override is a *license*, not a forced manual mode)
- `override=false` + manual fields hold residual data from prior edit → manual is *ignored*; resolution skips manual entirely; clean fall-through to metafield

The third case prevents the common footgun: a merchant unchecks override but the manual values stick in `block.settings`. Resolution treats them as if blank.

### Product resolution

`block.settings.product` takes precedence when set. Blank → auto-resolves from the rendering context:

- PDP template (`templates/product.json`) → `product` global is available; ambient resolution succeeds
- Product card render (consumer passes the card's product through to embedded blocks) → ambient resolution succeeds via the card's context
- Outside product context (e.g., homepage editorial section) + `product` blank → no metafield lookup possible; falls through to blank

The manual product picker enables "best seller", "featured review", "social proof" placements where the section's natural context isn't a single product.

### Link wrapping

When `link` is set: the entire star-rating renders inside `<a href>`. The link's accessible name comes from the wrapped star-rating's content (its `sr-only` span carries the precise rating + count). No additional `aria-label` on the link by default; consumers wanting custom link labels (e.g., "Read 24 reviews") would need a separate primitive or a future `link_label` arg.

Hover / focus styles target the link wrapper, not the stars themselves — the rating display stays static while the link affordance changes.

### Structured data (AggregateRating JSON-LD)

When a rating resolves (either path), the block emits an `AggregateRating` JSON-LD block via `utility--json-ld`, scoped to the resolved product. Skips emission entirely when blank — JSON-LD with no value is worse than no JSON-LD (search engines penalize structured-data inconsistencies).

JSON-LD shape:

```json
{
  "@type": "AggregateRating",
  "ratingValue": "<resolved rating>",
  "reviewCount": "<resolved count, when present>",
  "bestRating": "5",
  "worstRating": "0"
}
```

Embedded inside the product's full Product schema (the PDP / product-card emits a Product-typed JSON-LD; this block contributes the AggregateRating slot). When the block renders outside the PDP context with a manually-picked product, JSON-LD emission still works — the `product` setting carries the necessary scope.

### Other behaviors

- **All paths blank → no render.** Empty container would be visually wrong (small gap where the rating "should" be); cleaner to render nothing.
- **`size` modifier defaults.** Even when `size: default` is the chosen value, the modifier emits — keeps the styling surface uniform and avoids the "default has no modifier" cognitive split.
- **`color_scheme` modifier emits whenever set** (including default scheme). Re-scopes the color tokens within the block subtree per the per-block color-scheme override pattern (schema-conventions § block-level color scheme).
- **Reduced motion / forced colors.** Inherits from `star-rating` (no transitions defined in the block layer itself) and the substrate body rules.

## A11y

- **`aria-label` ownership** — `star-rating` L0 carries the `sr-only` span with the precise rating + count. The block doesn't add a redundant `aria-label`; the wrapped link inherits the accessible name from its content.
- **Link accessible name from content.** When wrapped, the `<a>` has no explicit `aria-label`; its accessible name comes from the wrapped star-rating's `sr-only` text. Screen readers announce: "Link, 3.5 out of 5 stars, based on 24 reviews".
- **Keyboard accessibility.** Link is naturally focusable; non-linked rating is not interactive. No focus traps.
- **`forced-colors: active`** — stars render via `currentColor` inheritance from the L0 snippet; forced-colors mode preserves legibility.
- **Touch-target compliance.** When linked, the entire `<a>` is the tap target — typically far larger than 44×44 since it wraps the multi-star strip. No additional discipline needed.

## Locale keys

None added by this block. The `star-rating` L0 owns the accessible label keys (`accessibility.star_rating.with_count` / `accessibility.star_rating.no_count`).

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — block-half group).

- **Tier**: theme-primitive (Tier 2 — block-half group; the `star-rating` snippet has its own snippet-half page)
- **Source**: colocated `snippets/rating.validation.json` source + `snippets/rating.test.js` — generate-and-drop through the `?view=validation` slot *(planned)*
- **API surface** (matrix to exercise):
  - **Default state** (`override=false`, metafield filled, product context present) → metafield value renders
  - **`override=false` + metafield blank** → block hidden (no markup)
  - **`override=true` + manual rating ∈ {0, 2.5, 5}** × **count ∈ {0, 42}** → manual values render
  - **`override=true` + manual blank + metafield resolves** → metafield fall-through (the override-as-license behavior)
  - **`override=true` + manual blank + metafield blank** → block hidden
  - **`product` blank + PDP context** → auto-resolves to current product
  - **`product` set + outside PDP context** → uses picker's product
  - **`product` set + inside PDP context** → uses picker's product (overrides ambient)
  - **`link` blank vs link set** — verify wrapping presence + accessible-name chain
  - **`size` ∈ {small, default, large}** — verify star dimensions per modifier
  - **`show_count=false`** — verify count hidden even when resolved
  - **`color_scheme` override** — verify scheme tokens re-scope within the block subtree
- **Edge cases**:
  - All paths blank → block emits no markup (DOM verification, not just visually hidden)
  - `rating > 5` from metafield → clamped by `star-rating` L0
  - `metafield_rating_key` references a missing metafield → falls back to blank gracefully
  - No product context outside PDP/card + `product` blank → falls to blank
  - Decimal precision: rating=2.7 → renders as 2.5 visually (per L0's half-star resolution); sr-only label reads 2.7 precisely (per L0's behavior)
  - Residual manual values when `override=false` → ignored entirely; resolution skips manual
  - AggregateRating JSON-LD only emits when a rating resolves; never when block is hidden
- **Visual showcase**: a matrix of blocks demonstrating sizes × with/without count × with/without link × source variants. Plus a JSON-LD-presence row showing the structured-data block in the page source (view-source verification).
- **Assertions** (prose; Playwright once installed):
  - Every block rendering produces a single `<div class="shopify-block--rating">` root
  - `data-modifiers` contains exactly one `size:<value>` token and one `color-scheme:<id>` token
  - When `link` is set: a single `<a>` child wraps the star-rating; `href` matches
  - When `link` is blank: no `<a>` element inside the block
  - Computed `--rating-star-size` matches the size modifier's mapped value
  - When the block is hidden (all paths blank): no `.shopify-block--rating` element exists in the DOM
  - JSON-LD `<script type="application/ld+json">` with `@type: AggregateRating` present iff rating resolved
- **Unit scope**: none (Liquid + CSS; the L0 `star-rating` snippet has no JS either).

## Implementation-time decisions

- **Setting help text for `metafield_namespace`.** Document common alternatives (Shopify Reviews → `reviews`, Judge.me → `judgeme`, Loox → `loox`, Yotpo → `yotpo`, Stamped → `stamped`) so merchants picking a third-party app know the field is editable. Update when shipped.
- **Block icon for the editor.** Pick from `assets/icon-*.svg` library or add a new `icon-star.svg` variant. The editor preview icon helps merchants recognize the block in the add-block list.
- **`link_label` arg.** Currently the link's accessible name comes from the inherited star-rating content. Some merchant projects want explicit "Read N reviews" labels for SEO + UX clarity. Defer; add later as an optional override.
- **`utility--json-ld` dependency.** Currently planned, not shipped. Verify the utility exists before shipping this block; author it first if absent. Pattern: takes a JSON-encoded string + a `@type`; emits `<script type="application/ld+json">...`. Sibling specs (product / breadcrumb) likely share usage.
- **Manual `rating` step granularity.** Currently 0.5 (matches star-rating's half-star resolution). Some merchants want 0.1 step (more visual precision for displayed value, even though stars render as 0.5). Defer; 0.5 covers the standard case.
- **PDP-only whitelist tightening.** Current `Whitelisted by` lists section + group + columns (broad). If merchants misuse rating in editorial sections without manual `product` set (resulting in hidden blocks), tighten the whitelist to PDP-only contexts. Revisit after first usage data.

## Out of scope

- **Interactive star-picker (review submission flow).** A separate primitive if ever needed — different DOM (focusable inputs, keyboard navigation, click handlers).
- **Multi-rating aggregation** (quality + value + comfort scored separately) — different visual pattern + different block.
- **Variant-level ratings.** Rating is product-level. Variants don't carry their own ratings in Shopify's metafield model.
- **Live update via fetch** (refreshing rating when a new review is submitted client-side) — defer to per-project; would require the review-app integration's own JS.
- **Direct third-party review API integration** (Yotpo, Judge.me, Loox calling their REST APIs from the client). The metafield path is the integration surface — those apps populate the product metafields, which this block reads.
- **Review-list rendering.** The block displays the *aggregate*; rendering individual reviews is a different (typically app-provided) surface.

## Related

- `star-rating.spec.md` — L0 snippet this block composes; owns the visual rendering + accessible label
- `.context/docs/schema-conventions.md` — block-level `color_scheme` override pattern; standard top-spacing pair (`mobile_margin_block_start` / `desktop_margin_block_start`)
- `.context/rules/block-convention.md` — block file structure (thin wrapper: render + schema); snippet ownership of rendering logic
- `.context/docs/modifier-system.md` — `data-modifiers` comma-separated convention; `size:<value>` + `color-scheme:<id>` token shape
- `.context/docs/asset-loading.md` — `utility--json-ld` (planned) routing pattern
- `title.spec.md`, `button.spec.md` — sibling L1 blocks consuming similar block-level color-scheme + top-spacing patterns
