# Container patterns

The horizontal-sizing system for sections and blocks. Three concepts, two CSS patterns, one bleed model. Responsiveness layers on top — see "Responsiveness" below.

## Three concepts

| Concept | What it is | Where it lives |
|---|---|---|
| **Section gutter** (`--gutter`) | Space between section content area and viewport edge. Responsive: `--mobile-gutter` (1.5rem) below 48rem, `--desktop-gutter` (3.5rem) at/above. | Theme-wide, emitted by `utility--css-variables`. |
| **Gap** | Space *between* tracks in a grid or flex container. | Per-container (set on `group`, `columns`, etc., via the `gap` block setting). |
| **Inner padding** | Space inside an element's own border (`padding-inline` / `padding-block`). | Per-element, opt-in via `container_style` variants (card / outlined / elevated) or per-project CSS overrides. |

These three live at independent scales. A change at one scale doesn't leak into another:
- Section gutter is a theme-wide constant; it doesn't propagate to nested containers.
- Gap separates tracks in a single grid; it doesn't accumulate when grids nest.
- Inner padding is element-local; it doesn't interact with the section/track gutter system.

There is no "track inner gutter" as a primitive. The padding inside a grid track is handled by the track's child block via `container_style` (when card-like chrome is wanted) or by the block's own padding (when block-specific). The grid itself doesn't add padding inside tracks.

## CSS variables

| Variable | Source | Purpose |
|---|---|---|
| `--gutter` | `utility--css-variables` (responsive via `--mobile-gutter` / `--desktop-gutter`) | Section gutter at the current breakpoint. Doubles as the partial-bleed escape distance. |
| `--content-width` | Section-level dynamic style (via `content_width` metaobject setting) | Section's content cap, also the bleed ceiling; defaults to 125rem at the substrate (`layer-base.css`) |

## Width patterns

### Default content sizing

Direct children of `<theme-section>` (i.e., `.shopify-section > .shopify-block`) declare their own width via:

```css
.shopify-block {
  inline-size: min(calc(100% - 2 * var(--gutter)), var(--content-width, 125rem));
  margin-inline: auto;
}
```

Behavior:

| Viewport | `inline-size` resolves to |
|---|---|
| `< --content-width` | `viewport - 2 × --gutter` (content tracks viewport with gutter offset) |
| `≥ --content-width` (specifically `≥ --content-width + 2 × --gutter`) | `--content-width` (capped) |

Block grows with viewport (minus gutter on each side), caps at the section's `--content-width`.

`margin-inline: auto` centers the block when its width is below the containing block's available space.

### Section-bleed — full-width default

For a block that should fill the section width (no gutter offset), capped at the bleed cap:

```css
.shopify-block[data-modifiers*='bleed:section'] {
  inline-size: min(100%, var(--content-width, 125rem));
  margin-inline: auto;
}
```

Behavior:

