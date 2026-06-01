# spacing

**Layer**: substrate

**Type**: metaobject (`spacing`)

**Status**: shipped

**Implementation**:
- `snippets/utility--css-variables.liquid` v1.13.0 (CSS variable emitter — `--spacing-<handle>` per entry, mobile value in `:root`, desktop value in nested `@media (width >= 48rem)`)
- `sections/section.liquid` v1.6.0 (`block_rhythm` setting consumer — emits `--block-rhythm: var(--spacing-<picked-handle>)` per section)
- `assets/layer-theme.css` (block-rhythm cascade rule — reads `var(--block-rhythm)` for inter-block margin)
- `assets/layer-base.css` (substrate defaults seed `--spacing-xs/sm/md/lg/xl` for the T-shirt slots; metaobject entries with matching handles override these via cascade position)
- Metaobject definition itself — created per `metaobject-definitions.md` § `spacing`

**Reconciled**: 2026-06-01 (paired with the design-constants cycle: utility--css-variables v1.13.0 + section.liquid v1.6.0 + layer-base.css spacing scale addition + block-rhythm namespace migration)

**Reviewed**: pending

**Depends on**: substrate `--spacing-xs/sm/md/lg/xl` defaults in `layer-base.css` — the metaobject's substrate-aligned handles override these defaults via cascade position. No other primitive or utility dependencies.

**Consumers**:
- `snippets/utility--css-variables.liquid` — iterates `metaobjects.spacing.values`, emits `--spacing-<handle>` for each (mobile in `:root`, desktop in `@media`)
- `sections/section.liquid` — `block_rhythm` setting (metaobject picker) drives `--block-rhythm: var(--spacing-<handle>)` per-section
- Any consumer reading `var(--spacing-<handle>)` directly — substrate-T-shirt-slot consumers (`var(--spacing-md)` etc.) for static defaults; per-instance dynamic-style consumers via the indirection pattern (`var(--component-spacing, var(--spacing-md))` + `--component-spacing: var(--spacing-<picked>)` from per-block setting)
- Block-level top-spacing escape-hatch (raw `mobile_margin_block_start` / `desktop_margin_block_start` px ranges on blocks) — *not* metaobject-driven; the spacing metaobject is for rhythmic / shared tokens, raw px is for per-instance overrides on top

## Purpose

A named spacing token catalog. Each entry holds a mobile + desktop px pair; entries auto-emit as `--spacing-<handle>` CSS variables in `:root` (mobile value) with a nested `@media (width >= 48rem)` branch (desktop value). The unified `--spacing-*` namespace serves the whole theme: substrate components read `var(--spacing-md)` for static defaults, per-instance dynamic style swaps to a picked handle, block-rhythm consumes the namespace as `var(--spacing-<handle>)` per section.

The design earns its keep by collapsing what would otherwise be three parallel vocabularies — substrate spacing defaults, block-rhythm spacing, component-padding spacing — into one shared `--spacing-<handle>` namespace. A merchant tuning the `md` entry from 16px to 18px propagates the change through every consumer reading `var(--spacing-md)` without per-component re-wiring.

The substrate **does not auto-bind** in the way `text_style`'s `h1`–`h6` bind to HTML tags. Two emitters write to the same `--spacing-<handle>` namespace: `layer-base.css` seeds T-shirt defaults; `utility--css-variables` emits the metaobject loop later in the same `:root`. Matching handles override via cascade position; non-matching handles add new spacing slots that coexist. See `design-constants.md` for the substrate side.

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name in admin (e.g., `Medium`, `Spacious`, `Hero-section`). `system.handle` derives from it on creation. |
| `mobile_value` | Number (decimal) | yes | Spacing value on mobile, in **px**. Emitted as `--spacing-<handle>: <value>px` in `:root`. |
| `desktop_value` | Number (decimal) | yes | Spacing value on desktop (≥768px), in **px**. Emitted as `--spacing-<handle>: <value>px` inside `@media (width >= 48rem)`. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

**Two-value-per-token** is the load-bearing schema choice. Horizon-style single-value-with-a-scale-multiplier doesn't accommodate exotic entries (e.g., `0px` mobile / `48px` desktop for a section that needs no rhythm on mobile but breathing room on desktop). The two-value catalog stays flat and explicit; merchants set arbitrary pairs without re-architecting the scale.

