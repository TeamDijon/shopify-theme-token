# payment-icons-strip

**Layer**: 0

**Type**: snippet (`snippets/payment-icons-strip.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Shopify `shop.enabled_payment_types` global (built-in) — default source list when no explicit `types` arg passed
- Shopify `payment_type_svg_tag` filter (built-in) — renders a brand-colored inline SVG for a payment-type string
- Locale keys under `payment.*`

**Consumers**:
- Footer section (planned) — trust strip near the bottom of every page
- Cart trust area (planned) — reinforces accepted methods on the cart page
- PDP trust strip (planned) — optional near-CTA confidence display

## Purpose

Inline row of brand-colored payment-method icons sourced from `shop.enabled_payment_types`. The icons are decorative-by-default; one accessible label on the wrapping list communicates the group's meaning ("Accepted payment methods") to assistive tech without enumerating each icon individually.

The snippet is a sub-component primitive — never the root of a theme block. Consumed inline by chrome / trust-strip surfaces. Multiple consumption sites share one DOM contract; the row is layout-agnostic (wrap-friendly via flex-wrap, lets the consumer's container drive the inline-size).

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `types` | array of strings | no | `shop.enabled_payment_types` | Each entry is a Shopify payment-type identifier (e.g. `'visa'`, `'master'`, `'amex'`, `'paypal'`, `'shopify_pay'`). Pass an override list when the consumer wants a custom subset or ordering; default uses the shop's full enabled set in Shopify's order. |

Invoked inline from consumers:

```liquid
{% render 'payment-icons-strip' %}
```

Or with an override:

```liquid
{% render 'payment-icons-strip', types: 'visa,master,amex' | split: ',' %}
```

## Output shape

```html
<ul class="payment-icons" aria-label="Accepted payment methods">
  <li class="payment-icon" aria-hidden="true"><svg>…visa…</svg></li>
  <li class="payment-icon" aria-hidden="true"><svg>…mastercard…</svg></li>
  <li class="payment-icon" aria-hidden="true"><svg>…amex…</svg></li>
  …
</ul>
```

- `<ul>` root carries the group's accessible name via `aria-label`.
- Each `<li>` wraps one SVG (the payment-type icon, brand-colored, returned by `payment_type_svg_tag`) + carries `aria-hidden="true"`.
- The group label is the sole announcement; SR doesn't enumerate the icons one by one.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& svg`:

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

`flex-wrap: wrap` lets the row break across multiple lines on narrow containers (footer trust strip on mobile). `block-size` is fixed, `inline-size: auto` preserves each icon's intrinsic aspect ratio — payment icons vary (Visa is wide, Mastercard is squarer). `list-style: none` + `padding: 0` + `margin: 0` strip the default `<ul>` chrome since the semantic-list framing is for ARIA, not visual list affordance.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--payment-icons-gap` | Gap between icons | `0.5rem` |
| `--payment-icon-height` | Icon block-size (height); inline-size scales via aspect ratio | `1.5rem` |

Color is not exposed — payment icons are brand-colored (the SVGs returned by `payment_type_svg_tag` carry their own paint). A merchant wanting monochrome treatment would need to override the SVGs themselves (out of this primitive's scope).

## Behavior

- **Source resolution.** `types` arg → `shop.enabled_payment_types` fallback. The fallback gives the shop's full enabled set in Shopify's canonical order (typically: credit cards → wallets → BNPL → bank methods). Consumer-passed `types` array overrides both content and order.
- **Per-type rendering.** Each entry passes through `payment_type_svg_tag`, which returns an `<svg>...</svg>` string with the brand mark. The snippet emits the SVG inside `<li class="payment-icon" aria-hidden="true">`.
- **Off-list types.** `payment_type_svg_tag` returns empty string for an unknown type — the `<li>` still emits but is visually empty. The snippet could gate on this with a `| size` check, but defensive guarding adds complexity for an edge case Shopify guards upstream.
- **Empty list.** When `types` is blank or `shop.enabled_payment_types` is empty (rare; shops typically enable at least one method), the snippet `break`s — no markup. Avoids rendering an empty `<ul>` with an accessible name that points at nothing.
- **Wrapping.** `flex-wrap: wrap` is the default; container-driven. A consumer wanting forced single-line behavior overrides `.payment-icons { flex-wrap: nowrap; overflow-x: auto; }` in its own CSS.
- **Color discipline.** Brand colors come from the SVGs; the snippet doesn't touch fill / stroke / color. `forced-colors: active` (Windows high-contrast) preserves the brand colors via `forced-color-adjust: auto` default. Consumers in extremely-stylized contexts (monochrome footer brands) need to override the SVGs project-side.

## A11y

- **Group-level accessible name** via `aria-label="Accepted payment methods"` on the `<ul>`. SR announces the group once when walking into it.
- **Per-icon `aria-hidden="true"`.** Individual payment icons aren't independently meaningful to SR — the group label conveys the message ("we accept these"). Enumerating each method by brand name adds noise without information for the typical confidence-strip use case.
- **`<ul>` semantic appropriate.** Payment methods are a collection with no inherent textual order; `<ul>` reflects that. The group label is on `<ul>` rather than a wrapping `<nav>` or `<section>` because the icons aren't navigation and don't constitute a content section — they're inline confidence markers.
- **No interactive content.** The strip is pure display. A consumer wanting clickable methods (e.g., payment-method-specific FAQ links) wraps each `<li>` content in `<a>` themselves — uncommon; defer until usage justifies.
- **`forced-colors: active`** — preserves brand colors via the SVGs' explicit fills; no extra handling.

## Locale keys

One key under `payment.*`:

- `payment.accepted_methods` — `"Accepted payment methods"`

Locale-file structure follows `locale-conventions.md`. Key lives in `locales/en.default.json` and `locales/fr.json`.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Source**: colocated `snippets/payment-icons-strip.validation.json` source + `snippets/payment-icons-strip.test.js` — generate-and-drop through the `?view=validation` slot *(planned)*
- **API surface** (matrix to exercise):
  - **Default (no `types` arg)** — uses `shop.enabled_payment_types`; visual confirms every enabled method renders
  - **Explicit `types` override** with a curated list (e.g. `['visa', 'master', 'amex']`) — confirms order + filtering work
  - **`types` array with an unknown entry** (`['visa', 'made_up']`) — confirms `payment_type_svg_tag` empty-return is tolerated; visual shows a gap (empty `<li>`)
  - **Empty `types`** (passed `[]` or shop has zero enabled methods) — confirms snippet `break`s; no `<ul>` in DOM
- **Edge cases**:
  - Single-entry list (`types: ['visa']`) — renders one icon; `<ul>` + label still emit appropriately
  - 10+ methods on narrow viewport — verify wrap behavior; multiple rows
  - RTL locale — verify directional flow (`flex` respects logical direction)
- **Visual showcase**: a table per matrix cell with: input (types passed / shop default), rendered strip, computed accessible name (from DevTools accessibility tree). Plus a viewport-cycling row showing wrap behavior at narrow widths.
- **Assertions** (prose; Playwright once installed):
  - `<ul>` root carries `aria-label` matching `payment.accepted_methods` locale value
  - Each `<li>` carries `aria-hidden="true"` + contains exactly one `<svg>`
  - `<svg>` count matches `types.length` (or `shop.enabled_payment_types.length` when default)
  - Computed `block-size` on each `<svg>` matches `--payment-icon-height` (default `1.5rem`)
  - At narrow viewport (e.g., 320px) with 8+ methods: `<ul>` height exceeds `--payment-icon-height` (wrap fired)
- **Unit scope**: none (Liquid + CSS).

## Implementation-time decisions

- **Empty-`<li>` filtering for unknown types.** `payment_type_svg_tag` returning empty produces a `<li>` with no SVG inside. Two options: (a) trust Shopify's identifier list is canonical and don't guard, (b) wrap the SVG emission in a `| size > 0` check + skip the `<li>` when empty. Option (a) is simpler; option (b) avoids visible-as-gap markup. Decide at first consumer based on whether the markup gap is noticeable.
- **Group label customization.** The default key `payment.accepted_methods` gives "Accepted payment methods" — most consumers want this. A consumer wanting different framing ("Available at checkout", "Payment options", etc.) currently has no override. Could add an `aria_label` arg later if usage shows multiple consumers wanting variants.
- **Per-icon labels via `<title>`.** Currently `aria-hidden` blocks all per-icon announcement. If a consumer (e.g., dedicated payment-methods page rather than confidence strip) needs each icon to announce its brand name, the snippet could emit `<title>` inside each SVG (via post-render injection) + drop `aria-hidden`. Out of scope today; revisit if a consumer needs per-icon SR semantics.
- **Mobile / desktop responsive variants.** Currently one size + wrap. A consumer wanting a smaller `--payment-icon-height` at mobile + larger at desktop sets that via media-query in their own CSS. The snippet doesn't internalize responsive sizing — keeps the primitive minimal.

## Out of scope

- **Custom payment badges beyond Shopify's catalog.** BNPL marketing (Klarna 4-pay badges, Affirm explainer chips), "Buy now, pay later" copy, country-specific bank-transfer marks — those compose at the consumer level, not in this primitive.
- **"Secure checkout" trust copy.** A separate primitive / micro-composition for security messaging — "Your payment is secure", padlock + SSL marks, etc. Not part of this strip.
- **Interactive payment-method linking.** A consumer wanting each icon to link to a per-method FAQ or details page wraps `<li>` contents in `<a>` themselves; not modeled here.
- **Per-payment-method labels.** No per-icon `<title>` / `aria-label` emission. The strip's purpose is group-level confidence; per-method enumeration is a different intent (out of scope).
- **Color overrides.** SVGs carry brand colors; no `currentColor` discipline applies. Monochrome treatments require SVG-source overrides (project CSS can't recolor brand SVGs cleanly).

## Related

- `.context/docs/locale-conventions.md` — locale file structure
- `.context/rules/a11y-conventions.md` — `aria-label` group pattern; decorative icon discipline
- `icon.spec.md` — sibling icon primitive (different sourcing: theme `icon-*.svg` files vs Shopify's `payment_type_svg_tag`); shared decorative-by-default pattern
- Shopify Liquid reference: `shop.enabled_payment_types` (global), `payment_type_svg_tag` (filter)
