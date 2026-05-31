# inventory-status

**Layer**: 0
**Type**: snippet (`snippets/inventory-status.liquid`)
**Status**: spec (not yet implemented)
**Reviewed**: pending
**Depends on**: Shopify variant inventory fields (built-in). JS update path: future `variant-display.js` module (specced with product blocks, likely shared with `price-with-compare`).
**Consumers**: PDP buy-buttons block, product card, cart line items, comparison table (all planned)

## Purpose

Single source of truth for inventory state display. Resolves four states from Shopify variant fields and emits them via the modifier system; consumers style each state visually as needed.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `variant` | object | yes | Shopify variant — derives `available`, `inventory_management`, `inventory_policy`, `inventory_quantity` |
| `threshold` | number | no | Low-stock cutoff. Default: `5` |
| `show_in_stock` | boolean | no | Default `true`. Set `false` to render nothing when state is `in-stock` (common "alerts only" treatment) |

## State resolution

| State | Condition |
|---|---|
| `in-stock` | `inventory_management == nil` OR `inventory_quantity > threshold` |
| `low-stock` | `inventory_quantity > 0 && inventory_quantity <= threshold` |
| `pre-order` | `inventory_quantity <= 0 && inventory_policy == 'continue'` |
| `out-of-stock` | `inventory_quantity <= 0 && inventory_policy == 'deny'` |

## Output shape

```html
<span class="inventory-status"
      data-modifiers="state:low-stock"
      data-inventory-quantity="3"
      data-inventory-policy="deny"
      data-inventory-management="shopify">
  {{ 'inventory.state.low_stock' | t: count: 3 }}
</span>
```

When `show_in_stock` is `false` and state resolves to `in-stock`, the snippet early-exits (`break`) and renders nothing.

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.inventory-status {
  display: inline-flex;
  align-items: center;
  gap: var(--status-gap, 0.25rem);
  font-size: var(--status-size, 0.75rem);
  color: var(--status-color, currentColor);

  &[data-modifiers*='state:in-stock']     { --status-color: var(--in-stock-color, var(--color-success)); }
  &[data-modifiers*='state:low-stock']    { --status-color: var(--low-stock-color, var(--color-warning)); }
  &[data-modifiers*='state:pre-order']    { --status-color: var(--pre-order-color, var(--color-info)); }
  &[data-modifiers*='state:out-of-stock'] { --status-color: var(--out-of-stock-color, var(--color-role-foreground-muted)); }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--status-color` | Resolved state color (set internally per modifier) | per-state default below |
| `--status-size` | Label font size | `0.75rem` |
| `--status-gap` | Gap between child elements | `0.25rem` |
| `--in-stock-color` | In-stock state color | `var(--color-success)` |
| `--low-stock-color` | Low-stock state color | `var(--color-warning)` |
| `--pre-order-color` | Pre-order state color | `var(--color-info)` |
| `--out-of-stock-color` | Out-of-stock state color | `var(--color-role-foreground-muted)` |

Defaults reference the semantic `theme_color` seeds (see `.context/docs/metaobject-definitions.md`). Merchants override via the exposed hooks when brand colors should diverge.

## Behavior

- State resolution per the table above; emitted as `data-modifiers="state:<state>"`
- Untracked inventory (`inventory_management == nil`) always resolves to `in-stock`
- `data-inventory-*` attrs carry raw variant fields for JS update path
- Label text resolved via locale keys (see below); `{count}` interpolated only for `low-stock`
- Early exit (`break`) when `variant` is blank, OR when `show_in_stock: false` and state is `in-stock`

## A11y

- No special ARIA — the rendered text is the label; screen readers read it natively
- Consumer wraps with `aria-live="polite"` when JS updates the state on variant change (same pattern as price-with-compare)

## Locale keys to add

- `inventory.state.in_stock` — `"In stock"`
- `inventory.state.low_stock` — `"Low stock — {{ count }} left"` (count interpolation)
- `inventory.state.pre_order` — `"Pre-order"`
- `inventory.state.out_of_stock` — `"Out of stock"`

## Implementation-time decisions

- JS update of label text on variant change — leans toward emitting all four labels as a `data-labels` JSON attr so the JS module swaps the right one without re-translating client-side. Decide with `variant-display.js` module.
- Optional decorative dot/icon prefix — per-consumer composition, not a snippet arg.
- Whether `pre-order` warrants a separate state from a generic "backorder" — usually merchant-determined via product tag or metafield; leave the snippet as policy-based and let consumers swap labels via theme settings if needed.

## Out of scope

- Per-location inventory (`pickup-availability` is a separate Layer 4 section)
- Inventory date forecasts ("Back in stock March 1") — needs merchant data entry, separate metafield-driven section
- Sold-out waitlist signup — that's the `preorder-notify-me` Layer 4 section
- Stock progress bars ("85% sold") — distinct UI, not a state pill