## Output shape

The emitter writes one variable per entry inside the `:root` block, plus matching overrides inside the nested `@media (width >= 48rem)`:

```css
:root {
  /* …theme_color palette… */
  /* …gradient block… */
  /* …gutter…  */

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 32px;
  --spacing-xl: 64px;
  --spacing-hero-section: 80px;  /* per-project custom handle */

  @media (width >= 48rem) {
    --gutter: var(--desktop-gutter);

    --spacing-xs: 8px;
    --spacing-sm: 12px;
    --spacing-md: 24px;
    --spacing-lg: 48px;
    --spacing-xl: 96px;
    --spacing-hero-section: 120px;
  }
}
```

The substrate-aligned handles (`xs` / `sm` / `md` / `lg` / `xl`) override the `layer-base.css` defaults emitted earlier in the cascade. The `hero-section` handle is a per-project addition with no substrate counterpart — it just adds a new `--spacing-hero-section` slot.

When no `spacing` metaobject entries exist (fresh-install store before seeding), only the substrate defaults from `layer-base.css` emit. The T-shirt slots remain functional; the catalog is just empty.

## CSS

N/A at the metaobject layer — emission rules live in `utility--css-variables`'s output. The metaobject contributes the data; the snippet composes the rule.

## CSS custom properties (exposed)

| Variable | Type | Source |
|---|---|---|
| `--spacing-<handle>` | `<value>px` (mobile in `:root`, desktop in nested `@media`) | one per metaobject entry; substrate-aligned handles override `layer-base.css` defaults via cascade position |

The substrate defaults exposed by `layer-base.css` (`--spacing-xs/sm/md/lg/xl`) are documented in `design-constants.md`. This spec doesn't duplicate them — the metaobject's job is the override / extension surface on top of those defaults.

## Behavior

- **Dual emission, cascade-driven override.** Substrate (`layer-base.css`) emits T-shirt defaults; `utility--css-variables` emits the metaobject loop later in the same `:root`. Matching handles override; non-matching add new slots. No skip-on-same-value logic — comparison at Liquid emit time is fragile (px vs rem, integer vs float); always-emit keeps the loop simple.
- **Mobile in `:root`, desktop in nested `@media (width >= 48rem)`.** The two-branch emission matches the metaobject's two-value schema. CSS variables are substituted at use-site (per Variables Level 1 spec), so consumers reading `var(--spacing-md)` get the right value per viewport automatically — no need for consumer-side media queries.
- **`system.handle` is the load-bearing key.** Renaming an entry's handle in admin changes the emitted variable name. T-shirt handles (`xs`/`sm`/`md`/`lg`/`xl`) align with substrate defaults — renaming away from them loses the override (substrate default reapplies at the slot; the renamed entry becomes a custom slot under its new handle).
- **`name` is decorative.** Display label for the admin. Not consumed at runtime. Renaming `name` doesn't change emission; renaming `handle` does.
- **px values, not rem.** The metaobject emits px integers (per schema). The substrate defaults in `layer-base.css` use rem (typography-relative). The mixing of units in the catalog is visible to anyone debugging computed styles but functionally fine — both resolve to pixel values. A merchant wanting typography-relative spacing keeps the substrate defaults; a merchant setting metaobject entries gets fixed px regardless of root font.
- **Block-rhythm is a consumer, not the owner.** `section.liquid`'s `block_rhythm` setting picks a `spacing` metaobject entry; the section emits `--block-rhythm: var(--spacing-<picked-handle>)`. The block-rhythm cascade rule in `layer-theme.css` reads `var(--block-rhythm)` for the inter-block margin. Block-rhythm doesn't "own" the spacing catalog — it consumes the namespace through the picked handle.
- **Per-instance consumer override via indirection.** Component CSS that wants a per-instance handle override uses the two-tier pattern:
  ```css
  .shopify-block--component {
    padding-block-start: var(--component-spacing, var(--spacing-md));
  }
  ```
  Per-instance `{% style %}` block sets `--component-spacing: var(--spacing-<picked-handle>)` from a block setting. The component CSS provides a sensible default (`--spacing-md`); the per-instance override swaps to any handle by name. CSS resolves the chain at use-site; the cascade picks the active value.
