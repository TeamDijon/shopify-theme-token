# utility--block-layout-vars

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--block-layout-vars.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--block-layout-vars.liquid` v1.1.0 (CSS variable emitter — captured by the caller's `dynamic_style` block and routed through `utility--dynamic-style`)

**Reconciled**: 2026-06-04 (v1.1.0 — content_width emission harmonized to rem, matching the margin pair and the codebase-wide merchant-px/front-end-rem convention)

**Reviewed**: 2026-06-04

**Depends on**:
- `content_width` metaobject — reads `.width.value` for the `--content-width` declaration
- No JS, no other snippet dependencies

**Consumers** (every L1 block):
- 9 shipped L1 blocks each render this utility inside their `{% capture dynamic_style %}` block to emit per-instance vars: `snippets/button.liquid` v1.4.0, `snippets/columns.liquid` v1.7.0, `snippets/embed.liquid` v1.2.0, `snippets/group.liquid` v1.6.0, `snippets/media.liquid` v1.4.0, `snippets/richtext.liquid` v1.2.1, `snippets/separator.liquid` v1.0.5, `snippets/spacer.liquid` v1.1.2, `snippets/title.liquid` v1.1.3
- Future L1 blocks (rating, etc.) — same pattern at the block layer
- `sections/section.liquid` — does *not* consume this utility directly; section emits `--content-width` (from its own content_width setting) and `--block-rhythm` (referencing the spacing metaobject) inline. Section's block-rhythm flows through this utility's emitted `--mobile-margin-block-start` / `--desktop-margin-block-start` as the per-block override path.

## Purpose

A centralized emitter for the three CSS custom properties shared by every L1 block's per-instance dynamic style: a max-inline-size cap (`--content-width`) and the mobile/desktop top-margin override pair (`--mobile-margin-block-start` / `--desktop-margin-block-start`). The utility consolidates the px→rem conversion, the breakpoint contract, and the skip-on-default logic so blocks don't re-implement them and can't drift independently.

The same three variables flow through the block-rhythm cascade rule in `layer-theme.css`; every L1 block emits them in the same shape, with the same units, at the same scope. Routing through this utility makes the contract pinnable + drift-detectable in one place.

## API

The snippet takes three optional args and emits the matching CSS variable lines into the caller's `{% capture %}` block. The caller pipes the captured string through `utility--dynamic-style` to scope it to the block's `#shopify-block-<id>` selector.

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `content_width` | metaobject (`content_width`) | no | blank | When present, emits `--content-width: <px/16>rem` from the entry's `.width.value` (converted via `divided_by: 16.0 \| round: 3`). Pass blank (or omit) to skip — useful when the block has its own width logic. |
| `mobile_margin_block_start` | number (px) | no | `0` or blank | When > 0, emits `--mobile-margin-block-start: <rem>` converted via `divided_by: 16.0 \| round: 3`. Skipped when 0 or blank — the block-rhythm cascade rule's fallback applies. |
| `desktop_margin_block_start` | number (px) | no | `0` or blank | When > 0, emits `--desktop-margin-block-start: <rem>` (same conversion). Skipped when 0 or blank. |

Invoked inline from a block's dynamic-style capture:

```liquid
{% capture dynamic_style %}
  {% render 'utility--block-layout-vars',
    content_width: content_width,
    mobile_margin_block_start: mobile_margin_block_start,
    desktop_margin_block_start: desktop_margin_block_start %}
{% endcapture %}
{% render 'utility--dynamic-style', base_selector: base_selector, css_content: dynamic_style %}
```

The block resolves its settings (typically from `block.settings.*`) into the three args before invoking.

## Output shape

The snippet writes CSS declarations directly via `echo` (no `{% capture %}` of its own). The caller's `{% capture dynamic_style %}` collects the lines. After `utility--dynamic-style` scopes the output to `#shopify-block-<id>`, the rendered CSS looks like:

```css
#shopify-block-<id> {
  --content-width: 42.5rem;  /* 680px → 42.5rem */
  --mobile-margin-block-start: 1.5rem;
  --desktop-margin-block-start: 2.5rem;
}
```

Skipped emissions:

- **Blank `content_width`** — no `--content-width` line; the block inherits the section's value via cascade
- **Zero or blank `mobile_margin_block_start`** — no `--mobile-margin-block-start` line; the block-rhythm cascade rule's `var(--block-rhythm, 0rem)` fallback applies
- **Zero or blank `desktop_margin_block_start`** — same

The skip-on-default logic keeps the rendered HTML lean and lets the cascade do its job without redundant overrides.

## CSS

N/A at the utility-snippet layer — the snippet emits raw CSS declarations into the caller's capture. The actual cascade rule consuming these variables lives in `layer-theme.css`'s block-rhythm cascade (per `theme-root.md` § Rhythm scope).

## CSS custom properties (exposed)

Per-instance vars emitted (shared by every L1 block):

| Variable | Type | Source |
|---|---|---|
| `--content-width` | `<value>rem` (px-converted) | `content_width.width.value` when the metaobject arg is set; omitted otherwise |
| `--mobile-margin-block-start` | `<value>rem` (px-converted) | `mobile_margin_block_start` when > 0; omitted when 0 or blank |
| `--desktop-margin-block-start` | `<value>rem` (px-converted) | `desktop_margin_block_start` when > 0; omitted when 0 or blank |

Consumed by:
- The block's own CSS for `max-inline-size: var(--content-width, ...)` and the inherited block-rhythm cascade rule in `layer-theme.css` reading `--mobile-margin-block-start` / `--desktop-margin-block-start`
- Cascade through descendants: nested children inside a block inherit the block's `--content-width` (cascade default)

## Behavior

