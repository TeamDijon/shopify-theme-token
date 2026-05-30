# Specialized section pattern

A specialized section has bespoke JS (cart, header, modal, etc.) and uses its own custom element (e.g. `<theme-cart>`) extending `BaseComponent`, instead of the generic `<theme-section>` wrapper.

For the high-level convention see `section-convention.md`. For JS module conventions see `js-asset-convention.md`. This doc is the worked example.

## File pair (plus optional CSS)

- `sections/<name>.liquid` — section file (Liquid + schema)
- `assets/<name>.js` — JS class powering `<theme-<name>>`
- `assets/<name>.css` — optional component-specific stylesheet

When authoring a new specialized section, also:

- Append `'<name>'` to `module_list` in `snippets/utility--import-map.liquid`
- Carry `theme-root` in the custom-element's `data-modifiers` so it inherits theme appearance defaults via the substrate's `[data-modifiers*='theme-root']` selector. Omit any `layout:` modifier — specialized sections own their layout via per-section CSS. See `.context/docs/theme-root.md` for the contract.

## Liquid (`sections/<name>.liquid`)

```liquid
{% # Cart v1.0.0 %}

{% liquid
  assign base_selector = 'shopify-section-' | append: section.id
%}

<theme-cart id="{{ base_selector }}" data-modifiers="theme-root,state:closed">
  {% comment %} markup driven by section.settings {% endcomment %}
  <button data-toggle>{{ 'cart.actions.toggle' | t }}</button>
</theme-cart>

{% capture dynamic_style %}
  {% comment %} per-instance CSS variables, optional {% endcomment %}
{% endcapture %}
{% render 'utility--dynamic-style', base_selector: base_selector, css_content: dynamic_style %}

{% render 'utility--asset-loader', name: 'cart', css: 'inline', js: 'module' %}

{% schema %}
{
  "name": "Cart",
  "tag": "section",
  "class": "shopify-section--cart",
  "blocks": [],
  "settings": []
}
{% endschema %}
```

## JS (`assets/<name>.js`)

```js
/**
 * Cart specialized section.
 * @module @theme/cart
 * @version 1.0.0
 */

import { BaseComponent } from "@theme/base-component";

export class ThemeCart extends BaseComponent {
  connectedCallback() {
    if (this.toggleButton) {
      this.events.add(this.toggleButton, "click", this.onToggleClick);
    }
  }

  get toggleButton() {
    return this.cache.get("dom", "toggleButton", () =>
      this.querySelector("[data-toggle]")
    );
  }

  onToggleClick = () => {
    this.modifiers.toggle("state:open");
  };
}

if (!customElements.get("theme-cart")) {
  customElements.define("theme-cart", ThemeCart);
}
```

## Patterns to follow

- **Arrow-function methods for callbacks** — auto-binds `this`, no constructor `.bind()`.
- **DOM access via cached getters** — `this.cache.get("dom", "name", () => this.querySelector(...))`. Centralizes selectors and avoids repeated traversal.
- **Bind events in `connectedCallback`** — the DOM isn't ready in the constructor.
- **Never override `disconnectedCallback`** — `BaseComponent`'s default already clears all four managers (events, observers, cache, modifiers) on disconnect.
- **Modifier checks via `this.modifiers`** — set initially from Liquid via `data-modifiers="..."`; mutated at runtime via `add` / `remove` / `toggle`.
- **Guard `customElements.define`** — the file may load twice during dev hot-reload; the `customElements.get(...)` check prevents the redefinition error.

## Patterns to avoid

- **Standalone helper classes** that bypass `BaseComponent` and manage their own listeners/observers — duplicates boilerplate. If a section has internal helpers, prefer methods on the component class.
- **Settings via dataset attributes or inline JSON islands** — pass values from Liquid via render parameters when invoking sub-snippets, or via `dynamic_style` for CSS. Keep the JS class consuming DOM, not config.
- **Setting modifiers in JS for initial state** — modifiers are set from Liquid (rendered with the markup). JS mutates state at runtime; it doesn't initialize it.

## Cross-references

- `theme-root.md` — the `theme-root` modifier contract (identity, layout opt-out by omission)
- `section-convention.md` — Specialized section subsection (high-level)
- `js-asset-convention.md` — JS module structure (imports, exports, JSDoc, changelog)
- `asset-loading.md` — `utility--asset-loader` strategy details (`'inline'`, `'link'`, `'module'`, `'preload'`)
- `modifier-system.md` — runtime mutation patterns and dimension naming
