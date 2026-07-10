# form-field

**Layer**: 0

**Type**: snippet (`snippets/form-field.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Theme input styling in `assets/layer-theme.css` — `<body> :where(input, textarea, select)` rules drive the default visual treatment per scheme (`--color-role-input-{background,text,border}` + hover/focus/disabled states)
- Semantic `theme_color` palette seed `error` — emit as `--color-error` per `theme-color.spec.md`
- Scheme-role tokens (`--color-role-foreground-muted`, `--color-role-input-border`)
- Locale keys: caller-owned (no snippet-internal locale keys; labels and errors come from the caller)

**Consumers**:
- `contact-page` section / template (planned)
- Account auth templates — `login`, `register`, `recover-password`, `reset-password` (planned)
- `guest-order-lookup` section (planned)
- `preorder-notify-me` Layer 4 section (planned)
- `gift-card-recipient-form` block (planned)
- Newsletter / promo signup forms (planned)

## Purpose

Atomic form-field unit — label + control + help text + error message — with all ARIA wiring handled once: `<label for>` ↔ control id, `aria-describedby` linking help and error, `aria-invalid` on errored controls, `aria-required` + native `required`, and the required visual indicator (`aria-hidden` asterisk, since `required` already announces).

The snippet renders one field at a time. The `{% form %}` wrapper, submit button, business logic, and any cross-field validation all stay with the consuming section / template — this primitive is the *single field* abstraction, not a form abstraction.

## Scope

**Label-above-control family**: `text`, `email`, `tel`, `number`, `url`, `password`, `textarea`, `select`. Plus **`checkbox`** (control-beside-label layout). Radio groups (`<fieldset>` + `<legend>` + multiple inputs) need a different DOM shape and ARIA pattern; deferred to a sibling `form-choice` primitive.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `type` | string | no | `'text'` | One of `'text'` / `'email'` / `'tel'` / `'number'` / `'url'` / `'password'` / `'textarea'` / `'select'` / `'checkbox'`. Off-list → falls back to `'text'`. |
| `name` | string | yes | — | Control `name` attribute (used in form submission). Blank → snippet `break`s. |
| `label` | string | yes | — | Field label text. Blank → snippet `break`s. The label is mandatory; `placeholder` is never a label substitute. |
| `id` | string | no | `field-{{ name \| handleize }}` | Control id for `<label for>` association — the `name` is handleized (`contact[email]` → `field-contact-email`) for a CSS/JS-safe id. Pass explicit when two fields would handleize to the same id (multiple newsletter signup forms, etc.). |
| `value` | string | no | blank | Prefilled value. For `checkbox`, presence-vs-absence drives the `checked` state — `value` non-blank means checked. For `select`, `value` matches one of the `options[i].value` and pre-selects it. |
| `required` | boolean | no | `false` | Adds `required` attribute + `aria-required="true"` + visible `*` indicator (the asterisk is `aria-hidden` — `required` already announces). |
| `placeholder` | string | no | blank | Hint inside text-family inputs / textarea. Never a label substitute. Disallowed on `select` (would interfere with the placeholder-option pattern) and `checkbox` (no placeholder concept). |
| `help` | string | no | blank | Help text rendered below the control. Linked to the control via `aria-describedby`. |
| `error` | string | no | blank | Error message (typically from Shopify's `form.errors` array). When present, adds `aria-invalid="true"` to the control, renders the error span with `role="alert"`, and overrides the control's border to error color. |
| `options` | array of `{value, label}` objects | no | — | Required for `type:select`. Each entry renders as `<option value="{{ value }}">{{ label }}</option>`. |
| `autocomplete` | string | no | blank | HTML `autocomplete` attribute value (e.g. `email`, `name`, `tel`, `street-address`). When set, browsers offer their autofill UI. |
| `rows` | number | no | `4` | `textarea` rows attribute. |

Invoked from a consuming form:

```liquid
{% form 'contact', class: 'contact-form' %}
  {% render 'form-field', type: 'text', name: 'contact[name]', label: 'Name', required: true, autocomplete: 'name' %}
  {% render 'form-field', type: 'email', name: 'contact[email]', label: 'Email', required: true, autocomplete: 'email',
    error: form.errors.translated_fields.email %}
  {% render 'form-field', type: 'textarea', name: 'contact[body]', label: 'Message', rows: 6 %}
  <button type="submit">Send</button>
{% endform %}
```

## Output shape — text-family / textarea / select

```html
<div class="form-field" data-modifiers="type:email">
  <label class="field-label" for="field-contact-email">
    Email
    <span class="field-required" aria-hidden="true">*</span>
  </label>

  <input class="field-control"
         type="email"
         id="field-contact-email"
         name="contact[email]"
         value="jane@example.com"
         autocomplete="email"
         required
         aria-required="true"
         aria-invalid="true"
         aria-describedby="field-contact-email-help field-contact-email-error">

  <span class="field-help" id="field-contact-email-help">We'll never share your email.</span>
  <span class="field-error" id="field-contact-email-error" role="alert">Please enter a valid email.</span>
</div>
```

`textarea` swaps `<input>` for `<textarea rows="{{ rows }}">…</textarea>` (the value goes between the tags, not as an attribute). `select` swaps for `<select>` looping `options` into `<option>` elements; the `value` arg pre-selects the matching option.

The `aria-describedby` value is assembled at render time from whichever of `{{ id }}-help` / `{{ id }}-error` are present, space-joined. When neither is present, the attribute is omitted entirely.

## Output shape — checkbox (control beside label)

```html
<div class="form-field" data-modifiers="type:checkbox">
  <input class="field-control"
         type="checkbox"
         id="field-newsletter-consent"
         name="newsletter[consent]"
         value="yes"
         checked
         required
         aria-required="true"
         aria-describedby="field-newsletter-consent-help">

  <label class="field-label" for="field-newsletter-consent">
    Send me product updates
  </label>

  <span class="field-help" id="field-newsletter-consent-help">Unsubscribe anytime.</span>
</div>
```

Order swaps: input first, label second. Help / error wrap below via `flex-wrap` (see CSS). The asterisk `*` lives inside the label as in the standard layout; CSS positions it inline after the label text.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name`:

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
    margin-inline-start: 0.125rem;
  }

  /* .field-control inherits theme input styling from layer-theme.css (body-level
     :where(input, textarea, select) rules). Per-field, we only override the
     scheme-input-border token under aria-invalid, which the inherited rule reads. */
  & .field-control[aria-invalid='true'] {
    --color-role-input-border: var(--color-error);
  }

  & .field-help {
    font-size: var(--field-help-size, 0.8125rem);
    color: var(--field-help-color, var(--color-role-foreground-muted));
  }

  & .field-error {
    font-size: var(--field-error-size, 0.8125rem);
    color: var(--field-error-color, var(--color-error));
  }

  /* Checkbox: control beside label; help/error wrap below */
  &[data-modifiers*='type:checkbox'] {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--field-checkbox-gap, 0.5rem);

    & .field-help,
    & .field-error {
      flex-basis: 100%;
    }
  }
}
```

**Variable-shadow override pattern for error state.** Setting `--color-role-input-border: var(--color-error)` inside the `[aria-invalid='true']` rule re-scopes that variable for the control. The body-level input styling in `layer-theme.css` reads `border: ... var(--color-role-input-border)` — that rule now resolves to the error color for invalid controls without per-component selector duplication. The same pattern works for any input role-token override (e.g., a `[data-warning]` state could shadow `--color-role-input-border` to a warning color).

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--field-gap` | Gap between label / control / help / error | `0.375rem` |
| `--field-label-size` | Label font size | `0.875rem` |
| `--field-label-weight` | Label font weight | `500` |
| `--field-label-color` | Label color | inherits |
| `--field-required-color` | Required asterisk color | `var(--color-error)` |
| `--field-help-size` | Help text font size | `0.8125rem` |
| `--field-help-color` | Help text color | `var(--color-role-foreground-muted)` |
| `--field-error-size` | Error text font size | `0.8125rem` |
| `--field-error-color` | Error text color | `var(--color-error)` |
| `--field-checkbox-gap` | Gap between checkbox and label | `0.5rem` |

