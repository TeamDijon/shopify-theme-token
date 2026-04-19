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
  "info": "Leave blank for full width"
},
{ "type": "header", "content": "Appearance" },
{
  "type": "color_scheme",
  "id": "color_scheme",
  "label": "Color scheme",
  "default": "scheme-1"
}
```

See `.claude/rules/section-convention.md` for the full section structure.

## Grouping

- Group related settings under `{ "type": "header" }` separators
- Use `{ "type": "paragraph" }` only for short hints directly under a header (e.g. breakpoint reminders like "Mobile style < 768px"); not for long documentation

## Adding a new convention

When a recurring schema shape appears across multiple files, document it here and update the relevant rule(s) to reference it.

## Related

- Design-system metaobjects: `.context/docs/design-system-metaobjects.md`