- **Responsive resolution propagates through `var()` chains.** A per-section `--block-rhythm: var(--spacing-md)` doesn't bake in the current value of `--spacing-md` — it stores the var reference. At each read (`margin-block-start: var(--block-rhythm)`), the resolution happens fresh against whichever scope's `--spacing-md` is active. So responsive behavior (mobile vs desktop) flows through the chain without re-emission at each layer.
- **Per-block top-spacing is *not* metaobject-driven.** Every block carries `mobile_margin_block_start` / `desktop_margin_block_start` as raw px ranges (not a `spacing` picker). Per-block margins are instance-specific overrides on top of the section's rhythm — the section sets the baseline, blocks override individually. Forcing per-block margins through the metaobject would explode the catalog or over-constrain merchants.

## Seed entries

Recommended catalog (load-bearing T-shirt handles + optional explicit-zero, full details in `metaobject-definitions.md` § spacing):

| Handle | Name | mobile_value | desktop_value |
|---|---|---|---|
| `none` | None | 0 | 0 |
| `xs` | Extra small | 4 | 8 |
| `sm` | Small | 8 | 12 |
| `md` | Medium | 16 | 24 |
| `lg` | Large | 32 | 48 |
| `xl` | Extra large | 64 | 96 |

The T-shirt handles align with `layer-base.css`'s substrate scale — overriding their defaults via the cascade. Stores migrating from the prior seed (`tight`/`default`/`spacious`/`loose`) keep working as custom-handled entries until renamed; the substrate defaults apply to the T-shirt slots in the meantime.

The `none` handle is the explicit-zero option for block-rhythm (no inter-block margin). It has no substrate counterpart, so it just adds a new `--spacing-none` slot that resolves to `0px`. Useful as a `block_rhythm` picker option when a section needs no rhythm cascade.

Per-project additions extend the catalog per project archetype (`hero-section`, `card-inset`, `pull-quote-pad`, etc.). Custom-handled entries always add new slots — they never collide with the substrate scale.

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page(s)**: `sections/validation--substrate--spacing.liquid` + `templates/index.validation--substrate--spacing.json` *(shipped — existed pre-cycle; updated 2026-06-01 to describe the new `--spacing-<handle>` emission pattern)*
- **API surface** (matrix to exercise):
  - **Per-entry catalog**: each `spacing` metaobject entry rendered as a colored bar — height swaps from `mobile_value` to `desktop_value` when the viewport crosses 640px (validation page uses the `spacer` snippet at `breakpoint:40`). Reader confirms each bar's height matches its entry's pair.
  - **T-shirt slot override**: substrate-aligned handles (`xs` / `sm` / `md` / `lg` / `xl`) — DevTools `Computed` panel on `:root` shows the metaobject value replacing the `layer-base.css` default for the matching slot.
  - **Custom-slot coexistence**: a per-project handle (e.g., `hero-section`) — DevTools confirms `--spacing-hero-section` is emitted; substrate `--spacing-xs/sm/md/lg/xl` defaults remain visible (unless also overridden).
  - **Block-rhythm consumer**: a preset using a `block_rhythm`-picked entry → section emits `--block-rhythm: var(--spacing-<handle>)` in its dynamic-style block; child blocks' computed `margin-block-start` matches the picked entry's responsive value.
- **Edge cases**:
  - `mobile_value` blank → emits `--spacing-<handle>: px;` (malformed declaration; falls through to substrate default for the slot if substrate-aligned, or to `var()` fallback chain otherwise). Schema validation should prevent this at authoring; runtime tolerates by falling through.
  - `mobile_value == desktop_value` → both branches emit the same value (no skip-on-same-value logic at emit time; minor redundancy in output, no visual impact).
  - `mobile_value == 0` and `desktop_value == 0` (the `none` seed) → emits `--spacing-none: 0px` in both branches; consuming as `var(--spacing-none)` resolves to `0px`.
  - Custom handle matching no substrate slot → just adds the new `--spacing-<handle>`; no override.
  - Renamed handle in admin → CSS variable name changes; consumers referencing the old name (via per-project CSS, dynamic style, etc.) get an undefined variable resolving to their fallback chain.
