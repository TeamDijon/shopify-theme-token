# Subgrid migration

Substrate restructure that replaced the today-state's `inline-size: min(...)` + `margin-inline: auto` + negative-margin escape with a named-line CSS grid model. Coordinated three structural shifts into one coherent overhaul.

**Status**: shipped (Stages 0 + 1 + 2 + 3 landed 2026-05-31). The verification scaffold lives at `sections/exploration--subgrid.liquid` (reachable at `/?view=exploration--subgrid`).

## What this migration accomplishes

Three changes, landed together:

1. **token-section becomes a CSS grid with named bleed lines.** Direct children declare `grid-column` on those lines. Replaces the today pattern of `inline-size: min(100% - 2 * var(--gutter), var(--content-width))` + `margin-inline: auto`.
2. **Strict container-only bleed model.** Only container blocks (`group`, `columns`, `media`) declare bleed direction via grid-column on section's named lines. Content blocks (`title`, `richtext`, `button`) carry no bleed setting. Children of containers position via their container's own layout — they do not independently reach section's bleed lines. Eliminates the partial-bleed escape pattern entirely.
3. **Appearance defaults move to `<body>`.** Typography, color, transitions, form-input styling cascade from body to everything inside it (including chrome elements outside `<token-section>`). theme-root's responsibilities slim from five to four: JS runtime, scheme override, layout root (bleed grid), rhythm container.

## Target substrate shape

CSS in `assets/layer-theme.css`:

```css
@layer theme {
  /* Outer section wrapper — unchanged (.shopify-section minimal styling) */
  .shopify-section {
    scroll-margin-block-start: 5rem;
    scroll-behavior: var(--scroll-behavior);
    --scroll-behavior: smooth;

    @media (prefers-reduced-motion) {
      --scroll-behavior: auto;
    }
  }

  /* Appearance defaults — body level. Cascade to chrome elements + theme-roots + descendants. */
  body {
    background: var(--gradient-background);
    color: var(--color-role-foreground);
    font-family: var(--base-font-family);
    font-style: var(--base-font-style);
    font-size: var(--base-font-size);
    line-height: var(--base-line-height);
    font-weight: var(--base-font-weight);
    letter-spacing: var(--base-letter-spacing);
    text-transform: var(--base-text-transform);
    text-decoration: var(--base-text-decoration);
    text-wrap: pretty;
    transition: background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard);

    @media (prefers-reduced-motion) {
      transition-duration: 0s;
    }

    & :where(.h0, h1, .h1, h2, .h2, h3, .h3, h4, .h4, h5, .h5, h6, .h6) {
      color: var(--color-role-foreground-heading, inherit);
    }

    & :where(input, textarea, select) {
      background-color: var(--color-role-input-background);
      color: var(--color-role-input-text);
      border: 0.0625rem solid var(--color-role-input-border);
    }
    /* ...other form-input states */
  }

  /* Theme-root: bleed grid with named lines */
  [data-modifiers*='theme-root'] {
    display: grid;
    grid-template-columns:
      [bleed-start]
      minmax(0, calc((100% - var(--content-width, 125rem)) / 2 + var(--gutter)))
      [content-start]
      minmax(0, var(--content-width, 125rem))
      [content-end]
      minmax(0, calc((100% - var(--content-width, 125rem)) / 2 + var(--gutter)))
      [bleed-end];
    justify-content: center;
    position: relative;
  }

  /* Default: direct children span content track */
  [data-modifiers*='theme-root'] > * {
    grid-column: content-start / content-end;
  }

  /* Container bleed declarations on direct children */
  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:both'] {
    grid-column: bleed-start / bleed-end;
  }

  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:inline-start'] {
    grid-column: bleed-start / content-end;
  }

  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:inline-end'] {
    grid-column: content-start / bleed-end;
  }

  @media (width < 48rem) {
    [data-modifiers*='theme-root'] > [data-modifiers*='bleed-mobile:both'] {
      grid-column: bleed-start / bleed-end;
    }
  }

  /* Rhythm cascade — direct children of any theme-root */
  [data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
    margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm-mobile, 0rem));

    @media (width >= 48rem) {
      margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm-desktop, 0rem));
    }
  }

  /* Container style variants — unchanged (apply to container blocks regardless of position) */
  :where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:card'] {
    /* ...padding + border-radius + background + box-shadow */
  }
  /* ...outlined, elevated */
}
```

## Bleed model (strict container-only)

