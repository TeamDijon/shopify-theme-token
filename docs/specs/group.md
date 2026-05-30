# group

**Layer**: 1

**Type**: block (`blocks/group.liquid`) + matching snippet (`snippets/group.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/group.liquid` v1.3.0 (render surface)
- `blocks/group.liquid` v1.3.0 (block schema + render call)

**Reconciled**: 2026-05-30

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `container_style` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid` (recursive), `blocks/columns.liquid`, `blocks/media.liquid`

## Purpose

Flex container that groups child blocks under one configurable layout. Direction (column/row), alignment, gap, stack-below breakpoint, optional bleed, optional container style, and optional color-scheme override all flow through one block. Children compose via `{% content_for 'blocks' %}` against an **explicit whitelist** of the 9 L1 block types (no `@theme` wildcard) — including `group` itself, which makes the block recursively composable for nested layouts.

This is the most flexible of the three L1 container blocks (`group`, `columns`, `media`). Distinguishing it from siblings:

- **`columns`** owns *grid* layouts with fixed column counts and asymmetric ratios; group is *flex*, ratio-free, with stack-below by container width.
- **`media`** owns *image/video framing* with overlay-content children; group has no media surface, no overlay semantics.
- **`group`** is the catch-all flex composition — when the goal is "lay these blocks next to each other" or "wrap this set in a card with a background scheme," group is the answer.

Stack-below uses `@container` queries against the group's own inline-size, not the viewport. A row-direction group placed inside a narrow column stacks vertically when *the group* is below the breakpoint, regardless of viewport width. The viewport-driven equivalent (media queries) would mis-stack in nested layouts.

## API

Snippet args (`{% render %}` interface) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` / `contents` for the render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. Section object passed by the block file. |
| `block` | block | yes (render) | — | Snippet-only. Block object carrying settings. |
| `block_id` | string | no | — | Snippet-only. Override for the base-selector identifier on direct (non-block) renders. |
| `contents` | string | yes | — | Snippet-only. Pre-rendered child-blocks markup; the block file does `{% capture contents %}{% content_for 'blocks' %}{% endcapture %}` before rendering. Snippet does not `break` when blank — an empty group still renders the wrapper (some merchant flows author the container before its children). |
| `direction` | select (`column` / `row`) | no | `"column"` | Flex direction. `column` stacks children vertically; `row` arranges horizontally. |
| `stack_below` | select (`none` / `40` / `60` / `80`) | no | `"60"` | In `row` direction, switches to column when the group's container inline-size is below the named breakpoint (rem). `none` disables; `40` / `60` / `80` map to the substrate breakpoint rems (sm / md / lg). Schema `visible_if` shows only when `direction == 'row'`. |
| `horizontal_alignment` | select (`start` / `center` / `end` / `space-between`) | no | `"start"` | In `column` direction maps to `align-items`; in `row` direction maps to `justify-content`. `space-between` is silently normalized to `start` in column direction (would emit invalid `align-items: space-between`). |
| `vertical_alignment` | select (`start` / `center` / `end`) | no | `"start"` | In `row` direction maps to `align-items`. Ignored in column direction. Schema `visible_if` shows only when `direction == 'row'`. |
| `content_width` | metaobject (`content_width`) | no | blank → 100% (no cap) | Caps `max-inline-size` via `--content-width`. Ignored when `bleed` is true (the bleed rule overrides max-inline-size to `none`). |
| `gap` | range (0–100, step 2, px) | no | `16` | Gap between children. Emitted as `--gap` in rem (px / 16). Zero-emission skipped — `--gap` is only emitted when positive. |
| `bleed` | checkbox | no | `false` | Extends the group past the section gutter to the visible viewport width via `inline-size: 100dvw; margin-inline: calc(50% - 50dvw)`. Same constraint as `media`'s bleed: assumes a centered ancestor chain (the group must sit inside a `margin-inline: auto` parent for the math to land symmetrically). |
| `container_style` | metaobject (`container_style`) | no | blank | Reads `.system.handle`; emits `container-style:<handle>` modifier. Variant CSS lives **centrally in `core.css`** `@layer theme`, scoped across the three container blocks (group/columns/media) so the same handle yields the same visual treatment across consumers. |
| `color_scheme` | theme setting (`color_scheme`) | no | blank | Overrides the section's color scheme for this block and its descendants. Emits `color-scheme:<id>` modifier; the global per-scheme rules in `utility--css-variables` re-resolve `--color-role-*` tokens within the modifier-bearing element. |
| `mobile_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin below the desktop breakpoint. Routed through `utility--block-layout-vars`. |
| `desktop_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. Same routing. |

## Whitelisted children

The block schema declares an **explicit whitelist** of the 9 L1 block types (no `@theme` wildcard, per the explicit-whitelisting convention in `composition-strategy.md`):

```
spacer, separator, title, richtext, button, media, embed, group, columns
```

Notable:
- **`group` is in its own whitelist** — recursive composition. A group can contain another group, enabling nested layouts (e.g. outer group with `direction: row` + bleed, inner groups with `direction: column` for each row entry).
- **`columns` is whitelisted** — but composing column-layouts inside a group's row direction can produce nested-flex layouts that may not match merchant intent. Use `columns` as the outermost grid container when grid semantics are wanted.
- **No `media` whitelist quirk** — `media` whitelists `group`, but `media` itself is in group's whitelist, so media can sit inside a group as a leaf block (no recursion ambiguity).

When a new L1 block ships, this whitelist needs an entry per the `composition-strategy.md` whitelisting convention. Tracked as a per-block obligation in the spec template's `Whitelisted by` field.

## Output shape

```html
<div class="shopify-block shopify-block--group"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="direction:row,stack-below:60,container-style:card,color-scheme:scheme-2">
  <div class="inner">
    <!-- children rendered via {% content_for 'blocks' %} -->
  </div>
</div>
```

**Outer/inner architecture is load-bearing.** `container-type: inline-size; container-name: group` lives on the outer (`.shopify-block--group`); the flex layout (`display: flex`, direction, alignment, gap) lives on the inner (`.inner`, parent-scoped via `.shopify-block--group > .inner`). The CSS Containment spec states that `@container <name>` queries do **not** match the element with `container-type` — they only match descendants. Putting flex on the outer would make stack-below rules silently never match. The split is structural, not stylistic.

`data-modifiers` always carries at least `direction:column` (or `direction:row`); additional tokens append per setting (`stack-below`, `bleed`, `container-style`, `color-scheme`). Order is deterministic per the snippet's `modifier_list` builder.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--group` (outer) and `.inner` (inner). Layered in `@layer components`.

```css
.shopify-block--group {
  container-type: inline-size;
  container-name: group;
  max-inline-size: var(--content-width, 100%);

  &[data-modifiers*='bleed'] {
    inline-size: 100dvw;
    max-inline-size: none;
    margin-inline: calc(50% - 50dvw);
  }

  & > .inner {
    display: flex;
    gap: var(--gap, 0rem);
  }

  /* Direction: column — vertical stack, horizontal_alignment → align-items */
  &[data-modifiers*='direction:column'] > .inner {
    flex-direction: column;
    align-items: var(--horizontal-alignment, start);
  }

  /* Direction: row — horizontal arrangement, horizontal_alignment → justify-content, vertical_alignment → align-items */
  &[data-modifiers*='direction:row'] > .inner {
    flex-direction: row;
    justify-content: var(--horizontal-alignment, start);
    align-items: var(--vertical-alignment, start);
  }

  /* Stack-below — flip to column when container is below the breakpoint; @container queries above it switch back to row */
  &[data-modifiers*='stack-below'] > .inner {
    flex-direction: column;
    align-items: var(--horizontal-alignment, start);
  }
}

@container group (inline-size >= 40rem) {
  .shopify-block--group[data-modifiers*='stack-below:40'] > .inner {
    flex-direction: row;
    justify-content: var(--horizontal-alignment, start);
    align-items: var(--vertical-alignment, start);
  }
}
/* …and equivalent @container queries at 60rem (md) and 80rem (lg) */
```

`container_style` variant rules live **centrally in `core.css` `@layer theme`**, not in this snippet — they're shared across `group`, `columns`, and `media` via a `:where(...)` selector that doesn't carry to this file. See `specs/container-style.md` for the variant catalog and the per-project extension contract.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm-mobile/desktop` via `utility--block-layout-vars`.

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars` (shared with every L1 block):

| Variable | Purpose | Default |
|---|---|---|
| `--content-width` | `max-inline-size` cap (px from metaobject) | `100%` |
| `--mobile-margin-block-start` | Top margin below the desktop breakpoint | `0` |
| `--desktop-margin-block-start` | Top margin at/above the desktop breakpoint | inherits mobile |

Group-specific vars emitted into the per-instance dynamic style block:

| Variable | Purpose | Default |
|---|---|---|
| `--gap` | Gap between children (rem) | `0rem` (only emitted when setting > 0) |
| `--horizontal-alignment` | `align-items` in column / `justify-content` in row | `start` (only emitted when ≠ `start`) |
| `--vertical-alignment` | `align-items` in row direction | `start` (only emitted when ≠ `start`) |

Zero-emission discipline: alignment vars and gap are only emitted when they differ from the default. Keeps the per-instance `<style>` block lean.

## Behavior

- **Direction × stack-below interaction.** `direction: column` ignores `stack_below` entirely (column doesn't stack). `direction: row` honors stack-below — below the breakpoint, the inner is `flex-direction: column`; at or above, it flips back to `row` via the `@container` rule. The fallback (no `@container` support, though all current engines support it) renders as column — graceful degradation.
- **Container queries against the group's own width, not viewport.** This is the load-bearing reason for `@container` vs `@media`. A row-direction group placed inside a narrow column or sidebar stacks based on the column's inline-size — correctly — even though the viewport may be wider than the named breakpoint. Standard responsive thinking ("at 768px, stack") doesn't apply; the question is "is this group narrower than 40/60/80rem?"
- **Outer/inner wrapper architecture is required**, not cosmetic. `@container group` queries skip the element that defines the container. If flex were on the outer, stack-below rules would silently never fire. The `.inner` wrapper exists so the flex layout sits on a descendant of the container-defining element.
- **`space-between` in column direction normalizes to `start`.** CSS doesn't accept `align-items: space-between` (it's a `justify-content` value), and silently invalid values inherit the cascade default — which would be unpredictable. The snippet's Liquid pre-normalizes (`if direction == 'column' and horizontal_alignment == 'space-between' → horizontal_alignment = 'start'`) so the emitted `--horizontal-alignment` is always valid.
- **Bleed math.** `inline-size: 100dvw; margin-inline: calc(50% - 50dvw)` extends the group symmetrically past the section gutter. Math depends on the group's parent chain being centered (`margin-inline: auto` somewhere up the tree). Inside a non-centered parent (e.g. a left-aligned grid column), bleed will skew to one side. Same constraint as `media`'s bleed; documented because it's a real authoring trap.
- **`content_width` vs `bleed` ordering.** When both are set, bleed wins (the bleed rule sets `max-inline-size: none`, overriding the content-width cap). A schema-level `visible_if` safeguard on `content_width` would be the natural fix but Shopify's schema rejects `visible_if` on `metaobject`-type settings (`ValidSchema` error). The mitigation is an `info` string on the setting documenting the override: *"Leave blank for full width. Ignored when 'Edge to edge' is enabled."* When Shopify lifts the `visible_if` restriction on metaobject settings, switch to the schema-level gate.
- **Color-scheme override emission.** When `color_scheme` is set, the block emits `data-modifiers*='color-scheme:<id>'` on the outer element. The per-scheme rule in `utility--css-variables` re-emits `--color-role-*` tokens on every element matching the modifier — including this group. Descendants inherit the new tokens via the normal CSS cascade. A nested group with its own `color_scheme` override re-emits again locally; the deepest override wins for that subtree. The descendant-bleed footgun was closed in `utility--css-variables` v1.5.1 (dropped a `:has()` selector that re-matched ancestors).
- **Recursive nesting.** A group inside a group is a fully supported composition pattern. Each nesting level has its own container query (`container-name: group` is shared — the `@container group` rule walks up to the nearest named ancestor, which is the immediate parent group). Stack-below works per-level independently.
- **Empty group renders the wrapper, intentionally.** Container blocks emit their wrappers structurally — that's their role. The asymmetry vs leaf blocks (button/title/richtext, which `break` on blank content) is deliberate: a content-bearing primitive with no content has nothing to render; a container with no children still provides the container. Two consequences worth knowing: (1) an empty group still participates in section block-rhythm — it's a `.shopify-block` matched by the rhythm cascade selector, so a section with `[block A, empty group, block B]` carries rhythmic spacing around the empty group as if it were a real block. Authors using a group as a visual placeholder during composition should be aware. (2) an empty group with `container_style` set renders an empty styled card / outlined box / elevated panel — useful as a placeholder pattern for "I'll fill this card later," not a footgun.
- **`{{ block.shopify_attributes }}` emission.** On the outer element, for theme-editor block selection. Safe no-op on direct snippet renders (no `block` context).

## Locale keys

Schema strings under `blocks.group.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.group.name`
- `blocks.group.settings.layout.content` (group header)
- `blocks.group.settings.direction.{label,options.{column,row}}`
- `blocks.group.settings.stack_below.{label,info,options.{none,sm,md,lg}}`
- `blocks.group.settings.horizontal_alignment.{label,info,options.{start,center,end,space_between}}`
- `blocks.group.settings.vertical_alignment.{label,options.{start,center,end}}`
- `blocks.group.settings.content_width.{label,info}`
- `blocks.group.settings.gap.label`
- `blocks.group.settings.bleed.{label,info}`
- `blocks.group.settings.appearance.content` (group header)
- `blocks.group.settings.container_style.{label,info}`
- `blocks.group.settings.color_scheme.{label,info}`
- `blocks.group.settings.top_spacing.content` (group header)
- `blocks.group.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.group.presets.group.{name,category}`

No runtime strings; no entries under `accessibility.*` (group is a structural wrapper without semantic role beyond `<div>`).

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block; no L0 sub-component half)
- **Page**: `sections/validation--primitive--group.liquid` + `templates/index.validation--primitive--group.json` (shipped)
- **API surface** (block-backed only — no snippet-half group):
  - **Direction × stack-below matrix**: row with each `stack_below ∈ {none, 40, 60, 80}`; column (stack_below not honored).
  - **Alignment matrix per direction**: row × `horizontal_alignment ∈ {start, center, end, space-between}` × `vertical_alignment ∈ {start, center, end}`; column × `horizontal_alignment ∈ {start, center, end}` (space-between normalized to start).
  - **Gap variation**: 0, 16, 48 (zero-emission discipline check).
  - **content_width × bleed precedence**: both set → bleed wins; verify visually.
  - **container_style integration**: `card`, `outlined`, `elevated` variants applied; verify CSS comes from `core.css`'s centralized rule (not duplicated here).
  - **color_scheme override**: group with `scheme-2` override inside a `scheme-1` section; nested group with `scheme-3` override inside the `scheme-2` group; verify the deepest override wins for its subtree.
  - **Recursion**: nested groups (group inside group inside group) with mixed directions; verify each level's stack-below is independent.
