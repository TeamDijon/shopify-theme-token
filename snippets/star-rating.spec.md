# star-rating

**Layer**: 0

**Type**: snippet (`snippets/star-rating.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- `snippets/icon.liquid` (renders each star via the `preset` arg)
- `assets/icon-star.svg` (the source SVG; carries `data-half-star` on the first path for partial fills)
- `assets/layer-utilities.css` — star preset CSS rules (`[data-name="star"][data-preset="full|half|empty"]` selector tree resolving `fill` per preset)
- Locale keys under `accessibility.star_rating.*`

**Consumers**:
- `rating` L1 block (primary; planned) — embeds the snippet inside product/review surfaces
- Product-card surfaces (planned) — inline rating beneath product title
- `testimonial` block (planned, if shipped) — optional rating on a testimonial card

## Purpose

Five-star visual treatment for a numeric rating. Resolves a numeric `rating` (0–5, decimal) into a row of five icons using the existing `full` / `half` / `empty` presets on `icon-star.svg`. Single source of truth for star rendering across the theme — the rating block, product cards, and any other rating-bearing primitive consume this snippet rather than re-implementing the star-resolution logic.

The snippet is a sub-component primitive — never the root of a theme block. It carries its own accessible name (the precise rating + count, screen-reader-only) so consumers don't need to write per-call `aria-label`s.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `rating` | number | yes | — | The rating value. Clamped to `0–5` at consumption. Blank → snippet `break`s (emits nothing). Decimals supported; per-star resolution uses 0.5 increments. |
| `count` | number | no | blank | Review count. When set, renders an adjacent `<span class="rating-count">` showing the number. When blank, no count emitted; the SR-only label drops its count suffix. |

The snippet is invoked inline from consumers:

```liquid
{% render 'star-rating', rating: product.metafields.reviews.rating, count: product.metafields.reviews.count %}
```

## Output shape

```html
<span class="star-rating">
  <span class="sr-only">3.5 out of 5 stars, based on 24 reviews</span>
  <svg data-name="star" data-preset="full" aria-hidden="true">…</svg>
  <svg data-name="star" data-preset="full" aria-hidden="true">…</svg>
  <svg data-name="star" data-preset="full" aria-hidden="true">…</svg>
  <svg data-name="star" data-preset="half" aria-hidden="true">…</svg>
  <svg data-name="star" data-preset="empty" aria-hidden="true">…</svg>
  <span class="rating-count">24</span>  <!-- only when count is set -->
</span>
```

`<span>` root keeps the rating inline-flow — sits inside flowing text or alongside a product title without forcing a block break. The five `<svg>` elements come from the `icon` snippet (which injects `aria-hidden="true"` and `data-preset="<value>"` per its own contract; see `icon.spec.md`).

The `sr-only` span carries the precise (unrounded) rating plus optional count — screen readers announce it once before walking past the visually-hidden text and the `aria-hidden` SVGs. The visible-rating-count is decorative for SR (the SR text already names the count).

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name` / `& > tag`:

```css
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;

  & > svg {
    inline-size: var(--star-size, 1em);
    block-size: var(--star-size, 1em);
  }

  & .rating-count {
    margin-inline-start: 0.375rem;
    font-size: var(--count-size, 0.875em);
    color: var(--count-color, var(--color-role-foreground-muted));
  }
}
```

`inline-flex` keeps the rating in inline flow while letting `gap` space the stars consistently regardless of the SVG's intrinsic spacing. The SVGs themselves are sized via `inline-size`/`block-size` on the SVG child — icon SVGs ship without `width`/`height` attributes by convention (see `icon-convention.md`), so the consumer's CSS owns the dimensions.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--star-size` | Star width + height | `1em` (scales with the consumer's text size) |
| `--count-size` | Review-count text size relative to surrounding text | `0.875em` |
| `--count-color` | Review-count text color | `var(--color-role-foreground-muted)` |

`--star-size` and `--count-size` use `em` to scale with the consumer's typography — a star-rating placed inside a `<h2>` reads larger than one in fine print, automatically. Per-consumer overrides via the cascade or a wrapping element's style.

## Behavior

- **Per-star resolution.** For each star index `i` in `1..5`:
  - `rating >= i` → `full`
  - `rating >= i - 0.5` → `half`
  - else → `empty`
  
  A rating of `3.0` produces `full, full, full, empty, empty`. `3.5` produces `full, full, full, half, empty`. `4.7` produces `full, full, full, full, half` (the `>= 4.5` rule wins; 0.7 doesn't round up to a full fifth star — half is the shipped resolution).
- **Half-star is the shipped resolution.** Sub-half precision (quarter-star, 0.1-step) is out of scope. The half-star preset uses `data-half-star` on the first path of `icon-star.svg` and a CSS rule in `layer-utilities.css` filling only that path — adding quarter-star precision would require additional SVG paths and additional preset rules, which the catalog isn't designed for.
- **Rating clamping.** Ratings outside `0–5` clamp at consumption: `rating < 0` → all empty; `rating > 5` → all full. The clamp lives in the snippet, not the caller's responsibility.
- **Early exit on blank rating.** `rating` blank → snippet `break`s (no output). Consumers calling with an absent metafield (`product.metafields.reviews.rating` not set) get no star-rating row, which is the correct rendering (no row > an empty/zero row that misleads).
- **`count` is decorative for SR.** The SR-only label names the count when present; the visible `<span class="rating-count">` is redundant for SR but useful visually. The visible count carries no `aria-` attribute — its content reaches SR through the parent's reading order, but the SR-only label was already announced first, so the announcement order is: (1) "3.5 out of 5 stars, based on 24 reviews", (2) walk past hidden SVGs, (3) "24".
- **`<span>` root for inline flow.** Container is inline-level so the rating sits next to a product title or inside a flowing paragraph. Consumers wanting block flow wrap in `<div>` themselves.
- **`inline-flex` is the layout primitive.** Inside the inline-flow `<span>`, `inline-flex` gives consistent spacing via `gap` without baseline-alignment quirks that come from inline SVG layout. The container's `align-items: center` keeps stars + count vertically centered.
- **`currentColor` inheritance.** Icon SVGs use `currentColor` per the icon convention. The rating's `color` comes from the consumer's cascade — a star-rating inside a `<button>` reads the button's text color, inside a `<p>` reads the body color, etc. No explicit `--star-color` variable; per-element color overrides happen by setting the consumer's `color`.

## A11y

- **`sr-only` label carries the precise rating + count.** Format: `"{{ rating }} out of 5 stars, based on {{ count }} reviews"` (when count is set) or `"{{ rating }} out of 5 stars"` (when count is blank). The rating value is the unrounded number — `3.7 out of 5 stars` reads accurately, not the visual `3.5` from the half-star resolution.
- **Individual stars are `aria-hidden="true"`.** Inherited from the `icon` snippet's universal aria-hidden injection (see `icon.spec.md`). The SVGs don't reach the SR; the parent's `sr-only` label is the sole announcement.
- **`forced-colors: active` keeps stars legible.** The CSS uses `currentColor` for fills, so high-contrast mode picks up the user's preferred text color. The preset selectors use `fill` (which respects `forced-colors-adjust: auto` by default) without explicit color overrides.

## Locale keys

Two keys under `accessibility.star_rating.*`:

- `accessibility.star_rating.with_count` — `"{{ rating }} out of 5 stars, based on {{ count }} reviews"` (used when `count` is set; both interpolations expected)
- `accessibility.star_rating.no_count` — `"{{ rating }} out of 5 stars"` (used when `count` is blank)

Two keys instead of one with conditional interpolation — the t-filter doesn't conditionally drop interpolation arguments, so a single template `"{{ rating }} out of 5 stars, based on {{ count }} reviews"` would emit a literal `based on  reviews` (empty interpolation) when `count` is blank. Two keys keep the translated strings natural per locale.

Locale-file structure follows `locale-conventions.md`. Both keys live in `locales/en.default.json` and `locales/fr.json`.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half) and Tier 1c (utility-css for the star preset rules — covered indirectly by the icon validation path).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Source**: colocated `snippets/star-rating.validation.json` source + `snippets/star-rating.test.js` — generate-and-drop through the `?view=validation` slot *(planned)*
- **API surface** (matrix to exercise):
  - **Rating values across the spectrum**: `0`, `0.4` (< 0.5 → all empty), `0.5` (one half-star), `1.0`, `2.5`, `3.7` (rounds visually to 3.5; SR reads 3.7), `4.5`, `5.0`
  - **Count states**: blank (no count rendered, SR label drops suffix), `1` (singular grammar consideration — `1 review` vs `1 reviews` — depending on locale), `1000` (large value; visual layout doesn't break)
  - **Out-of-range ratings**: `-1` (clamp to 0, all empty), `5.7` (clamp to 5, all full)
- **Edge cases**:
  - `rating` blank → snippet `break`s; no markup
  - `rating` = `0` (vs blank) → row of 5 empty stars renders; SR reads `"0 out of 5 stars"` — semantically different from blank
  - `count` = `0` → suffix grammar (`"0 reviews"`) renders; visual count badge shows `0`. Consumers wanting "no count when zero" handle that upstream
  - Consumer at base text size (1rem) vs h2 (e.g. 2rem) → stars scale via `1em` default; verify visually that nested star-ratings (e.g. inside testimonial cards) inherit appropriate size
- **Visual showcase**: a table of every rating value above × every count state. Reader confirms the visual matches the documented per-star resolution rule.
- **Assertions** (prose; Playwright once installed):
  - Output contains exactly five SVG elements, each with `data-name="star"` + `data-preset` ∈ `{full, half, empty}`
  - `data-preset` per star matches the resolution rule for the given rating
  - SR-only span text matches `accessibility.star_rating.{with_count,no_count}` per the count state
  - Visible rating-count text matches the numeric count when present; absent when count is blank
  - Star color (computed `currentColor`-resolved fill) matches the consumer's `color` cascade
- **Unit scope**: none (Liquid + CSS; no JS).

## Implementation-time decisions

Open questions to resolve when the snippet ships:

- **Count format pluralization.** `"based on 1 reviews"` reads wrong. Options: (a) two singular/plural key variants (`with_count_one`, `with_count_other`) using Shopify's t-filter pluralization (`'accessibility.star_rating.with_count' | t: count: count`); (b) wrap the count with a separate `accessibility.star_rating.count_suffix` key that adopts plural form. The Shopify pluralization filter is the canonical solution — defer the exact key shape to the build pass.
- **Rounded-down visual vs precise SR.** A rating of `4.7` visually shows `4.5` (half-star); SR reads `4.7`. The mismatch is intentional (precise data for SR, simplified visual) but the build pass should verify it doesn't surprise merchants reviewing the rendering.
- **`--star-color` override knob.** Not currently exposed (`currentColor` cascade is the sanctioned path). If usage shows recurring cases where the star color needs to diverge from the surrounding text (e.g., gold stars on a primary-button-colored testimonial card), add `--star-color` as an explicit override. Defer; revisit at first consumer.

## Out of scope

- **Interactive star-picker for review submission.** This snippet renders read-only ratings. A future `star-picker` primitive (input element, keyboard navigation, click handlers) would be a separate snippet.
- **JS update path for variant changes.** Rating is product-level metafield data, not variant-level. No JS-driven re-render on variant switch.
- **Sub-0.5 visual precision.** Half-star is the shipped resolution. Quarter-star or finer requires additional SVG paths and preset rules.
- **Aggregated multi-rating display.** Reviews → distribution histogram (`X 5-star reviews, Y 4-star reviews, …`) is a separate primitive. This snippet renders a single aggregated value.
- **Schema.org `AggregateRating` JSON-LD emission.** The `rating` L1 block emits the JSON-LD when consumer context demands it (product schema, article review). This snippet renders the visual only.
- **Non-star icons.** Hearts, thumbs, diamonds, etc. would need their own preset CSS rules and their own snippet (or a parameterized primitive). Stars are the shipped aesthetic.

## Related

- `icon.spec.md` — the primitive that renders each star; reads `preset` to apply the `data-preset` attribute
- `.context/rules/icon-convention.md` — SVG file authoring rules; explains the `data-half-star` part-attribute used by the half preset
- `assets/layer-utilities.css` — the star preset CSS rules (`[data-name="star"][data-preset="..."]` selectors)
- `rating.spec.md` — L1 block consumer (planned); wraps the star-rating snippet with metafield-first rating data + AggregateRating JSON-LD
- `.context/docs/locale-conventions.md` — locale file structure and the `t:` filter prefix for schema-side translations
- `.context/rules/a11y-conventions.md` — `sr-only` utility pattern and `accessibility.*` namespace conventions
