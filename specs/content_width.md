# content_width

**Layer**: substrate

**Type**: metaobject (`content_width`)

**Status**: shipped

**Implementation**:
- `sections/section.liquid` v1.6.0 (`content_width` setting consumer — emits `--content-width: <value>px` per section via dynamic style)
- `blocks/group.liquid`, `blocks/columns.liquid`, `blocks/media.liquid`, `blocks/richtext.liquid`, `blocks/title.liquid`, `blocks/button.liquid` — per-block `content_width` override setting; each emits `--content-width: <value>px` per-block via dynamic style
- `assets/layer-theme.css` (bleed-grid cap rule — reads `var(--content-width, 125rem)`; the substrate fallback acts as a big-screen protection)
- Metaobject definition itself — created per `metaobject-definitions.md` § `content_width`

**Reconciled**: 2026-06-01

**Reviewed**: pending

**Depends on**: none — substrate-root token type. Consumed by the bleed-grid named-line cap.

**Consumers**:
- `sections/section.liquid` — `content_width` setting (metaobject picker) drives the section's center grid track cap
- 6 block-half settings (`group`, `columns`, `media`, `richtext`, `title`, `button`) — per-block override of the section's content_width when a block wants to constrain itself narrower (e.g., a title narrower than the section, a button row centered in reading width)
- `assets/layer-theme.css` — bleed-grid named-line columns `[content-start]` and `[content-end]` are computed against `var(--content-width)` with a `125rem` fallback
- Per-project blocks that ship their own content_width override (e.g., a future `pull-quote` L1 narrower than the section)

## Purpose

A named max-inline-size catalog. Each entry holds a single `width` (px) that caps an element's inline content area. The named entries (`narrow`, `reading`, `medium`, `wide`) give merchants vocabulary for the common composition widths without dropping into raw px ranges; per-project entries extend the catalog per archetype need (`pull-quote-narrow`, `hero-banner-wide`).

