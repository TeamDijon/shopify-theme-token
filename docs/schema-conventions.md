# Schema conventions

Recurring patterns in block and section schemas. Use these instead of re-inventing settings each time. Populate as patterns emerge.

## Top-spacing pair

For block-level top margin, use a mobile + desktop range pair preceded by a "Top spacing" header:

```json
{ "type": "header", "content": "Top spacing" },
{
  "type": "range",
  "id": "mobile_margin_block_start",
  "label": "Mobile",
  "min": -200,
  "max": 200,
  "step": 2,
  "unit": "px",
  "default": 0
},
{
  "type": "range",
  "id": "desktop_margin_block_start",
  "label": "Desktop",
  "min": -200,
  "max": 200,
  "step": 2,
  "unit": "px",
  "default": 0
}
```

The snippet reads both settings and emits `--mobile-margin-block-start` and `--desktop-margin-block-start` CSS custom properties via `utility--dynamic-style`. The stylesheet applies mobile by default and switches at the desktop breakpoint (`@media (width >= 48rem)`).

### Override idiom

Top-margin overrides the section's `block_rhythm` cascade per block, in both directions. The range is symmetric around zero: positive values add breathing room beyond the section rhythm; negative values pull a block tighter than the rhythm. Authoring rule: set the section rhythm to the section's typical spacing, then use positive overrides for breathing-room exceptions and negative overrides for tightening exceptions. Negative top-margin is the explicit, declared exception to the rhythm grid; use it for one-off tightening.

See `container-patterns.md` § Block-rhythm override idiom.

## Section base settings

Every section carries these settings before its custom ones:

```json
{ "type": "header", "content": "Layout" },
{
  "type": "select",
  "id": "layout",
  "label": "Layout",
  "options": [
    { "value": "column", "label": "Stacked" },
    { "value": "row", "label": "Side-by-side" },
    { "value": "columns_2", "label": "Two columns" },
    { "value": "columns_3", "label": "Three columns" },
    { "value": "columns_4", "label": "Four columns" }
  ],
  "default": "column",
  "info": "Picks the section's implicit-container layout. For finer control, wrap children in a `group` or `columns` block."
},
{
  "type": "metaobject",
  "metaobject_type": "content_width",
  "id": "content_width",
  "label": "Content width",
  "info": "Leave blank for the 2000px theme default — full width on most screens (1920px and below)."
},
{
  "type": "metaobject",
  "metaobject_type": "spacing",
  "id": "block_rhythm",
  "label": "Block rhythm",
  "info": "Vertical space between blocks. Leave blank for none."
},
{ "type": "header", "content": "Appearance" },
{
  "type": "color_scheme",
  "id": "color_scheme",
  "label": "Color scheme",
  "default": "scheme-1"
}
```

The section's `data-modifiers` carries `theme-root` (identity) and `color-scheme:<id>` (theming context); no `layout` modifier. Under the subgrid model, theme-section is always a bleed grid (named-line columns: `bleed-start` / `content-start` / `content-end` / `bleed-end`); row / multi-track compositions live inside container blocks (`group` / `columns`). See `.context/docs/theme-root.md` § Bleed grid.

`block_rhythm` emits `--block-rhythm-mobile` / `--block-rhythm-desktop` CSS variables via `utility--dynamic-style`. The matching rule lives in `layer-theme.css` scoped to theme-roots:

```css
[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm-mobile, 0rem));

  @media (width >= 48rem) {
    margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm-desktop, 0rem));
  }
}
```

The `> .shopify-block:not(:first-child)` selector limits rhythm to direct children of a theme-root, one level deep; nested blocks inside container blocks (`group`, `columns`, `media`) use the parent's `gap` instead. The per-block fallback chain (`--mobile-margin-block-start` → `--block-rhythm-mobile` → `0rem`) lets per-block overrides win, fall through to the section rhythm, then to zero.

See `.context/rules/section-convention.md` for the full section structure.

## Block-level color scheme override

Blocks that can override the section's color scheme (typically containers like `media`, `group`, `columns`) expose a single `color_scheme` setting with no default:

```json
{
  "type": "color_scheme",
  "id": "color_scheme",
  "label": "t:blocks.<name>.settings.color_scheme.label",
  "info": "t:blocks.<name>.settings.color_scheme.info"
}
```

Blank means "inherit from the section." The snippet emits a `color-scheme:<id>` modifier only when the setting is non-blank, so the per-scheme rules emitted by `utility--css-variables` re-apply to the block subtree. Replaces the experience-theme pattern of pairing a `custom_colors` checkbox with a separate scheme picker — one setting expresses "off" via blank, fewer pieces for the merchant to coordinate.

## Grouping

- Group related settings under `{ "type": "header" }` separators
- Use `{ "type": "paragraph" }` only for short hints directly under a header (e.g. breakpoint reminders like "Mobile style < 768px"); not for long documentation

## Metaobject picker vs hardcoded select

Prefer `"type": "metaobject"` over `"type": "select"` with a hardcoded `options` list when:

- Values represent **curated content** the merchant should manage (icons, theme colors, button styles, typographic styles, layout tokens)
- New entries should be addable without a code change
- The set of values shares a structure (a "name + slug" pair, a color hex, a numeric width, etc.) that benefits from being a metaobject

Hardcoded `select` is fine for **stable theme constants** where merchant curation isn't a goal:

- Breakpoints (`none / 40 / 60 / 80` — tied to CSS media queries)
- Alignment options (`start / center / end` — finite UI primitives)
- Layout direction (`horizontal / vertical`, `image-first / text-first`)
- Boolean-ish enums (`auto / always / never`)

Whenever you choose a metaobject picker, the type must be documented in `metaobject-definitions.md` (definitions) and `design-system-metaobjects.md` (consumption) before being referenced in a schema.

## Adding a new convention

When a recurring schema shape appears across multiple files, document it here and update the relevant rule(s) to reference it.

## Related

- Design-system metaobjects (consumption): `.context/docs/design-system-metaobjects.md`
- Metaobject definitions (creation): `.context/docs/metaobject-definitions.md`
