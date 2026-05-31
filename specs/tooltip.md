# tooltip

**Layer**: 0

**Type**: snippet (`snippets/tooltip.liquid`)

**Status**: spec (not yet implemented)

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- `snippets/icon.liquid` (renders the default `info` icon trigger; consumer can override via `trigger_icon` arg)
- Native HTML `popover` API (built-in to all baseline browsers since 2024)
- Future `assets/tooltip.js` — progressive enhancement for hover/focus reveal + JS placement (until CSS anchor positioning is baseline-safe). Specced separately when the first consumer ships.
- Scheme-role tokens + design constants (`--color-role-foreground-muted`, `--color-role-foreground`, `--color-role-background`, `--color-role-border`, `--shadow-md`, `--radius-small`)
- Locale keys: caller-owned (`trigger_label` + `content` are translated strings the caller passes)

**Consumers**:
- Form-field inline help (planned) — explains a field's expected format or constraint
- Swatch labels (planned) — reveals the full color name on a small swatch
- Fine-print explainers (planned) — expands abbreviations / jargon
- Icon-meaning hints (planned) — explains what an icon represents when text alone is insufficient
- Price-breakdown hints (planned) — clarifies a price component (tax-inclusive note, shipping-included flag)

## Purpose

Toggletip primitive — a focusable trigger that reveals a short, non-interactive explanation. Built on the native HTML `popover` API so the base interaction works on pointer, keyboard, and touch without JS, and the popover renders in the top layer (no clipping by overflow ancestors).

Two layers:

- **Base (zero JS)** — `<button popovertarget>` toggles a `[popover] role="tooltip"`. Click / tap / Enter / Space toggles. Escape + outside-click (light dismiss) close. Fully accessible without scripts.
- **Enhancement (`tooltip.js`)** — adds show on hover + focus, hide on leave + blur + Escape; positions the popover relative to its trigger (top-layer popovers need JS placement until CSS anchor positioning has solid baseline).

The toggletip pattern is *non-interactive content only* — text description, no links / buttons / forms inside. Tooltips with interactive content are a different primitive (disclosure / popover). This snippet's contract is bounded to non-interactive descriptions.

## Interaction model

| Surface | Without `tooltip.js` (base) | With `tooltip.js` (enhanced) |
|---|---|---|
| Pointer hover | (no-op) | show on hover; hide on leave |
| Keyboard focus | (no-op) | show on focus; hide on blur or Escape |
| Click / tap / Enter / Space | toggle | toggle |
| Escape | close (native popover light-dismiss) | close |
| Outside click | close (native popover light-dismiss) | close |
| Touch tap | toggle (works without JS) | toggle |

Touch users get the same base interaction model with or without JS — tap toggles. The JS enhancement specifically addresses the pointer-hover and keyboard-focus reveal paths.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `content` | string | yes | — | Tooltip text (translated string the caller passes). Blank → snippet `break`s. Supports inline formatting only (no nested interactive content). |
| `trigger_label` | string | conditional | — | Accessible name for the trigger when it's icon-only. Required when `trigger_text` is blank; ignored when `trigger_text` is set (visible text serves as the name). |
| `trigger_icon` | string | no | `'info'` | Icon `file_name` (without `icon-` prefix). Requires `assets/icon-<name>.svg`. Default `info` requires `assets/icon-info.svg`. |
| `trigger_text` | string | no | blank | Visible text trigger instead of an icon. When set, the icon path is skipped entirely. |
| `id` | string | no | `tooltip-<auto>` | Popover id + `aria-describedby` target. Auto-generated when blank using a section/block context hash; pass explicit when multiple tooltips share a context. |

Invoked inline from consumers:

```liquid
{% comment %} Icon trigger with required accessible name {% endcomment %}
{% render 'tooltip',
   content: 'block.settings.help_text' | t,
   trigger_label: 'accessibility.tooltip.format_hint' | t %}

{% comment %} Text trigger (no separate label needed) {% endcomment %}
{% render 'tooltip',
   content: 'Includes 12% sales tax',
   trigger_text: 'Tax-inclusive' %}
```

## Output shape

```html
<span class="tooltip">
  <button class="tooltip-trigger" type="button"
          popovertarget="tooltip-abc123"
          aria-describedby="tooltip-abc123"
          aria-label="Format hint">
    <svg data-name="info" aria-hidden="true">…</svg>
  </button>
  <span class="tooltip-content" popover id="tooltip-abc123" role="tooltip">
    Use the format YYYY-MM-DD.
  </span>
</span>
```

For the text-trigger variant:

```html
<span class="tooltip">
  <button class="tooltip-trigger" type="button"
          popovertarget="tooltip-xyz789"
          aria-describedby="tooltip-xyz789">
    Tax-inclusive
  </button>
  <span class="tooltip-content" popover id="tooltip-xyz789" role="tooltip">
    Includes 12% sales tax.
  </span>
</span>
```

- `<button popovertarget>` is the native HTML wiring — clicking toggles the popover without JS.
- `aria-describedby` is independent of `aria-label` — the trigger's name comes from `aria-label` (icon-only) or its visible text content (text-trigger); the description comes via `aria-describedby` pointing at the popover content.
- `[popover]` attribute on the content + `role="tooltip"` for the semantic + top-layer rendering.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name` / `& > svg`:

```css
.tooltip {
  display: inline-flex;

  & .tooltip-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--tooltip-trigger-size, 1.5rem);
    min-block-size: var(--tooltip-trigger-size, 1.5rem);
    color: var(--tooltip-trigger-color, var(--color-role-foreground-muted));
    background: none;
    border: 0;
    cursor: help;
    padding: 0;

    & > svg {
      inline-size: var(--tooltip-icon-size, 1rem);
      block-size: var(--tooltip-icon-size, 1rem);
    }

    &:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-role-focus-ring);
      outline-offset: var(--focus-ring-offset);
      border-radius: var(--radius-small);
    }
  }

  & .tooltip-content {
    margin: 0;
    max-inline-size: var(--tooltip-max-width, 16rem);
    padding: var(--tooltip-padding, 0.5rem 0.75rem);
    border: 1px solid var(--color-role-border);
    border-radius: var(--tooltip-radius, var(--radius-small));
    background: var(--tooltip-background, var(--color-role-background));
    color: var(--tooltip-color, var(--color-role-foreground));
    font-size: var(--tooltip-size, 0.8125rem);
    box-shadow: var(--shadow-md);
    /* Placement: tooltip.js sets top/left relative to the trigger until CSS anchor positioning is baseline-safe */
  }
}
```

The trigger inherits the substrate's `:focus-visible` outline pattern using the design constants (`--focus-ring-width` / `--focus-ring-offset`). The popover content sits in the browser's top layer when open (`[popover]` semantics) — no `z-index` needed; no clipping by overflow ancestors.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--tooltip-trigger-size` | Trigger min touch target (square) | `1.5rem` |
| `--tooltip-trigger-color` | Trigger icon / text color | `var(--color-role-foreground-muted)` |
| `--tooltip-icon-size` | Trigger icon dimensions | `1rem` |
| `--tooltip-max-width` | Content max width | `16rem` (256px — readable line length without overflow) |
| `--tooltip-padding` | Content padding | `0.5rem 0.75rem` |
| `--tooltip-radius` | Content border radius | `var(--radius-small)` (`0.25rem`) |
| `--tooltip-background` | Content background | `var(--color-role-background)` |
| `--tooltip-color` | Content text color | `var(--color-role-foreground)` |
| `--tooltip-size` | Content font size | `0.8125rem` |

## Behavior

- **Trigger naming.** Two pathways: (a) `trigger_text` set → visible text is the accessible name; no `aria-label`; (b) `trigger_text` blank → `aria-label` carries the name + an icon renders inside. Path (b) requires `trigger_label` (snippet `break`s if blank to prevent un-named icon-only triggers).
- **Description linkage.** `aria-describedby` always points from trigger → popover content, regardless of trigger style. Screen readers announce the description on trigger focus + when the popover opens.
- **Native popover toggle.** `<button popovertarget>` is HTML-native; the browser handles click/tap/Enter/Space toggling + Escape + outside-click dismiss. No JS required for the base interaction.
- **`role="tooltip"` on content.** The semantic indicates a non-interactive description (vs `dialog` for interactive popovers). Screen readers treat tooltip content as supplementary description, announced via the describedby chain.
- **Top-layer rendering.** `[popover]` content renders in the browser's top layer — sits above every other element including ones with `z-index`; never clipped by overflow ancestors. The styling discipline: the snippet doesn't set `z-index` (popover semantics handle it) and doesn't worry about `overflow: hidden` parents.
- **JS enhancement: hover/focus reveal.** `tooltip.js` (planned) adds hover-show + focus-show + leave-hide + blur-hide handlers. The base click-toggle still works in parallel; both can coexist. JS module is loaded by the section that uses tooltips (via `utility--asset-loader`), not globally.
- **JS enhancement: placement.** Until CSS anchor positioning has solid baseline coverage, `tooltip.js` reads the trigger's bounding rect on open + sets `position: fixed; top/left` on the popover. Migration path: when anchor positioning is baseline-safe, drop the JS placement, rely on `position-anchor` + `inset-area` in CSS.
- **Auto-id generation.** When `id` is blank, generate using the section's `id` + block context + a stable hash of the content (or a counter). The `popovertarget` ↔ `id` ↔ `aria-describedby` chain needs uniqueness across the page.
- **`break` on blank content.** A tooltip with no content has no purpose; the snippet emits nothing. Defensive against absent metafield values.
- **Touch-target floor.** `1.5rem` (24px) meets WCAG 2.5.8 (AA, 24×24px minimum). For AAA-level 2.5.5 (44×44px), consumers raise `--tooltip-trigger-size: 2.75rem`. The default optimizes for dense-inline use (form-help "i" icons next to field labels); the AAA bump is a per-consumer call.
- **`cursor: help`** on the trigger — pointer affordance signaling "this reveals more info" without being clickable in the action sense.