| Rule | Statement |
|---|---|
| Bleed is a container concern | Only container blocks (`group`, `columns`, `media`) declare bleed direction. Content blocks (`title`, `richtext`, `button`, `spacer`, `separator`, `embed`) carry no bleed setting. |
| Bleed declares grid-column on section's named lines | A container block as a direct child of token-section uses one of: `content-start / content-end` (default), `bleed-start / content-end`, `content-start / bleed-end`, `bleed-start / bleed-end`. Emitted via `bleed-desktop:<value>` / `bleed-mobile:<value>` modifiers. |
| Children of containers do not reach section's bleed lines | A block inside a `columns` track positions in columns' own grid. It cannot independently bleed past its container's boundary. To make a child bleed, set the bleed at the container layer. |
| Position selectors (`:first-child` / `:last-child`) are not used for bleed gating | Bleed declarations on a container apply absolutely on the section's named lines; no edge-track gating needed. |
| Asymmetric layouts express via container settings | "Image-left bleed + text-right gutter" composes as `<columns bleed:inline-start ratio:2:1>` with two tracks. The container's bleed direction + track ratio do the work. |
| Deep-nested bleed needs are per-project | If a composition genuinely requires a deeply-nested element to align with section's bleed lines, either restructure (lift the bleeding container higher) or handle in per-project CSS. Not supported in substrate. |

## Affected files

