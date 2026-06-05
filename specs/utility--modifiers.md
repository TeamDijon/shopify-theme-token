# utility--modifiers

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--modifiers.liquid` + `snippets/utility--document-modifiers.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/utility--modifiers.liquid` v1.2.0 (attribute emitter — wraps a comma-list into `data-modifiers="…"` with escape)
- `snippets/utility--document-modifiers.liquid` v1.1.0 (document-scope composer — emits `template:<value>` + optional `shopify-design-mode` and delegates attribute emission to `utility--modifiers`)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- `utility--document-modifiers` consumes Liquid globals `template`, `request.page_type`, `request.design_mode`
- `utility--document-modifiers` calls `utility--modifiers` for attribute emission
- `utility--modifiers` has no internal dependencies

**Consumers**:
- `utility--modifiers`: 8 L1 block snippets — `button`, `columns`, `embed`, `group`, `media`, `richtext`, `spacer`, `title` — each composes a comma-list of `key:value` pairs into a `modifier_list` and renders this utility to emit the attribute
- `utility--document-modifiers`: rendered exactly once per page from `layout/theme.liquid` + `layout/landing.liquid` inside the `<html>` opening tag

## Purpose

The paired emitter for the theme's `data-modifiers` attribute — the runtime channel between Liquid-side composition and CSS / JS that selects on `[data-modifiers*='<token>']`. `utility--modifiers` is the leaf: takes a pre-composed comma-list and emits the `data-modifiers="<list>"` attribute (escaped, blank-list-suppressed). `utility--document-modifiers` is the document-scope composer: builds the `<html>`-tag modifier list from runtime Liquid globals (template name, design-mode flag) and delegates emission.

The pair encodes the modifier-system contract at its two write points. List composition (which tokens get added) lives at the call site — every L1 block builds its own list per its modifier schema; `utility--document-modifiers` builds the document-scope list. Attribute emission (escaping, blank-list omission) is centralized in `utility--modifiers` so the cross-cutting rules don't drift.

## API

### `utility--modifiers`

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `modifier_list` | string | yes | — | Comma-separated list of `key:value` tokens. Blank list (or unset) suppresses the attribute entirely via early `break`. Escaped at emission. |

Output: `data-modifiers="<escaped-list>"` or nothing when blank. No leading or trailing whitespace inside the attribute value beyond what the caller's `modifier_list` carries.

### `utility--document-modifiers`

No params. Reads Liquid globals:

| Global | Used for |
|---|---|
| `template` | Source of the `template:<value>` token. Liquid's built-in `template` object exposes the active template name |
| `request.page_type` | Special-case override — when `'policy'`, the `template:<value>` token becomes `template:policy` instead of the per-policy template name |
| `request.design_mode` | When truthy, adds `shopify-design-mode` to the list (theme-editor preview frame detection) |

Output: the rendered `data-modifiers="…"` attribute for the `<html>` opening tag. Emitted via delegation to `utility--modifiers`.

## Output shape

Block-level emission via `utility--modifiers`:

```liquid
{% liquid
  assign modifier_list = 'theme-root,color-scheme:scheme-1,bleed-desktop:left'
%}
<token-section {% render 'utility--modifiers', modifier_list: modifier_list %}>
  ...
</token-section>
```

Renders:

```html
<token-section data-modifiers="theme-root,color-scheme:scheme-1,bleed-desktop:left">
```

Document-level emission via `utility--document-modifiers`:

```liquid
<html {% render 'utility--language' %} {% render 'utility--document-modifiers' %}>
```

Renders, on `templates/product.json` in storefront mode:

```html
<html lang="en" dir="ltr" data-modifiers="template:product">
```

In theme editor (design mode):

```html
<html lang="en" dir="ltr" data-modifiers="template:product,shopify-design-mode">
```

On any of Shopify's policy pages (`refund_policy`, `privacy_policy`, `terms_of_service`, `shipping_policy`):

```html
<html lang="en" dir="ltr" data-modifiers="template:policy">
```

## CSS

N/A — utility-snippets emit attribute markup; no CSS rules. Consumers of the attribute (substrate CSS in `layer-theme.css`, per-block stylesheets) live in their respective specs / stylesheets.

## CSS custom properties (exposed)

N/A — the utility emits an attribute, not custom properties.

## Behavior

### `utility--modifiers`

- **Blank-list suppression.** Empty / blank `modifier_list` triggers `break` — the attribute is not emitted. Callers can build a modifier list conditionally without guarding the emission; an empty list naturally renders no attribute.
- **`escape` filter on emission.** The list value passes through Liquid's `escape` filter before rendering — defends against attribute breakout from merchant-supplied modifier values (e.g. a merchant-typed string containing `"` injected into a modifier token via a setting). Token values typed by the theme itself contain no special chars; the escape is for the merchant-input attack surface.
- **No list normalization.** The utility does not trim, deduplicate, or reorder the list — emission is verbatim (modulo escape). Composing the list correctly is the caller's responsibility per `.context/docs/modifier-system.md` § Composition rules.

### `utility--document-modifiers`

