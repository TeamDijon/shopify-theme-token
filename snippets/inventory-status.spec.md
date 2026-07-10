# inventory-status

**Layer**: 0

**Type**: snippet (`snippets/inventory-status.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Shopify variant inventory fields (built-in): `variant.available`, `variant.inventory_management`, `variant.inventory_policy`, `variant.inventory_quantity`
- Semantic `theme_color` palette seeds (`success`, `warning`, `error`, `info`) — emit as `--color-<handle>` per `theme-color.spec.md`. The spec assumes these handles are seeded per `metaobject-definitions.md` § theme_color recommended entries.
- Locale keys under `inventory.state.*` and `accessibility.inventory.*`
- Future `assets/variant-display.js` module — JS update path on variant change; specced separately when product blocks land (likely shared with `price-with-compare`)

**Consumers**:
- PDP buy-buttons block (planned) — primary surface, shows the active variant's inventory state above the add-to-cart
- Product card (planned) — low-stock or sold-out annotation under the price
- Cart line items (planned) — out-of-stock indicator when a cart line's variant has gone unavailable
- Comparison tables / faceted listings (planned)

## Purpose

Variant inventory state as a small inline pill. Resolves a Shopify variant's inventory fields (`inventory_management`, `inventory_policy`, `inventory_quantity`) into one of four states (`in-stock` / `low-stock` / `pre-order` / `out-of-stock`), emits the state as a `data-modifiers="state:<value>"` modifier, and renders a translated label. Per-state color comes from the semantic-color slice of the theme palette (`--color-success` / `-warning` / `-info` / `-foreground-muted`) — merchants get scheme-coherent state colors without per-call configuration.

The snippet is a sub-component primitive — never the root of a theme block. Consumed inline by buy-buttons / product-card / cart-line primitives. Multiple consumption sites share one DOM contract (`.inventory-status` root + the four state modifiers + the data attribute set), so a future `variant-display.js` updates every status pill on the page with one selector.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `variant` | object | yes | — | Shopify variant. Derives `inventory_management`, `inventory_policy`, `inventory_quantity` for state resolution. Blank → snippet `break`s. |
| `threshold` | number | no | `5` | Low-stock cutoff. Quantities `1..threshold` → `low-stock`. Per-project customization via theme setting. |
| `show_in_stock` | boolean | no | `true` | When `false` AND resolved state is `in-stock`, snippet `break`s — common "alerts only" treatment that surfaces low / pre-order / out-of-stock but stays quiet when there's nothing concerning. |

Invoked inline from consumers:

```liquid
{% render 'inventory-status', variant: product.selected_or_first_available_variant, threshold: settings.low_stock_threshold %}
```

## State resolution

Four states, resolved in priority order (first match wins):

| State | Condition |
|---|---|
| `in-stock` | `inventory_management == blank` (untracked inventory) OR `inventory_quantity > threshold` |
| `low-stock` | `inventory_quantity > 0` AND `inventory_quantity <= threshold` |
| `pre-order` | `inventory_quantity <= 0` AND `inventory_policy == 'continue'` (Shopify's "keep selling when out of stock" flag) |
| `out-of-stock` | `inventory_quantity <= 0` AND `inventory_policy == 'deny'` |

**Untracked inventory always resolves to `in-stock`.** Shopify's `inventory_management == nil` means the merchant doesn't track quantities for this variant (digital products, service products, build-to-order items). The snippet treats that as "always available" because Shopify's add-to-cart UI does — there's no signal to display otherwise.

## Output shape

```html
<span class="inventory-status"
      data-modifiers="state:low-stock"
      data-inventory-quantity="3"
      data-inventory-policy="deny"
      data-inventory-management="shopify">
  Low stock — 3 left
</span>
```

- `<span>` root — inline-flow, sits next to the price or above the add-to-cart button.
- `data-modifiers="state:<state>"` — the state token; CSS targets via `[data-modifiers*='state:low-stock']` etc.
- `data-inventory-*` attributes carry the raw variant fields for the JS update path (variant-display.js reads them on variant change, re-resolves state, swaps the modifier + label).
- Label text comes from the matching `inventory.state.<state>` locale key; `low-stock` interpolates `{{ count }}` with the current `inventory_quantity`.

When `show_in_stock: false` AND resolved state is `in-stock`, the snippet emits nothing (`break`).

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name`:

```css
.inventory-status {
  display: inline-flex;
  align-items: center;
  gap: var(--status-gap, 0.25rem);
  font-size: var(--status-size, 0.75rem);
  color: var(--status-color, currentColor);

  &[data-modifiers*='state:in-stock']     { --status-color: var(--in-stock-color,     var(--color-success)); }
  &[data-modifiers*='state:low-stock']    { --status-color: var(--low-stock-color,    var(--color-warning)); }
  &[data-modifiers*='state:pre-order']    { --status-color: var(--pre-order-color,    var(--color-info)); }
  &[data-modifiers*='state:out-of-stock'] { --status-color: var(--out-of-stock-color, var(--color-role-foreground-muted)); }
}
```

`inline-flex` keeps the pill in inline flow alongside the price or buy buttons. The two-level fallback chain (`--<state>-color` → `--color-<semantic>`) lets per-project CSS override at either layer — set `--low-stock-color` for a single per-consumer override, or change the `success`/`warning`/`info` theme_color seeds to repaint every consumer.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--status-color` | Resolved state color (set internally per modifier) | per-state defaults below |
| `--status-size` | Label font size | `0.75rem` |
| `--status-gap` | Gap between elements (icon prefix + label if a consumer adds one) | `0.25rem` |
| `--in-stock-color` | In-stock state color | `var(--color-success)` |
| `--low-stock-color` | Low-stock state color | `var(--color-warning)` |
| `--pre-order-color` | Pre-order state color | `var(--color-info)` |
| `--out-of-stock-color` | Out-of-stock state color | `var(--color-role-foreground-muted)` |

The four semantic-color tokens (`success` / `warning` / `info`) are `theme_color` palette entries — scheme-independent, drawn from `--color-<handle>` emissions per `theme-color.spec.md`. Out-of-stock uses `--color-role-foreground-muted` (scheme-aware muted color) rather than a semantic palette token: out-of-stock is *de-emphasized*, not signaled, so it should fade with the surrounding scheme rather than carry a fixed "neutral" hue.

## Behavior

- **State resolution priority.** The four conditions in § State resolution are tested in order; the first match wins. The order matters at the `inventory_quantity <= 0` boundary: a variant with quantity 0 and policy `continue` resolves to `pre-order`, not `out-of-stock`. The policy field disambiguates.
- **Threshold default `5`.** Common e-commerce default. Per-project customization via a theme setting (`settings.low_stock_threshold`) the consumer passes through. Edge: `threshold = 0` makes `low-stock` unreachable — all positive quantities resolve to `in-stock`. Edge: `threshold` larger than the variant's quantity at any point means every available variant reads as `low-stock`; rare but valid.
- **Untracked inventory.** `variant.inventory_management == blank` (Liquid blank check covers both `nil` and empty string) → `in-stock`. The variant could still have a `inventory_quantity` value (Shopify keeps the field; it's just not authoritative when management is off) — the snippet ignores it.
- **`show_in_stock: false` alerts-only mode.** When this flag is `false` AND state resolves to `in-stock`, the snippet `break`s with no emission. Used on surfaces where the merchant only wants to surface concerning states (low / pre-order / out-of-stock) — the alternative would be visual clutter ("In stock" badges on every product). Default `true` keeps the explicit positive signal.
- **`data-modifiers` is the styling surface.** Per `modifier-system.md`, categorical state lives in `data-modifiers`. The CSS uses `[data-modifiers*='state:<state>']` substring matching (not `[data-modifiers='state:<state>']` exact match) so future composition (e.g. adding a `severity:high` modifier) doesn't break state selectors.
- **`data-inventory-*` raw fields are for JS.** `data-inventory-quantity` / `data-inventory-policy` / `data-inventory-management` carry the variant's raw values. The JS update path reads them on variant change, re-resolves state per the same rules, swaps the modifier token + re-translates the label. No CSS selector reads these — they're a JS-only contract.
- **Label interpolation only for `low-stock`.** The `inventory.state.low_stock` key uses `{{ count }}` to render the remaining quantity. The other three states are flat strings (no quantity context needed; pre-order is policy-driven, out-of-stock has no quantity to show, in-stock is binary).
- **Early exit when `variant` is blank.** Snippet `break`s — no markup. Consumers calling for an absent variant (deleted product variant referenced from an outdated cart line, etc.) get nothing rather than an empty pill.

## A11y

- **Visible text is the label.** No separate `sr-only` label needed — screen readers announce the rendered text natively. The label carries enough context on its own (e.g., `"Low stock — 3 left"` doesn't need a hidden expansion).
- **No `aria-live` on the snippet root.** When a consumer's JS update path swaps the label on variant change, the consumer's wrapper (e.g., `<form>` on the PDP, the product-card container) carries `aria-live="polite"` to scope the announcement. Multiple inventory pills on a page (cart with several lines) would over-announce if each carried its own `aria-live`.
- **`forced-colors: active` handling.** Per-state colors come from theme palette tokens that resolve through `currentColor` in forced-colors mode. The semantic distinction between states relies on color alone today — a future enhancement could add a decorative icon prefix (a leading `icon-warning` for low-stock, etc.) for users who can't perceive color differences. Flagged as an implementation-time decision.
- **Consumer composition adds icons, not the snippet.** Adding an `icon` arg to the snippet would force every consumer to make the icon-or-no-icon decision. Consumers compose icon + status as separate calls when they need it — `{% render 'icon', file_name: 'warning' %}{% render 'inventory-status', variant: variant %}`.

## Locale keys

Four keys under `inventory.state.*`:

- `inventory.state.in_stock` — `"In stock"`
- `inventory.state.low_stock` — `"Low stock — {{ count }} left"` (interpolates `count`)
- `inventory.state.pre_order` — `"Pre-order"`
- `inventory.state.out_of_stock` — `"Out of stock"`

The em-dash (U+2014) in low-stock is the typographically correct separator; locale translations preserve it. Pluralization of `"{{ count }} left"` deferred to implementation-time (`1 left` vs `0 left` edge cases — the `1` case is "Last one!" in many themes, common locale-pluralization concern).

Locale-file structure follows `locale-conventions.md`. Keys live in `locales/en.default.json` and `locales/fr.json`.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Page(s)**: `sections/validation--primitive--inventory-status.liquid` + `templates/index.validation--primitive--inventory-status.json` *(planned)*
- **API surface** (matrix to exercise):
  - **In-stock**: `inventory_management: nil` (untracked); `inventory_quantity > threshold` (e.g. 20, threshold 5)
  - **Low-stock**: `inventory_quantity` at threshold edge (5), just below (4), at minimum positive (1)
  - **Pre-order**: `inventory_quantity: 0` + `inventory_policy: 'continue'`; also negative quantities + `continue` (Shopify allows oversold scenarios)
  - **Out-of-stock**: `inventory_quantity: 0` + `inventory_policy: 'deny'`; also negative + `deny`
  - **`show_in_stock: false`** under each state — confirms in-stock breaks but low/pre-order/out-of-stock still render
  - **Threshold variants**: `threshold: 0` (low-stock unreachable), `threshold: 100` (huge ranges read as low-stock), `threshold: blank` (defaults to 5)
- **Edge cases**:
  - `variant` blank → snippet `break`s; no markup
  - `inventory_management: 'shopify'` + `inventory_quantity` blank → treats blank as `0`, resolves per policy
  - Negative `inventory_quantity` + `continue` policy → resolves to `pre-order` (still allowing orders despite oversold)
  - State boundary at quantity `threshold` exactly → low-stock (the `<=` in the low-stock condition includes the boundary)
  - State boundary at quantity `threshold + 1` exactly → in-stock (the `>` in the in-stock condition excludes the boundary)
- **Visual showcase**: a table per state × `show_in_stock` flag. Each row displays the rendered pill, the state token from `data-modifiers`, and the raw `data-inventory-*` values. Plus a row demonstrating the consumer-composed icon-prefix pattern for accessibility-conscious surfaces.
- **Assertions** (prose; Playwright once installed):
  - `data-modifiers` contains exactly one state token from `{in-stock, low-stock, pre-order, out-of-stock}`
  - `data-inventory-quantity` / `-policy` / `-management` match the variant's raw values (or empty when absent)
  - Rendered label matches the `inventory.state.<state>` locale key (with `{{ count }}` interpolated for low-stock)
  - Computed `color` per state matches the corresponding `--<state>-color` default
  - `show_in_stock: false` + in-stock state → snippet renders nothing (no `.inventory-status` element in DOM)
- **Unit scope**: none (Liquid + CSS). The JS update path (`variant-display.js`, future) carries its own Vitest specs.

## Implementation-time decisions

- **Pluralization of `"{{ count }} left"`.** English `1 left` reads as "Last one!" in some merchant styles. Two options: (a) Shopify t-filter pluralization with `_one` / `_other` variants; (b) special-case `count == 1` with a separate key (`inventory.state.low_stock_one` → `"Last one!"`). Defer to the build pass.
- **Decorative state icons.** Adding a leading `icon` (warning / pre-order clock / sold-out cross) would aid color-blind users. Per-consumer composition (caller renders `icon` next to the status pill) is the proposed pattern, but the snippet could optionally accept an `icon: bool` flag to render its own. Decide at first consumer.
- **JS update path API.** Proposed: `import { updateInventoryStatus } from '@theme/variant-display'; updateInventoryStatus(el, variant)`. The module reads the new variant's inventory fields, re-resolves the state, swaps the `data-modifiers` token via `ModifiersManager` patterns (or simple `setAttribute`), and re-translates the label. Specced when product blocks land — likely shared with `price-with-compare`'s update path.
- **Pre-order vs back-order language.** Pre-order = "this is a pre-launch product accepting orders"; back-order = "we're out, but you can still order and we'll ship when back in stock". Shopify's `inventory_policy: 'continue'` covers both semantically. The label `"Pre-order"` defaults to the more common usage; merchants needing back-order language can override the locale key per project.

## Out of scope

- **Per-location inventory.** Inventory might vary by retail location (pickup vs online). That's a separate primitive (`pickup-availability`, planned Layer 4 section).
- **Inventory date forecasts** (`"Back in stock March 1"`). Requires merchant-entered restock date metafields; separate metafield-driven primitive.
- **Sold-out waitlist signup.** Email-capture for restock notifications is a Layer 4 section (`preorder-notify-me`), not this primitive.
- **Stock progress bars** (`"85% sold"`). Distinct visual treatment, would need its own primitive. The pill model here is text-first.
- **Variant inventory aggregation across a product** (`"Some sizes low stock"`). This snippet covers a single variant. Aggregating across variants is a product-card concern, not a sub-primitive.
- **Cart-line inventory degradation** ("This item is no longer available"). Cart-level state — would need different copy and a different DOM (likely a cart-line modifier, not an inline pill). Out of this primitive's scope.

## Related

- `price-with-compare.spec.md` — sibling sub-component primitive (variant-driven, JS update path); shares the data-attributes + future JS module pattern
- `theme-color.spec.md` — `--color-success` / `-warning` / `-info` palette tokens consumed for state colors (the semantic seed entries per `metaobject-definitions.md` § theme_color)
- `.context/docs/locale-conventions.md` — locale file structure; inventory-domain strings live under `inventory.*`, sr-only labels (if added) under `accessibility.*`
- `.context/docs/modifier-system.md` — `data-modifiers` convention; this snippet emits a single `state:<value>` token
- `.context/rules/a11y-conventions.md` — color-only state distinction notes; flagged in Implementation-time decisions
- `icon.spec.md` — for the decorative-icon prefix consumers may compose alongside the status pill
