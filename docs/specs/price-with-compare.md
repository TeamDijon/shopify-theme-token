# price-with-compare

**Layer**: 0
**Type**: snippet (`snippets/price-with-compare.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: Shopify `money` filter family (built-in). JS update path: future `pricing.js` module (specced with product blocks).
**Consumers**: PDP price block, product card, cart line items, recommendation strips, comparison tables (all planned)

## Purpose

Single source of truth for price display. Renders current price + optional compare-at (strikethrough) + optional save pill. Exposes raw values via `data-*` so JS can update on variant change without re-querying the server.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `variant` | object | yes\* | Shopify variant. Preferred — derives `price`, `compare_at_price`, `currency` |
| `price` | number | yes\* | Explicit price in cents. Used when no variant context (cart subtotal, custom flows) |
| `compare_at_price` | number | no | Explicit compare-at in cents. Hidden when blank or ≤ `price` |
| `show_compare_at` | boolean | no | Default `true`. Set `false` to suppress compare-at even when present |
| `show_save_pill` | boolean | no | Default `false`. Renders save pill when compare-at > price |
| `money_filter` | string | no | One of `'money'`, `'money_without_trailing_zeros'`, `'money_with_currency'`. Default: `'money_without_trailing_zeros'`. Consumers typically pass a theme-setting value (e.g. `settings.price_format`) |

\* one of `variant` or `price` is required.

## Output shape

```html
<span class="price-with-compare"
      data-price="2999"
      data-compare-at-price="3999"
      data-currency="USD"
      aria-label="…">
  <span class="compare-at-price">{{ compare_at_price | <money_filter> }}</span>
  <span class="current-price">{{ price | <money_filter> }}</span>
  {% if show_save_pill %}<span class="save-pill" aria-hidden="true">−25%</span>{% endif %}
</span>
```

`.compare-at-price` renders empty (CSS `:empty` hides) when blank or ≤ current price — keeps DOM stable for JS updates.

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.price-with-compare {
  display: inline-flex;
  align-items: baseline;
  gap: var(--price-gap, 0.5rem);

  & .compare-at-price {
    text-decoration: line-through;
    color: var(--compare-color, var(--color-role-foreground-secondary));
    font-size: var(--compare-size, inherit);
    &:empty { display: none; }
  }

  & .current-price {
    color: var(--price-color, inherit);
    font-weight: var(--price-weight, 500);
  }

  & .save-pill {
    color: var(--save-color, var(--color-role-background));
    background: var(--save-background, var(--color-accent));
    padding: 0.125rem 0.5rem;
    border-radius: var(--save-radius, 999px);
    font-size: var(--save-size, 0.75rem);
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--price-color` | Current price color | inherits from `color` |
| `--price-weight` | Current price font weight | `500` |
| `--price-gap` | Gap between price elements | `0.5rem` |
| `--compare-color` | Compare-at price color | `var(--color-role-foreground-secondary)` |
| `--compare-size` | Compare-at font size | inherits |
| `--save-color` | Save pill text color | `var(--color-role-background)` |
| `--save-background` | Save pill background | `var(--color-accent)` |
| `--save-size` | Save pill font size | `0.75rem` |
| `--save-radius` | Save pill border radius | `999px` |

## Behavior

- Resolves `price` / `compare_at_price` / `currency` from `variant` when present; explicit args override
- Compare-at hidden (CSS `:empty`) when blank or ≤ current price — DOM element stays for JS to repopulate
- Save pill renders only when `show_save_pill` AND compare-at > price; format `−{{ percent }}%` where `percent = round((compare_at - price) / compare_at * 100)`
- Amounts formatted via the filter named by `money_filter` — Liquid doesn't support dynamic filter names, so the snippet branches via `{% case money_filter %}` and applies the matching filter
- `data-price` / `data-compare-at-price` carry raw cents (Shopify standard) for JS updates
- `data-currency` carries ISO code so JS can format without re-querying Shopify settings
- Early exit (`break`) when neither `variant` nor `price` is provided

## A11y

- Single `aria-label` on root from locale key — combines both prices into one screen-reader announcement
- Save pill `aria-hidden="true"` — the % is redundant with the two prices already in aria-label
- No `aria-live` here — consumer decides (the product-info container can wrap with `aria-live="polite"` when JS updates trigger announcements)

## Locale keys to add

- `accessibility.price.current_only` — `"{{ price }}"`
- `accessibility.price.with_compare` — `"{{ price }}, was {{ compare_at_price }}"`

## Implementation-time decisions

- Save pill format — `−25%` vs `Save 25%` vs `−$10`. Decide with first consumer
- JS update path — `pricing.js` module API (`updatePriceElement(el, variant)` proposed), specced separately when product blocks land

## Out of scope

- Tax/duty/shipping-inclusive pricing — Shopify-settings level
- Multi-currency selector (renders one currency, the active Shopify locale)
- Unit-price display (`$X per kg`) — separate snippet if needed
- Price ranges for products ("From $X") — product-card concern
- B2B tier pricing — handled at variant level by Shopify, snippet receives resolved `variant.price`
