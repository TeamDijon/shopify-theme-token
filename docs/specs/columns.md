# columns

**Layer**: 1

**Type**: block (`blocks/columns.liquid`) + matching snippet (`snippets/columns.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/columns.liquid` v1.7.0 (render surface)
- `blocks/columns.liquid` v1.5.0 (block schema + render call)
- `assets/token-layout.js` v1.1.0 (inner-wrapper custom element)

**Reconciled**: 2026-05-31 (theme-* → token-* rename pass — inner-wrapper tag `<theme-layout>` → `<token-layout>`; contract surface unchanged)

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `container_style` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid` (recursive), `blocks/media.liquid` is NOT in this list (media whitelists columns but not the reverse — see "Nested container composition" below)

## Purpose

CSS Grid container with fixed column ratios. The second of three L1 container blocks (alongside `group` and `media`), specialized for explicit-ratio multi-track layouts. Renders an outer `.shopify-block--columns` (hosts the named container `columns` for `@container` queries) wrapping an inner `<token-layout>` element (hosts the grid layout). Seven preset column ratios cover the common shapes: 2-track equal (`2`), 3-track equal (`3`), 4-track equal (`4`), and asymmetric pairs (`1-2`, `2-1`, `1-3`, `3-1`).

Distinguishing from siblings:

- **`group`** — flex composition, ratio-free, stack-below switches between row/column. Reach for `group` when "lay these next to each other, optionally wrap on narrow" is the goal.
- **`media`** — single media element with overlay content. No layout matrix.
- **`columns`** — explicit grid ratios (`2-1`, `1-3`, etc.), stack-below to single column, sticky-track support. Reach for `columns` when ratio control is the goal.

Stack-below uses `@container` queries against the columns block's **own** inline-size, not the viewport. A columns block placed inside a narrow parent stacks based on the parent's available width — correctly — without false-positive matches against the viewport breakpoint.

## API

Snippet args (`{% render %}`) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` / `contents` for render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. |
| `block` | block | yes (render) | — | Snippet-only. |
| `block_id` | string | no | — | Snippet-only. |
| `contents` | string | yes | — | Snippet-only. Pre-rendered child blocks markup. Snippet doesn't `break` when blank — an empty columns still renders the wrappers (consistent with `group`'s container-renders-empty pattern). |
| `columns` | select (`2` / `3` / `4` / `1-2` / `2-1` / `1-3` / `3-1`) | no | `"2"` | Grid column template. Emits `columns:<value>` modifier and `--grid-template-columns` via dynamic style. |
| `stack_below` | select (`none` / `40` / `60` / `80`) | no | `"60"` | Below the named container-width breakpoint (rem), collapses to single column. `none` disables. Emits `stack-below:<value>` modifier when ≠ `none`. The 60 default (md / ~960px) covers most "stack on tablet" cases. |
| `sticky_track` | select (`none` / `first` / `second`) | no (visible only on 2-track layouts) | `"none"` | Pins the named track via `position: sticky`. Schema `visible_if` constrains to layouts with exactly 2 tracks (`2`, `1-2`, `2-1`, `1-3`, `3-1`). Disabled when stack-below has collapsed the layout. |
| `vertical_alignment` | select (`start` / `center` / `end` / `stretch`) | no (visible only when `sticky_track: none`) | `"start"` | `align-items` on the grid container. Hidden in the editor when sticky is active because sticky forces `align-self: start` on the pinned track. |
| `content_width` | metaobject (`content_width`) | no | blank → 100% | Caps `max-inline-size`. Composes with bleed (cap = section's content cap; per `container-patterns.md`). |
| `gap` | range (0–100, step 2, px) | no | `16` | Gap between columns. Emitted as `--gap` in rem; zero-emission skipped. |
| `bleed_desktop` | select (`none` / `inline_start` / `inline_end` / `both`) | no | `"none"` | Columns block's bleed direction at/above 48rem. Emitted as `bleed-desktop:<value>` modifier when ≠ `none`; the section's named-line bleed grid resolves positioning. |
| `bleed_mobile` | select (`none` / `both`) | no | `"none"` | Columns block's bleed direction below 48rem. Single-column mobile has no edge tracks; per-side bleed has no geometric meaning there. Emitted as `bleed-mobile:both` modifier when set. |
| `container_style` | metaobject (`container_style`) | no | blank | Emits `container-style:<handle>` modifier. Centralized variant CSS in `layer-theme.css`. |
| `color_scheme` | theme setting (`color_scheme`) | no | blank | Overrides the section's color scheme. Emits `color-scheme:<id>` modifier. |
| `mobile_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin below the desktop breakpoint. |
| `desktop_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. |

## Whitelisted children

```
spacer, separator, title, richtext, button, media, embed, group, columns
```

The full 9-block roster. Recursive composition via `columns` in its own whitelist enables nested grids (a row of columns where each column is itself a columns block). Note `media` whitelists `columns` for media-as-track-content patterns, but `columns` does not currently include nested media outside the standard composition (media-as-content goes in via the same whitelist entry).

## Output shape

```html
<div class="shopify-block shopify-block--columns"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="columns:2,stack-below:60,sticky-track:first,bleed-desktop:both,bleed-mobile:both,container-style:card,color-scheme:scheme-2">
  <token-layout>
    <!-- children rendered via {% content_for 'blocks' %} -->
  </token-layout>
</div>
```

**Outer/inner architecture is load-bearing.** `container-type: inline-size; container-name: columns` lives on the outer (`.shopify-block--columns`); the grid layout (`display: grid`, `grid-template-columns`, `gap`, `align-items`) lives on the inner `<token-layout>`, scoped via `.shopify-block--columns > token-layout`. The CSS Containment spec states `@container <name>` queries do **not** match the element with `container-type` — they only match descendants. Putting the grid on the outer would make stack-below rules silently never match. The split is structural, not stylistic. Same pattern as `group`.

`data-modifiers` accumulates per emit-when-set. Order is deterministic per `modifier_list` builder.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--columns` (outer) and `> token-layout` (inner). Layered in `@layer components`.

```css
.shopify-block--columns {
  container-type: inline-size;
  container-name: columns;
  max-inline-size: var(--content-width, 100%);

  /* No own bleed CSS — section's grid-column handles bleed positioning when this block is a direct child of <token-section> and carries a bleed-desktop:* / bleed-mobile:* modifier. */
}

.shopify-block--columns > token-layout {
  display: grid;
  grid-template-columns: var(--grid-template-columns, 1fr);
  align-items: var(--vertical-alignment, start);
  gap: var(--gap, 0rem);
}

/* Stack-below — collapse to single column when below the breakpoint */
.shopify-block--columns[data-modifiers*='stack-below'] > token-layout {
  grid-template-columns: 1fr;
}

@container columns (inline-size >= 40rem) {
  .shopify-block--columns[data-modifiers*='stack-below:40'] > token-layout {
    grid-template-columns: var(--grid-template-columns);
  }
}
/* …equivalent @container queries at 60 and 80 rem */

/* Sticky track — pin first or last column */
.shopify-block--columns[data-modifiers*='sticky-track:first'] > token-layout > :first-child,
.shopify-block--columns[data-modifiers*='sticky-track:second'] > token-layout > :last-child {
  position: sticky;
  top: var(--sticky-offset, 1rem);
  align-self: start;
}

/* Disable sticky when stack-below has collapsed */
.shopify-block--columns[data-modifiers*='stack-below'] > token-layout > * {
  position: static;
}

/* Re-enable sticky inside @container queries that re-enable the grid */
@container columns (inline-size >= 40rem) {
  .shopify-block--columns[data-modifiers*='stack-below:40'][data-modifiers*='sticky-track:first'] > token-layout > :first-child,
  .shopify-block--columns[data-modifiers*='stack-below:40'][data-modifiers*='sticky-track:second'] > token-layout > :last-child {
    position: sticky;
  }
}
/* …equivalent for 60 and 80 */
```

`container_style` variant rules live centrally in `layer-theme.css` (shared with `group` and `media`). See `specs/container-style.md`.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm-mobile/desktop` via `utility--block-layout-vars`.

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars`:

| Variable | Purpose | Default |
|---|---|---|
| `--content-width` | `max-inline-size` cap (px from metaobject) | `100%` |
| `--mobile-margin-block-start` / `--desktop-margin-block-start` | Top margin per breakpoint | `0` |

Columns-specific vars emitted into per-instance dynamic style:

| Variable | Purpose | Default |
|---|---|---|
| `--grid-template-columns` | Grid track template per the `columns` setting | `1fr` (CSS fallback) |
| `--gap` | Gap between tracks (rem) | `0rem` (only emitted when > 0) |
| `--vertical-alignment` | `align-items` on the grid | `start` (only emitted when ≠ `start`) |

Sticky-track tuning:

| Variable | Purpose | Default |
|---|---|---|
| `--sticky-offset` | Distance from viewport top when pinned | `1rem` (CSS fallback) |

## Behavior

- **Seven preset ratios.** `2`, `3`, `4` for equal tracks; `1-2`, `2-1`, `1-3`, `3-1` for asymmetric pairs. The emission is a `--grid-template-columns` value per the case branch. No `<n>fr` arbitrary-ratio mode — adding new ratios requires a new entry in the schema's options + a new `when` branch in the snippet.
- **Stack-below via `@container` queries.** The block declares `container-name: columns` on the outer. The inner's `grid-template-columns` defaults to `1fr` when a `stack-below` modifier is present; the `@container columns (inline-size >= 40rem)` rule overrides it back to the configured `--grid-template-columns` value when the outer's width is at or above the breakpoint. Behavior: a columns block sized below 40rem stacks; above 40rem, the grid applies. Container queries against the outer's inline-size — not the viewport — so nested columns inside narrow parents stack correctly.
- **Outer/inner is required.** Same architectural rationale as `group`. `@container columns` queries skip the element with `container-type: inline-size`. The grid lives on `<token-layout>` (the descendant); the container lives on `.shopify-block--columns` (the outer).
- **Sticky-track pins one column.** `sticky-track:first` pins the first grid item via `position: sticky; top: var(--sticky-offset, 1rem); align-self: start`. `sticky-track:second` pins the last. Only 2-track layouts make geometric sense for sticky (the non-sticky track provides the scroll runway); the schema's `visible_if` constrains the setting to 2-track values. `align-self: start` keeps the pinned child at its natural height so the parent grid can grow taller; the non-sticky child remains free to size itself.
- **Sticky disables under stack-below.** When stack-below has collapsed the grid to single-column, sticky has no second track to scroll against; the `position: static` override at the `[data-modifiers*='stack-below']` selector disables pin. The `@container` queries that re-enable the grid also re-enable sticky (the per-breakpoint sticky rules).
- **vertical_alignment hidden when sticky is active.** Schema `visible_if` ensures the editor doesn't expose the conflict; sticky forces `align-self: start` on the pinned track, so per-track alignment would be ignored anyway. The setting is preserved in the schema for the non-sticky case.
- **bleed shares math + footgun with `group`/`media`.** `margin-inline: calc(50% - 50dvw)` escapes the section gutter to the full visible viewport, anchored on the parent's centerline. Off-center ancestor chains (a columns inside the narrower track of a `1-3` parent columns) cause visual drift. Use bleed at the section level or inside a centered group; avoid nesting bleeds.
- **content_width ignored when bleed is true.** Same as `media`/`group`: bleed sizing (`inline-size: 100dvw; max-inline-size: none`) overrides the `max-inline-size: var(--content-width)` declaration.
- **Empty columns renders the wrappers.** Container blocks emit their structural wrappers by design. An empty columns participates in section block-rhythm — it's a `.shopify-block` matched by the rhythm cascade selector. An empty columns with `container_style` set renders a styled empty card / outline / panel — useful as a placeholder pattern during composition.
- **Recursive nesting.** Columns inside columns is supported. Each level has its own `@container columns` queries — the rule walks up to the nearest named ancestor, which is the immediate parent columns. Stack-below works per-level independently. The shared `container-name` means a columns inside another columns has its `stack-below` triggered by the parent's width, not the section's.
- **`{{ block.shopify_attributes }}` emission.** On the outer wrapper.

## Locale keys

Schema strings under `blocks.columns.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.columns.name`
- `blocks.columns.settings.layout.content` (group header)
- `blocks.columns.settings.columns.{label,options.{two,three,four,one_two,two_one,one_three,three_one}}`
- `blocks.columns.settings.stack_below.{label,info,options.{none,sm,md,lg}}`
- `blocks.columns.settings.sticky_track.{label,info,options.{none,first,second}}`
- `blocks.columns.settings.vertical_alignment.{label,options.{start,center,end,stretch}}`
- `blocks.columns.settings.content_width.{label,info}`
- `blocks.columns.settings.gap.label`
- `blocks.columns.settings.bleed.{label,info}`
- `blocks.columns.settings.appearance.content` (group header)
- `blocks.columns.settings.container_style.{label,info}`
- `blocks.columns.settings.color_scheme.{label,info}`
- `blocks.columns.settings.top_spacing.content` (group header)
- `blocks.columns.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.columns.presets.columns.{name,category}`

No runtime strings.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block-backed; no sub-component half)
- **Page**: `sections/validation--primitive--columns.liquid` + `templates/index.validation--primitive--columns.json` (shipped — proto-preset `columns-features` may slot here at retrofit)
- **API surface**:
  - **Ratio matrix**: `2`, `3`, `4`, `1-2`, `2-1`, `1-3`, `3-1` × stack-below ∈ {none, 40, 60, 80} — verify grid-template-columns emission and stack-below behavior at each breakpoint
  - **Sticky-track**: `first` and `second` on each 2-track ratio — verify sticky pins the named track; scroll the parent and confirm visual behavior; stack-below collapsed → sticky disabled
  - **vertical_alignment**: `start`, `center`, `end`, `stretch` on a non-sticky 2-track layout
  - **Gap**: 0, 16, 48 — verify zero-emission discipline
  - **Bleed**: with and without — verify section-bleed sizing applies when set; bleed inside a column track (off-center case) — visual drift (documented footgun)
  - **content_width × bleed**: capped width without bleed; capped width with bleed → bleed wins (max-inline-size: none); confirm
  - **container_style**: card, outlined, elevated — verify centralized rules apply from `layer-theme.css`
  - **color_scheme override**: columns with scheme-2 inside scheme-1 section — children inherit scheme-2 tokens
  - **Recursion**: columns inside columns (e.g. outer `2` with each track containing another `1-2`) — verify each level's stack-below works against immediate parent
- **Edge cases**:
  - Empty columns (no children declared) → outer + inner wrappers render, no inner content
  - `sticky_track` set on a 3- or 4-track ratio (unreachable from editor; possible via direct render) → modifier still emits; CSS only pins first or last child, which may not be visually expected for >2 tracks
  - `vertical_alignment: stretch` + sticky active → sticky forces `align-self: start`; stretch ignored
  - `bleed` on a columns inside a `1-3` parent's first (narrower) track → visual drift (off-center chain)
  - Container query support absent (legacy engines) → grid renders without stack-below switching; degrades to default `--grid-template-columns` always-on
- **Visual showcase**: matrix sections per concern. Reader confirms ratio renders correctly at desktop/mobile, stack-below switches at the named breakpoint, sticky pins the correct track, bleed escapes the gutter.
- **Assertions** (prose; Playwright once installed):
  - Computed `grid-template-columns` on `token-layout` matches the configured `columns` value (above the stack-below breakpoint) or `1fr` (below)
  - `[data-modifiers*='sticky-track:first']` instances have `position: sticky` on the first grid child above the stack-below breakpoint
  - `[data-modifiers*='bleed']` instances have `inline-size: 100dvw` and `margin-inline: calc(50% - 50dvw)`
  - `[data-modifiers*='container-style:card']` instances pull their variant rule from `layer-theme.css`
- **Unit scope**: none (Liquid + CSS only)

## Out of scope

- **Arbitrary `<n>fr` ratios** — only the seven preset shapes ship. Adding new ratios is a schema + snippet update; the agreed surface is preset-based, not free-form.
- **Per-track styling** — columns are uniform; per-track customization (different background per track, different padding per track) requires nesting a `group` inside each track with its own settings. The columns block doesn't expose per-track settings.
- **Asymmetric stack-below per breakpoint** — single threshold per columns block. "Stack at 40rem on first columns, 80rem on second columns" requires composing two columns blocks with different settings, not a per-track threshold.
- **Bleed beyond the section's content cap** — same constraint as `group`/`media`. Under Option A, bleed caps at `--content-width`. The subgrid migration tightens this.
- **Auto-flow modes** (`grid-auto-flow: dense`, `repeat(auto-fit, minmax(…))`) — the grid is explicitly templated, not auto-flow. Adaptive cards belong in a future `auto-grid` block.
- **`grid-template-rows` configuration** — columns block doesn't expose row sizing. Children flow into a single row by default; multi-row layouts require nesting columns inside columns or composing with `group`.
- **Reverse-order on stack-below** — when collapsing to single column, source order applies. "Visual reorder on stack" would require a `flex-direction: column-reverse` override; not in the API surface.

## Related

- Container patterns (sizing, bleed model, content cap, asymmetric responsive shapes): `.context/docs/container-patterns.md`
- Group spec (sibling flex container; share outer/inner architecture, container_style, color_scheme, bleed conventions): `.context/docs/specs/group.md`
- Media spec (sibling container block specialized for media surfaces): `.context/docs/specs/media.md`
- Container-style spec (centralized variant CSS in `layer-theme.css`): `.context/docs/specs/container-style.md`
- Subgrid migration (planned future state — strict container-only bleed, named-line grid): `.context/docs/subgrid-migration.md`
- Schema conventions (top-spacing pair, color-scheme override pattern, container-style pattern): `.context/docs/schema-conventions.md`