Consumed by both **section-level** (the section's outer cap) and **block-level** overrides (a block narrower than its parent section). The substrate's `125rem` (2000px) fallback in `layer-theme.css` covers the unset case — wider than any common viewport, so unset effectively means "no constraint until ultra-wide displays."

This metaobject is intentionally **single-value** (one `width` per entry), unlike `spacing` which carries mobile + desktop pairs. Inline-size caps don't typically need viewport-specific tuning at the named-token layer — a "reading width" is 680px whether the viewport is 640px or 1440px; the user sees more whitespace at wider viewports, not a wider content column. Merchants needing viewport-responsive caps compose with `@media` per project, or pick different entries via setting at different breakpoints (not currently supported in schema — see Out of scope).

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name in admin (e.g., `Narrow`, `Reading`, `Wide`). `system.handle` derives from it on creation. |
| `width` | Number (decimal) | yes | Maximum content width in **px**. Emitted as `--content-width: <value>px` in the consuming section / block's dynamic style. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

## Output shape

Per-section emission (via `section.liquid`'s dynamic style):

```css
#shopify-section-<id> {
  --content-width: 680px;
}
```

Per-block emission (via the block's dynamic style — overrides the section's value within the block's scope):

```css
#shopify-block-<id> {
  --content-width: 1000px;
}
```

The variable is consumed by the bleed grid in `layer-theme.css`:

```css
[data-modifiers*='theme-root'] {
  grid-template-columns:
    [bleed-start] 1fr
    [content-start] min(var(--content-width, 125rem), 100% - 2 * var(--gutter))
    [content-end] 1fr [bleed-end];
}
```

The `min(var(--content-width, 125rem), 100% - 2 * var(--gutter))` clamp ensures the content track is whichever is *smaller*: the picked cap, or the viewport minus gutters. So a `narrow: 600px` entry caps at 600px even on a 320px phone — the viewport-gutter math wins. Cascade through block-level overrides happens via the same variable; nested blocks read the most-specific scope's value.

## CSS

N/A at the metaobject layer — emission happens at the consumer (section / block dynamic style). The cap rule itself lives in `layer-theme.css` § bleed-grid.

## CSS custom properties (exposed)

| Variable | Type | Source |
|---|---|---|
| `--content-width` | `<value>px` | one declaration per metaobject-picked entry, scoped to the consuming section's or block's element via dynamic style. Substrate fallback `125rem` (≈2000px) when no entry is picked. |

The variable has cascade semantics — set on a section, inherited by descendants until a nested block overrides it. So a section with `content_width: wide` (1400px) containing a richtext block with `content_width: reading` (680px) gives the richtext block a 680px cap while the rest of the section uses 1400px.

## Behavior

- **Single px value per entry.** Not responsive (no mobile/desktop pair). Inline caps tend to be a single value across viewports; differential caps compose via separate entries + per-breakpoint pickers (out of scope today; revisit if usage shows real need).
- **`width` validated by schema as decimal.** Currently no `min` / `max` validation enforced — merchants could enter `5` or `999999`. The bleed-grid `min(...)` clamp prevents the ultra-wide case from breaking layout (viewport-gutter math always wins); the ultra-narrow case is a merchant-responsibility footgun.
- **`system.handle` is the load-bearing key.** Merchants pick entries by handle via the metaobject picker setting; the section / block then emits the entry's `width` value. Renaming an entry's handle in admin moves consumers' selections (the picker stores a GID reference, not the handle string), so the contract is GID-stable; handle changes affect URL-friendly names but not emission.
- **No global `:root` emission.** Unlike `--color-<handle>` or `--spacing-<handle>` which emit globally for any-CSS consumption, `--content-width` is *only* set per-section / per-block where the picker resolves. Globally referencing `var(--content-width)` from a stylesheet outside a sectioned context returns the fallback. The design choice: content_width is contextual (the cap applies to the picking section's scope), not catalog-wide.
- **`125rem` fallback in `layer-theme.css` is the big-screen protection.** When a section has no `content_width` entry picked, the bleed-grid named-line cap reads `125rem` (≈2000px). Wider than 99% of viewports — effectively "no cap until ultra-wide displays" + a protection against grotesquely-wide content on 4K+ screens.
- **`min(var(--content-width), 100% - 2 * var(--gutter))` is the clamp.** The bleed-grid named-line track uses `min()` so the content cap is whichever is smaller: the picked value or the viewport minus gutters. Narrow viewports get gutter-respecting widths; wide viewports get the picked cap.
- **Block-level override is a cascade-scope reset.** When a child block picks its own `content_width`, the block's dynamic style sets `--content-width` on the block's element. Cascade inheritance gives the block (and its descendants) the new value; siblings of the block still use the section's value. The cascade does the right thing without per-consumer wiring.

## Seed entries

Recommended catalog (full details in `metaobject-definitions.md` § content_width):

| Handle | Name | width |
|---|---|---|
| `narrow` | Narrow | 600 |
| `reading` | Reading | 680 |
| `medium` | Medium | 1000 |
| `wide` | Wide | 1400 |

No `default` entry is seeded — a blank section setting falls through to the `125rem` (2000px) substrate fallback in `layer-theme.css`. The fallback is wider than any common viewport, so "no entry picked" reads as "no cap until ultra-wide" — exactly the right default.

The `reading` handle is the load-bearing semantic anchor for long-form prose — 680px (~65ch at default body font) is the established line-length-for-readability per typography conventions. Used by `richtext` and `title` blocks when authoring needs the readable column without manually picking a px value.

Per-project additions extend the catalog per archetype (`pull-quote-narrow`, `hero-banner-wide`, `dense-grid-wide`, etc.).

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page(s)**: `sections/validation--substrate--content-width.liquid` + `templates/index.validation--substrate--content-width.json` *(shipped — existed pre-rename pass; describes the per-entry width emission and the substrate fallback)*
- **API surface** (matrix to exercise):
  - **Per-entry catalog**: each `content_width` metaobject entry rendered as a horizontal bar with `max-inline-size: var(--content-width); width: 100%;` inside a section that picks the entry — reader confirms the rendered width matches the entry's `width`.
  - **Section-level pick**: a section with `content_width: reading` (680px) constrains its content track to 680px on viewports wider than ~720px; falls back to `100% - 2 * --gutter` on narrower viewports (the `min(...)` clamp).
  - **Block-level override**: a section with `content_width: medium` (1000px) containing a `richtext` block with `content_width: reading` (680px) → richtext's content cap is 680px, surrounding blocks remain at 1000px. Verify by computed `max-inline-size` on each.
  - **Unset / blank**: a section with no `content_width` picked → bleed-grid named-line cap reads `125rem` substrate fallback (≈2000px); content track fills the viewport minus gutters on any common viewport.
- **Edge cases**:
  - `width: 0` → emits `--content-width: 0px`; `min(0px, 100% - 2 * --gutter)` resolves to `0`, hiding the content track. Merchant footgun; not guarded.
  - `width` very small (`< 200`) → content track narrower than the gutter math allows readable layouts; may force content overflow. Merchant responsibility.
  - `width` very large (`> 3000`) → `min()` clamps to viewport-gutter math at any reasonable viewport; no visual impact. The `3200px` background-stop guard elsewhere in `layer-theme.css` covers the outer rendering.
  - Block-level override with a narrower-than-section value → inner block displays narrower, with the surrounding section's wider context visible around it.
- **Visual showcase**: a grid of section rows, each with a different `content_width` pick. Each row contains a colored bar capped at the picked width, with the section's bleed area visible around it. Reader confirms widths match across the catalog. A second row demonstrates the block-level-override cascade (section at wide; nested richtext at reading; visible width difference between the surrounding section content and the richtext column).
- **Assertions** (prose; Playwright once installed):
  - Computed `max-inline-size` on the section's content track equals the entry's `width` in px (or the viewport-gutter math when narrower).
  - Per-block override: computed `max-inline-size` on the overriding block equals its own picked `width`; sibling blocks in the same section use the section's value.
  - Unset section: bleed-grid named-line cap resolves to `2000px` (the `125rem` fallback at 16px root).
- **Unit scope**: none (metaobject layer; no JS).

## Out of scope

- **Per-viewport responsive widths.** Single-value schema today. Differential caps per viewport require schema extension (mobile_width + desktop_width pair, matching `spacing`'s shape). Defer until a real consumer surfaces the need.
- **Min-width / clamp range** (`clamp(min, ideal, max)` semantics). The current shape is a hard max only; ranges would need schema additions. Out of scope at this metaobject's layer; project-CSS can compose `clamp()` against `--content-width` if needed.
- **Per-block `min-content-width`.** The block might want a *minimum* readable width separate from the inherited cap. Not currently exposed; consumer-side CSS can clamp at the block's own scope.
- **Vertical-direction equivalent** (`--content-block-size`, `--content-height`). The catalog is inline-size only; vertical sizing is per-component (e.g., `media_size`'s ratio / relative / fixed modes).
- **Computed-fluid widths** (`min(100ch, 80vw)` etc.). Single px value is the schema; fluid sizing composes at consumer-CSS layer using the catalog as building blocks.
- **Default entry.** Intentionally no `default` handle. Blank picker → substrate fallback (`125rem` in `layer-theme.css`). Seeding `default` would be either redundant with the substrate fallback or competing with it.

## Related

- `section.md` — primary consumer; emits `--content-width` per section's `content_width` setting; describes the bleed-grid named-line cap that consumes the variable
- `theme-root.md` — describes the bleed-grid + content cap structure (named-line columns + `min(...)` clamp)
- `richtext.md`, `title.md`, `button.md`, `group.md`, `columns.md`, `media.md` — per-block override consumers; each carries its own `content_width` setting that overrides the section's value within its scope
- `.context/docs/metaobject-definitions.md` § `content_width` — setup contract (Shopify admin metaobject definition schema, field types, recommended seed entries)
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (load-bearing handles, override scopes)
- `.context/docs/container-patterns.md` — content cap rationale, convergence with gutter math + bleed model
