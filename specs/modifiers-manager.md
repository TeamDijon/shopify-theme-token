# modifiers-manager

**Layer**: substrate

**Type**: utility-js (`assets/modifiers-manager.js`)

**Status**: shipped

**Implementation**: `assets/modifiers-manager.js` v2.0.0 (class)

**Reconciled**: 2026-05-29

**Reviewed**: 2026-06-02

**Depends on**: none — leaf module, no `@theme/*` imports

**Consumers**:
- `assets/base-component.js` v1.1.0 — every `<token-*>` custom element exposes a lazy `.modifiers` getter that instantiates one manager per element; `disconnectedCallback` calls `.clear()`. Full contract in `base-component.md`.
- `assets/document-utils.js` v1.0.0 — exports `documentModifiers`, a module-level singleton bound to `document.documentElement` for html-level state (locked-scroll, theme switches, locale flags)

## Purpose

A small, instance-per-element class that owns the `data-modifiers` attribute on a target HTML element. Reads its current state, adds/removes/toggles tokens, and serializes back to the attribute string. The manager is the only sanctioned writer of `data-modifiers` at runtime — direct `setAttribute` calls bypass key-uniqueness and parsing invariants the manager enforces.

The attribute itself is the cross-cutting modifier convention documented in `modifier-system.md`: comma-separated `key:value` (or bare `key`) tokens, consumed by CSS via attribute-contains selectors and by other JS code via this manager. Both surfaces (CSS, JS) treat `data-modifiers` as the canonical home for categorical state — visual variants, server-side flags, client-side component state that drives styling.

## API

The class exposes a small mutation API. All mutating methods return `this` for chaining.

| Method | Params | Returns | Behavior |
|---|---|---|---|
| `constructor(element)` | `element: HTMLElement` | instance | Binds the manager to a target element. The element is held by reference; subsequent attribute mutations affect *that* element. No defensive copying. |
| `has(key)` | `key: string` | `boolean` | Returns `true` when the parsed attribute contains a token whose key (the substring before the first `:`) matches. Value-agnostic — `has("state")` returns true whether the token is `state` or `state:loading`. |
| `add(...modifiers)` | `modifiers: string[]` | `this` | Adds one or more `key` or `key:value` tokens. Each modifier is a **no-op when its key already exists** — the manager does not update the value of an existing key. Variadic; multiple tokens can be added in one call. Triggers a single `setAttribute` write at the end. |
| `remove(...keys)` | `keys: string[]` | `this` | Removes every token whose key matches any argument. When the resulting set is empty, the attribute is removed entirely (rather than left as an empty string). Variadic. |
| `set(modifier, condition)` | `modifier: string`, `condition: boolean` | `this` | Calls `add(modifier)` when `condition` is truthy; calls `remove(<key>)` when falsy. The key is the substring before the first `:` in `modifier`. |
| `toggle(modifier)` | `modifier: string` | `this` | Adds the full `modifier` token when its key is absent; removes the key when present. The toggle is *value-aware* — the value appended on the add path is whatever was passed in (`toggle("step:validating")` adds `step:validating`, then a follow-up `toggle("step:validating")` removes the `step` key regardless of its current value). |
| `clear()` | — | `this` | Removes the `data-modifiers` attribute entirely. Used by `BaseComponent.disconnectedCallback` for cleanup. |

The attribute name (`data-modifiers`) is hardcoded as a module-level constant. No other attribute names are managed.

### Private helpers

`#parse()` and `#serialize()` are private. Parsing splits on `,`, trims each part, drops empties, and extracts `key`/`value` by the first `:`. Serialization re-joins via `, ` (with the literal space). Callers don't see parsed objects; the public API speaks in strings.

## Output shape

The manager produces no DOM markup of its own — it mutates `data-modifiers` on a pre-existing element. The attribute's emitted form after mutations:

```html
<!-- after .add("color-scheme:scheme-2") then .add("state:loading") -->
<element data-modifiers="color-scheme:scheme-2, state:loading">

<!-- after .remove("state") -->
<element data-modifiers="color-scheme:scheme-2">

<!-- after .remove("color-scheme") leaving empty set -->
<element>
```

Tokens are space-separated *after* the comma (`, ` not `,`) when serialized. CSS selectors using `*=` match either form, but the consistent serialization makes the attribute eyeballable.

## CSS

N/A — JS module, no markup or styles.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Instance per element.** Each `new ModifiersManager(element)` is bound to one element. Two managers on the same element are valid but redundant — both read/write the same attribute.
- **Reads on every operation.** `has`, `add`, `remove`, `set`, `toggle` all parse the current attribute on each call. No internal cache. External mutations to `data-modifiers` (via `setAttribute`, devtools, etc.) are picked up automatically on the next operation.
- **Single attribute write per mutation.** `add(...)` and `remove(...)` compute the new attribute string and call `setAttribute` once at the end — no incremental writes per argument. Chained mutations (`mgr.add(...).remove(...)`) produce two writes, one per call.
- **No-op when nothing changes.** `add` skips the write when every argument's key already exists. `remove` skips when no key matches. `clear` always calls `removeAttribute` even when the attribute is absent (cheap; idempotent).
- **Empty set drops the attribute.** `remove`, when leaving zero tokens, calls `removeAttribute` rather than `setAttribute("data-modifiers", "")`. Keeps the rendered HTML clean and lets `:not([data-modifiers])` selectors match a fully-cleared element.
- **No event emission.** Mutations don't dispatch a `change` event or call observers. The component that mutates a modifier owns the reaction — no listener roundtrip needed; cross-component coordination flows through `theme-events.js` (typed bus, Bucket B), not modifier-attribute observation. Categorical state and semantic state transitions are separate channels. Callers that genuinely need to react to *external* modifier mutations attach a `MutationObserver` themselves.
- **`add` is key-level, not value-level.** When the key already exists in the attribute, the call is a no-op — the existing value stays. Variadic; multiple new keys can be added in one call producing one DOM write.
- **Chainability.** All mutating methods return `this`. Reads (`has`) return their value, not the instance.

