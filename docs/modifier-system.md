# Modifier system

Cross-cutting convention for variant and state attributes on rendered elements. Referenced by `snippet-convention`, `section-convention`, and `icon-convention`.

## Attribute

Every component element may carry `data-modifiers`, a comma-separated list of `key:value` (or bare `key`) tokens:

```html
<button data-modifiers="button-style:solid-secondary,size:large">...</button>
<token-section data-modifiers="color-scheme:scheme-2">...</token-section>
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
<token-section data-modifiers="color-scheme:{{ section.settings.color_scheme }}">
```

## CSS hooks

Target modifiers with attribute-contains selectors:

```css
.shopify-block--button[data-modifiers*='button-style:outline-'] {
  background-color: transparent;
  border-color: var(--button-color);
}
```

Use `*=` (contains) rather than `=` (equals) so an element can carry multiple modifiers without the selector having to list them all. When a value family shares a prefix (e.g. `outline-primary`, `outline-secondary`, `outline-tertiary`), anchor the selector on a trailing separator (`outline-`) so substring matches stay scoped to that family.

## JS hooks

The `ModifiersManager` class (`assets/modifiers-manager.js`) reads and mutates `data-modifiers` on elements, letting JS add, remove, or toggle modifier tokens without stringly manipulating the attribute. This makes modifiers a first-class channel for component state (e.g. `step:submitting`, `view:expanded`) that both CSS and JS can react to.

## When to use

- **Visual variants that map to a design-system enum** — button style, card layout, color scheme, icon fill mode
- **Server-side state flags** — e.g. `locale:rtl`, `template:product`
- **Client-side component state** mutated via `ModifiersManager` — e.g. `step:submitting`, `view:expanded`. Use this when the same state drives CSS styling; use standard attributes/classes when only JS reads the state.

## When NOT to use

- **Per-instance values** (width, color, margin): use CSS custom properties via `utility--dynamic-style` instead
- **Pure JS state that does not drive styling**: use standard attributes (`aria-*`, `data-<name>`) or classes

## Authoring rules

Three rules, not violated by current usage; documented for future authoring.

### Categorical only — not continuous

Use `data-modifiers` for **finite, named** enum values (`button-style:solid-secondary`, `state:loading`, `template:product`). For continuous/numeric values (margins, sizes, computed offsets), use CSS custom properties via `utility--dynamic-style` instead. ZAG's `top-margin:0` through `top-margin:22` generates 23 individual CSS selectors where one variable would do.

Discrete numeric labels tied to a fixed enum (e.g. our `breakpoint:40` / `:60` / `:80` mapping to media queries) are categorical, not continuous.

### No prefix collisions

The substring-match nature of `*=` selectors means a token can shadow a longer one. Don't have `state:open` and `state:opened` coexist; don't have `breakpoint:4` and `breakpoint:40` coexist. Naming discipline: avoid making one key/value a prefix of another **unless the substring match is intentional** (like our `prose` matching both `prose` and `prose:narrow`).

Forward-looking: if we ever add hierarchical template paths (e.g. `template:product.bundle`), the existing `template:product` would silently match. Audit before adding.

### Swapping a key's value

No atomic replace operation exists — the manager intentionally does not provide one. To swap a dimension's value (`step:validating` → `step:submitting`), `remove("step")` then `add("step:submitting")`:

```js
this.modifiers.remove("step");
this.modifiers.add("step:submitting");
```

The explicit two-step makes the swap intent visible at the call site. See `specs/modifiers-manager.md` for the full API surface and design rationale.
