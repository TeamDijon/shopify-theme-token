# badge

**Layer**: 0

**Type**: snippet (`snippets/badge.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- `snippets/icon.liquid` (optional leading icon)
- Semantic `theme_color` palette seeds (`success`, `warning`, `error`, `info`) — emit as `--color-<handle>` per `theme-color.spec.md`. The spec assumes these handles are seeded per `metaobject-definitions.md` § theme_color recommended entries.
- Scheme-role tokens (`--color-role-foreground`, `--color-role-background`, `--color-role-primary`) — emitted by `utility--css-variables` per scheme
- Design-constants tokens (`--radius-small`) — emitted by `layer-base.css`

**Consumers**:
- `product-badges` L1 block (planned) — renders sale / new / low-stock / custom badges on product cards
- Blog category / tag pills (planned)
- Promo / status markers across surfaces (planned)
- Any consumer wanting a labeled tone-colored pill

## Purpose

Generic tone-colored pill — label + optional leading icon, rendered as a small inline marker. Six tones (`neutral` / `success` / `warning` / `error` / `info` / `accent`) cover the semantic palette + the scheme accent. Two styles (`tint` default, `solid` modifier) cover the dominant visual treatments. All domain logic (which badges a product gets, what they say) lives in consuming blocks / sections; this snippet renders one badge with given inputs.

The snippet is a sub-component primitive — never the root of a theme block. Consumed inline by block-backed primitives that need labeled markers (product-badges, blog-meta, promo strips). Multiple consumption sites share one DOM contract; per-tone CSS lives centrally in this snippet's stylesheet, so a new consumer adds new badges without per-consumer color rules.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `label` | string | yes | — | Badge text. Blank → snippet `break`s. |
| `tone` | string | no | `'neutral'` | One of `neutral` / `success` / `warning` / `error` / `info` / `accent`. Emits as `tone:<value>` in `data-modifiers`. Off-list values fall through to the neutral default (no matching modifier rule). |
| `icon` | string | no | blank | Icon file_name (without `icon-` prefix, e.g. `'check'`). When set, renders the `icon` primitive before the label via `{% render 'icon', file_name: icon %}`. |
| `badge_style` | string | no | `'tint'` | One of `'tint'` (default — tinted background, tone-colored text) or `'solid'` (solid tone fill, contrast text). Emits as `badge-style:<value>` in `data-modifiers`. |

Invoked inline from consumers:

```liquid
{% render 'badge', label: 'Sale', tone: 'accent', badge_style: 'solid' %}
{% render 'badge', label: 'Free shipping', tone: 'success', icon: 'check' %}
```

## Output shape

```html
<span class="badge" data-modifiers="tone:warning,badge-style:tint">
  <svg data-name="check" aria-hidden="true">…</svg>   <!-- only when icon is set -->
  Low stock
</span>
```

- `<span>` root — inline-flow, sits next to other inline content.
- `data-modifiers` carries `tone:<value>` always (even for neutral — keeps the styling surface uniform) and `badge-style:<value>` always.
- Icon SVG is `aria-hidden="true"` (per the icon primitive's universal contract); the label text carries the meaning.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name` / `& > tag`:

```css
.badge {
  --badge-tone: var(--color-role-foreground);

  display: inline-flex;
  align-items: center;
  gap: var(--badge-gap, 0.25rem);
  padding: var(--badge-padding, 0.125rem 0.5rem);
  border-radius: var(--badge-radius, var(--radius-small));
  font-size: var(--badge-size, 0.75rem);
  font-weight: var(--badge-weight, 500);

  color: var(--badge-text-color, var(--badge-tone));
  background: var(--badge-background, color-mix(in oklab, var(--badge-tone), var(--color-role-background) 88%));

  & > svg {
    inline-size: var(--badge-icon-size, 0.875rem);
    block-size: var(--badge-icon-size, 0.875rem);
  }

  &[data-modifiers*='tone:success'] { --badge-tone: var(--color-success); }
  &[data-modifiers*='tone:warning'] { --badge-tone: var(--color-warning); }
  &[data-modifiers*='tone:error']   { --badge-tone: var(--color-error); }
  &[data-modifiers*='tone:info']    { --badge-tone: var(--color-info); }
  &[data-modifiers*='tone:accent']  { --badge-tone: var(--color-role-primary); }

  &[data-modifiers*='badge-style:solid'] {
    color: var(--badge-solid-text, var(--color-role-primary-button-text));
    background: var(--badge-tone);
  }
}
```

Default **tint** style — tone-tinted background (`color-mix(in oklab, <tone>, <scheme-background> 88%)` — 12% tone mixed into the scheme background, producing a subtle tinted ground) with tone-colored text. Adapts to light + dark schemes without an `-on` pair because the mix base is the scheme background (which itself is scheme-aware).

`solid` style swaps to a solid tone fill with `--color-role-primary-button-text` as the contrast text (designed to read on saturated tone backgrounds — same color the button primary background pairs with).

`color-mix(in oklab, …)` here is *color mixing* (not transparency): the tint is the result of blending two colors. Token's `rgb(from … r g b / α)` covers transparency cases; this is the other surface.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--badge-tone` | Resolved tone color (set internally per modifier; neutral falls through to scheme foreground) | `var(--color-role-foreground)` |
| `--badge-text-color` | Tint-mode text color | `var(--badge-tone)` |
| `--badge-background` | Tint-mode background | `color-mix(in oklab, var(--badge-tone), var(--color-role-background) 88%)` |
| `--badge-solid-text` | Solid-mode text color | `var(--color-role-primary-button-text)` |
| `--badge-size` | Font size | `0.75rem` |
| `--badge-weight` | Font weight | `500` |
| `--badge-padding` | Padding | `0.125rem 0.5rem` |
| `--badge-radius` | Border radius | `var(--radius-small)` (`0.25rem`) |
| `--badge-gap` | Icon-label gap | `0.25rem` |
| `--badge-icon-size` | Icon dimensions (square) | `0.875rem` |

Two-layer override chain on tone colors: the per-tone modifier rules set `--badge-tone` via `var(--<per-project-override>, <default>)` — so per-project CSS can override at either layer (set `--badge-tone` directly for one-off styling, or change the underlying `--color-<semantic>` palette entries to repaint every badge).

## Behavior

- **Tone resolution.** The `tone:<value>` modifier matches one of five rules; the matched rule sets `--badge-tone`. The neutral default has no matching rule — `--badge-tone` stays at its initial value (`var(--color-role-foreground)`). Off-list tone values (e.g. `tone:foo`) also fall through to neutral.
- **Mixed tone-color sources** — by design. Semantic-state tones (success/warning/error/info) use `theme_color` palette entries (`--color-<handle>`) — palette colors don't shift across schemes; a "success" green stays green whether the surrounding scheme is light or dark, because the *state semantic* shouldn't change. The accent tone uses the scheme-role primary (`--color-role-primary`) — the brand accent SHOULD shift with the scheme (the primary in a dark mode is the dark-mode primary). Neutral uses the scheme-role foreground (also scheme-aware) — "neutral" means "blend with surrounding text". Three categories, three sourcing choices, each matching the semantic.
- **Tint vs solid choice.** `tint` is the default — soft, low-contrast, sits well in dense product cards. `solid` is the high-emphasis variant for promotional surfaces (sale badges, "NEW" markers) where the badge should announce itself. Default to tint; consumers opt in to solid per badge.
- **Tint formula is `color-mix(in oklab, <tone>, <bg> 88%)`.** The 88% reads as "88% scheme background, 12% tone" — a subtle tinted ground. Oklab color space gives perceptually-uniform mixing (the tint doesn't shift hue toward muddier shades as it would in sRGB). Per-project tuning: override `--badge-background` to change the formula entirely; or alter the percent by setting a different `--badge-background` per badge variant.
- **Solid text on saturated tones.** The default `--badge-solid-text` is `--color-role-primary-button-text` — the color the scheme's primary button pairs with text. Most schemes set this to a high-contrast value (white on dark primary, dark on light primary). For tones whose contrast against the primary-button-text default is poor, per-call override via `--badge-solid-text`.
- **Icon optional, never decorative-only.** When an icon is set, it sizes via `inline-size`/`block-size` on the SVG (the icon primitive doesn't expose `--icon-size`; consumers set dimensions directly per `icon.spec.md`). The icon is `aria-hidden="true"` per the icon contract; the badge's *label text* carries semantic meaning. A badge with only an icon (no label) doesn't make sense — the snippet `break`s on blank label.
- **Early exit on blank label.** `label` blank → snippet `break`s. A badge with no text reads as a colored dot in the middle of content; if that's the intent, consumers reach for a different primitive.

## A11y

- **Visible text is the label.** No special ARIA on the badge — screen readers announce the rendered text natively. Tone communicates emphasis visually, not semantically; a `"Sale"` badge announces as the word "Sale", not as a tone-colored announcement.
- **Icon is `aria-hidden`** (inherited from the icon primitive). The label text reaches the SR; the icon is decorative.
- **Color-only tone distinction.** Like inventory-status, the per-tone color is the only cue for users who can perceive color. Per-project tonal-icon pairing (e.g., a warning sign icon on every warning-tone badge) reinforces the distinction. The snippet doesn't force this — consumers choose.
- **Redundant badges may be `aria-hidden`.** When a badge restates information already in the surrounding UI (a `"Sale"` badge next to a visible compare-at price), the consumer can wrap or attribute the badge for SR suppression. This snippet's root is a `<span>` for inline flow; consumers add `aria-hidden="true"` via their wrapper or by re-rendering this snippet with that attribute. Not a snippet arg; consumer's call.
- **Solid-mode text contrast assumes saturated tones.** The default `--badge-solid-text` (scheme's primary-button-text) reads well on saturated backgrounds. Light tones (e.g., a custom merchant tone with a pale color) need per-call `--badge-solid-text` override for WCAG compliance.

## Locale keys

N/A — the snippet renders a `label` arg directly. Locale-driven content (translated badge text) is the *caller's* concern: consumers pass `'badge.sale.label' | t` as the `label` arg when they need translation. The snippet itself doesn't define translation keys; per-call labels can come from anywhere.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Page(s)**: `sections/validation--primitive--badge.liquid` + `templates/index.validation--primitive--badge.json` *(planned)*
- **API surface** (matrix to exercise):
  - **All six tones** × **both styles**: 6 × 2 = 12 badges, each with a representative label
  - **With + without icon**: same matrix doubled (24 total)
  - **Long labels**: a tone × style cell with a 30+ character label to verify wrapping behavior (`<span>` allows wrapping; long labels span multiple lines naturally)
  - **Scheme switching**: the entire matrix shown under three scheme overrides (scheme-1 inherited, scheme-2 + scheme-3 overridden). Reader confirms neutral + accent tones shift; semantic tones (success/warning/error/info) stay the same color across schemes (palette-sourced).
  - **Off-list tone**: `tone: 'made-up'` → renders as neutral (no matching modifier rule fires)
- **Edge cases**:
  - `label` blank → no markup
  - `label` with leading/trailing whitespace → preserved as-is (caller's obligation to trim if needed)
  - `icon: 'nonexistent'` → icon primitive emits nothing; badge still renders with just the label (per icon's missing-asset handling)
  - HTML in `label` → Liquid escapes by default when interpolated with `{{ label }}`; no `| escape` needed in the snippet
- **Visual showcase**: a 6×2 (tone × style) grid, each cell showing the badge at a glance. Plus the with/without-icon doubling, the long-label row, and the scheme-cycle band.
- **Assertions** (prose; Playwright once installed):
  - `data-modifiers` contains exactly one `tone:<value>` token from the valid set + exactly one `badge-style:<value>` token
  - Tint mode: computed `color` on the badge matches `--badge-tone` (per the resolved per-tone rule); computed `background-color` matches the `color-mix(…)` result
  - Solid mode: computed `color` matches `--color-role-primary-button-text`; computed `background-color` matches `--badge-tone`
  - Neutral tone (no modifier rule): computed `color` falls through to `var(--color-role-foreground)`
  - Scheme switching: under `[data-modifiers*='color-scheme:scheme-2']`, the accent + neutral tones' computed colors match scheme-2's foreground / primary hex; semantic tones stay constant
- **Unit scope**: none (Liquid + CSS).

## Implementation-time decisions

- **Tint vs solid default.** Currently `tint`. Sale / promo badges typically want solid for emphasis. Revisit default with first consumer; either change the snippet default to `solid` or document the consumer's per-call choice.
- **Tonal-icon pairings as a built-in convention.** Consumers compose `icon` + `badge` per call today. If usage data shows every `success` badge gets a check icon and every `warning` gets a warning sign, a per-tone default-icon could ship in v2. Defer until usage data exists.
- **Badge size scale.** The single default size (`0.75rem` font + `0.125rem 0.5rem` padding) covers most product-card / promo strip use cases. A future size scale (`size:small` / `:medium` / `:large` modifier) would land if larger / smaller badges become a recurring need. Defer until the second size is needed.
- **Reusable named badges via a metaobject.** A `badge` metaobject (entries: handle + label + tone + style + icon) would let merchants seed a catalog and reference by handle (`{% render 'badge', badge: settings.featured_badge %}`). The `label`/`tone`/`icon`/`badge_style` API maps cleanly. Deferred — current per-call API is sufficient.

## Out of scope

- **Badge source resolution.** Product tags → badge list, computed sale percentage → label, inventory state → tone — consumer-block concern (e.g., the planned `product-badges` block). This snippet renders one badge with given inputs.
- **Positioning / stacking on a card.** Product cards stack multiple badges (sale + new + low-stock); the stacking layout (vertical strip on the corner, horizontal row below the title) is the consumer's concern.
- **Interactive / linked pills.** A clickable category pill is a different primitive (sometimes called a `chip` — links with hover/focus states). The simple case wraps this snippet in `<a>` at the consume site; the full primitive ships separately if usage justifies.
- **Removable / closeable pills.** A pill with a close `×` button (filter chip, tag input) is a different primitive with its own interaction model.
- **Computed badge expiry / scheduled visibility.** "Sale ends in 2 days" — time-based gating lives in the consuming block's logic.

## Related

- `icon.spec.md` — leading-icon source; consumers pass `file_name` directly to `badge`, which forwards it
- `inventory-status.spec.md` — sibling tone-colored sub-primitive; uses similar per-state color resolution via `data-modifiers`; styled as a tone-colored inline label rather than a padded pill
- `theme-color.spec.md` — semantic palette tokens (`--color-success` / `-warning` / `-error` / `-info`) consumed for the four semantic tones
- `design-constants.spec.md` — `--radius-small` consumed for the badge corner rounding
- `.context/docs/modifier-system.md` — `data-modifiers` convention; this snippet emits `tone:<value>,badge-style:<value>`
- `utility--css-variables.spec.md` — color-mix vocabulary (used here for tint formula); the substrate's transparency vocabulary (`rgb(from)`) is the sibling — different intents
- `.context/rules/a11y-conventions.md` — color-only state distinction notes (referenced for tone semantics)
