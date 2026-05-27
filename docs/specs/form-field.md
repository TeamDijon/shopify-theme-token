# form-field

**Layer**: 0
**Type**: snippet (`snippets/form-field.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: theme input styling in `core.css` (`input`/`textarea`/`select` are styled there), semantic `--color-error` token
**Consumers**: `contact-page`, account-auth templates, `guest-order-lookup`, `preorder-notify-me`, `gift-card-recipient-form`, newsletter/promo forms (all planned)

## Purpose

The atomic form-field unit — label + control + help text + error message, with all ARIA wiring (label association, `aria-describedby`, `aria-invalid`, required) handled once. Renders controls only; the `{% form %}` wrapper, submit button, and business logic stay with the consumer.

## Scope

Handles the **label-above-control family**: `text`, `email`, `tel`, `number`, `url`, `password`, `textarea`, `select`, plus `checkbox` (control-beside-label layout). Radio groups are deferred to a future fieldset-based `form-choice` sibling.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `type` | string | no | `text` (default), `email`, `tel`, `number`, `url`, `password`, `textarea`, `select`, `checkbox` |
| `name` | string | yes | Control `name` attr (form submission). Blank → early exit |
| `label` | string | yes | Field label. Blank → early exit |
| `id` | string | no | Control id for label association. Default `field-{{ name }}`; pass explicit when the same name repeats on a page |
| `value` | string | no | Prefilled value |
| `required` | boolean | no | Adds `required` + `aria-required` + visual indicator. Default `false` |
| `placeholder` | string | no | Hint text (text-family + textarea). Not a label substitute |
| `help` | string | no | Help text below the control |
| `error` | string | no | Error message (typically from Shopify `form.errors`) |
| `options` | array | no | For `select`: list of objects `{ value, label }` |
| `autocomplete` | string | no | `autocomplete` attr (e.g. `email`, `name`, `tel`) |
| `rows` | number | no | `textarea` rows. Default `4` |

## Output shape — standard (text-family / textarea / select)

```html
<div class="form-field" data-modifiers="type:email">
  <label class="field-label" for="{{ id }}">
    {{ label }}{% if required %} <span class="field-required" aria-hidden="true">*</span>{% endif %}
  </label>
  <input class="field-control" type="email" id="{{ id }}" name="{{ name }}"
         {% if value != blank %}value="{{ value }}"{% endif %}
         {% if placeholder != blank %}placeholder="{{ placeholder }}"{% endif %}
         {% if autocomplete != blank %}autocomplete="{{ autocomplete }}"{% endif %}
         {% if required %}required aria-required="true"{% endif %}
         {% if error != blank %}aria-invalid="true"{% endif %}
         aria-describedby="{{ describedby }}">
  {% if help != blank %}<span class="field-help" id="{{ id }}-help">{{ help }}</span>{% endif %}
  {% if error != blank %}<span class="field-error" id="{{ id }}-error" role="alert">{{ error }}</span>{% endif %}
</div>
```

`textarea` swaps `<input>` for `<textarea rows="{{ rows }}">`; `select` swaps for `<select>` looping `options` into `<option>`. `describedby` is assembled from whichever of `{{ id }}-help` / `{{ id }}-error` are present (space-joined, omitted when neither).

## Output shape — checkbox (control beside label)

```html
<div class="form-field" data-modifiers="type:checkbox">
  <input class="field-control" type="checkbox" id="{{ id }}" name="{{ name }}"
         {% if value != blank %}value="{{ value }}"{% endif %}
         {% if required %}required aria-required="true"{% endif %}
         {% if error != blank %}aria-invalid="true"{% endif %}
         aria-describedby="{{ describedby }}">
  <label class="field-label" for="{{ id }}">
    {{ label }}{% if required %} <span class="field-required" aria-hidden="true">*</span>{% endif %}
  </label>
  {% if help != blank %}<span class="field-help" id="{{ id }}-help">{{ help }}</span>{% endif %}
  {% if error != blank %}<span class="field-error" id="{{ id }}-error" role="alert">{{ error }}</span>{% endif %}
</div>
```

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--field-gap, 0.375rem);

  & .field-label {
    font-size: var(--field-label-size, 0.875rem);
    font-weight: var(--field-label-weight, 500);
    color: var(--field-label-color, inherit);
  }

  & .field-required {
    color: var(--field-required-color, var(--color-error));
  }

  /* .field-control inherits theme input styling from core.css; only invalid state overridden here */
  & .field-control[aria-invalid='true'] {
    --color-input-border: var(--color-error);
  }

  & .field-help {
    font-size: var(--field-help-size, 0.8125rem);
    color: var(--field-help-color, var(--color-foreground-muted));
  }

  & .field-error {
    font-size: var(--field-error-size, 0.8125rem);
    color: var(--field-error-color, var(--color-error));
  }

  /* Checkbox: control beside label, help/error wrap below */
  &[data-modifiers*='type:checkbox'] {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--field-checkbox-gap, 0.5rem);

    & .field-help,
    & .field-error { flex-basis: 100%; }
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--field-gap` | Gap between label / control / help / error | `0.375rem` |
| `--field-label-size` | Label font size | `0.875rem` |
| `--field-label-weight` | Label font weight | `500` |
| `--field-label-color` | Label color | inherits |
| `--field-required-color` | Required asterisk color | `var(--color-error)` |
| `--field-help-size` | Help text font size | `0.8125rem` |
| `--field-help-color` | Help text color | `var(--color-foreground-muted)` |
| `--field-error-size` | Error text font size | `0.8125rem` |
| `--field-error-color` | Error text color | `var(--color-error)` |
| `--field-checkbox-gap` | Gap between checkbox and label | `0.5rem` |

## Behavior

- Branches on `type`; text-family renders `<input type="...">`, `textarea`/`select`/`checkbox` render their respective controls
- `id` defaults to `field-{{ name }}`; consumer passes an explicit id when the same name appears more than once on a page
- `describedby` assembled from the present help/error ids (space-joined) so screen readers announce both when present
- `required` adds the `required` attr + `aria-required="true"` + a visual `*` (the asterisk is `aria-hidden` — `required` already conveys it to assistive tech)
- `error` adds `aria-invalid="true"`, a `role="alert"` error span, and an error-colored input border via `--color-input-border` override
- `select` loops `options` (objects `{ value, label }`) into `<option>`; pre-selects when `value` matches
- Early exit (`break`) when `name` or `label` is blank

## A11y

- Every control has an associated `<label for>` — `placeholder` is never the only label
- Required state via the `required` attribute (announced natively) + decorative `aria-hidden` asterisk
- Errors: `role="alert"` (announced on appearance) + `aria-invalid` on the control + `aria-describedby` linkage
- Help text linked via `aria-describedby`
- Inherits the theme's `:focus-visible` input styling from `core.css`

## Out of scope

- Radio groups — future `form-choice` sibling (needs `<fieldset>`/`<legend>` grouping)
- File upload, multi-select, native date/time pickers — add to the input branch when a consumer needs them
- Client-side validation logic — consumer/JS concern; this renders the server-error state Shopify provides
- The `{% form %}` wrapper, hidden fields, and submit button — consumer owns these
- Floating-label style — top-label only for now; a CSS variant if wanted later

## Implementation-time decisions

- Select placeholder option (disabled empty `<option>` shown first) — add when the first `select` consumer lands
- Whether to support `type:date` / `type:file` in the input branch — trivial to add, defer until needed
- Error-state border override approach — currently re-points `--color-input-border` to `--color-error`; confirm against the actual `core.css` input rules when implementing