- **Visual showcase**: vertical stack of colored bars per metaobject entry, labeled with handle + mobile px + desktop px. Reader resizes across 640px breakpoint to verify the height swap. A second row demonstrates the substrate-override case (DevTools-side validation): a `md` entry with a non-substrate value overrides the rem-based default.
- **Assertions** (prose; Playwright once installed):
  - Computed `--spacing-md` on `:root` at viewport `< 48rem` equals the metaobject's `mobile_value` (px) when a `md`-handled entry exists; equals `1rem` (substrate default, ≈16px) otherwise.
  - Same property at viewport `>= 48rem` equals `desktop_value` (px) when entry exists; equals `1rem` otherwise.
  - A non-substrate-aligned handle (`--spacing-hero-section`) returns its emitted value at both breakpoints; the substrate T-shirt slot values remain intact (e.g., `getComputedStyle(root).getPropertyValue('--spacing-md')` still returns the `md` slot value).
  - Block-rhythm consumer: a section with `block_rhythm: md` has computed `--block-rhythm` resolving to `var(--spacing-md)`'s active value; direct-child blocks' `margin-block-start` matches.
- **Unit scope**: none (metaobject layer; no JS).

## Out of scope

- **CSS emission mechanics** — covered by `utility--css-variables.md`. This spec describes the data contract + runtime semantics; that spec covers how the snippet composes the spacing emission alongside the four other domains.
- **Substrate spacing defaults** — `layer-base.css` seeds `--spacing-xs/sm/md/lg/xl` in rem. The substrate constants live in `design-constants.md`. This spec is the override / extension surface on top of those defaults.
- **Block-rhythm cascade rule** — the CSS rule (`[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) { margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm, 0rem)); }`) lives in `layer-theme.css` and is covered in `section.md` + `theme-root.md`. This spec describes only the spacing data layer.
- **Per-block top-spacing settings** — raw `mobile_margin_block_start` / `desktop_margin_block_start` px ranges on individual blocks are an instance-override escape-hatch, *not* metaobject-driven. Per `architecture.md`'s "Per-block top-spacing is an escape hatch, not the base rhythm" rule.
- **Padding tokens.** Padding is structural (sections with backgrounds, blocks with internal padding) and stays inline as range fields on blocks where it matters. Not part of the spacing metaobject's job.
- **Container `gap` settings.** `group` / `columns` / `media` carry their own `gap` settings (range fields, not metaobject-driven). The spacing catalog could conceivably back these too, but the current design keeps them as instance ranges for per-container flexibility.
- **Per-stop / per-axis spacing.** A spacing entry carries one value (per breakpoint), not separate inline / block / start / end values. Asymmetric padding requires consumer-side composition (`padding-block: var(--spacing-md) var(--spacing-lg)` etc.) using the catalog as building blocks.
- **Animation-driven spacing changes.** The spacing catalog is static; no JS reads or mutates the values at runtime. Components animating padding / gap reference the metaobject values as keyframe endpoints, but the metaobject doesn't expose an animation API.

## Related

- `design-constants.md` — substrate-side spec covering `--spacing-xs/sm/md/lg/xl` defaults in `layer-base.css`. The dual-emission cascade-override pattern is documented there + here.
- `utility--css-variables.md` — the substrate emitter that materializes the metaobject loop. Defers the data contract + cascade-override semantics to this spec.
- `section.md` — primary block-rhythm consumer; emits `--block-rhythm: var(--spacing-<picked-handle>)` per its `block_rhythm` setting.
- `.context/docs/theme-root.md` — describes the block-rhythm cascade rule structure (the rule lives in `layer-theme.css`, scoped to `[data-modifiers*='theme-root']` elements).
- `.context/docs/metaobject-definitions.md` § `spacing` — setup contract (Shopify admin metaobject definition schema, field types, recommended seed entries).
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (load-bearing handles, override scopes, T-shirt vs semantic naming).
- `.context/docs/architecture.md` § Block-level conventions — "Per-block top-spacing is an escape hatch, not the base rhythm" rule explaining the raw-px override pattern complementing the metaobject.
