# tooltip

**Layer**: 0
**Type**: snippet (`snippets/tooltip.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: `snippets/icon.liquid`, native `popover` API, future `assets/tooltip.js` (progressive enhancement)
**Consumers**: form-field hints, swatch labels, fine-print explainers, icon-meaning hints, price breakdowns (all planned)

## Purpose

A toggletip primitive — a focusable trigger that reveals a short, non-interactive explanation. Built on the native `popover` API so it works on pointer, keyboard, and touch, and renders in the top layer (no clipping). Hover/focus reveal is a JS progressive enhancement on top of the zero-JS click base.

## Interaction model (Approach B)

- **Base (no JS)**: trigger is a `<button popovertarget>`; click/tap/Enter toggles the popover. Escape + light-dismiss close it. Fully accessible and touch-friendly without scripts.
- **Enhancement (`tooltip.js`)**: show on hover + focus, hide on leave + blur + Escape; positions the popover relative to the trigger (top-layer popovers need JS placement until CSS anchor positioning is baseline-safe).

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `content` | string | yes | Tooltip text. Blank → early exit |
| `trigger_label` | string | yes\* | Accessible name for the trigger. Required for icon-only triggers; ignored when `trigger_text` is set (the text is the name) |
| `trigger_icon` | string | no | Icon file_name. Default `'info'` |
| `trigger_text` | string | no | Visible text trigger instead of an icon |
| `id` | string | no | Popover id + describedby link. Auto-generated when blank |

\* required only for icon-only triggers.

## Output shape

```html
<span class="tooltip">
  <button class="tooltip-trigger" type="button"
          popovertarget="{{ id }}"
          aria-describedby="{{ id }}"
          {% if trigger_text == blank %}aria-label="{{ trigger_label }}"{% endif %}>
    {% if trigger_text != blank %}{{ trigger_text }}{% else %}{% render 'icon', file_name: trigger_icon %}{% endif %}
  </button>
  <span class="tooltip-content" popover id="{{ id }}" role="tooltip">
    {{ content }}
  </span>
</span>
```

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.tooltip {
  display: inline-flex;

  & .tooltip-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--tooltip-trigger-size, 1.5rem);
    min-block-size: var(--tooltip-trigger-size, 1.5rem);
    color: var(--tooltip-trigger-color, var(--color-foreground-muted));
    cursor: help;

    & > svg { --icon-size: var(--tooltip-icon-size, 1rem); }
  }

  & .tooltip-content {
    margin: 0;
    max-inline-size: var(--tooltip-max-width, 16rem);
    padding: var(--tooltip-padding, 0.5rem 0.75rem);
    border: 1px solid var(--color-border);
    border-radius: var(--tooltip-radius, 0.375rem);
    background: var(--tooltip-background, var(--color-background));
    color: var(--tooltip-color, var(--color-foreground));
    font-size: var(--tooltip-size, 0.8125rem);
    box-shadow: var(--shadow-md);
    /* Placement set by tooltip.js (top, left) until anchor positioning is baseline */
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--tooltip-trigger-size` | Trigger min touch target | `1.5rem` |
| `--tooltip-trigger-color` | Trigger icon/text color | `var(--color-foreground-muted)` |
| `--tooltip-icon-size` | Trigger icon size | `1rem` |
| `--tooltip-max-width` | Content max width | `16rem` |
| `--tooltip-padding` | Content padding | `0.5rem 0.75rem` |
| `--tooltip-radius` | Content border radius | `0.375rem` |
| `--tooltip-background` | Content background | `var(--color-background)` |
| `--tooltip-color` | Content text color | `var(--color-foreground)` |
| `--tooltip-size` | Content font size | `0.8125rem` |

## Behavior

- Base: native popover toggle on click/tap/Enter; Escape + outside-click dismiss (popover light-dismiss)
- Enhancement (`tooltip.js`): hover + focus show, leave + blur + Escape hide, + positioning relative to the trigger
- `id` auto-generated when not passed (popover target + describedby need a unique id)
- Early exit (`break`) when `content` is blank

## A11y

- Trigger is a focusable `<button>` with an accessible name (`aria-label` for icon-only, or the visible `trigger_text`)
- `role="tooltip"` on the content; `aria-describedby` links trigger → content
- Touch: tap toggles (native popover). Keyboard: Tab to trigger, Enter/Space toggles, Escape closes
- `cursor: help` on the trigger
- Trigger meets the 44×44px touch-target guidance via `min-*-size` (default 1.5rem can be raised by the consumer where tap precision matters)

## Out of scope

- Interactive content (links, buttons, forms) inside the bubble — that's a disclosure/popover, a different primitive. Tooltip content is non-interactive text
- Rich HTML beyond simple inline formatting
- Anchor-positioning-based placement — revisit when CSS anchor positioning is baseline-safe; migrate placement from JS to pure CSS then

## Implementation-time decisions

- Positioning strategy — `tooltip.js` computes placement (trigger rect → popover top/left) until anchor positioning is baseline; then drop the JS placement path
- AT announcement timing — validate `aria-describedby` + `role="tooltip"` against a real screen reader and Horizon's modal/popover accessibility rule; switch the content to a live region if describedby-on-toggled-popover doesn't announce reliably
- `trigger_icon` default `'info'` requires `assets/icon-info.svg` — create it if absent (per `icon-convention.md`)
- Min touch target — 1.5rem default is below the 44px guideline for dense inline use; consumers in tap-critical contexts should raise `--tooltip-trigger-size`
