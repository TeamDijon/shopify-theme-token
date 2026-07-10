# price-with-compare

**Layer**: 0

**Type**: snippet (`snippets/price-with-compare.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Shopify `money` filter family — built-in (`money`, `money_without_trailing_zeros`, `money_with_currency`, `money_without_currency`)
- Locale keys under `accessibility.price.*`
- Future `assets/pricing.js` module — JS update path for variant-driven re-render; specced separately when product blocks land

**Consumers**:
- PDP price block (planned) — primary surface, shows the active variant's price
- Product card surfaces (planned) — inline price beneath product title
- Cart line items (planned) — per-line price
- Recommendation strips (planned)
- Comparison tables / faceted listings (planned)

## Purpose

Single source of truth for price display. Renders current price + optional compare-at (strikethrough) + optional save pill. Exposes raw price values + currency code via `data-*` attributes so a JS update path can re-render on variant change without re-querying the server.

The snippet is a sub-component primitive — never the root of a theme block. Consumed inline by block-backed primitives that include pricing (PDP price block, product card, cart line). Multiple consumption sites share one DOM contract (`.price-with-compare` root + the three inner spans + the data attribute set), so a future `pricing.js` updates every price on the page with one selector.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `variant` | object | conditional | — | Shopify variant. When set, derives `price` from `variant.price`, `compare_at_price` from `variant.compare_at_price`, currency from `cart.currency.iso_code` (cart context) or `shop.currency`. Preferred input shape for product / cart consumers. |
| `price` | number | conditional | — | Explicit price in cents (Shopify's amount-in-cents convention). Used when no variant context (cart subtotal, custom flows). Takes precedence over `variant.price` when both are passed. |
| `compare_at_price` | number | no | blank | Explicit compare-at in cents. Hidden when blank or `≤ price`. Takes precedence over `variant.compare_at_price`. |
| `show_compare_at` | boolean | no | `true` | When `false`, suppresses compare-at even when present in `variant.compare_at_price`. Caller chooses to hide the savings story (cart line summary, etc.). |
| `show_save_pill` | boolean | no | `false` | When `true` AND compare-at exceeds price, renders the save pill (`−25%` etc.). Off by default — most consumers show the strikethrough alone. |
| `money_filter` | string | no | `'money_without_trailing_zeros'` | One of `'money'`, `'money_without_trailing_zeros'`, `'money_with_currency'`, `'money_without_currency'`. Selects the Liquid filter to format the cent amount. Consumers typically pass a theme-setting value (e.g. `settings.price_format` if such a setting is defined). |

Either `variant` or `price` must produce a non-blank price; otherwise the snippet `break`s. Compare-at follows the same fall-through: explicit arg → `variant.compare_at_price` → blank.

## Output shape

```html
<span class="price-with-compare"
      data-price="2999"
      data-compare-at-price="3999"
      data-currency="USD">
  <span class="sr-only">29.99, was 39.99</span>
  <span class="compare-at-price">$39.99</span>
  <span class="current-price">$29.99</span>
  <span class="save-pill" aria-hidden="true">−25%</span>
</span>
```

- `<span>` root keeps the price inline-flow. Consumers wanting block flow wrap in `<div>` themselves.
- `data-price` / `data-compare-at-price` carry raw cents (the Shopify standard amount unit). JS can re-read + update without re-querying.
- `data-currency` carries the ISO 4217 code (e.g. `USD`, `EUR`). Lets the JS update path format prices client-side without re-fetching shop settings.
- `.compare-at-price` always emits (DOM stays stable for JS updates), but renders empty + visually hidden (`:empty { display: none }`) when no compare-at applies.
- `.save-pill` only emits when `show_save_pill` is `true` AND compare-at > price.

The `sr-only` span is the SR-only label; visible spans are `aria-hidden` by default reading order through the parent — see § A11y.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name`:

```css
.price-with-compare {
  display: inline-flex;
  align-items: baseline;
  gap: var(--price-gap, 0.5rem);

  & .compare-at-price {
    color: var(--compare-color, var(--color-role-foreground-muted));
    font-size: var(--compare-size, inherit);
    text-decoration: line-through;
    text-decoration-thickness: 0.0625rem;

    &:empty { display: none; }
  }

  & .current-price {
    color: var(--price-color, inherit);
    font-weight: var(--price-weight, 500);
  }

  & .save-pill {
    color: var(--save-color, var(--color-role-primary-button-text));
    background: var(--save-background, var(--color-role-primary));
    padding: 0.125rem 0.5rem;
    border-radius: var(--save-radius, var(--radius-pill));
    font-size: var(--save-size, 0.75em);
    font-weight: 600;
  }
}
```

`inline-flex` + `gap` keeps the three elements (compare / current / pill) consistently spaced regardless of font metrics. `align-items: baseline` lines the strikethrough and current prices on text baselines — looks right when they're the same font-size, and degrades gracefully when sizes differ via `--compare-size`.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--price-color` | Current price color | inherits from `color` |
| `--price-weight` | Current price font weight | `500` |
| `--price-gap` | Gap between compare / current / pill | `0.5rem` |
| `--compare-color` | Compare-at price color | `var(--color-role-foreground-muted)` |
| `--compare-size` | Compare-at font size | `inherit` (matches current price) |
| `--save-color` | Save pill text color | `var(--color-role-primary-button-text)` |
| `--save-background` | Save pill background | `var(--color-role-primary)` |
| `--save-size` | Save pill font size | `0.75em` (relative to surrounding text) |
| `--save-radius` | Save pill border radius | `var(--radius-pill)` (fully rounded) |

The defaults wire into the scheme-role token system + design constants — a project switching color schemes gets a scheme-appropriate save-pill, and tuning the global radius scale ripples into the pill rounding. Per-consumer overrides via cascade or wrapping-element style.

## Behavior

- **Variant vs explicit input.** When `variant` is passed, the snippet reads `variant.price` and `variant.compare_at_price`. Explicit `price` / `compare_at_price` args override on a per-arg basis — a caller can pass `variant` + an override `price` for "the variant's data minus the price we'll re-derive ourselves" use cases. Currency comes from `cart.currency.iso_code` in cart context, falling back to `shop.currency` for non-cart pages.
- **Compare-at gating.** Three conditions hide compare-at: (1) blank/null, (2) `compare_at_price ≤ price` (no savings), (3) `show_compare_at: false`. In the first two cases, `.compare-at-price` still emits but is empty — `:empty { display: none }` hides it visually. The DOM element stays for JS updates: a JS variant-change handler can populate the empty `<span>` when the new variant has compare-at, without re-rendering structure.
- **Save pill computation.** `percent = ((compare_at_price - price) / compare_at_price * 100) | round`. The minus-sign is U+2212 (`−`), not the ASCII hyphen — typographically correct for negative numbers. Pill format is `−{{ percent }}%` (e.g. `−25%`).
- **Dynamic filter selection.** Liquid doesn't support dynamic filter names — `{{ amount | <var-named-filter> }}` doesn't work. The snippet branches via `{% case money_filter %} {% when 'money' %}{{ amount | money }} {% when 'money_with_currency' %}{{ amount | money_with_currency }} {% ... %}`. The four supported filters cover the standard Shopify family; off-list values fall to the default branch (`money_without_trailing_zeros`).
- **Early exit on missing price.** Both `variant` and `price` blank → snippet `break`s. The caller's pricing surface is absent (out-of-stock, deleted variant, etc.); rendering an empty container would be a visual artifact.
- **`data-currency` is for JS, not display.** The currency display character (`$`, `€`) comes from the formatted price via the money filter. The `data-currency` attribute carries the ISO code for JS update paths that need to format prices client-side. The two surfaces — visible price text vs ISO code data attribute — coexist on the root.
- **No `aria-live` on the root.** This snippet renders static markup. When a consumer's JS update path replaces price text via a variant-change handler, the consumer's container (e.g., `<form>` on the PDP) carries `aria-live="polite"` to scope the announcement. Multiple price snippets on a page (current variant + recommendations) would over-announce if each carried its own `aria-live` — defer to the consumer.

## A11y

- **`sr-only` label carries the combined price story.** Format: `"{{ price }}, was {{ compare_at }}"` when compare-at applies, `"{{ price }}"` otherwise. The values are the formatted money strings (e.g., `"$29.99, was $39.99"`) — pre-translated by the money filter, which respects Shopify's locale settings.
- **Save pill is `aria-hidden="true"`.** The `−25%` is redundant with the `sr-only` label (which already names both prices and lets the user infer the savings). Hiding the pill from SR avoids the awkward `"minus 25 percent"` announcement on top of the prices.
- **Visible price spans aren't `aria-hidden`.** Modern SRs handle inline structured text well — the `sr-only` label fires first, then the SR walks the visible content. The `:empty` compare-at span is fully removed from the AT tree by `display: none`, so empty-state announcements don't fire.
- **`forced-colors: active` keeps prices legible.** Default `color: inherit` on current price, `var(--color-role-foreground-muted)` on compare-at — both resolve through `currentColor` ultimately, which forced-colors mode picks up. The save pill's background-via-system-color is the one risk; tested at implementation time.

## Locale keys

Two keys under `accessibility.price.*`:

- `accessibility.price.current_only` — `"{{ price }}"` (used when compare-at is hidden)
- `accessibility.price.with_compare` — `"{{ price }}, was {{ compare_at_price }}"` (used when compare-at applies)

Two keys (instead of one with conditional interpolation) — Shopify's t-filter doesn't drop empty interpolations naturally, and the comma + grammar reads wrong in a single-key version. Keys live in `locales/en.default.json` + `locales/fr.json` per `locale-conventions.md`.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Page(s)**: `sections/validation--primitive--price-with-compare.liquid` + `templates/index.validation--primitive--price-with-compare.json` *(planned)*
- **API surface** (matrix to exercise):
  - **`variant` input** with realistic data: variant whose `price` < `compare_at_price` (sale), variant whose `price = compare_at_price` (no compare-at shown), variant with `compare_at_price: null`
  - **Explicit `price` / `compare_at_price` input** (no variant): cart subtotal scenario; sale scenario; mismatch scenario (compare-at < price → hidden)
  - **`show_compare_at: false`**: suppresses even when compare-at applies
  - **`show_save_pill: true`** under each compare-at state: pill emits with computed percent / pill absent when no savings
  - **Each `money_filter` value**: `money`, `money_without_trailing_zeros`, `money_with_currency`, `money_without_currency` — visual confirm each formats correctly
  - **Currency switching**: USD vs EUR vs JPY (zero-decimal currency); `data-currency` carries ISO code; visible price formats per filter
- **Edge cases**:
  - Both `variant` and `price` blank → snippet `break`s; no markup
  - `variant` with `price: null` → break (treated as blank)
  - `compare_at_price` < `price` → compare-at hidden (the `:empty` rule); DOM element preserved
  - `compare_at_price` equal to `price` → same (no savings = no compare-at)
  - `show_save_pill: true` but compare-at hidden → pill doesn't render (gated on both flags AND savings > 0)
  - Off-list `money_filter` (e.g. `'invalid'`) → falls to the default branch (`money_without_trailing_zeros`)
  - Zero-decimal currency (JPY: `¥2999` = 2999 yen, not 29.99) — the money filter respects Shopify's currency rules; the snippet doesn't divide cents
- **Visual showcase**: a table of (variant state) × (filter choice) × (compare/save flags), with each row rendering the snippet. Reader confirms: visible prices format correctly per filter; compare-at strikes through and uses muted color; save pill computes correct percent + renders in primary scheme color; SR-only label reads correctly when SR is on.
- **Assertions** (prose; Playwright once installed):
  - `data-price` matches the rendered cent value
  - `data-compare-at-price` is present (possibly empty string) regardless of compare-at visibility
  - `data-currency` matches `shop.currency` or `cart.currency.iso_code` per context
  - Visible `.current-price` text matches the formatted output of the selected filter
  - When compare-at hidden, `.compare-at-price` exists with empty text content; computed `display` is `none`
  - When save pill present, `.save-pill` text matches `−{{ percent }}%` with U+2212 minus sign
  - SR-only span matches `accessibility.price.with_compare` (or `current_only`) per the compare-at state
- **Unit scope**: none (Liquid + CSS). The JS update path that consumes the data attributes (`pricing.js`, future) carries its own Vitest specs.

## Implementation-time decisions

- **Save pill format.** Three options: `−25%` (the spec's default — minimal, math-style), `Save 25%` (verb-led, more explicit), `−$10` (absolute amount, useful for high-priced items where percent reads abstract). The spec picks `−25%` for consistency across currencies; revisit if usage shows merchants asking for explicit amount.
- **Pluralization of the SR `was` clause.** English `was` is singular; some locales need plural forms based on the price magnitude. Defer to first locale beyond en/fr.
- **JS update path API.** Proposed: `import { updatePriceElement } from '@theme/pricing'; updatePriceElement(el, variant)`. The module reads the variant's `price` / `compare_at_price`, formats via a JS money formatter (`new Intl.NumberFormat(locale, { style: 'currency', currency: el.dataset.currency })`), and rewrites the three inner spans. Specced separately when the product block lands.
- **`--price-weight` default `500`.** Medium weight reads as emphasized vs the body text; designer review may push it to `600` (semibold) or back to `400` (no emphasis, current price differentiated by position alone). Defer to first PDP design pass.

## Out of scope

- **Tax / duty / shipping-inclusive pricing** — Shopify-settings level; the variant's `price` already reflects whatever pricing display the merchant chose. The snippet doesn't compute taxes.
- **Multi-currency selector UI** — renders one currency (the active locale's). A currency-picker primitive is a separate concern.
- **Unit-price display** (`$X per kg`) — separate snippet; common on grocery / wholesale themes. Token doesn't ship one by default.
- **Price ranges for products** (`From $X`) — a product-card concern, not a single-variant snippet. The product-card primitive composes price range strings on its own.
- **B2B tier pricing** — handled at variant level by Shopify (the variant's `price` already reflects the customer's tier). The snippet receives the resolved value.
- **Subscription / one-time pricing toggles** — selling-plan-aware pricing is a higher-level concern (PDP's selling-plan section), not this snippet.
- **Inline percent off as primary display** (`25% off – $29.99`) — different visual hierarchy than this snippet's compare-at-then-price model. A future `price-with-percent-prominent` would be a variant snippet.

## Related

- `.context/docs/locale-conventions.md` — locale file structure and the `t:` filter prefix
- `.context/rules/a11y-conventions.md` — `sr-only` utility pattern and `accessibility.*` namespace conventions
- `.context/docs/design-system-metaobjects.md` — scheme-role tokens consumed for save-pill colors (primary, primary-button-text) and compare-at muted color (foreground-muted)
- `design-constants.spec.md` — `--radius-pill` consumed for the save pill rounding
- `rating.spec.md` — sibling L1 block planned (also consumes a small inline primitive); when product blocks land, the PDP composition pattern crystallizes
- `inventory-status.spec.md` — sibling sub-component primitive (variant-level state pill); shares the JS update path pattern (variant change → re-read data-* + re-render)