- **Edge cases**:
  - Empty group (no children declared in the template) → outer + inner wrappers render, no inner content
  - `direction: column` + `horizontal_alignment: space-between` → emits `--horizontal-alignment: start` (normalization branch)
  - `bleed: true` inside a non-centered parent → skewed bleed (documented anti-pattern; not actively prevented)
  - `stack_below: 40` in column direction → stack-below modifier still emits if it weren't `visible_if`-gated in row only; the schema gating means the case is unreachable from the editor, but a direct snippet render could pass it. Snippet renders honor the modifier; CSS rule fires correctly (column stays column, since the `stack-below` rule reverts to column on narrow which is column already).
- **Visual showcase**: matrix sections, each labelled. Reader confirms layout per direction × stack-below × alignment cell; bleed extends past gutter symmetrically; container_style variants look the same as on `validation--primitive--columns` and `validation--primitive--media` (centralized CSS verification); color-scheme override propagates to descendants.
- **Assertions** (prose; Playwright once installed):
  - `direction:column` instances have computed `flex-direction: column` on `.inner`
  - `direction:row` + `stack-below:40` instances have `flex-direction: column` below 40rem container width, `row` at/above
  - `align-items` / `justify-content` resolve to the expected value per direction
  - `bleed` instances have `inline-size: 100dvw` and `margin-inline: calc(50% - 50dvw)` matching the snippet's bleed rule
  - `container_style:card` instances pull their variant rule from `core.css`, not the group snippet's stylesheet (verify via computed-style chain)
  - `color_scheme:scheme-2` override emits `--color-role-background`, `--color-role-foreground` (etc.) values from scheme 2's settings on the group element
  - Nested groups each emit their own container query context; child stack-below works against immediate parent's inline-size
