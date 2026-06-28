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
  "min": 0,
  "max": 100,
  "step": 2,
  "unit": "px",
  "default": 0
},
{
  "type": "range",
  "id": "desktop_margin_block_start",
  "label": "Desktop",
  "min": 0,
  "max": 100,
  "step": 2,
  "unit": "px",
  "default": 0
}
```

The snippet reads both settings and emits `--mobile-margin-block-start` and `--desktop-margin-block-start` CSS custom properties via `utility--dynamic-style`. The stylesheet applies mobile by default and switches at the desktop breakpoint (`@media (width >= 48rem)`).

### Override idiom

Top-margin overrides the section's `block_rhythm` for that block with an **absolute** value — the override *replaces* the rhythm, it is not added on top of it. So a block configured at `8px` keeps `8px` wherever it sits, regardless of the blocks before or after. The range is `0…100` (positive only). Authoring rule: set the section rhythm to the section's typical spacing, then add a per-block override only where a block needs a different gap — a value below the rhythm tightens it, a larger value loosens it; the `spacer` block covers large gaps. Block-level overlap (negative margin) is intentionally unsupported — deliberate overlap is a positioned / container concern, not block rhythm.

See `container-patterns.md` § Block-rhythm override idiom.

## Section base settings

Every section carries these settings before its custom ones:

```json
{ "type": "header", "content": "Layout" },
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
{ "type": "header", "content": "Appearance" }
// + the color-scheme override pair — see § Color-scheme override
```

There is no `layout` setting — under the subgrid model token-section is always a bleed grid (named-line columns: `bleed-start` / `content-start` / `content-end` / `bleed-end`); row / multi-track compositions live inside container blocks (`group` / `columns`). See `.context/docs/theme-root.md` § Bleed grid.

The section's `data-modifiers` carries `theme-root` (identity) always, plus `color-scheme:<id>` only when `custom_color_scheme` is on (§ Color-scheme override).

`block_rhythm` emits `--block-rhythm: var(--spacing-<picked-handle>)` via `utility--dynamic-style` — points at the unified spacing namespace emitted by `utility--css-variables`, where responsive resolution lives in the spacing token's `@media` branch. The matching rule lives in `layer-theme.css` scoped to theme-roots:

```css
[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm, 0rem));

  @media (width >= 48rem) {
    margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm, 0rem));
  }
}
```

The `> .shopify-block:not(:first-child)` selector limits rhythm to direct children of a theme-root, one level deep; nested blocks inside container blocks (`group`, `columns`, `media`) use the parent's `gap` instead. The per-block fallback chain (`--mobile-margin-block-start` → `--block-rhythm` → `0rem`) lets per-block overrides win, fall through to the section rhythm, then to zero. The `@media` in `layer-theme.css` exists for the per-block mobile/desktop margin override path; `--block-rhythm` itself resolves responsively through its referenced `--spacing-<handle>`.

See `.context/rules/section-convention.md` for the full section structure.

## Color-scheme override

A section or container block (`group`, `columns`, `media`) opts into a *local* color scheme through a checkbox-gated picker. A `color_scheme` setting requires a default and can't be left empty, so a separate boolean carries the "no local override" state:

```json
{
  "type": "checkbox",
  "id": "custom_color_scheme",
  "label": "t:<scope>.settings.custom_color_scheme.label",
  "info": "t:<scope>.settings.custom_color_scheme.info",
  "default": false
},
{
  "type": "color_scheme",
  "id": "color_scheme",
  "default": "scheme-1",
  "label": "t:<scope>.settings.color_scheme.label",
  "visible_if": "{{ section.settings.custom_color_scheme }}"
}
```

(`block.settings.custom_color_scheme` in the `visible_if` at block level.)

**Default off** — the element emits no `color-scheme:<id>` modifier and rides the cascade: `<body>` paints the global/substrate scheme, and each level draws its ancestor's `--color-role-*` tokens. **Checked** — the snippet appends `color-scheme:<color_scheme>` to `data-modifiers`, so `utility--css-variables`'s per-scheme rules re-emit the tokens for this element's subtree and (for theme-roots) the scheme paint re-backgrounds it. This is Token's substrate→local-override model: global by default, local only when asked.

The emit guard keys on the boolean, not the picker value:

```liquid
if custom_color_scheme
  assign modifier_list = modifier_list | append: ',color-scheme:' | append: color_scheme
endif
```

`visible_if` hides the now-required picker until the override is on. This supersedes the earlier "single picker, blank = inherit" idiom — `color_scheme` can't actually be blank (it requires a default), so the boolean gate is what expresses "off." See `.context/docs/theme-root.md` § Scheme paint for the runtime (token re-emission + paint) and `modifier-system.md` for the `color-scheme:<id>` modifier.

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
