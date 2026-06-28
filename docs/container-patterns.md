# Container patterns

The horizontal-sizing system for sections and blocks. Three concepts, one bleed model (named-line grid on token-section), one content-width cap. Responsiveness layers on top — see "Responsiveness" below.

## Three concepts

| Concept | What it is | Where it lives |
|---|---|---|
| **Section gutter** (`--gutter`) | Space between section content area and viewport edge. Responsive: `--mobile-gutter` (1.5rem) below 48rem, `--desktop-gutter` (3.5rem) at/above. Absorbed by the section's side grid tracks (1fr each); no explicit padding. | Theme-wide, emitted by `utility--css-variables`. |
| **Gap** | Space *between* tracks in a grid or flex container. | Per-container (set on `group`, `columns`, `media` overlay-content via the `gap` block setting). |
| **Inner padding** | Space inside an element's own border (`padding-inline` / `padding-block`). | Per-element, opt-in via `container_style` variants (card / outlined / elevated) or per-project CSS overrides. |

These three live at independent scales. A change at one scale doesn't leak into another:

- Section gutter is the section's side-track width; it doesn't propagate to nested containers (their own layout governs).
- Gap separates tracks in a single grid; it doesn't accumulate when grids nest.
- Inner padding is element-local; it doesn't interact with the section/track gutter system.

There is no "track inner gutter" as a primitive. The padding inside a grid track is handled by the track's child block via `container_style` (when card-like chrome is wanted) or by the block's own padding (when block-specific).

## CSS variables

| Variable | Source | Purpose |
|---|---|---|
| `--gutter` | `utility--css-variables` (responsive via `--mobile-gutter` / `--desktop-gutter`) | Section side-track minimum at narrow viewports. Absorbed into the section's `1fr` side tracks. |
| `--content-width` | Section-level dynamic style (via `content_width` metaobject setting) | Section's content cap (max width of the center track). Defaults to 125rem at the substrate (`layer-base.css`). Doubles as the bleed cap — bleeding children span past the content cap to viewport edge only when the viewport is wider than `content-width + 2 × gutter`. |

## Bleed grid (the one model)

Theme-section resolves as a CSS grid with three tracks and four named lines. Direct children declare span via `grid-column`, gated on `bleed-desktop:<value>` / `bleed-mobile:<value>` modifiers — emitted by container blocks (`group`, `columns`, `media`).

```css
[data-modifiers*='theme-root'] {
  display: grid;
  grid-template-columns:
    [bleed-start]
    min(var(--gutter), max(0px, calc((var(--content-width, 125rem) + 2 * var(--gutter) - 100%) / 2)))
    [content-start]
    min(var(--content-width, 125rem), calc(100% - 2 * var(--gutter)))
    [content-end]
    min(var(--gutter), max(0px, calc((var(--content-width, 125rem) + 2 * var(--gutter) - 100%) / 2)))
    [bleed-end];
  justify-content: center;
}

[data-modifiers*='theme-root'] > * {
  grid-column: content-start / content-end;
}
```

Track behavior (three viewport ranges):

| Viewport | Side track | Center track | Bleed extent (start → end) | Content extent |
|---|---|---|---|---|
| `< --content-width` | `--gutter` | `viewport - 2 × --gutter` | viewport (full bleed) | `viewport - 2 × --gutter` |
| Convergence range: `--content-width` to `--content-width + 2 × --gutter` | shrinking from `--gutter` toward `0` | `viewport - 2 × --gutter` (still tracking viewport) | `--content-width` (already capped) | `viewport - 2 × --gutter` |
| `≥ --content-width + 2 × --gutter` | `0` (collapsed) | `--content-width` (capped) | `--content-width` (capped) | `--content-width` |

At wide viewports, bleed and content **converge** at `--content-width`. The grid total ≤ `--content-width + 2 × --gutter`; `justify-content: center` keeps the grid centered within the wider section. Edge-to-edge backgrounds at very wide viewports live on the outer `.shopify-section` (no max-inline-size cap).

