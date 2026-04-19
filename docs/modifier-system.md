# Modifier system

Cross-cutting convention for variant and state attributes on rendered elements. Referenced by `snippet-convention`, `section-convention`, and `icon-convention`.

## Attribute

Every component element may carry `data-modifiers`, a comma-separated list of `key:value` (or bare `key`) tokens:

```html
<button data-modifiers="button-style:solid-secondary,size:large">...</button>
<theme-section data-modifiers="color-scheme:scheme-2">...</theme-section>
<svg data-modifiers="fill">...</svg>
<form data-modifiers="step:submitting">...</form>
```

**Keys** use kebab-case.

**Values** reflect their source — no enforced casing. Examples:
- Metaobject handles: `solid-secondary`, `text-link` (kebab-case because Shopify handles are)
- Setting values: `scheme-1`, `scheme-2` (kebab-case because the setting value is)
- JS state names: `submitting`, `loading`, `validating` (camelCase when that matches the JS convention used by `ModifiersManager`)

Pick the casing that best represents the source; consumers (CSS selectors, JS reads) match the emitted form.

## Emitting the attribute

Two patterns, depending on how the set evolves:

**Dynamic or multi-modifier** — build a `modifier_list` and render via `utility--modifiers`. The utility emits nothing when the list is blank, so the attribute is omitted rather than empty.

```liquid
{% liquid
  assign modifier_list = ''
  if button_style != blank
    assign modifier_list = 'button-style:' | append: button_style.system.handle
  endif

  capture modifiers
    render 'utility--modifiers', modifier_list: modifier_list
  endcapture
%}

<button {{ modifiers }}>...</button>
```

**Single and stable** — when an element carries exactly one modifier and the set is unlikely to grow, hardcode the attribute inline. Skip the `modifier_list` + `utility--modifiers` ceremony.

```liquid
<theme-section data-modifiers="color-scheme:{{ section.settings.color_scheme }}">
```

## CSS hooks

Target modifiers with attribute-contains selectors:

```css
.shopify-block--button[data-modifiers*='button-style:outline'] {
  background-color: transparent;
  border-color: var(--color-primary);
}
```

Use `*=` (contains) rather than `=` (equals) so an element can carry multiple modifiers without the selector having to list them all.

## JS hooks

The `ModifiersManager` class (`assets/modifiers-manager.js`) reads and mutates `data-modifiers` on elements, letting JS add, remove, or toggle modifier tokens without stringly manipulating the attribute. This makes modifiers a first-class channel for component state (e.g. `step:submitting`, `view:expanded`) that both CSS and JS can react to.

## When to use

- **Visual variants that map to a design-system enum** — button style, card layout, color scheme, icon fill mode
- **Server-side state flags** — e.g. `locale:rtl`, `template:product`
- **Client-side component state** mutated via `ModifiersManager` — e.g. `step:submitting`, `view:expanded`. Use this when the same state drives CSS styling; use standard attributes/classes when only JS reads the state.

## When NOT to use

- **Per-instance values** (width, color, margin): use CSS custom properties via `utility--dynamic-style` instead
- **Pure JS state that does not drive styling**: use standard attributes (`aria-*`, `data-<name>`) or classes