### Lifecycle (when used via BaseComponent)

The base class exposes `.modifiers` as a lazy getter — the manager is constructed on first access, retained on the instance (`this._modifiers`), and `.clear()`-ed in `disconnectedCallback`. This means:

- Components don't pay the construction cost until they actually read or mutate modifiers.
- When the element detaches from the DOM, the manager's `clear()` wipes the attribute — important when an element may re-attach (custom elements are not necessarily destroyed on detach). A re-attached element starts with no modifiers; the component is expected to re-emit its initial set if needed.

The document-element singleton (`documentModifiers` in `document-utils.js`) follows a different lifecycle: it's eagerly constructed at module load and lives for the document's lifetime. No `clear()` on unload — the page is gone anyway.

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/modifiers-manager.test.js`, importing the class directly and asserting against a jsdom-backed `document.body.appendChild(element)` fixture.
- **Unit scope** (prose; Vitest specs once installed):
  - **Construction**: `new ModifiersManager(element)` does not mutate the element. No attribute writes until a mutating method is called.
  - **`has(key)`**:
    - Returns `false` when the attribute is absent.
    - Returns `true` for a bare `key` token (`data-modifiers="loading"` → `has("loading") === true`).
    - Returns `true` for a `key:value` token, value-agnostic (`data-modifiers="state:loading"` → `has("state") === true`, `has("loading") === false`).
    - Returns `false` for a substring of a key (`data-modifiers="color-scheme:scheme-2"` → `has("color") === false`).
  - **`add(modifier)`**:
    - Writes the attribute when the key is new.
    - Skips the write when the key already exists, regardless of value mismatch.
    - Variadic — `add("a", "b", "c")` produces one write, three tokens.
    - Serializes with `, ` separator.
  - **`remove(key)`**:
    - Writes the attribute with the key's token excluded.
    - Removes the attribute entirely when the remaining set is empty.
    - Skips the write when the key isn't present.
    - Variadic.
  - **`set(modifier, condition)`**:
    - Truthy condition routes to `add(modifier)`.
    - Falsy condition routes to `remove(<key>)`.
    - Key extraction works on both bare and `key:value` forms.
  - **`toggle(modifier)`**:
    - Absent → adds the full token.
    - Present → removes the key (regardless of current value).
    - Round-tripping (`toggle("x")` twice) returns to the starting state.
  - **`clear()`**:
    - Removes the attribute when present.
    - No-op when absent (does not throw).
  - **Chainability**: every mutating method returns the same instance; `mgr.add("a").remove("b").toggle("c")` is valid and executes in order.
  - **External mutation tolerance**: setting `element.setAttribute("data-modifiers", "foo:bar")` outside the manager is reflected in the next `has`/`add`/`remove` call (re-parse on each operation).
  - **Edge cases**:
    - Whitespace in input: `add(" state:loading ")` — current implementation does not trim arg strings; trailing/leading whitespace in the arg ends up in the serialized output. Caller obligation to pre-trim.
    - Empty-string arg: `add("")` — currently produces a `{ key: "", value: null, raw: "" }` entry that serializes to a stray comma. Avoid; not defended against (an empty string is meaningless as a modifier).
    - Multiple colons: `add("a:b:c")` — key is `a`, value is `b:c`. The value can carry colons.

## Out of scope

- **Multi-value per key**. Each key holds at most one value. Composite states (`state:loading + state:validating`) get modeled as two keys (`step:validating`, `phase:loading`) or a structured value (`state:loading-validating`), not duplicate-key tokens. Adding multi-value support would force value-aware `remove` semantics across the API.
- **Overwrite-on-add semantic.** `add` on an existing key is a no-op — value isn't replaced. The Set/Map/classList "overwrite or set" convention isn't followed here; routing value swaps through `add` would lose call-site visibility on swap intent.
- **Atomic value swap** (`replace` / `setValue` / `upsert`). Not provided. The two-step `remove(key)` + `add(key:value)` pair is the sanctioned swap (see "Overwrite-on-add semantic" above for the rationale). If usage data shows a real need, `upsert(modifier)` is the additive fix.
- **Class-attribute mirroring**. The manager does not sync to `element.classList`. CSS hooks live on `[data-modifiers*='...']` selectors only.
- **Event emission**. No `modifierchange` event. Consumers needing reactivity attach their own `MutationObserver` or coordinate via the caller that triggered the mutation.
- **Cross-element batch operations**. One manager, one element. Bulk apply-to-many wraps `forEach` at the caller — out of scope here.
- **Attribute-name configurability**. `data-modifiers` is hardcoded. A second attribute (e.g. `data-state`) would warrant a separate manager class, not a parameterized one — keeping the constructor signature single-arg is the design ceiling.
- **Validation / schema enforcement**. The manager accepts any string as a key or value. Casing rules (kebab for keys, source-matching for values) are documented in `modifier-system.md` but not enforced at the JS layer.

## Related

- `base-component.md` — primary consumer; describes the lazy-getter / `disconnectedCallback` lifecycle driving `.clear()`
- `document-utils.md` — exports `documentModifiers`, the html-element singleton instance of this class
- `events-manager.md`, `observers-manager.md`, `cache-manager.md` — sibling substrate utility-js specs sharing the same v2.0.0 evolution pattern
- `.context/docs/modifier-system.md` — the `data-modifiers` vocabulary (when/why), complementing this spec's API surface
- `.context/rules/js-asset-convention.md` — file structure conventions