- **`template` global is the source-of-truth for the `template:<value>` token.** Shopify's built-in `template` object resolves to the current template's name (e.g. `index`, `product`, `404`).
- **Policy-page collapse.** Shopify exposes four policy templates (`refund_policy`, `privacy_policy`, `terms_of_service`, `shipping_policy`), each with its own `template` value — but no unified `template == "policy"` abstraction. The utility synthesizes the missing hook by collapsing all four into a single `template:policy` token, giving CSS / JS a stable selector for "any policy page" the platform doesn't provide. Detection: `request.page_type == 'policy'` is the documented Shopify discriminator.
- **`shopify-design-mode` is design-mode only.** The `request.design_mode` flag is truthy inside the theme editor and false on the storefront. The token's purpose is editor-frame detection — substrate JS / CSS that should only run inside the editor preview keys off `[data-modifiers*='shopify-design-mode']` at the document level.
- **Composition is positional.** `template:<value>` comes first, `shopify-design-mode` appended after when present. `JS code keying off the document attribute should match on token presence (`includes('shopify-design-mode')`), not on positional index.
- **Delegation to `utility--modifiers`.** The composer does not emit the attribute itself — it builds the list, then renders `utility--modifiers` with that list. Centralizing the escape + blank-list rules.
- **Always renders something.** `template` is always non-blank on a rendered page, so the document-modifiers attribute is always emitted (unlike block-level consumers, which can have empty modifier lists when no settings are configured).

## A11y

N/A — utility-snippets emit a data-attribute; no rendered DOM, no a11y surface. ARIA attributes live on the consuming element, not in this attribute.

## Locale keys

N/A — pure attribute emission, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: covered indirectly by every L1 block validation page (block-scope emission) + every rendered page (document-scope emission on `<html>`). No dedicated validation page; the utility's behavior is observable on every rendered template.
- **API surface** (matrix to exercise):
  - **Block-scope emission with non-blank list** — block element carries `data-modifiers="<list>"` matching the composed list
  - **Block-scope emission with blank list** — no `data-modifiers` attribute on the block element
  - **Document-scope emission on storefront** — `<html data-modifiers="template:<name>">` with no design-mode token
  - **Document-scope emission inside theme editor** — `<html data-modifiers="template:<name>,shopify-design-mode">`
  - **Policy page** — `<html data-modifiers="template:policy">` on each of the four policy templates
  - **Escape** — a modifier token containing `"` is escaped to `&quot;` in the rendered attribute (attack-surface defense)
- **Edge cases**:
  - Trailing / leading comma in `modifier_list` — emitted verbatim, no normalization (callers should not produce them)
  - Modifier value containing a comma — would corrupt the comma-delimited list; out of scope, callers don't compose tokens with embedded commas
  - Template with snake-case name (e.g. `customers/account`) — the literal `template:<value>` carries Shopify's value verbatim; substrate CSS matches via `*=` substring selectors per `.context/docs/modifier-system.md`
- **Visual showcase**: every validation page implicitly exercises both utilities — DevTools shows the `<html>` attribute always present + per-block attributes on every modifier-bearing block.
- **Assertions** (prose; Playwright once installed):
  - On `templates/index.json` (storefront): `document.documentElement.dataset.modifiers === 'template:index'`
  - On `templates/index.json` inside theme editor: `document.documentElement.dataset.modifiers === 'template:index,shopify-design-mode'`
  - On `templates/page.refund-policy.json`: `document.documentElement.dataset.modifiers === 'template:policy'`
  - Block-scope: each rendered L1 block with non-blank modifiers carries its expected list; blocks with no modifier inputs configured render with no `data-modifiers` attribute
- **Unit scope**: none (Liquid only).

## Implementation-time decisions

Both files shipped — retrofit spec, no open decisions.

## Out of scope

- **List composition rules.** The utility emits whatever list it receives. Composition rules — naming (`scope:value`), allowable scopes, conflict semantics — live in `.context/docs/modifier-system.md`; per-element schemas land in element specs.
- **Per-token deduplication / conflict resolution.** Two tokens with the same scope (e.g. `color-scheme:scheme-1,color-scheme:scheme-2`) would both appear in the rendered attribute; substrate CSS matching is substring-based and would match both. Callers compose a single token per scope; the utility doesn't defend against duplicate-scope misuse.
- **Document-scope token catalog.** Currently two tokens: `template:<value>` and `shopify-design-mode`. New document-scope tokens (e.g. a `theme:dark` indicator, `network:offline` for PWA shells) land via additions to `utility--document-modifiers`, with a corresponding update to this spec's "Used for" table.
- **Mutation API.** The utility emits the attribute at render time only; runtime mutation of `data-modifiers` happens via `ModifiersManager` on the JS side per `.context/specs/modifiers-manager.md`. The Liquid utilities are write-once at render.
- **Section-host inline emission.** `sections/section.liquid` writes its own `data-modifiers` attribute inline (literal `data-modifiers="theme-root,color-scheme:..."`) instead of delegating to `utility--modifiers`. Consolidating section.liquid's emission through the utility is a one-line internal refactor; out of scope until a contract change requires it.

## Related

- `.context/docs/modifier-system.md` — naming convention, scope rules, CSS-matching pattern, the load-bearing nature of well-known tokens (`theme-root`, `color-scheme:<id>`)
- `.context/specs/modifiers-manager.md` — JS-side mutation API; reads and writes the same attribute this utility emits
- `.context/specs/document-utils.md` — `documentModifiers` singleton, the document-scope JS counterpart to `utility--document-modifiers`
- `.context/specs/section.md` — outlier consumer; emits `data-modifiers` inline rather than through this utility
