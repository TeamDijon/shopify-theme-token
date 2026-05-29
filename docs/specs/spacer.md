# spacer

**Layer**: 1
**Type**: block (`blocks/spacer.liquid`) + matching snippet (`snippets/spacer.liquid`)
**Status**: shipped
**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--dynamic-style.liquid`, `theme_color` metaobject entries (optional, for background)
**Consumers**: any section accepting `@theme` children

## Purpose

Vertical-space block with configurable block-size (height). Two modes — one fixed size, or a mobile/desktop pair that switches at a selected breakpoint. An optional `theme_color` background turns the spacer into a colored band, serving as a section divider between same-scheme sections, a brand-color stripe, or a framed accent above or below a hero.

Scope constraint — vertical-rhythm at the section level. Inside a row-direction `group`, the spacer's `inline-size: 100%` claims the full row and squishes siblings. Inside column-direction containers (the default for `group` and `columns`), it works as intended.

## API

| Setting | Type | Required | Notes |
|---|---|---|---|
| `breakpoint` | select (`none` / `40` / `60` / `80`) | yes | Default `none`. Switches between fixed-size mode and responsive-pair mode. Values match breakpoint rems (40rem = sm, 60rem = md, 80rem = lg). |
| `spacer_block_size` | range (0–200, step 2, px) | when `breakpoint=none` | Default 24. Visible only when `breakpoint=none` (via schema `visible_if`). |
| `mobile_spacer_block_size` | range (0–200, step 2, px) | when `breakpoint!=none` | Default 16. Visible only when `breakpoint!=none`. |
| `desktop_spacer_block_size` | range (0–200, step 2, px) | when `breakpoint!=none` | Default 24. Visible only when `breakpoint!=none`. |
| `background_color` | metaobject (`theme_color`) | no | Default transparent. Renders via `var(--color-<handle>)`. |

## Output shape

```html
<div class="shopify-block shopify-block--spacer"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="breakpoint:40">
</div>
```

`data-modifiers` only present when `breakpoint != none`. Per-instance CSS custom properties emit via `utility--dynamic-style` into a scoped `<style>` block.

## CSS

```css
.shopify-block--spacer {
  display: block;
  position: relative;
  inline-size: 100%;
  block-size: var(--spacer-block-size, 0rem);
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm-mobile, 0rem));
  margin-block-end: 0;
  margin-inline: auto;
  background-color: var(--background-color, transparent);

  @media (width >= 48rem) {
    margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm-desktop, 0rem));
  }

  &[data-modifiers*='breakpoint'] {
    block-size: var(--mobile-spacer-block-size, 0rem);
  }

  @media (width >= 40rem) {
    &[data-modifiers*='breakpoint:40'] { block-size: var(--desktop-spacer-block-size, 0rem); }
  }
  @media (width >= 60rem) {
    &[data-modifiers*='breakpoint:60'] { block-size: var(--desktop-spacer-block-size, 0rem); }
  }
  @media (width >= 80rem) {
    &[data-modifiers*='breakpoint:80'] { block-size: var(--desktop-spacer-block-size, 0rem); }
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--spacer-block-size` | Fixed-mode height (rem) | `0rem` |
| `--mobile-spacer-block-size` | Responsive-mode height below breakpoint | `0rem` |
| `--desktop-spacer-block-size` | Responsive-mode height at/above breakpoint | `0rem` |
| `--background-color` | Optional background fill | `transparent` |

All emitted per-instance via `utility--dynamic-style`, only when the source setting is positive / non-blank (skip zero-emission for clean output).

## Behavior

- **Mode selection**: `breakpoint=none` uses `--spacer-block-size` only. `breakpoint != none` switches to `--mobile-spacer-block-size` (below threshold) and `--desktop-spacer-block-size` (at/above), via `data-modifiers="breakpoint:<value>"` CSS attribute selectors
- **Top-margin chain**: `margin-block-start` inherits the section's `--block-rhythm-mobile` / `--block-rhythm-desktop` cascade. The block-rhythm system flows naturally — no explicit top-spacing setting needed on this block
- **px → rem conversion**: settings are px-valued in the editor; emitted as rem (`px / 16`) to honor root font scale
- **A11y**: block is semantically empty (`<div>` with no children); no label needed — invisible to assistive technology by virtue of having no content
- **Reduced motion / forced colors**: no animations, no interactive states — nothing to honor

## Locale keys

- `blocks.spacer.name`
- `blocks.spacer.settings.spacer.content`
- `blocks.spacer.settings.breakpoint.{label,options.{none,sm,md,lg}}`
- `blocks.spacer.settings.spacer_block_size.label`
- `blocks.spacer.settings.{mobile,desktop}_spacer_block_size.{label,info}`
- `blocks.spacer.settings.appearance.content`
- `blocks.spacer.settings.background_color.{label,info}`
- `blocks.spacer.presets.spacer.{name,category}`

## Validation

Per `validation-contract.md`:

- **Tier**: primitive (Tier 2)
- **Page**: `sections/validation--primitive--spacer.liquid` + `templates/index.validation--primitive--spacer.json`
- **API surface** (block-backed only):
  - `breakpoint=none` × spacer_block_size ∈ {0, 24, 100, 200}
  - `breakpoint=40` × mobile=16 × desktop=64
  - `breakpoint=60` × mobile=16 × desktop=64
  - `breakpoint=80` × mobile=16 × desktop=64
  - With and without `background_color`
- **Edge cases**:
  - spacer_block_size=0 → no `--spacer-block-size` emitted; block collapses to 0
  - background_color blank → transparent (no `--background-color` emitted)
  - block-rhythm context: spacer placed in a section with `--block-rhythm-mobile/desktop` set → `margin-block-start` inherits the rhythm value
  - placed inside row-direction container → out-of-scope (anti-pattern; not validation-tested)
- **Visual showcase**: matrix of cells per breakpoint mode × size, with and without background. Reader confirms vertical gaps render at the expected heights and switch at the expected viewports.
- **Assertions**: prose — each cell's computed `block-size` matches setting × viewport, correct background, modifier attribute present/absent per mode. Selectors + expectations once Playwright lands.
- **Unit scope**: none (no JS)

## Out of scope

- Horizontal spacer — `inline-size: 100%` is intentional; horizontal gaps belong in container `gap` settings
- Use inside row-direction `group` — documented anti-pattern; documentation only, not enforced
- Animated reveal — pure spacing primitive, no motion concerns