- **Unit scope**: none (Liquid + CSS only; no JS)

## Out of scope

- **Grid layout** — group is flex-only. CSS Grid semantics (named template areas, fractional column tracks) belong in `columns`. A merchant wanting "2/3 + 1/3 columns" reaches for `columns`, not group with hardcoded child widths.
- **Mixed-axis breakpoint behavior** — group's stack-below switches from row to column at a single breakpoint. "Row on mobile, column on tablet, row on desktop" or "reverse the column order at this breakpoint" isn't supported via setting; a project needing it composes nested groups or writes per-project CSS.
- **`align-self` / per-child overrides** — group's alignment is uniform across children. A specific child needing different alignment than its siblings must consume its own per-child custom property (rare) or be wrapped in a single-child group with its own alignment.
- **Auto-fit / auto-fill grid behavior** — `repeat(auto-fit, minmax(…))`-style adaptive grids belong in `columns` (or future grid-aware blocks). Group's stack-below is a binary switch; it doesn't compose intermediate states.
- **Bleed inside non-centered parents** — the bleed math (`margin-inline: calc(50% - 50dvw)`) assumes a centered ancestor chain. Bleeding inside a left-aligned grid cell or off-center container skews to one side. Not enforced; documented as an authoring constraint. <!-- REVIEW: Any ideas where this would happen and more generally when bleed would be used for group block ? -->
- **Auto-detection of child count for ratio assignment** — a group with 3 row-direction children does not auto-distribute into equal thirds; children render at their intrinsic sizes plus gap, then `justify-content` distributes leftover space. For deterministic ratio control, reach for `columns`.
- **Style overrides from child blocks bleeding up** — a child block's `color_scheme` override styles itself but does not propagate upward to affect the parent group's chrome. The cascade is one-way down.