| File | Change |
|---|---|
| `assets/layer-theme.css` | Full rewrite. Appearance moves to `body`. Theme-root becomes a bleed grid via `display: grid` + named columns. Container bleed declarations match via `[data-modifiers*='bleed-desktop:*']`. Negative-margin escape rules removed entirely. |
| `snippets/group.liquid` (stylesheet block) | Bleed CSS rewritten: `inline-size: min(100%, var(--content-width))` + `margin-inline: auto` → `grid-column: bleed-start / bleed-end` (etc.). Partial-bleed escape (`margin-inline-(start\|end)`) removed. |
| `snippets/columns.liquid` (stylesheet block) | Same as group. Multi-track subdivision (`grid-template-columns: repeat(N, 1fr)`) lives on the `.inner` (or future `<token-layout>`); subgrid pass-through on the outer is not required because container blocks now express bleed via the container's own grid-column. |
| `snippets/media.liquid` (stylesheet block) | Same — bleed via grid-column. |
| `.context/docs/theme-root.md` | "Five responsibilities" section reduces to four (appearance moves to body). "Substrate CSS shape" section updates to the subgrid model. "Layout enum" mention removed (no enum after this migration; section's `layout` setting itself is removed in a separate pass — see Open questions). |
| `.context/docs/container-patterns.md` | Major trim. "Partial-bleed escape (per-side, inside a grid track)" section removed entirely. "Default content sizing" and "Section-bleed — full-width default" sections rewritten as grid-column declarations instead of `inline-size: min(...)` formulas. "Content cap and convergence" section updated to describe grid behavior. Position-selector table removed (no gating needed). |
| `.context/docs/specs/group.md` | API surface (`bleed_desktop` / `bleed_mobile` enums) unchanged; CSS section rewritten to grid-column model; Behavior section updates the bleed-math entry. |
| `.context/docs/specs/spacer.md`, `separator.md`, etc. | No bleed-related changes (content blocks have no bleed setting under the strict model; today's specs reflect this). |
| `.context/docs/architecture.md` | "CSS layering" mention of body-level appearance. "Section render model" example unchanged (data-modifiers contract unchanged). |
| `.context/docs/css-standards.md` | `@layer theme` description updates: body now hosts appearance defaults; theme-root hosts layout + rhythm. |
| `sections/section.liquid` | Possible removal of `layout` setting — see Open questions. Otherwise unchanged. |
| `sections/*.liquid` (all) | No changes. `theme-root` modifier already present. |

## Migration sequence

Staged commits to keep verification tractable.

### Stage 0 — Exploration scaffold

Build `sections/exploration--subgrid--*.liquid` variants that test the new bleed grid model with realistic compositions:

- Section-bleed band (full width) with content track child
- Image-left + content-right hero (asymmetric `columns bleed:inline-start`)
- Image-right + content-left hero (mirrored asymmetric)
- Two-track columns with gap, both bleeding outward (full-bleed band with split content)
- Three-track columns, content-aligned (no bleed)
- Nested groups inside a section-bleed columns block (verify children don't independently bleed; positioning is container-driven)

Each scaffold renders side-by-side with the current model for visual diffing. Tracked under BACKLOG.md § Active exploration alongside the existing bleed scaffold.

### Stage 1 — Substrate cutover

Single commit on main worktree:

- Rewrite `assets/layer-theme.css` per § Target substrate shape.
- Update `snippets/group.liquid` stylesheet block to grid-column model.
- Update `snippets/columns.liquid` stylesheet block (when columns block lands; today it's a spec gap).
- Update `snippets/media.liquid` stylesheet block.
- Verify theme-check passes; load representative validation pages; confirm no visual regressions.

### Stage 2 — Spec reconciliation

Commits on context worktree:

- `theme-root.md` — reduce responsibilities; update substrate-CSS-shape section; remove layout-enum references if section's `layout` setting is being dropped.
- `container-patterns.md` — major trim per § Affected files. Becomes a tighter doc focused on the grid model.
- `group.md` — CSS section + Behavior section updates; Implementation pin bump.
- `columns.md`, `media.md` — analogous updates when those specs are authored / reconciled.
- `architecture.md`, `css-standards.md` — body-level appearance prose.

### Stage 3 — `<token-layout>` follow-up

Separate batch after Stages 1–2 land:

- New file `assets/token-layout.js` — empty class registration.
- Append `'token-layout'` to `module_list` in `snippets/utility--import-map.liquid`.
- Replace `<div class="inner">` with `<token-layout>` in container block snippets.
- Update specs (group, columns, media) to reflect new tag.
- CSS in container snippets updates from `> .inner` to `> token-layout`.

Decoupled because it's cosmetic, not load-bearing. Lands when convenient.

## Constraints

| Constraint | Status |
|---|---|
| Deep-nested partial bleed (depth > 1) | Not supported in substrate. Per-project CSS or restructure. |
| Child of a bleeding container independently un-bleeding | Not supported. Child positions in container's layout; for narrower-than-container child, use per-block `content_width` override (`max-inline-size` cap + `margin-inline: auto` on the child). |
| Asymmetric bleed in single-block sections | Express via single-block container blocks (`<media bleed:inline-start>`) at section level. Works cleanly. |
| Browser support | CSS grid + named lines + `@media (width < ...)` are universally supported. Subgrid (Chrome 117+, Safari 16+, Firefox 71+) is **not used** in this migration — the grid model uses named lines on token-section directly, and container blocks have their own grids. The subgrid migration earns its name only because the conceptual model is subgrid-shaped; the implementation doesn't require browser-level subgrid support. |
| App-section appearance inheritance | App sections inside `<body>` now inherit typography + default scheme tokens from body's appearance rules. Apps with their own explicit styling override per normal cascade. Apps without styling adopt theme defaults — usually desired. Accepted side effect. |

## Open questions

**The section `layout` setting.** Today (post-D4′), `sections/section.liquid` carries a `layout` select with `column` / `row` / `columns_2/3/4`. Under subgrid, the section is always a bleed grid — the `column` value of the enum becomes "the default behavior with no override," and `row` / `columns_N` conflict with the section being a bleed grid (their `grid-template-columns` would replace the named bleed lines).

Two resolutions:

- **Drop the `layout` setting entirely.** Section is always the bleed grid; merchants wanting row / multi-column compositions wrap in a `group` or `columns` block. Removes one degree of API duplication with the container blocks. Discussed and leaned-toward during the theme-root identity discussion.
- **Keep `column` only.** The setting reduces to a no-op (always `column`) and is dropped from the editor surface. Equivalent to the first option in practice.

Lean: **drop entirely.** Section schema simplifies to content_width + block_rhythm + color_scheme.

**Container-query stack-below behavior.** Today columns/group blocks use `@container <name> (inline-size >= 40rem) { ... }` to switch between row and column layouts. Under subgrid migration: container blocks still own their own grid (multi-track) on `.inner` (or `<token-layout>`). Container queries continue to govern stack-below — the trigger is unchanged, the result is grid-template-columns variations within the container's own grid. No conflict with section's bleed grid.

## Related

- Theme-root contract: `.context/docs/theme-root.md`
- Container patterns (today's bleed model — superseded by this migration's Stage 2): `.context/docs/container-patterns.md`
- Composition strategy (layer model): `.context/docs/composition-strategy.md`
- Group spec (current implementation pin for the strict-bleed container API): `.context/docs/specs/group.md`
- Architecture: `.context/docs/architecture.md`
