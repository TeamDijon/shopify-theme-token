# group

**Layer**: 1

**Type**: block (`blocks/group.liquid`) + matching snippet (`snippets/group.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/group.liquid` v1.7.1 (render surface)
- `blocks/group.liquid` v1.7.0 (block schema + render call)
- `assets/token-layout.js` v1.1.0 (inner-wrapper custom element)

**Reconciled**: 2026-06-28 (snippet v1.7.1 — `container-type` scoped to stack-below groups so nested non-querying groups no longer collapse as flex children. 2026-06-27: block v1.7.0 / snippet v1.7.0 — color scheme gated by `custom_color_scheme`; top-margin override range narrowed to `0…100`, absolute override / negatives dropped via `utility--block-layout-vars` v1.2.1)

**Reviewed**: pending

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `container_style` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid` (recursive), `blocks/columns.liquid`, `blocks/media.liquid`

## Purpose

The catch-all flex container — ratio-free, recursive, and stack-below-aware via `@container` queries against the group's own inline-size (not the viewport). Direction (column/row), alignment, gap, stack-below breakpoint, optional bleed, optional container style, and optional color-scheme override all flow through one block. Children compose via `{% content_for 'blocks' %}` against an **explicit whitelist** of the 9 L1 block types (no `@theme` wildcard) — including `group` itself, enabling nested layouts.



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
| `content_width` | metaobject (`content_width`) | no | blank → 100% (no cap) | Caps `max-inline-size` via `--content-width`. Composes with bleed — bleed caps at the section's content cap, so `content_width: 60rem` + `bleed_desktop: both` produces a 60rem-wide bleed band (see `container-patterns.md` § Content cap and convergence). |
| `gap` | range (0–100, step 2, px) | no | `16` | Gap between children. Emitted as `--gap` in rem (px / 16). Zero-emission skipped — `--gap` is only emitted when positive. |
| `bleed_desktop` | select (`none` / `inline_start` / `inline_end` / `both`) | no | `"none"` | Group's bleed direction at/above 48rem. `both` matches section-bleed (caps at the section's content cap). `inline_start` / `inline_end` extend the group's start / end edge to the bleed boundary (= content cap), keeping gutter offset on the other side. Emitted as `bleed-desktop:<value>` modifier when ≠ `none`. |
| `bleed_mobile` | select (`none` / `both`) | no | `"none"` | Group's bleed direction below 48rem. Single-column mobile has no edge tracks; per-side bleed has no geometric meaning there, so the mobile enum is binary. `both` matches section-bleed below 48rem. Emitted as `bleed-mobile:both` modifier when set. Asymmetric setting shape with `bleed_desktop` is intentional — see `container-patterns.md` § Bleed API: asymmetric mobile / desktop shapes. |
| `container_style` | metaobject (`container_style`) | no | blank | Reads `.system.handle`; emits `container-style:<handle>` modifier. Variant CSS lives **centrally in `layer-theme.css`** `@layer theme`, scoped across the three container blocks (group/columns/media) so the same handle yields the same visual treatment across consumers. |
| `custom_color_scheme` | checkbox | no | `false` | Gates the local color-scheme override. Off → no modifier; the block rides the surrounding scheme. On → the picker applies. See `schema-conventions.md` § Color-scheme override. |
| `color_scheme` | theme setting (`color_scheme`) | no (gated) | `"scheme-1"` | Applied only when `custom_color_scheme` is on (`visible_if`). Emits `color-scheme:<id>` modifier; the global per-scheme rules in `utility--css-variables` re-resolve `--color-role-*` tokens within the modifier-bearing element and its descendants. |
| `mobile_margin_block_start` | range (0–100, step 2, px) | no | `0` | Top margin below the desktop breakpoint. Routed through `utility--block-layout-vars`. |
| `desktop_margin_block_start` | range (0–100, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. Same routing. |

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
     data-modifiers="direction:row,stack-below:60,bleed-desktop:inline_start,bleed-mobile:both,container-style:card,color-scheme:scheme-2">
  <token-layout>
    <!-- children rendered via {% content_for 'blocks' %} -->
  </token-layout>
</div>
```

**Outer/inner architecture is load-bearing.** `container-type: inline-size; container-name: group` lives on the outer (`.shopify-block--group`); the flex layout (`display: flex`, direction, alignment, gap) lives on the inner `<token-layout>`, parent-scoped via `.shopify-block--group > token-layout`. The CSS Containment spec states that `@container <name>` queries do **not** match the element with `container-type` — they only match descendants. Putting flex on the outer would make stack-below rules silently never match. The split is structural, not stylistic. `container-type` is applied **only to groups carrying a `stack-below` modifier** (the only groups that run a container query); applying it to every group collapses groups nested as flex children, because `inline-size` containment removes their content's contribution to their intrinsic inline-size.

`data-modifiers` always carries at least `direction:column` (or `direction:row`); additional tokens append per setting (`stack-below`, `bleed-desktop`, `bleed-mobile`, `container-style`, `color-scheme`). Order is deterministic per the snippet's `modifier_list` builder.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--group` (outer) and `> token-layout` (inner). Layered in `@layer components`.

```css
.shopify-block--group {
  /* container-type + container-name are applied only on groups carrying a
     stack-below modifier (see the stack-below rule below), not every group —
     which would collapse nested flex-child groups to zero width. */
  max-inline-size: var(--content-width, 100%);

  /* Bleed is owned by the section's named-line grid (see `assets/layer-theme.css` + `subgrid-migration.md`).
     This snippet emits `bleed-desktop:<value>` / `bleed-mobile:<value>` modifiers; the section's
     grid-column rules match them on direct children of <token-section>. No bleed CSS lives here. */

  & > token-layout {
    display: flex;
    gap: var(--gap, 0rem);
  }

  /* Direction: column — vertical stack, horizontal_alignment → align-items */
  &[data-modifiers*='direction:column'] > token-layout {
    flex-direction: column;
    align-items: var(--horizontal-alignment, start);
  }

  /* Direction: row — horizontal arrangement, horizontal_alignment → justify-content, vertical_alignment → align-items */
  &[data-modifiers*='direction:row'] > token-layout {
    flex-direction: row;
    justify-content: var(--horizontal-alignment, start);
    align-items: var(--vertical-alignment, start);
  }

  /* Stack-below — flip to column when container is below the breakpoint; @container queries above it switch back to row */
  &[data-modifiers*='stack-below'] > token-layout {
    flex-direction: column;
    align-items: var(--horizontal-alignment, start);
  }
}

@container group (inline-size >= 40rem) {
  .shopify-block--group[data-modifiers*='stack-below:40'] > token-layout {
    flex-direction: row;
    justify-content: var(--horizontal-alignment, start);
    align-items: var(--vertical-alignment, start);
  }
}
/* …and equivalent @container queries at 60rem (md) and 80rem (lg) */
```

`container_style` variant rules live **centrally in `layer-theme.css` `@layer theme`**, not in this snippet — they're shared across `group`, `columns`, and `media` via a `:where(...)` selector that doesn't carry to this file. See `specs/container-style.md` for the variant catalog and the per-project extension contract.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm` via `utility--block-layout-vars` (the section sets `--block-rhythm: var(--spacing-<picked-handle>)`).

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars` — see that spec for the variable contract + emission rules. Block-specific fallbacks consumed via `var(--<name>, <fallback>)` in this block's CSS: `--content-width` → `100%`; `--mobile-margin-block-start` → `0`; `--desktop-margin-block-start` → inherits mobile.

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
- **Outer/inner wrapper architecture is required**, not cosmetic. `@container group` queries skip the element that defines the container. If flex were on the outer, stack-below rules would silently never fire. The `<token-layout>` wrapper exists so the flex layout sits on a descendant of the container-defining element.
- **`space-between` in column direction normalizes to `start`.** CSS doesn't accept `align-items: space-between` (it's a `justify-content` value), and silently invalid values inherit the cascade default — which would be unpredictable. The snippet's Liquid pre-normalizes (`if direction == 'column' and horizontal_alignment == 'space-between' → horizontal_alignment = 'start'`) so the emitted `--horizontal-alignment` is always valid.
- **Bleed via modifier emission, section grid resolves.** The snippet emits `bleed-desktop:<value>` and `bleed-mobile:<value>` modifiers; bleed positioning is handled by the section's named-line bleed grid via `grid-column` rules on direct children of `<token-section>`. Strict container-only bleed model — when this group is nested inside another container, the section's `>` direct-child selector doesn't match, so the nested group positions in its container's layout and doesn't bleed. See `subgrid-migration.md`.
- **`content_width` vs `bleed` interaction.** Under Option A (`container-patterns.md` § Content cap and convergence), bleed caps at `--content-width`. A merchant setting both `content_width: 60rem` and `bleed_desktop: both` gets a 60rem-wide bleed band — the bleed honors the section's content cap rather than overriding it. The two settings compose coherently.
- **Color-scheme override emission (gated).** When `custom_color_scheme` is on, the block emits `data-modifiers*='color-scheme:<id>'` on the outer element (off → no modifier, the block rides the surrounding scheme). The per-scheme rule in `utility--css-variables` re-emits `--color-role-*` tokens on every element matching the modifier — including this group. Descendants inherit the new tokens via the normal CSS cascade. The override also paints a background **band** on the group via the container scheme-paint rule in `layer-theme.css` (see `theme-root.md` § Scheme paint), so a plain override is visible — not only token re-emission. A nested group with its own `color_scheme` override re-emits and re-paints locally; the deepest override wins for that subtree.
- **Recursive nesting.** A group inside a group is a fully supported composition pattern. Each nesting level has its own container query (`container-name: group` is shared — the `@container group` rule walks up to the nearest named ancestor, which is the immediate parent group). Stack-below works per-level independently. A nested group carries `container-type` only when it has a stack-below modifier; without it the group sizes to its content as a normal flex child — applying `container-type` to every group would collapse nested flex children to zero width.
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
- `blocks.group.settings.bleed_desktop.{label,info,options.{none,inline_start,inline_end,both}}`
- `blocks.group.settings.bleed_mobile.{label,info,options.{none,both}}`
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
- **Tests**: `.tests/e2e/primitive--group.spec.js` (executable; `npm run test:e2e`)
- **Requires seeded**: `container_style/card`, `content_width/reading` (Token's shipped seed catalog); color scheme `scheme-2` must exist in the theme's color schemes. A test needing an unseeded handle signals a seed-set gap, not a test workaround.
- **API surface** (block-backed only — no snippet-half group):
  - **Direction × stack-below matrix**: row with each `stack_below ∈ {none, 40, 60, 80}`; column (stack_below not honored).
  - **Alignment matrix per direction**: row × `horizontal_alignment ∈ {start, center, end, space-between}` × `vertical_alignment ∈ {start, center, end}`; column × `horizontal_alignment ∈ {start, center, end}` (space-between normalized to start).
  - **Gap variation**: 0, 16, 48 (zero-emission discipline check).
  - **Bleed matrix**: `bleed_desktop ∈ {none, inline_start, inline_end, both}` × `bleed_mobile ∈ {none, both}` — eight combinations. Verify the asymmetric API (mobile binary, desktop per-side enum) renders correctly: at each breakpoint, the active bleed treatment matches the setting and falls back cleanly when the other breakpoint differs.
  - **content_width × bleed composition**: bleed caps at the section's content cap (no override) — verify a `content_width: 60rem` section with `bleed_desktop: both` produces a 60rem-wide bleed band, not a 125rem one.
  - **container_style integration**: `card`, `outlined`, `elevated` variants applied; verify CSS comes from `layer-theme.css`'s centralized rule (not duplicated here).
  - **color_scheme override**: group with `scheme-2` override inside a `scheme-1` section; nested group with `scheme-3` override inside the `scheme-2` group; verify the deepest override wins for its subtree.
  - **Recursion**: nested groups (group inside group inside group) with mixed directions; verify each level's stack-below is independent.
- **Edge cases**:
  - Empty group (no children declared in the template) → outer + inner wrappers render, no inner content
  - `direction: column` + `horizontal_alignment: space-between` → emits `--horizontal-alignment: start` (normalization branch)
  - `bleed_mobile: both` + `bleed_desktop: none` → mobile bleeds (section's mobile grid-column rule matches); desktop returns to default content track (no desktop bleed modifier means no desktop grid-column override)
  - `bleed_desktop: inline_start` on a group **nested inside another container** → bleed modifier is emitted but the section's `>` direct-child bleed-grid-column rule doesn't match (nested group isn't a direct child of `<token-section>`); the nested group positions in its container's layout, no bleed
  - `stack_below: 40` in column direction → stack-below modifier still emits if it weren't `visible_if`-gated in row only; the schema gating means the case is unreachable from the editor, but a direct snippet render could pass it. Snippet renders honor the modifier; CSS rule fires correctly (column stays column, since the `stack-below` rule reverts to column on narrow which is column already).
- **Visual showcase**: matrix sections, each labelled. Reader confirms layout per direction × stack-below × alignment cell; bleed treatments render at the expected breakpoint with the expected per-side (or both-sides) extension to the section's content cap; container_style variants look the same as on `validation--primitive--columns` and `validation--primitive--media` (centralized CSS verification); color-scheme override propagates to descendants.
- **Assertions** (executable — `.tests/e2e/primitive--group.spec.js`):
  - `direction:column` → `token-layout` computes `flex-direction: column`; `direction:row` → `row` with `justify-content: start` by default
  - Row `horizontal_alignment` center / end / space-between → `justify-content` matches; `vertical_alignment` center → `align-items` center
  - Column `horizontal_alignment` center / end → `align-items` matches
  - `space-between` in column direction normalizes to start — `--horizontal-alignment` is not emitted and `align-items` resolves to `start` (never the invalid `space-between`)
  - `stack-below:40` → container query against the group's own inline-size: `flex-direction: row` when the group is ≥ 40rem wide, `column` when narrower (verified across the desktop / mobile viewports). `stack-below:80` stays `column` even on the 1280px desktop viewport (the group is < 80rem), proving the query is against the group's width, not the viewport
  - `gap` emits `--gap` (rem) and applies as `token-layout` `gap`; zero gap emits nothing
  - Bleed settings emit the bleed modifiers (`bleed-desktop:both`, `bleed-mobile:both`, `bleed-desktop:inline_start`) — the raw setting value (underscore). The painted `grid-column` is the section's bleed grid (Tier 3), not asserted here
  - `container_style:card` emits the modifier and pulls centralized variant CSS from `layer-theme.css` (computed `border-radius: 8px`, `padding: 24px`, non-`none` `box-shadow` — absent on a plain group)
  - `custom_color_scheme` + `color_scheme:scheme-2` emits `color-scheme:scheme-2`, re-resolves `--color-role-background` to scheme-2's value, and paints a background band (computed `background-color` = scheme-2's bg, vs transparent on a plain group)
  - `content_width` caps the group (`--content-width` + `max-inline-size`)
  - Recursive nesting: a group inside a group renders both, each with its own `direction` modifier and `token-layout` flex-direction; with per-level `color_scheme` overrides the deepest wins for its subtree (`--color-role-background` differs inner vs outer)
  - Empty group renders the outer `.shopify-block--group` + `token-layout` wrapper with no children
  - Top-spacing overrides emit `--mobile-/--desktop-margin-block-start` (loose `1.0rem` / `4.0rem`, tight `0.5rem` / `1.0rem`) — absolute values that replace the rhythm
- **Deliberately unasserted**: bleed *painting* (the section's `grid-column` bleed grid acts only on direct children of a real `<token-section>` grid — a Tier-3 concern asserted on preset / section pages, not on this contained primitive harness); `block.shopify_attributes` (editor-only). `container_style` legibility is delegated to `validation--substrate--container-style`.
- **Unit scope**: none (Liquid + CSS only; no JS)

## Out of scope

- **Grid layout** — group is flex-only. CSS Grid semantics (named template areas, fractional column tracks) belong in `columns`. A merchant wanting "2/3 + 1/3 columns" reaches for `columns`, not group with hardcoded child widths.
- **Mixed-axis breakpoint behavior** — group's stack-below switches from row to column at a single breakpoint. "Row on mobile, column on tablet, row on desktop" or "reverse the column order at this breakpoint" isn't supported via setting; a project needing it composes nested groups or writes per-project CSS.
- **`align-self` / per-child overrides** — group's alignment is uniform across children. A specific child needing different alignment than its siblings must consume its own per-child custom property (rare) or be wrapped in a single-child group with its own alignment.
- **Auto-fit / auto-fill grid behavior** — `repeat(auto-fit, minmax(…))`-style adaptive grids belong in `columns` (or future grid-aware blocks). Group's stack-below is a binary switch; it doesn't compose intermediate states.
- **Bleed beyond the section's content cap** — bleed caps at `--content-width` (the section's content cap = bleed boundary, per `container-patterns.md`). A merchant wanting a "narrow text + wide media" composition inside a single section uses `columns` with one bleeding child and a per-block `content_width` override on the text-bearing sibling, not a wider bleed ceiling.
- **Auto-detection of child count for ratio assignment** — a group with 3 row-direction children does not auto-distribute into equal thirds; children render at their intrinsic sizes plus gap, then `justify-content` distributes leftover space. For deterministic ratio control, reach for `columns`.
- **Style overrides from child blocks bleeding up** — a child block's `color_scheme` override styles itself but does not propagate upward to affect the parent group's chrome. The cascade is one-way down.

## Related

- Container patterns (gutter / gap / inner padding, bleed model, responsiveness shapes, asymmetric bleed API): `.context/docs/container-patterns.md`
- Schema conventions (top-spacing pair, section base settings, color-scheme override pattern): `.context/docs/schema-conventions.md`