## A11y

- **Focusable trigger.** `<button type="button">` is naturally focusable, keyboard-operable, and reaches WCAG 4.1.2 (Name, Role, Value) via the standard button semantics + `aria-label` or visible text.
- **Description chain via `aria-describedby`.** The trigger's `aria-describedby` references the popover content's `id`. Screen readers announce the description on focus regardless of whether the popover is visually open. When the user activates the trigger and the popover opens, the description has already been announced via the describedby chain.
- **`role="tooltip"`** on the content vs `role="dialog"` for interactive popovers. Tooltip role = non-interactive description; dialog role = focus-trapped interactive surface. This snippet enforces the tooltip pattern (no interactive children).
- **Touch-tap toggle.** Native popover handles tap; iOS Safari + Android Chrome (current baselines) fire the toggle correctly on `<button popovertarget>`.
- **Escape closes.** Native popover light-dismiss includes Escape + outside-click. Keyboard users press Escape to dismiss without needing to re-focus the trigger.
- **`:focus-visible` outline** uses the substrate's design constants (`--focus-ring-width` / `--color-role-focus-ring` / `--focus-ring-offset`). Outline-offset gives the ring breathing room against the trigger's content.
- **`forced-colors: active`** (Windows high-contrast) — border + text use scheme-role tokens that resolve through system colors via `forced-color-adjust: auto`; the popover stays legible.
- **Touch-target compliance.** Default `1.5rem` (24px) meets WCAG 2.2 AA (SC 2.5.8, 24×24px minimum). AAA-level (SC 2.5.5, 44×44px) requires consumer override of `--tooltip-trigger-size`.

## Locale keys

No snippet-internal locale keys — `content`, `trigger_label`, and `trigger_text` are translated strings the caller passes. Callers using sr-only language explanations for the trigger should source `trigger_label` from `accessibility.tooltip.*` keys per `locale-conventions.md`.

Common per-project keys callers might add (project-side, not snippet-internal):

- `accessibility.tooltip.format_hint` — `"Format hint"`
- `accessibility.tooltip.explanation` — `"More information"`

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Page(s)**: `sections/validation--primitive--tooltip.liquid` + `templates/index.validation--primitive--tooltip.json` *(planned)*
- **API surface** (matrix to exercise):
  - **Icon trigger with `trigger_label`** — renders icon + carries `aria-label`
  - **Text trigger** (`trigger_text` set, `trigger_icon` ignored) — renders text + no `aria-label`
  - **Both `trigger_text` and `trigger_label` passed** — `trigger_text` wins; `trigger_label` ignored
  - **Custom `trigger_icon`** (e.g., `'help'`, `'warning'`) — verify icon renders
  - **Custom `id`** — verify the popovertarget ↔ id ↔ aria-describedby chain uses the passed value
  - **Long content** (multi-line, near max-width) — verify wrap behavior + max-width cap
  - **Multiple tooltips on one page** — verify each has a unique id; one open at a time (native popover behavior)
  - **Keyboard interaction**: Tab to trigger, Enter / Space toggles, Escape closes
  - **Touch interaction**: tap toggles (DevTools touch emulation)
  - **Pointer interaction (base, no JS)**: click toggles
  - **Pointer interaction (with `tooltip.js`)**: hover shows; leave hides; focus shows; blur hides
- **Edge cases**:
  - `content` blank → snippet `break`s; no markup
  - `trigger_text` blank + `trigger_label` blank → snippet `break`s (un-named icon-only trigger is invalid)
  - Trigger nested inside another `position: fixed` or `overflow: hidden` element → popover content still renders in top layer (no clipping)
  - Reduced-motion preference → no transitions on the snippet today; native popover handles open/close without animation by default
  - Forced-colors mode → border + text via scheme tokens preserve legibility