| Viewport | `inline-size` resolves to |
|---|---|
| `< --content-width` | `viewport` (fills viewport) |
| `≥ --content-width` | `--content-width` (capped at the section's content cap) |

Compared to the non-bleed default, the bleed sibling is exactly `2 × --gutter` wider until viewport reaches `--content-width + 2 × --gutter`, at which point both cap at the same width and the gap closes. They converge.

### Partial-bleed escape (per-side, inside a grid track)

When a block sits inside a grid track (column track inside a `columns` block) and needs to escape its track to reach the section's bleed cap on one side, the negative-margin approach handles it:

```css
.shopify-block[data-modifiers*='bleed:inline-start']:first-child {
  margin-inline-start: calc(-1 * var(--gutter));
}

.shopify-block[data-modifiers*='bleed:inline-end']:last-child {
  margin-inline-end: calc(-1 * var(--gutter));
}
```

The escape distance is the section gutter. Partial bleed reclaims the gutter on its side, reaching the section's content edge — which is also the bleed boundary, since the bleed ceiling equals the content cap (see § Content cap and convergence).

**Position selectors are load-bearing.** Per-side bleed only makes geometric sense at edge tracks:

| Block position in grid | `bleed:inline-start` | `bleed:inline-end` | `bleed:both` |
|---|---|---|---|
| `:first-child` (edge, start side) | ✓ Fires | (no-op, no end edge to bleed) | (no-op if siblings exist) |
| `:last-child` (edge, end side) | (no-op, no start edge) | ✓ Fires | (no-op if siblings exist) |
| Middle | No-op | No-op | (no-op) |
| `:only-child` | ✓ Fires | ✓ Fires | ✓ Fires |

Middle-track configurations silently no-op rather than break the layout. The modifier still emits to `data-modifiers` (for inspection/debug); the CSS selector simply doesn't match. Merchants configuring `bleed: inline-start` on a middle column see no visual effect — documented quirk.

## Nested gutter rule

Section gutter applies **only at the section's direct children**. Deeper nesting uses `inline-size: 100%` within its parent — no accumulated gutter shrinkage.

```css
/* Gutter offset applies only to direct children of the section */
.shopify-section > .shopify-block {
  inline-size: min(calc(100% - 2 * var(--gutter)), var(--content-width, 125rem));
}

/* Nested blocks fill their containing block */
.shopify-block .shopify-block {
  inline-size: 100%;
  /* Or its own width logic per the block's CSS */
}
```

A `columns` inside a `group` inside the section gets the gutter offset once (on the outer group). The columns inside it inherits its parent group's content area without re-applying the offset. The nested columns has its own gap; each nested track gets `(parent_track_width - (n-1) × gap) / n`.

Deep-nesting compositions stay predictable: each level partitions its containing block; no level eats into the next.

## Content cap and convergence

The section's `--content-width` is the single ceiling for both content and bleed. Bleeding elements are content (images, decorative bands), not background — they cap at the same width as text content. There is no separate "bleed cap" constant; the bleed ceiling tracks whatever value `--content-width` resolves to on the section.

The substrate default is `125rem` (2000px), set in `layer-base.css` as the `--content-width` default. Sections narrow the ceiling per-instance via the `content_width` metaobject setting; both content and bleed follow the narrowed value. A 60rem-content section gets 60rem bleed — a deliberate constraint that keeps bleed media proportional to the section's content scale.

Section-bleed and non-bleed siblings converge at viewports `≥ --content-width + 2 × --gutter`. The constant `2 × --gutter` gap between them at narrower viewports shrinks to zero at the convergence viewport and stays zero for all wider viewports. Beyond the cap, both sit centered in the viewport at the same width with the excess viewport-to-cap space visible on each side.

"Narrow text, wide media" inside one section uses a `columns` block with one bleeding child and a per-block `content_width` override on the text-bearing sibling — not mismatched section-vs-block ceilings. The columns composition surfaces the merchant's intent explicitly.

Edge-to-edge backgrounds on very wide viewports live at the `.shopify-section` element (which has no max-inline-size cap) via background-color or background-image. The bleed system caps at content; the section's outer wrapper handles viewport-spanning visuals.

## Inner padding and bleed compose freely

`container_style` variants (card / outlined / elevated) add `padding-inline` and `padding-block` to the styled block. This padding is element-local — it doesn't interact with section gutter or bleed math.

A card variant inside a bleeding parent works as expected:

```html
<group bleed=both>                 <!-- outer: full-bleed band -->
  <group container_style=card>      <!-- inner: card with own padding -->
    <title>…</title>
    <button>…</button>
  </group>
</group>
```

Visual outcome:
- Outer group spans edge to edge (or bleed cap), painting its background across.
- Inner card sits inside the band with its own `padding: 1.5rem`, providing breathing room for the card's contents.
- The card's padding is independent of the outer group's bleed — they live at different scales.

This composition is encouraged for "full-bleed band with padded content card inside" patterns.

## Exceptions

### Horizontal-scroll containers

Some primitives need `padding-inline` (not negative `margin-inline`) for their gutter, because they host native horizontal scroll. Negative margins would clip the scroll-snap container or break overflow detection. Primitives in this category:

- `slider` / `carousel` (planned)
- `marquee` (planned)
- `breadcrumb` / `linklist-quick-nav` when their content overflows horizontally on narrow viewports
- Any future primitive whose visible-but-overflowing horizontal flow must remain native-CSS-scrollable

These primitives use the partial-bleed escape approach inverted — they keep the section gutter as `padding-inline` on the scroll rail, and the rail's INNER content scrolls. The gutter never escapes via negative margin in these blocks.

Document in the primitive's spec when it ships.

### Per-block `content_width`

Per-block `content_width` (set on individual blocks like `title`, `richtext`, `button`) overrides the block's `--content-width` for itself only. The default-sizing formula resolves the narrower cap inside the block's containing block — the block becomes narrower than its sibling blocks.

This is the right answer for "image-left + content-right with narrow title on right column": each child of the right column sets its own `content_width` metaobject. The formula caps at that value within the right column's available width. No new mechanism needed.

## Responsiveness

The patterns above operate statically. Responsiveness layers on top via five principles and a small set of shapes.

### Principles

1. **One viewport cutover at 48rem.** The substrate's only viewport breakpoint is mobile-first at 48rem. No second viewport breakpoint exists in the substrate or in composable blocks. A second cutover keys to container width.
2. **Topology is container-keyed; rhythm is viewport-keyed.** Stack-below, column count, grid recompose use container queries. Typography, gutter, vertical rhythm use viewport queries.
3. **Pair mobile/desktop settings when the value's interpretation differs across viewport states.** Top-margin (mobile breathing room ≠ desktop) and bleed direction (single-column mobile has no edge tracks) pair. Color, font, and alignment-without-layout-pivot do not.
4. **Cutover layer matches the layer that knows.** Substrate owns typography and gutter. Section owns its hero topology. Block owns its own stack threshold. Merchant owns content-meaningful breaks via paired settings on the block schema.
5. **Mobile-first.** Default values target mobile; desktop overrides apply at 48rem or at the container threshold.

### Encouraged shapes

| # | Shape | Use for | Example |
|---|---|---|---|
| E1 | Substrate single-cutover at 48rem | Typography, section gutter, baseline vertical rhythm | `--gutter` swaps from 1.5rem (mobile) to 3.5rem (desktop) at 48rem |
| E2 | Paired mobile/desktop settings (binary at 48rem) | Values whose interpretation differs across viewport states | `mobile_margin_block_start` + `desktop_margin_block_start`; `bleed_mobile` + `bleed_desktop` |
| E3 | Container queries for topology | Stack-below, column count recompose | Columns / group at `40` / `60` / `80` container breakpoints |
| E4 | Intrinsic wrap (CSS-only) | Content-natural wrap with no merchant choice | `flex-wrap`, `grid-template-columns: repeat(auto-fit, minmax(…))`, `min()` on widths |
| E5 | Single value with `min()` cap | Sizing bounded above, flowing below | `inline-size: min(100% - 2 × gutter, --content-width)` |
| E6 | Paired asset settings (mobile/desktop) | Media art direction with differing aspect and asset weight | `mobile_image` + `desktop_image` rendered via `<picture><source media>` swap |

### Discouraged shapes

| # | Anti-shape | Reason | Alternative |
|---|---|---|---|
| F1 | Second viewport cutover | Fragments the in-between band and the merchant config surface | Container queries (E3) |
| F2 | Fluid `clamp()` at substrate / system layer | Maintenance overhead at substrate scale | Binary swap (E1 / E2). One-off `clamp()` inside a specialized section's own scope is permitted |
| F3 | Container queries for typography | Body text shrinks when nested in a narrow rail | Viewport queries via substrate (E1) |
| F4 | Viewport queries for stack / wrap | A block does not know what portion of the viewport it occupies | Container queries (E3) |
| F5 | Block-level `hide_on_mobile` / `hide_on_desktop` | Two content variants drift apart; a11y contract splits | Reserved for specialized sections where the section author owns markup and a11y. Not available at theme-block composition |
| F6 | Per-block "breakpoint" picker (merchant picks 600px / 800px / 1200px) | Cross-block consistency is unreachable from a single-block setting | Container queries (E3) — block self-decides via its own container width |
| F7 | Cloning a block for a mobile variant + visibility toggle | Double-maintenance; content drift | Single block with E2 / E6 |

### Actor / key / cutover per dimension

| Dimension | Actor | Key | Cutover | Shape |
|---|---|---|---|---|
| Typography | Substrate | Viewport | Binary 48rem | E1 |
| Section gutter | Substrate | Viewport | Binary 48rem | E1 |
| Block-rhythm | Section (via `spacing` metaobject) | Viewport | Binary 48rem (paired vars) | E1 + E2 |
| Block top-margin | Merchant per block | Viewport | Binary 48rem (paired settings) | E2 |
| Spacer height | Merchant per block | Viewport | Multi-step (40 / 60 / 80) | E2 |
| Stack / wrap | Merchant per block | Container | Multi-step (40 / 60 / 80) | E3 |
| Bleed direction | Merchant per block | Viewport | Binary 48rem (paired, asymmetric API) | E2 |
| Content-width | Merchant per block / section | n/a | Single value | E5 |
| Inner padding | Block author | Container or intrinsic | Single value | E5 |
| Alignment | Block author or merchant | n/a | Single value; paired when single-column ↔ multi-column shifts the value's meaning | E2 (when pivoting) |
| Media asset | Merchant per block | Viewport | Binary 48rem (paired settings) | E6 |

### Bleed API: asymmetric mobile / desktop shapes

The mobile and desktop bleed settings have different *shapes*, not just different values. Single-column mobile has no edge tracks; per-side bleed has no geometric meaning there.

| Setting | Type | Values |
|---|---|---|
| `bleed_desktop` | enum | `none` / `inline_start` / `inline_end` / `both` |
| `bleed_mobile` | enum | `none` / `both` |

Asymmetric setting shape is acceptable when interpretation differs structurally (principle 3).

### Stack-vs-track rhythm: two values, two states

A `columns` block with `stack_below: 60` containing three children (title, richtext, button) has two layout states. Each state reads its between-element spacing from a different source.

**State A — stacked** (container inline-size below 60rem):

```
title
  ↕ ← gap reads from --block-rhythm cascade (section's `spacing` metaobject)
richtext
  ↕
button
```

**State B — side-by-side** (container inline-size at/above 60rem):

```
title  ↔  richtext  ↔  button
       ↑           ↑
       gap reads from columns block's `gap` setting
```

The two values are independent settings:
- `spacing` metaobject on the section → feeds `--block-rhythm-*` → governs State A.
- `gap` setting on the columns block → governs State B.

The topology cutover is container-keyed (`stack_below`), not viewport-keyed. Both values apply simultaneously; only one is visible at a time. The topology change is itself the cutover — no responsive pairing required.

A typical desktop layout sets a tighter vertical rhythm (e.g. 1.5rem between stacked text blocks) and a looser horizontal gap (e.g. 2.5rem between tracks). The merchant authors both independently.

### Block-rhythm override idiom

Block-rhythm cascades from the section's `spacing` metaobject and applies between siblings via top-margin on `:not(:first-child)`. Per-block `mobile_margin_block_start` / `desktop_margin_block_start` settings override the cascade per instance.

Authoring rule: set the section rhythm to the section's *typical* spacing. Per-block overrides operate in both directions — positive to add breathing room, **negative to pull a block tighter than the rhythm**. The schema range for top-margin includes negative values.

Negative top-margin is the explicit exception to the rhythm grid; use it for one-off tightening.

### Spacer at rail edges

A `spacer` block inside a rail (columns track, group child) is the legitimate tool for pre-first-child or post-last-child whitespace — rhythm utilities address only between-sibling spacing, not edges.

Between-sibling spacing inside a rail uses the parent's `gap` setting or the next sibling's top-margin. Spacer is not the tool for that case.

Symmetric breathing room around content of varying height uses the columns / group `vertical_alignment: center` setting, not edge spacers.

## Future direction — subgrid for parent-aware bleed

Gated on the upcoming `<theme-section>` identity discussion. Subgrid changes section structure fundamentally (every section becomes a grid with named lines); that restructure can't be scoped until the section's role and obligations are settled.

CSS subgrid (browser-supported as of Chrome 117+, Safari 16+, Firefox 71+) provides a cleaner alternative to the partial-bleed escape math for the asymmetric-bleed case.

A section structured as a grid with named bleed lines:

```css
.section {
  display: grid;
  grid-template-columns:
    [bleed-start] minmax(0, var(--gutter))
    [content-start] 1fr
    [center] 1fr
    [content-end] minmax(0, var(--gutter))
    [bleed-end];
}
```

Lets children declare their span using named lines: `grid-column: bleed-start / center` for a left-bleeding-to-center image. The grid engine resolves position and width — no negative margins escaping the gutter, no viewport math.

Trade-off: requires every section to be a grid with named lines. Substantial substrate restructure. Partial-bleed escape math is the today-state; subgrid is the future cleaner answer when the substrate is ready for it.

Tracked in BACKLOG for revisit.

## Open questions

**Subgrid migration.** When does Token's substrate adopt subgrid for sections? Gated on the upcoming `<theme-section>` identity discussion (subgrid restructures the section root). After that, depends on browser-support comfort and the cost-benefit of the restructure. Track in BACKLOG.

## Related

- `theme-root.md` — section's role as parametrizable implicit container; layout enum (`column` / `row` / `columns_N`); rhythm scope rule that pairs with the container patterns here
- `css-standards.md` — CSS layer model, naming, variables foundation
- `composition-strategy.md` — block / preset / section layer model
- `modifier-system.md` — `data-modifiers` convention used for `bleed:*` flags
- `validation.md` — chrome/content decoupling rule (related to section structure)
- BACKLOG.md — active exploration scaffold for the bleed API hypothesis