- **Skip-on-default.** Each of the three vars is conditionally emitted. The conditions are: `content_width != blank`, `mobile_margin_block_start > 0`, `desktop_margin_block_start > 0`. Zero or blank values produce no declaration, preserving the cascade fallback chain.
- **px → rem conversion for all three vars.** All three values are stored as px (margins via Shopify range setting, content_width via the metaobject's `width` field) but emitted in rem (`value | divided_by: 16.0 | round: 3`). Matches the codebase-wide merchant-px / front-end-rem convention (gutter, text-style sizes, spacing metaobject). Three-decimal rounding (`round: 3`) preserves sub-pixel precision at typical font-sizes without emitting excessive trailing digits.
- **No internal validation.** The snippet trusts its inputs — invalid metaobject references, malformed number values, etc. fall through to whatever Liquid produces (empty strings, `NaN` from divided_by, etc.). The block's setting schema is the validation layer; the utility just emits.
- **Order-stable output.** Emission order is fixed: `content_width` → mobile margin → desktop margin. Predictable for debugging via DevTools.
- **Cascade-aware design.** The skipped-on-default logic plus the consumer-side `var(--content-width, <fallback>)` chain plus the block-rhythm cascade rule's `var(--block-rhythm, 0rem)` fallback together create a four-layer cascade: per-block override → section's content_width / block_rhythm → substrate default → zero. Each layer fills in only when meaningful; intermediate layers naturally fall through.

## A11y

N/A — utility-snippet emitting CSS variables; no DOM, no rendered output, no a11y surface.

## Locale keys

N/A — pure-logic utility, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: covered indirectly by every L1 block's primitive validation page (`sections/validation--primitive--<block>.liquid` for the 9 L1 blocks). Each primitive page exercises the per-instance var emission as part of its block-half matrix. No dedicated `validation--substrate--block-layout-vars` page; the utility's behavior is observable through every block consumer.
- **API surface** (matrix to exercise per consumer):
  - **Content-width pick + blank**: block with metaobject picker resolved → `--content-width: <px/16>rem` emitted; blank picker → no declaration
  - **Mobile margin (> 0 + 0 + blank)**: positive value → `--mobile-margin-block-start: <rem>` emitted; zero or blank → no declaration
  - **Desktop margin (> 0 + 0 + blank)**: same matrix
  - **All-blank case**: all three args blank/zero → utility emits nothing; the wrapping `{% capture dynamic_style %}` produces an empty string that `utility--dynamic-style` short-circuits (no `<style>` block written)
- **Edge cases**:
  - Negative margin value (range schema typically prevents) → emits negative rem; CSS treats negative margin-block-start as a vertical pull. Merchant footgun if it reaches runtime.
  - Content_width metaobject with `width.value` blank → emits `--content-width: rem` (malformed); CSS drops the declaration. Schema validation should prevent.
  - Very large margin (e.g., 200px max from range schema) → emits `12.5rem` (200/16). No issue.
  - Sub-1-px-step margin (range step is 2) → preserved at full precision through the divisor + round.
- **Visual showcase**: per consumer's validation page — verify computed `--mobile-margin-block-start` / `--desktop-margin-block-start` / `--content-width` on the block element match the spec's expectations across the matrix.
- **Assertions** (prose; Playwright once installed):
  - When all three args are set, the block's computed style includes all three custom properties with the expected rem values
  - When mobile_margin_block_start is 0, the property is absent; the cascade rule's fallback resolves to `var(--block-rhythm, 0rem)`
  - When content_width is blank, the property is absent; the block inherits the section's `--content-width` via CSS cascade
- **Unit scope**: none (Liquid + CSS; no JS).

## Out of scope

- **Validation of metaobject reference shape.** The snippet trusts the block's setting schema. A merchant-broken metaobject reference (e.g., GID points to a deleted entry) would emit `--content-width: rem` and CSS drops it; the snippet doesn't pre-check.
- **Custom px→rem divisor.** The 16.0 divisor is hardcoded. Per-project theme overrides of root font-size would need to be coordinated separately (the substrate's root font-size is set in `layer-base.css` / `core.css`); the utility doesn't read the configured root font.
- **Additional layout vars** beyond the three documented. If future blocks need per-instance gap / padding / etc., a separate utility or schema extension is the right path; this utility's scope is fixed at content-width + the margin pair.
- **Section-level emission.** Sections don't route through this utility — `section.liquid` emits `--content-width` and `--block-rhythm` directly in its own dynamic style. The block-vs-section distinction is intentional: blocks share the three-var contract universally; sections have their own narrower contract that pulls from picked metaobjects.
- **Per-instance bleed / column / track overrides.** Container-block-specific settings (bleed, gap, sticky_track, etc.) are emitted by each container block's own dynamic style alongside this utility's call. The utility doesn't try to be a universal block-emitter — only the three shared variables.
- **CSS variable namespace expansion.** The three variable names are fixed and load-bearing across the 9 consumers + the cascade rule. Renaming requires coordinated edits across all consumers + `layer-theme.css`; not a per-block concern.

## Related

- `.context/docs/theme-root.md` — describes the block-rhythm cascade rule structure (`layer-theme.css` § Rhythm cascade) that consumes the per-instance margin vars
- `content-width.md` — the metaobject this utility reads via the `content_width` arg
- `spacing.md` — the metaobject that drives section-level `--block-rhythm`; the per-block margin override pair (this utility's job) acts as the override layer atop the section's rhythm
- `utility--dynamic-style.md` (planned) — the snippet that scopes the captured CSS to `#shopify-block-<id>`
- `section.md` — describes the section-level emission that the per-block override layer sits on top of
- `.context/rules/snippet-convention.md` — file structure (`{% doc %}` block, version header) the implementation follows
- `.context/docs/dynamic-style-pattern.md` — the per-instance Liquid-computed CSS pattern this utility participates in
