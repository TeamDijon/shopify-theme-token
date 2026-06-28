# spacer

**Layer**: 1

**Type**: block (`blocks/spacer.liquid`) + matching snippet (`snippets/spacer.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/spacer.liquid` v2.0.0 (render surface)
- `blocks/spacer.liquid` v2.0.0 (block schema + theme-editor wrapper)

**Reconciled**: 2026-06-28 (snippet + block v2.0.0 unchanged — validation page retrofitted to the production theme-root grid harness; template matrix rewritten to the `size`-handle interface; executable suite added. v2.0.0 replaced the px-size interface (`breakpoint` select + `spacer_block_size` / `mobile_` / `desktop_` ranges) with a single `size` picker backed by the `spacing` metaobject; height resolves to `var(--spacing-<handle>)`, mobile/desktop divide carried by the token.)

**Reviewed**: pending

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--dynamic-style.liquid`, `spacing` metaobject (for `size`), `theme_color` metaobject entries (optional, for background)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid`

## Purpose

Vertical-space block whose height is a `spacing` metaobject token. The merchant picks a token (`xs` … `xl` or a custom entry); the spacer renders `block-size: var(--spacing-<handle>)`, so the mobile/desktop divide rides the token's own responsive `@media` branch — one picker, no per-block breakpoint. An optional `theme_color` background turns the spacer into a colored band, serving as a section divider between same-scheme sections, a brand-color stripe, or a framed accent above or below a hero.

Primary scope: vertical-rhythm at the section level. Between section-level blocks, spacer adds rhythm independent of the section's `block_rhythm` cascade.

Inside a column-direction rail (columns track, group child), spacer is the legitimate tool for **edge whitespace** — pre-first-child or post-last-child gaps. Rhythm utilities (`block-rhythm` cascade and per-block top-margin) address only between-sibling spacing, not rail edges, so a spacer at the edge is the only mechanism. Between-sibling spacing inside a rail uses the parent's `gap` setting or the next sibling's top-margin, not a spacer. Symmetric breathing room around content of varying height uses the columns / group `vertical_alignment: center` setting, not edge spacers. See `container-patterns.md` § Spacer at rail edges.

<!-- REVIEW: Spec - Per template:design-principle-upfront-purpose, would the Purpose lead better with the rail-edge / between-sibling boundary as the distinctive principle? Spacer's design point is "edge whitespace tool — between-sibling spacing uses gap / top-margin instead." Currently this lands in ¶3. Draft: "The edge-whitespace tool for column-direction rails — pre-first-child or post-last-child gaps where rhythm utilities don't reach (block-rhythm cascade + per-block top-margin both address between-sibling spacing only). Renders a vertical-space block whose height is a spacing-metaobject token (var(--spacing-<handle>), mobile/desktop resolved through the token) with an optional theme_color background that turns the spacer into a colored band. Between-sibling spacing uses parent gap or next-sibling top-margin, not a spacer." Question: keep current 3-¶ framing, swap to the single-¶ lead, or split the difference? -->


Inside a row-direction `group`, the spacer's `inline-size: 100%` claims the full row and squishes siblings. Anti-pattern; not actively prevented.

## API

| Setting | Type | Required | Notes |
|---|---|---|---|
| `size` | metaobject (`spacing`) | no | Default blank → 0 height. Emits `--spacer-block-size: var(--spacing-<handle>)`; the token carries the mobile + desktop values (responsive resolution at 48rem lives in the token's own `@media` branch in `utility--css-variables`). |
| `background_color` | metaobject (`theme_color`) | no | Default transparent. Renders via `var(--color-<handle>)`. |

## Output shape

```html
<div class="shopify-block shopify-block--spacer"
     id="<base-selector>"
     {{ block.shopify_attributes }}>
</div>
```

No `data-modifiers` (the block emits no modifiers). Per-instance CSS custom properties emit via `utility--dynamic-style` into a scoped `<style>` block.

## CSS

```css
.shopify-block--spacer {
  display: block;
  position: relative;
  inline-size: 100%;
  block-size: var(--spacer-block-size, 0rem);
  margin-block-end: 0;
  margin-inline: auto;
  background-color: var(--background-color, transparent);
}
```

`--spacer-block-size` resolves to `var(--spacing-<handle>)`, which is itself responsive (mobile value in `:root`, desktop value at `@media (width >= 48rem)`) — so the spacer needs no breakpoint media queries of its own.

`margin-block-start` is forced to `0` for spacers by the substrate — the spacer is **rhythm-neutral** (see `theme-root.md` § Rhythm scope): it takes no `block_rhythm` margin and neither does the block right after it. A spacer's visible size is therefore exactly its `size` token, with no rhythm added before or after. Spacer has no per-instance top-margin setting (unlike most L1 blocks).

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--spacer-block-size` | Spacer height, set to `var(--spacing-<handle>)` from the picked token | `0rem` |
| `--background-color` | Optional background fill | `transparent` |

Both emitted per-instance via `utility--dynamic-style`, only when the source setting is non-blank (skip-on-blank for clean output).

## Behavior

- **Height is a spacing token.** `size` resolves a `spacing` metaobject; the snippet emits `--spacer-block-size: var(--spacing-<handle>)`. The mobile/desktop divide is the token's — defined once on the spacing entry, applied everywhere it's referenced. No per-block breakpoint or px values.
- **Rhythm-neutral**: a substrate rule forces `margin-block-start: 0` on the spacer and on the block immediately after it, so a spacer is an explicit gap that *replaces* the section's `block_rhythm` at its boundary rather than stacking with it. Additive spacing comes from a larger `size` token, not from rhythm + spacer. See `theme-root.md` § Rhythm scope.
- **No px conversion at the block.** Unlike the prior px interface, the height comes pre-converted through the spacing token (merchant-px → rem at the token's emit time in `utility--css-variables`).
- **A11y**: block is semantically empty (`<div>` with no children); no label needed — invisible to assistive technology by virtue of having no content.
- **Reduced motion / forced colors**: no animations, no interactive states — nothing to honor.

## Locale keys

- `blocks.spacer.name`
- `blocks.spacer.settings.spacer.content`
- `blocks.spacer.settings.size.{label,info}`
- `blocks.spacer.settings.appearance.content`
- `blocks.spacer.settings.background_color.{label,info}`
- `blocks.spacer.presets.spacer.{name,category}`

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive; block-backed only).

- **Page**: `sections/validation--primitive--spacer.liquid` + `templates/index.validation--primitive--spacer.json` (shipped). The page is the production theme-root grid harness (renders `validation--harness-styles`) carrying a base `--block-rhythm`, so the rhythm-neutral substrate rule is exercised, not just emitted. `size` + `background_color` are baked by metaobject **handle**; each case is selected in tests by its `--block-label`. Spacers are rhythm-neutral (no top margin) and often 0-height / transparent, so a harness-only `margin-block-end` separates the cases for legibility — it touches neither `block-size` nor `margin-block-start`.
- **Tests**: `.tests/e2e/primitive--spacer.spec.js` (executable; `npm run test:e2e`)
- **Requires seeded**: `spacing` handles `xs` (4/8) · `sm` (8/12) · `md` (16/24) · `lg` (32/48) · `xl` (64/96); `theme_color` handles `accent` + `muted` — from Token's shipped catalog (`.scripts/seed-metaobjects.mjs`).
- **API surface**:
  - `size` ∈ {blank, `xs`, `sm`, `md`, `lg`, `xl`} — height tracks the token's resolved value and switches mobile↔desktop at 48rem (the token's own `@media` branch)
  - `background_color` ∈ {blank, `accent`, `muted`} — colored band vs transparent
- **Edge cases**:
  - `size` blank → no `--spacer-block-size` emitted; block collapses to 0 height
  - `background_color` blank → transparent (no `--background-color` emitted)
  - Rhythm-neutral: a spacer in a section with `--block-rhythm` set still takes `margin-block-start: 0` (the substrate forces it on the spacer and on the block immediately after it) — the spacer's height *is* the gap, not stacked on top of rhythm
  - Placed inside a row-direction container → out of scope (anti-pattern; not validation-tested)
- **Assertions** (executable — `.tests/e2e/primitive--spacer.spec.js`):
  - Each `size` token emits `--spacer-block-size` and the computed `block-size` matches the token's value per viewport (desktop project → desktop value, mobile → mobile value)
  - Blank `size` → no `--spacer-block-size`, `block-size` collapses to 0, background transparent
  - `background_color` → `--background-color` emitted; computed `background-color` resolves to the picked token (`accent` → `rgb(255, 107, 53)`, `muted` → `rgb(107, 114, 128)`)
  - Rhythm-neutral: a non-first spacer's computed `margin-block-start` is `0px` despite the section `--block-rhythm`
  - `inline-size: 100%` fills the content track
- **Deliberately unasserted**: the exact rem emission of `--spacing-<handle>` (`getComputedStyle` resolves the `var()` to a length — the computed `block-size` carries the value); the harness `margin-block-end` (a legibility affordance, not contract).
- **Unit scope**: none (no JS)

## Out of scope

- Horizontal spacer — `inline-size: 100%` is intentional; horizontal gaps belong in container `gap` settings
- Use inside row-direction `group` — documented anti-pattern; documentation only, not enforced
- Between-sibling spacing inside a column-direction rail — use parent `gap` or next sibling's top-margin instead. Spacer remains correct at rail edges (see Purpose)
- Arbitrary px heights — express sizes as `spacing` metaobject entries (design-as-data); a one-off size is a custom spacing token, not a per-block px field
- Animated reveal — pure spacing primitive, no motion concerns

## Related

- `section.md` — describes the block-rhythm cascade that spacer's `margin-block-start` inherits from
- `spacing.md` — the metaobject backing the `size` setting; defines the token scale + mobile/desktop pair
- `theme-color.md` — `background_color` setting reads the metaobject for the optional colored band
- `.context/docs/container-patterns.md` — rail-edge use, rhythm vs gap, vertical-alignment alternative
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns; spacing handle vocabulary
