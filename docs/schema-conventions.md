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
  "max": 200,
  "step": 2,
  "unit": "px",
  "default": 0
},
{
  "type": "range",
  "id": "desktop_margin_block_start",
  "label": "Desktop",
  "min": 0,
  "max": 200,
  "step": 2,
  "unit": "px",
  "default": 0
}
```

The snippet reads both settings and emits `--mobile-margin-block-start` and `--desktop-margin-block-start` CSS custom properties via `utility--dynamic-style`. The stylesheet applies mobile by default and switches at the desktop breakpoint (`@media (width >= 48rem)`).

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
{ "type": "header", "content": "Appearance" },
{
  "type": "color_scheme",
  "id": "color_scheme",
  "label": "Color scheme",
  "default": "scheme-1"
}
```

`block_rhythm` emits `--block-rhythm-mobile` / `--block-rhythm-desktop` CSS variables via `utility--dynamic-style`. The matching rule lives in `core.css` under `theme-section`:

```css
& :where(.shopify-block) + .shopify-block {
  margin-block-start: var(--block-rhythm-mobile, 0);

  @media (width >= 48rem) {
    margin-block-start: var(--block-rhythm-desktop, 0);
  }
}
```

The `:where()` keeps specificity at zero so per-block overrides work; the sibling combinator gets margin-collapse semantics for free. Default 0 when no rhythm is configured.

See `.claude/rules/section-convention.md` for the full section structure.

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
