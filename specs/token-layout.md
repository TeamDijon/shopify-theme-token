# token-layout

**Layer**: substrate

**Type**: utility-js (`assets/token-layout.js`)

**Status**: shipped

**Implementation**: `assets/token-layout.js` v1.1.0 (custom-element registration)

**Reconciled**: 2026-06-04

**Reviewed**: 2026-06-04

**Depends on**: none — leaf module. Extends Web Platform `HTMLElement`.

**Consumers**:
- `snippets/group.liquid`, `snippets/columns.liquid` — wrap their children in `<token-layout>` as the inner layout root, allowing the outer's CSS to target `> token-layout` for direct-child styling without a stylistic class

## Purpose

A semantically-empty custom element that anchors the inner wrapper of container blocks (`group`, `columns`). Exists to give the inner wrapper a custom-element tag — replacing `<div class="inner">` — so consumers can target `> token-layout` from the outer block's CSS without a stylistic class. The class has no methods, no lifecycle behavior, no managers; it's a substrate anchor whose value is purely structural.

Container blocks (`group` / `columns`) distinguish the outer block element (carrying the `data-modifiers` attribute, schema settings, container-style variants) from the inner layout element (carrying the actual flex / grid layout rules). With `<div class="inner">` the inner gets a stylistic class re-declared in every container block's CSS; with `<token-layout>` the inner gets a stable tag selector at the substrate.

## API

No methods, no properties, no events. The class is `class TokenLayout extends HTMLElement {}` — empty body.

Registered globally as `<token-layout>` at module load via `window.customElements.define("token-layout", TokenLayout)`. Consumer markup:

```html
<div class="shopify-block shopify-block--group" data-modifiers="theme-root,…">
  <token-layout>
    <!-- content / block children -->
  </token-layout>
</div>
```

## Output shape

N/A — the element is markup-only; renders no DOM of its own beyond the tag wrapper.

## CSS

N/A at this layer — consumer blocks (`group`, `columns`) carry the layout rules that target `<token-layout>` as a descendant. Per-block CSS lives in those blocks' `{% stylesheet %}` blocks; this spec is the tag's substrate-level registration only.

## CSS custom properties (exposed)

N/A — the element emits no CSS variables.

## Behavior

- **Empty class — substrate anchor.** No methods, no properties, no lifecycle hooks. The class exists to give the inner wrapper a custom-element tag.
- **Global registration at module load.** Importing `@theme/token-layout` triggers `customElements.define("token-layout", TokenLayout)` as a side effect. `core.js` imports the module so the registration runs on theme initialization. No idempotency guard — the module loads once per page; double-registration would throw, which signals a load-order bug.
- **No `BaseComponent` extension.** This element doesn't need per-element managers (`events` / `observers` / `cache` / `modifiers`). Extending `BaseComponent` would pay 4-getter overhead per `<token-layout>` instance for no benefit; staying on `HTMLElement` keeps the cost zero.
- **Forward-compatible extension surface.** The class body is empty; future enhancements (per-instance behavior, custom-property exposure, slot-like APIs) extend `TokenLayout` without touching consumer markup.

## A11y

N/A — semantically transparent wrapper. The element doesn't carry ARIA roles; it inherits the surrounding context's semantics.

## Locale keys

N/A — no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Page(s)**: covered indirectly by `group` and `columns` block validation pages (`sections/validation--primitive--group.liquid`, `sections/validation--primitive--columns.liquid`). The element's effect — providing the `> token-layout` selector anchor — is observable through those blocks' rendered DOM.
- **API surface**: no methods to exercise.
- **Edge cases**:
  - Element used outside `group` / `columns` (per-project consumer) → renders as a transparent block-level element with no styling; the outer's CSS rules don't apply
  - Element nested inside another `<token-layout>` (unintended) → both render; the outer's `> token-layout` selector matches only the direct child
- **Visual showcase**: every `group` / `columns` block validation case implicitly exercises the element. DevTools confirms the `<token-layout>` tag wraps the block's children.
- **Assertions** (prose; Playwright once installed):
  - `customElements.get("token-layout")` returns the `TokenLayout` class after theme initialization
  - Every rendered `group` / `columns` block has exactly one direct-child `<token-layout>` element
- **Unit scope**: none — empty class with no behavior to test.

## Out of scope

- **Per-instance JS behavior.** The class is intentionally empty. If a container block needs JS behavior (event listeners, observer wiring), it lives in a specialized component class extending `BaseComponent`, not on `<token-layout>`.
- **Slot-like content distribution.** `<token-layout>` is a transparent wrapper, not a slot host. Consumers using shadow DOM patterns instantiate their own components; this element doesn't try to be a primitive for that.
- **ARIA / accessibility roles.** Semantically transparent by design. Container blocks that need a specific role (`role="group"`, `role="region"`) declare it on their outer block element, not on the inner `<token-layout>`.

## Related

- `.context/docs/subgrid-migration.md` § Stage 3 — the migration that introduced `<token-layout>` as the inner-wrapper tag
- `.context/specs/base-component.md` — the sibling substrate custom-element class; `<token-section>` is registered there, `<token-layout>` here
- `.context/specs/core.md` — entry point that imports `@theme/token-layout` and triggers the global registration as a side effect
- `.context/rules/section-convention.md` — outer-section vs inner-root architecture (the parallel that motivates `<token-layout>` for container blocks: outer schema-bearing, inner layout-bearing)
