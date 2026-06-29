# Block alignment

How a block aligns horizontally within its placement context. Companion to `container-patterns.md` (which owns horizontal *sizing* — gutter, gap, content-width cap, bleed); this doc owns horizontal *placement* of a block inside its parent.

## The placement-context model

Every block's immediate parent is one of four things, and each collapses to either a **grid item** or a **flex item**:

| Parent | Layout | Block is a… |
|---|---|---|
| `<token-section>` theme-root | grid | grid item |
| `columns` track | grid | grid item |
| `group` inner | flex | flex item |
| `<media-contents>` | flex | flex item |

Nesting recurses through the same four — a block inside a group inside a column is a flex item (the group is its parent). There is no fifth context.

The two contexts place their children differently:

- **Grid: the block self-places.** `justify-self` on the item decides where it sits in its track.
- **Flex: the container places its children.** `align-items` (column flex) / `justify-content` (row flex) on the container decides; an item's own `justify-self` is ignored.

`justify-self: center` encodes exactly this split: it centers the block in a grid context and is ignored in a flex context (where the container's alignment governs). This is why it is the one coherent self-alignment mechanism — and why `margin-inline: auto` is not: auto inline margins center in both grid and flex, *overriding* the flex container's `align-items`. A capped block centered by auto margins ignores its group's alignment — the footgun this model removes.

## Fill vs content-sized

- **Uncapped blocks fill the track.** A `title` / `richtext` / `group` / `columns` with no `content_width` stretches to its grid area (grid default) or its flex cross-size. No `justify-self` is emitted — stretch is correct.
- **Content-sized blocks center by default.** A block is content-sized when it is narrower than its track; **every** content-sized block centers via `justify-self: center` in a grid context (in a flex parent they follow the container's alignment). The block is content-sized when:
  - `button` — always (`display: inline-flex`, content-sized; `full_width: *` opts back into filling).
  - `title` / `richtext` / `group` / `columns` — when `content_width` is capped.
  - `separator` / `media` / `embed` — when `content_width` is capped.

Within the centered set, blocks differ in how they *fill* the centered box — a per-block intrinsic-sizing property, not an alignment concept:

| Family | Blocks | When capped |
|---|---|---|
| **Fill-to-cap** | `separator`, `media`, `embed`, `group`, `columns` | `inline-size: 100%` fills to the `content_width` cap, then `justify-self: center` centers that box. The width is the cap. |
| **Fit-content** | `title`, `richtext`, `button` | No `inline-size: 100%`; the block sizes to its content (capped), then centers. Wide content (prose) reaches the cap; narrow content stays narrower. |

Emission mechanics follow from the family. `separator` / `media` / `embed` carry `inline-size: 100%` + `justify-self: center` **unconditionally** in the stylesheet (the `inline-size` makes both no-ops until a cap narrows the block). `group` / `columns` emit `inline-size: 100%` + `justify-self: center` **conditionally** (per-instance, only when `content_width` is set) — unconditional `inline-size: 100%` re-introduces known `container-type` collapse hazards, and `columns` specifically collapses to 0 under a bare non-stretch `justify-self` because `container-type: inline-size` severs the content→size path, so the explicit width is load-bearing. `title` / `richtext` emit `justify-self: center` conditionally (no `inline-size`, so an unconditional `center` would shrink them in grid). `button` emits `justify-self: center` unconditionally (always content-sized).

## Default is center

Content-sized blocks center, not start-align. Center is the only no-markup default available while the per-block alignment setting is deferred (below), so it must serve the common case — and Token leans marketing / landing: centered heroes, centered content sections, centered CTAs, reading-width columns. The homepage is centered throughout. Center is also the least-churn choice: `title` / `richtext` / `separator` / `media` / `embed` already centered when capped.

`start` (RTL: `end`) is the least-opinionated, anchor-in-place alternative and would be the right default for an editorial / docs theme. Token is not that theme. RTL is handled by `justify-self` honoring logical inline direction — no per-direction CSS.

## Reaching start / end

Wrap the blocks in a `group` — the flex alignment authority. Its `horizontal_alignment` setting (→ `align-items`) governs all its children at once. This is the deliberate single escape hatch: a merchant who wants left- or right-aligned content groups the blocks and sets the group's alignment, rather than each leaf carrying its own knob.

## Deferred — per-block `horizontal_alignment`

A per-block `horizontal_alignment` setting (emitting `justify-self: <value>` per instance, overriding the center default) is **not** a feature. Start / end is reached through a `group`. Adding the per-block setting is additive and non-breaking if a real need appears; `button` is the natural first candidate (the only always-content-sized leaf, no `text_align` to collide with, gated `visible_if full_width: none`). It is deferred because it adds a setting plus interactions (with `full_width`, with `text_align`) for an alignment the `group` escape hatch already covers. (On a container the setting would govern the container's own placement, distinct from its existing `horizontal_alignment`, which aligns its children — a naming collision to resolve if the setting ever lands.)

## Deferred — responsive alignment

Alignment is a single value across viewports. No responsive alignment exists in Token (groups are single-value too). Per-project sections that need it own the markup; the composable layer does not pair alignment across the 48rem cutover. Consistent with `container-patterns.md` § Responsiveness (alignment pairs only when a single-column ↔ multi-column shift changes the value's meaning).

## Related

- `container-patterns.md` — horizontal sizing (gutter / gap / content-width / bleed); per-block `content_width` cap that produces the content-sized state
- `theme-root.md` — the section grid blocks self-place within
- `css-standards.md` — layer model and logical-property conventions