- **Visual showcase**: a matrix of trigger variants (icon-only / text-only) × content lengths (short / medium / long) × position contexts (near top of viewport / near bottom / near right edge). Reader confirms placement works at edges (when JS placement lands).
- **Assertions** (prose; Playwright once installed):
  - Trigger is a `<button type="button">` with `popovertarget` matching the popover content's `id`
  - Trigger carries `aria-describedby` matching the same `id`
  - For icon-only trigger: `aria-label` matches `trigger_label`; visible content is the icon SVG
  - For text trigger: no `aria-label`; visible text matches `trigger_text`
  - Popover content has `[popover]` attribute + `role="tooltip"`
  - On trigger click: popover open state transitions; on Escape: closes
  - Computed `min-block-size` + `min-inline-size` ≥ `--tooltip-trigger-size`
  - Popover content's computed `position` is `fixed` (top-layer) when open
- **Unit scope**: none for the snippet itself. `tooltip.js` (when shipped) carries its own Vitest specs covering hover/focus handler attachment + placement math.

## Implementation-time decisions

- **`assets/icon-info.svg` creation.** The default `trigger_icon: 'info'` requires the icon file to exist. If absent, create per `icon-convention.md` (lowercase kebab-case, viewBox, `data-name="info"`, no `width`/`height`, paths via `currentColor`). Check before shipping.
- **Auto-id generation strategy.** Options: (a) section.id + block context counter (deterministic within a render); (b) random hash (avoids cache-confusion across renders but loses stability); (c) hash of `content` (stable but identical content → collision). Lean toward (a) — the section + block context gives natural scoping.
- **JS placement API surface.** `tooltip.js` will be small — register on `tooltip-trigger` selectors, listen for `toggle` event on the popover, compute placement, set `top`/`left`. Decide whether to ship as a module-level listener or a class consumed by `BaseComponent` extension; revisit when the first consumer's section JS shape clarifies.
- **Anchor-positioning migration timing.** CSS anchor positioning is shipping incrementally; the JS placement path can drop when baseline coverage (~95%) is acceptable. Watch caniuse; flag as a periodic check in the audit phase.
- **AT announcement reliability.** `aria-describedby` on a closed popover: most screen readers read the linked content on trigger focus. Test against NVDA + VoiceOver + JAWS at validation time; if announcements drop, switch the content to an `aria-live` region + add an `aria-controls` linkage. Defer until validation reveals.
- **AAA touch target.** Default `1.5rem` is AA-compliant; some merchant projects want AAA. The exposed `--tooltip-trigger-size` is the override path; document in the planned validation page that AAA = `2.75rem`.

## Out of scope

- **Interactive content** (links, buttons, forms) inside the popover. That's a disclosure / popover primitive, not a tooltip. Tooltip content is non-interactive text per `role="tooltip"` semantics.
- **Rich HTML beyond inline formatting.** A tooltip with paragraphs, lists, headings is a different surface. Keep content short + single-block.
- **Anchor-positioning-based placement (CSS-only).** Today's placement is JS-driven via `tooltip.js`. Migrate when `position-anchor` + `inset-area` have baseline coverage; drop the JS placement path then.
- **Custom positioning (top / bottom / left / right) per consumer.** Default placement (over the trigger, biased toward viewport center) handled by `tooltip.js`. Per-consumer positioning override would be a future arg; defer.
- **Dismiss-on-trigger-hover-exit (for the JS-enhanced path).** Whether hover-exit closes immediately or after a short delay (preventing accidental dismiss when the user moves toward the popover content) — implementation-time tuning, not specced here.
- **Animation / transition.** Native popover toggle is instant by default. Adding a fade transition is a CSS layer over the spec; defer until brand UX requires.

## Related

- `icon.md` — primitive for the default `info` trigger and consumer-passed `trigger_icon` variants
- `form-field.md` — sibling primitive likely to consume tooltips for inline help (form field labels paired with tooltip triggers)
- `design-constants.md` — `--radius-small`, `--focus-ring-width`, `--focus-ring-offset`, `--shadow-md` consumed for the popover visuals
- `.context/docs/locale-conventions.md` — locale file structure (callers source `trigger_label` / `content` from translation keys)
- `.context/rules/a11y-conventions.md` — focus discipline, touch-target WCAG 2.5.5 / 2.5.8 levels
- Web platform reference: HTML `popover` attribute + the `popovertarget` HTML wiring (MDN docs; widely-supported baseline 2024)