Direct children:
- **No bleed modifier** (default): `grid-column: content-start / content-end` → sits in the center track, capped at `--content-width`.
- **`bleed-desktop:both`**: at ≥ 48rem, `grid-column: bleed-start / bleed-end` → spans full viewport width (capped at viewport — the side tracks contribute their share).
- **`bleed-desktop:inline-start`**: at ≥ 48rem, `grid-column: bleed-start / content-end` → start side bleeds, end side stays at content edge.
- **`bleed-desktop:inline-end`**: at ≥ 48rem, `grid-column: content-start / bleed-end` → end side bleeds, start side stays.
- **`bleed-mobile:both`**: at < 48rem, `grid-column: bleed-start / bleed-end` → mobile full-bleed regardless of desktop setting.

Mobile is a binary `both`-only enum. Single-column mobile has no edge tracks; per-side bleed has no geometric meaning there.

## Container nesting

Section gutter applies once, at the section's grid. Container blocks (`group`, `columns`, `media`) position via section's grid, then layout their own children via their own `gap` setting. No nested gutter math.

```html
<token-section>                                         <!-- bleed grid -->
  <div class="shopify-block--group">                     <!-- direct child: positions in content track -->
    <div class="inner">
      <div class="shopify-block--columns">              <!-- group's child: positions in group's flex -->
        <div class="inner">
          <div class="shopify-block--title">…</div>      <!-- columns' child: positions in columns' grid -->
        </div>
      </div>
    </div>
  </div>
</token-section>
```

A `group` inside a section: positions in section's content track (default). Inside the group's `.inner`, children flow per the group's flex settings (direction, alignment, gap).

A `columns` inside that group: positions per the group's flex (one flex item). Inside the columns' `.inner`, children flow per the columns' grid tracks.

Each level partitions its containing block; no level eats into the next. Deep-nesting compositions stay predictable.

**Children of containers do not reach section's bleed lines.** Section's grid-column rules only match direct children via the `>` combinator. A `bleed-desktop:both` modifier on a block nested inside a container emits to `data-modifiers` but the section's selector doesn't match — the nested block positions in its container's layout instead. This is the strict container-only bleed model in action (see `subgrid-migration.md` § Bleed model).

## Content cap and convergence

The section's `--content-width` is the single ceiling for both content and bleed. Bleeding elements are content (images, decorative bands), not background — they cap at the same width as text content. There is no separate "bleed cap" constant; the bleed ceiling tracks whatever value `--content-width` resolves to on the section.

The substrate default is `125rem` (2000px), set in `layer-base.css` as the `--content-width` default. Sections narrow the ceiling per-instance via the `content_width` metaobject setting; both content and bleed follow the narrowed value. A 60rem-content section gets 60rem bleed bands — a deliberate constraint that keeps bleed media proportional to the section's content scale.

At viewports `< --content-width + 2 × --gutter`, the bleed grid's side tracks compress to `--gutter` each (the center track's `min(...)` caps it at `100% - 2 × --gutter`). Bleed children spanning bleed-start to bleed-end still cover the full viewport at narrow viewports — the side tracks ARE the gutter at that scale.

Edge-to-edge backgrounds on very wide viewports live at the `.shopify-section` element (which has no max-inline-size cap) via background-color or background-image. The bleed system caps at content; the section's outer wrapper handles viewport-spanning visuals.

"Narrow text, wide media" inside one section composes as a `columns` block with one bleeding child and a per-block `content_width` override on the text-bearing sibling — not mismatched section-vs-block ceilings.

## Outer/inner container architecture

The three container blocks (`group`, `columns`, `media`) emit two nested wrappers:

```html
<div class="shopify-block shopify-block--group">  <!-- outer: container-type -->
  <token-layout>                                   <!-- inner: layout rules -->
    {% content_for 'blocks' %}
  </token-layout>
</div>
```

