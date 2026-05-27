# payment-icons-strip

**Layer**: 0
**Type**: snippet (`snippets/payment-icons-strip.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: `shop.enabled_payment_types`, `payment_type_svg_tag` filter (built-in)
**Consumers**: footer, cart trust area (planned)

## Purpose

Renders the row of accepted payment-method icons from Shopify's enabled payment types, with a single accessible group label.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `types` | array | no | Payment type strings. Default: `shop.enabled_payment_types` |

## Output shape

```html
<ul class="payment-icons" aria-label="{{ 'payment.accepted_methods' | t }}">
  {% for type in types %}
    <li class="payment-icon" aria-hidden="true">{{ type | payment_type_svg_tag }}</li>
  {% endfor %}
</ul>
```

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.payment-icons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--payment-icons-gap, 0.5rem);
  list-style: none;
  padding: 0;
  margin: 0;

  & svg {
    block-size: var(--payment-icon-height, 1.5rem);
    inline-size: auto;
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--payment-icons-gap` | Gap between icons | `0.5rem` |
| `--payment-icon-height` | Icon height | `1.5rem` |

## Behavior

- Loops `types`, rendering each via `payment_type_svg_tag`
- Defaults to `shop.enabled_payment_types` when no explicit list passed
- Early exit (`break`) when `types` is empty

## A11y

- Group `aria-label` ("Accepted payment methods") on the `<ul>`; individual icons `aria-hidden` — the group label conveys the meaning without a verbose icon-by-icon readout
- No interactive content — pure display

## Locale keys to add

- `payment.accepted_methods` — `"Accepted payment methods"`

## Out of scope

- Custom payment badges beyond Shopify's set (BNPL marketing, etc.)
- "Secure checkout" trust copy — separate composition
