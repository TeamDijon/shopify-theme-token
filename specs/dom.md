# dom

**Layer**: substrate

**Type**: utility-js (`assets/dom.js`)

**Status**: shipped

**Implementation**: `assets/dom.js` v2.0.0 (single object export with lazy getters)

**Reconciled**: 2026-06-01

**Reviewed**: 2026-06-02

**Depends on**: none — leaf module, no `@theme/*` imports. Uses Web Platform built-ins: `document.getElementById`.

**Consumers**:
- `assets/core.js` v1.3.0 — re-exports as `window.Token.dom` for inline-script + Liquid-template consumers
- Future specialized sections that need to reference document-level structural elements (e.g., header navigating to page content via `dom.pageContent`)

## Purpose

A read-only catalog mapping one stable unique ID per well-known document-level element — entries land only when the section that owns the markup ships, speculative additions are deliberately refused. Each property maps one ID to a `document.getElementById('<id>')` lookup performed lazily on read; missing elements warn via `console.warn` and return `null`.

The catalog carries only `pageContent` today — each future getter (header, footer, cart, search, etc.) lands when its section ships with a confirmed ID. Speculative additions create dev-time `console.warn` noise and risk encoding IDs that don't match the future markup.

Lookups are live, uncached. Consumers needing repeated access cache the reference themselves (e.g., via `CacheManager`'s `dom` cache type).

## API

A single named export, `dom`, with lazy getter properties.

| Property | Type | Source | Notes |
|---|---|---|---|
| `dom.pageContent` | `HTMLElement \| null` | `document.getElementById('page_content')` | The `<main id="page_content">` wrapper rendered by `layout/theme.liquid`. Returns `null` + warns via `console.warn` when the element is missing. |

Future getters will be added as sections ship — each entry pairs an ID (confirmed against the section's actual emitted markup) with a getter property. Anticipated additions:

| Future property | Source | Lands when |
|---|---|---|
| `dom.header` | `getElementById('<header-id>')` | Header section ships (Bucket B / specialized-section work) |
| `dom.footer` | `getElementById('<footer-id>')` | Footer section ships |
| `dom.cart` / `dom.miniCart` | `getElementById('<id>')` | Cart drawer / mini-cart specialized sections ship |
| `dom.search` / `dom.miniSearch` | `getElementById('<id>')` | Search overlay / mini-search specialized sections ship |

None of these exist on the shipped surface today. Each entry lands with the section that owns its rendered markup.

## Output shape

N/A — JS module, no DOM emission. The module's effect is the live lookups it performs.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Lazy lookups on read.** Each getter calls `document.getElementById` on access — no caching at the `dom` layer. Repeated access on a single component should cache locally (e.g., via `CacheManager`'s `dom` cache type, which is exactly designed for this).
- **`console.warn` on missing element.** When `getElementById` returns `null`, the getter logs a warning before returning the null. Diagnosable in dev tools; not silent. Production consoles may also surface the warning depending on logging policy.
- **`null` returned on missing element.** Consumers must handle the null case. The warning helps diagnose; the return value lets the consumer's code branch (skip the operation, fall back to a different element, etc.) without crashing.
- **No element creation.** The module does not create elements that don't exist. Consumers wanting a guaranteed reference compose `dom.pageContent ?? document.createElement('main')` themselves — out of scope for this leaf module.
- **No element mutation.** The module is a read-only catalog. Mutations (attribute changes, content swaps) happen at the consumer layer; this module is just a resolver.
- **Re-export through core.js as `window.Token.dom`.** Inline scripts and Liquid templates access via `window.Token.dom.pageContent`. The module-specifier import (`import { dom } from '@theme/dom'`) is the modern path for ES module consumers.

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/dom.test.js`, importing the module and asserting against a jsdom fixture with `<main id="page_content">` mounted.
- **Unit scope** (prose; Vitest specs once installed):
  - **`pageContent` hit**: with `<main id="page_content">` mounted, `dom.pageContent` returns the element reference.
  - **`pageContent` miss**: without the element, `dom.pageContent` returns `null` and a `console.warn` is emitted (spy on console).
  - **Lazy resolution**: removing the element after first access and accessing again returns `null` (no caching).
  - **Re-mount**: mounting the element after a missing-access returns the element on next access (lookups are live).
- **Edge cases**:
  - Multiple elements with `id="page_content"` (invalid HTML; browsers tolerate but return the first match) → returns the first match per platform behavior. Not guarded against (HTML validation is upstream concern).
  - Reading outside a document context (e.g., from a Worker) → `document` is undefined; throws naturally from the platform.

## Out of scope

- **Element creation.** The module reads existing markup; doesn't create elements. Consumers wanting a guaranteed reference compose at their layer.
- **Element mutation.** Read-only catalog.
- **Caching.** Lookups are lazy on read; no internal caching. Consumers wanting repeated access cache via `CacheManager` (the `dom` cache type is purpose-built).
- **Query selectors.** The catalog is keyed by unique ID — one named property per well-known element. `querySelector`-based getters (collection lookups, class-based selectors, ancestor walks) belong in the consumer or in `CacheManager`'s lookup cache; not in this resolver.
- **Per-section element catalogs.** Each section's internal elements are the section's concern — this module is for *document-level* structural references shared across the theme.
- **Custom-element references.** Custom elements upgrade asynchronously; a getter returning `<token-cart>` might be defined-but-not-upgraded. The module doesn't wait for `customElements.whenDefined`. Consumers needing upgrade-aware access compose with `customElements.whenDefined('<tag>')`.

## Related

- `core.md` — re-exports `dom` into `window.Token.dom` for inline-script consumers
- `cache-manager.md` — the `dom` cache type is purpose-built for memoizing DOM lookups across element lifetime; consumers reading `dom.pageContent` repeatedly compose with the cache
- `base-component.md` — the `section` getter pattern (closest('.shopify-section') memoized via `CacheManager`) is the per-element analog of this document-level catalog
- `.context/rules/js-asset-convention.md` — file structure (`@module @theme/dom`, JSDoc, changelog) the implementation file follows