**Why two wrappers.** The CSS Containment spec states that `@container <name>` queries do **not** match the element with `container-type` — they only match descendants. Putting the flex/grid layout on the same element as `container-type: inline-size` would make stack-below rules silently never fire. The outer hosts containment + the named container; the inner hosts the actual layout (`display: flex` / `display: grid`, `flex-direction`, `grid-template-columns`, `gap`, alignment).

**Inner is `<token-layout>` — a generic custom element** registered by `assets/token-layout.js`. Empty class extending `HTMLElement`; exists to give the inner wrapper a custom-element tag for CSS targeting. Scoped via the outer's class — `.shopify-block--group > token-layout`, `.shopify-block--columns > token-layout` — so the bare `token-layout` selector doesn't need defensive scoping inside the outer's stylesheet.

**`media` doesn't use `<token-layout>`.** Its inner element is `<media-contents>` (overlay-content layout) — a custom element used as a scope anchor for absolute-positioned overlay children, not the same role as token-layout. The outer hosts containment + the media element + the overlay tint sibling.

The outer/inner split is structural, not stylistic.

## Inner padding and bleed compose freely

`container_style` variants (card / outlined / elevated) add `padding-inline` and `padding-block` to the styled block. This padding is element-local — it doesn't interact with section gutter or bleed math.

A card variant inside a bleeding parent works as expected:

```html
<group bleed_desktop=both bleed_mobile=both>   <!-- outer: full-bleed band -->
  <group container_style=card>                  <!-- inner: card with own padding -->
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

Some primitives need `padding-inline` for their gutter, because they host native horizontal scroll. The bleed grid model doesn't fit — the scrolling element needs the gutter on its side, not absorbed into section's side tracks. Primitives in this category:

- `slider` / `carousel` (planned)
- `marquee` (planned)
- `breadcrumb` / `linklist-quick-nav` when their content overflows horizontally on narrow viewports
- Any future primitive whose visible-but-overflowing horizontal flow must remain native-CSS-scrollable

These primitives keep the section gutter as `padding-inline` on the scroll rail, and the rail's INNER content scrolls. Document in the primitive's spec when it ships.

### Per-block `content_width`

Per-block `content_width` (set on individual blocks like `title`, `richtext`, `button`) overrides the block's `max-inline-size` for itself only. The block's own CSS caps at that value; `margin-inline: auto` centers it inside the section's content track.

This is the right answer for "image-left + content-right with narrow title on right column": each child of the right column sets its own `content_width` metaobject. The cap applies inside the right column's available width. No new mechanism needed.

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
| E5 | Single value with `min()` cap | Sizing bounded above, flowing below | `min(var(--content-width), calc(100% - 2 × --gutter))` on theme-root center track |
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

Authoring rule: set the section rhythm to the section's *typical* spacing. A per-block override (`mobile_margin_block_start` / `desktop_margin_block_start`, range `0…100`) *replaces* the rhythm with an absolute value for that block — it is not added on top, so the same value yields the same gap wherever the block sits. A value below the rhythm tightens; a larger value loosens; the `spacer` block covers large gaps. Block-level overlap (negative) is not supported.

Negative top-margin is the explicit exception to the rhythm grid; use it for one-off tightening.

### Spacer at rail edges

A `spacer` block inside a rail (columns track, group child) is the legitimate tool for pre-first-child or post-last-child whitespace — rhythm utilities address only between-sibling spacing, not edges.

Between-sibling spacing inside a rail uses the parent's `gap` setting or the next sibling's top-margin. Spacer is not the tool for that case.

Symmetric breathing room around content of varying height uses the columns / group `vertical_alignment: center` setting, not edge spacers.

## Related

- `theme-root.md` — bleed grid contract (named lines, rhythm scope, four responsibilities)
- `subgrid-migration.md` — the structural overhaul that produced this model; explains the body-level appearance shift + strict container-only bleed
- `css-standards.md` — CSS layer model, naming, variables foundation
- `composition-strategy.md` — block / preset / section layer model
- `modifier-system.md` — `data-modifiers` convention used for `bleed-desktop:*` / `bleed-mobile:*` flags
- `validation.md` — chrome/content decoupling rule (related to section structure)