Control surface itself (background, text color, border default, hover, focus, disabled) inherits from `layer-theme.css`'s body-level input rules — not exposed here. Per-project styling of inputs happens centrally in `layer-theme.css`, not per-form.

## Behavior

- **Type branching.** The snippet `case`-branches on `type`. Text-family types (`text` / `email` / `tel` / `number` / `url` / `password`) render `<input type="<type>">`; `textarea`, `select`, `checkbox` render their respective elements. Off-list values fall to `text`.
- **Id auto-generation.** When `id` is blank, defaults to `field-` + the handleized `name` (`contact[email]` → `field-contact-email`), keeping the id safe for `<label for>`, `aria-describedby`, and CSS/JS targeting. Pass an explicit `id` when two fields would handleize to the same id (multiple newsletter forms on a page).
- **`aria-describedby` assembly.** The attribute value is composed from `{{ id }}-help` + `{{ id }}-error` per which spans are present (both → space-joined; one → that one's id; neither → attribute omitted). The order matters slightly: help before error puts the help description first in the SR's announcement chain, then the error.
- **`required` triple-wiring.** Adds the HTML `required` attribute (browser-enforced), `aria-required="true"` (AT explicitness; some older AT requires the explicit ARIA), and the visible `*` (consumer-visible). The asterisk is `aria-hidden` because `required` (and `aria-required`) already convey it.
- **Error state triple-wiring.** When `error` is set: `aria-invalid="true"` on the control, the `<span role="alert">` error message (announced when added live; pre-rendered errors are read when the SR walks the page), `--color-role-input-border` override via variable-shadow. The triple satisfies WCAG SC 3.3.1 (Error Identification) — programmatic state + accessible message + visual distinction.
- **`role="alert"` on the error span.** Triggers immediate announcement when the error span is added to the DOM (JS-driven validation). For server-rendered errors (Shopify returning the page with `form.errors`), the alert role announces as the SR walks through.
- **Checkbox `value` semantics.** A checkbox is "checked" when its `value` is non-blank. The default `value="yes"` (or whatever the consumer passes) shows in form submission only when the box is ticked — Shopify forms read the box's value as the submitted value when checked, or skip the name entirely when unchecked.
- **Select pre-selection.** Loops `options` into `<option>` elements; sets `selected` on the option whose `value` matches the `value` arg. When no match (or `value` is blank), the first option is the implicit selection per HTML semantics. Consumers wanting a placeholder option emit it themselves as the first entry (`options[0] = { value: '', label: 'Choose…' }`).
- **`placeholder` discipline.** Disallowed on `select` (Shopify form patterns use placeholder-option, not the `placeholder` attribute which isn't valid on select). Disallowed on `checkbox` (semantically meaningless). Allowed on text-family + textarea; the snippet doesn't enforce — passing a placeholder on select or checkbox is a no-op (the attribute is set but the browser ignores it).
- **Help vs error precedence in announcement order.** Both can coexist (e.g., a help that explains format + an error that says the input doesn't match the format). Order in DOM: help before error → SR reads help first, then error. The order is intentional: the help establishes context, the error indicates the violation.
- **Early exit on blank `name` or `label`.** Either blank → snippet `break`s with no markup. Both are mandatory because the field's HTML identity (`name` for submission) and accessibility (`label` for SR / sighted users) are non-negotiable.
- **Output escaping.** Shopify Liquid does not auto-escape `{{ }}`, so all caller-supplied display content — `label`, `placeholder`, `help`, `error`, `value`, and option `value` / `label` — is emitted through `| escape`. `name` and `id` are developer-controlled structural attributes emitted verbatim (`name` keeps its `contact[email]` form for submission; `id` is the handleized derivation).

## A11y

- **Every control has an associated `<label for>`.** Labels are mandatory; the snippet doesn't render the input without a label. Placeholder text is never the only label.
- **Required state via native `required` + redundant `aria-required`.** The native attribute is canonical; `aria-required` is added for older AT explicitness. The visible asterisk is `aria-hidden` to prevent triple-announcement.
- **Errors get three concurrent signals.** `aria-invalid` (programmatic state), `role="alert"` on the error span (live announcement), `aria-describedby` linkage from the control to the error span (read on focus). WCAG SC 3.3.1 + 3.3.3 covered.
- **Help and error coexist via `aria-describedby`.** Space-joined ids; SR walks both in order.
- **Color is not the only error cue.** The text content (`"Please enter a valid email."`) plus the screen-reader-announced invalid state communicate the error without color dependence.
- **Focus indicator inherits from `layer-theme.css`.** The body-level `:where(input, textarea, select):focus-visible` rule sets an outline + color. The form-field doesn't override; the theme-wide focus discipline applies.
- **Forced-colors mode** (Windows high-contrast) — input borders fall back to system colors via the cascade; the error-state border override (`--color-role-input-border: var(--color-error)`) cascades into forced-colors only if `--color-error` itself resolves there, which depends on `forced-color-adjust`. Tested at implementation time.

## Locale keys

N/A — the snippet renders the `label`, `help`, and `error` args directly. Locale-driven content is the *caller's* concern: the consuming section / template passes pre-translated strings, often from Shopify's `form.errors.translated_fields` for errors. The snippet itself defines no translation keys.

The `*` asterisk character is locale-independent (universal required-marker convention); no locale key for it.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Source**: colocated `snippets/form-field.validation.json` source + `snippets/form-field.test.js` — generate-and-drop through the `?view=validation` slot *(planned)*
- **API surface** (matrix to exercise):
  - **All nine types**: text / email / tel / number / url / password / textarea / select / checkbox — render each with a representative name + label
  - **States per type**:
    - Default (no value, no error)
    - With prefilled `value`
    - With `required: true`
    - With `help` text only
    - With `error` only
    - With both `help` and `error` (verify both announce in order)
    - Combination: `required` + `error` (focused state + alert)
  - **Select with options**: a 3-item options array, default first; with `value` matching the second option (pre-selected)
  - **Textarea with `rows`** at 2, 4, 8 — verify visual heights
  - **`autocomplete` variants**: `email`, `name`, `street-address`, `tel`, `cc-number` — verify the attribute applies (browser autofill UI confirms in DevTools)
  - **`placeholder` on text/textarea** + **placeholder ignored on select/checkbox** edge case
- **Edge cases**:
  - `name` or `label` blank → snippet `break`s; no markup
  - Off-list `type` (e.g. `'date'`) → falls to `text` (no `<input type="date">` emitted)
  - `error` (and any caller-supplied content: `label`, `help`, `placeholder`, `value`, option labels) with HTML → escaped. Shopify Liquid does **not** auto-escape `{{ }}`; the snippet applies `| escape` explicitly, so HTML renders as text, not markup
  - `options` blank or empty array on `select` → renders `<select>` with no options
  - Same `name` rendered twice on a page without explicit `id` → second instance's id collides; consumer must pass explicit `id`
  - Reduced-motion preference → no transitions on form-field defined here; inherited from layer-theme.css's input rules
- **Visual showcase**: a long form combining all types in their default and error states. Plus a tab-order verification row (Tab through the form; focus indicator + autocomplete UI surface naturally).
- **Assertions** (prose; Playwright once installed):
  - Every control has a `<label for>` matching its `id`
  - `aria-describedby` value matches the resolved id list (`{{ id }}-help` / `{{ id }}-error`, both, or omitted)
  - When `required: true`: control has `required` attribute + `aria-required="true"`; visible asterisk present + `aria-hidden`
  - When `error` is set: control has `aria-invalid="true"`; error span has `role="alert"`; computed border-color matches `--color-error`
  - When focused (`page.focus()`): outline visible (inherited from layer-theme.css `:focus-visible` rule)
  - Help span is present when `help` is set; absent otherwise
  - Error span is present when `error` is set; absent otherwise
- **Unit scope**: none (Liquid + CSS).

## Implementation-time decisions

- **Select placeholder option** (`<option value="" disabled selected>Choose…</option>`). Common UX pattern but adds a snippet branch. Decide whether to: (a) require consumers to include it as the first `options` entry, (b) add a `placeholder` arg that prepends the disabled option, (c) skip — the empty / first-option default is enough. Lean toward (a) for simplicity; revisit if usage data shows everyone re-implementing it.
- **Add `type:date` and friends.** Native `<input type="date">` / `time` / `datetime-local` are trivial to add to the type branch. Defer until a consumer needs them — date pickers vary widely across browsers; a project wanting consistent UX would JS-replace them anyway.
- **Multi-line error.** When Shopify returns multiple errors for a field (e.g. `["is required", "is invalid"]`), the consumer joins them before passing as `error`. A future enhancement: accept an array and render multiple `<span role="alert">` elements. Defer.
- **`name` uniqueness across forms on a page.** A page with two newsletter signup forms would have two fields both named `contact[email]`. The auto-generated `id` (`field-contact-email`) collides; the second `<label for>` points to the first input. Consumer must pass distinct `id` args. The snippet could prefix with a form-scoped string (`{{ form_id }}-field-{{ name }}`) but that requires an extra arg. Defer; document consumer's obligation.
- **Floating-label style.** Top-label is the only shipped style. A floating-label variant (label inside the control, animates up on focus) would be a CSS variant or a separate primitive. Defer; revisit if brand briefs require it.

## Out of scope

- **Radio groups.** Need `<fieldset>` + `<legend>` + multiple inputs sharing one name. Different DOM shape + ARIA pattern; deferred to a sibling `form-choice` primitive.
- **File upload, multi-select, native date/time pickers.** Each adds a type branch + extra UI consideration. Add when a consumer needs them; current scope covers the common form patterns.
- **Client-side validation logic.** The snippet renders server-error state Shopify provides. Live client-side validation (debounced email format checks, password-strength meters) is a JS concern; per-consumer addition.
- **The `{% form %}` wrapper, hidden fields, and submit button.** Consumer owns the form-level concerns. This primitive is one field.
- **Floating labels, inset labels, animated labels.** Top-label only.
- **Custom `<select>` (combobox / autocomplete).** Native `<select>` only. A combobox primitive (with ARIA combobox role, keyboard navigation, filterable options) is its own primitive — defer.
- **Localization of the asterisk character.** Universal convention; no locale key.
- **Submit button.** Use the `button` primitive at consume-site (`{% render 'button', content: 'Submit', link: blank %}` renders a `<button type="button">`; consumers wanting `<button type="submit">` either use raw HTML or compose a future submit-button variant).

## Related

- `button.spec.md` — sibling primitive consumers use for the form's submit button
- `theme-color.spec.md` — `--color-error` palette token consumed for required asterisk + error text + error-state border
- `.context/rules/a11y-conventions.md` — form-accessibility conventions; the spec aligns with WCAG SC 3.3.1 (Error Identification), 3.3.3 (Error Suggestion), 4.1.2 (Name, Role, Value)
- `.context/docs/locale-conventions.md` — locale file structure (the snippet has no internal keys; consumers pass translated strings)
- `utility--css-variables.spec.md` — input scheme-role tokens (`--color-role-input-*`) consumed for the control surface and overridden via variable-shadow for the error state
