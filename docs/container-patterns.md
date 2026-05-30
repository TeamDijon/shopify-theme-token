# Container patterns

The horizontal-sizing system for sections and blocks. Three concepts, two CSS patterns, one bleed model. Responsiveness layers on top — see "Open questions" below.

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
| `--gutter` | `utility--css-variables` (responsive via `--mobile-gutter` / `--desktop-gutter`) | Section gutter at the current breakpoint |
| `--content-width` | Section-level dynamic style (via `content_width` metaobject setting) | Section's content cap; defaults to 125rem at the substrate (`layer-base.css`) |
| `--bleed-cap` | Substrate constant in `layer-base.css` (`= 125rem`) | Maximum bleed extension. Equal to the theme's content ceiling — bleeding media is content, not background. |
| `--bleed-distance` | Section-level dynamic style, computed | Negative-margin amount for partial bleed. Formula: `max(0px, (min(100dvw, var(--bleed-cap)) - var(--content-width, 125rem)) / 2) + var(--gutter)` |

## Width patterns

### Pattern B — default content sizing

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

### Pattern A — partial-bleed escape (per-side, inside a grid track)

When a block sits inside a grid track (column track inside a `columns` block) and needs to escape its track to reach the section's bleed cap on one side, the negative-margin approach handles it:

```css
.shopify-block[data-modifiers*='bleed:inline-start']:first-child {
  margin-inline-start: calc(-1 * var(--bleed-distance));
}

.shopify-block[data-modifiers*='bleed:inline-end']:last-child {
  margin-inline-end: calc(-1 * var(--bleed-distance));
}
```

`--bleed-distance` is computed on the section root and includes the section gutter, the section's content-width gap (if section is narrower than the bleed cap), and the gap-absorb adjustment for "cut at viewport center" in two-track layouts.

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

## Bleed cap, content cap, and convergence

The bleed cap (`125rem` = 2000px) is the theme's content ceiling. Bleeding elements are content (images, decorative bands), not background — they cap at the same width as text content.

The result: at viewports `≥ --content-width + 2 × --gutter`, the non-bleed default and the section-bleed converge to the same width. They reach the same cap. The constant `2 × --gutter` gap between them at narrower viewports shrinks to zero at the convergence viewport and stays zero for all wider viewports.

This is intentional. The bleed isn't "extend to viewport edge forever" — it's "fill to the content cap." Beyond the cap, both default and bleed sit centered in the viewport at the same width, with the "viewport gutter" (excess viewport-to-cap space) visible on each side.

If a project wants edge-to-edge backgrounds on very wide viewports, that lives at the `.shopify-section` element (which has no max-inline-size cap) via background-color or background-image. The bleed system caps at content; the section's outer wrapper handles viewport-spanning visuals.

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

These primitives use the Pattern A approach inverted — they keep the section gutter as `padding-inline` on the scroll rail, and the rail's INNER content scrolls. The gutter never escapes via negative margin in these blocks.

Document in the primitive's spec when it ships.

### Per-block `content_width`

Per-block `content_width` (set on individual blocks like `title`, `richtext`, `button`) overrides the block's `--content-width` for itself only. The Pattern B formula resolves the narrower cap inside the block's containing block — the block becomes narrower than its sibling blocks.

This is the right answer for "image-left + content-right with narrow title on right column": each child of the right column sets its own `content_width` metaobject. The formula caps at that value within the right column's available width. No new mechanism needed.

## Future direction — subgrid for parent-aware bleed

CSS subgrid (browser-supported as of Chrome 117+, Safari 16+, Firefox 71+) provides a cleaner alternative to Pattern A escape math for the asymmetric-bleed case.

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

Lets children declare their span using named lines: `grid-column: bleed-start / center` for a left-bleeding-to-center image. The grid engine resolves position and width — no negative margins, no `--bleed-distance` variable, no viewport math.

Trade-off: requires every section to be a grid with named lines. Substantial substrate restructure. Pattern A escape math is the today-state; subgrid is the future cleaner answer when the substrate is ready for it.

Tracked in BACKLOG for revisit.

## Open questions

**Responsiveness in the API.** The current bleed flags are `bleed_desktop` and `bleed_mobile` (per-block); responsive `content_width` could plausibly need the same treatment (narrow on mobile, wide on desktop). The general shape — "per-block responsive overrides via paired settings" — needs a coherent rule before it proliferates. Discussion deferred to the next conversation.

**Subgrid migration.** When does Token's substrate adopt subgrid for sections? Depends on browser-support comfort + the cost-benefit of the restructure. Track in BACKLOG.

## Related

- `css-standards.md` — CSS layer model, naming, variables foundation
- `composition-strategy.md` — block / preset / section layer model
- `modifier-system.md` — `data-modifiers` convention used for `bleed:*` flags
- `validation.md` — chrome/content decoupling rule (related to section structure)
- BACKLOG.md — active exploration scaffold for the bleed API hypothesis
