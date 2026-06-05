# utility--media-sizing

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--media-sizing.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--media-sizing.liquid` v1.1.0 (mode-dispatch resolver)

**Reconciled**: 2026-06-05

**Reviewed**: pending

**Depends on**: `media_size` metaobject schema (consumes `.system.handle`, `.type.value`, `.value.value`)

**Consumers**:
- `snippets/media.liquid` — both `modifier` mode (seeds `sizing:<class>` token into `modifier_list`) and `vars` mode (emits ratio / height custom properties + mobile variants into captured dynamic style)
- `snippets/embed.liquid` — same two-mode usage; no `mobile_media_size` parameter (third-party iframe content does not carry a mobile override)

## Purpose

A two-mode resolver for the `media_size` metaobject — classifies an entry into the three sizing strategies (`fill` / `ratio` / `height`) and emits either the matching `sizing:<class>` modifier token or the matching CSS custom properties. The fill special-case and the mobile-override handling live in this one file so `media` and `embed` share one classification path; without the centralized resolver, the two consumers' inline branching drifted (embed silently fell back to 16/9 on `fill`-handle entries before v1.1.0 of `media.liquid`).

The two modes are deliberately one snippet — both consume the same `(handle, type, value)` triple and the same fill special-case; splitting into `utility--media-sizing-modifier` + `utility--media-sizing-vars` would duplicate the classification logic. The `output` param selects the emission shape; the classification is shared.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `media_size` | metaobject (`media_size`) | yes | — | Reads `.system.handle` (fill special-case routing), `.type.value` (`ratio` / `relative` / `fixed`), `.value.value` (emitted as the raw CSS value in `vars` mode) |
| `mobile_media_size` | metaobject (`media_size`) | no | — | Optional mobile override. Same shape. Consulted only in `vars` mode. |
| `output` | string | yes | — | `'modifier'` emits the `sizing:<class>` token; `'vars'` emits ratio / height custom properties. Blank → early exit. |

Early exit with `break` when `media_size` is blank or `output` is blank — produces empty output (caller's wrapping `{% capture %}` evaluates to empty, treated as no-op by downstream consumers).

### Mode: `modifier`

Emits a bare token (no leading comma, no trailing whitespace). Caller seeds it into its `modifier_list` array. One of:

- `sizing:fill` — when `media_size.system.handle == 'fill'` (handle-routed; bypasses `.type.value`)
- `sizing:ratio` — when `.type.value == 'ratio'`
- `sizing:height` — when `.type.value == 'relative'` or `.type.value == 'fixed'`

No `sizing:<class>` token emitted when `.type.value` falls outside the three known values (future-proofing — unknown type renders no modifier rather than a silently-broken token).

### Mode: `vars`

Emits a sequence of CSS declarations (terminated with `;`). Caller wraps in a `{% capture %}` and seeds into its `dynamic_style` content for `utility--dynamic-style` to scope. Possible outputs (concatenated when both `media_size` and `mobile_media_size` apply):

| Condition | Emission |
|---|---|
| `media_size.system.handle != 'fill'` AND `.type.value == 'ratio'` | `--media-ratio: <value>;` |
| `media_size.system.handle != 'fill'` AND `.type.value == 'relative' or 'fixed'` | `--media-height: <value>;` |
| `mobile_media_size != blank` AND `.system.handle != 'fill'` AND `.type.value == 'ratio'` | `--mobile-media-ratio: <value>;` |
| `mobile_media_size != blank` AND `.system.handle != 'fill'` AND `.type.value == 'relative' or 'fixed'` | `--mobile-media-height: <value>;` |

The `fill` handle skip in `vars` mode is structural: the CSS rule keyed off `sizing:fill` (in `snippets/media.liquid` and `snippets/embed.liquid`'s `{% stylesheet %}` blocks) handles fill sizing via `100svh` etc. — there's no ratio or height value to emit, the modifier carries the sizing intent.

## Output shape

```liquid
{% capture sizing_modifier %}
  {% render 'utility--media-sizing', media_size: media_size, output: 'modifier' %}
{% endcapture %}
{% assign modifier_list = modifier_list | append: ',' | append: sizing_modifier | strip %}

{% capture dynamic_style %}
  {% render 'utility--media-sizing',
    media_size: media_size,
    mobile_media_size: mobile_media_size,
    output: 'vars'
  %}
{% endcapture %}
```

`modifier` mode produces e.g. `sizing:ratio` — bare token. `vars` mode produces e.g. `--media-ratio: 16/9; --mobile-media-ratio: 4/3;` — declarations on the same line, terminated.

## CSS

N/A at this utility's layer — the utility emits values consumed by consumer-side CSS. The CSS rules keyed off `[data-modifiers*='sizing:fill']` / `[data-modifiers*='sizing:ratio']` / `[data-modifiers*='sizing:height']` live in `snippets/media.liquid` and `snippets/embed.liquid`'s `{% stylesheet %}` blocks (the variants render differently per block type — `media.liquid` uses CSS Grid layering, `embed.liquid` uses iframe-padding-bottom for ratio).

## CSS custom properties (exposed)

In `vars` mode, the utility emits — for the consumer to scope through `utility--dynamic-style`:

| Variable | Purpose | Source |
|---|---|---|
| `--media-ratio` | Aspect ratio for `ratio`-type entries (e.g. `16/9`) | `media_size.value.value` |
| `--media-height` | Block-size value for `relative` / `fixed`-type entries (e.g. `50vh`, `400px`) | `media_size.value.value` |
| `--mobile-media-ratio` | Same as `--media-ratio` but applied via mobile @media branch in consumer CSS | `mobile_media_size.value.value` |
| `--mobile-media-height` | Same as `--media-height` but applied via mobile @media branch | `mobile_media_size.value.value` |

Consumer-side: `media.liquid` and `embed.liquid` consume these variables in their `{% stylesheet %}` blocks via `aspect-ratio: var(--media-ratio)` or `block-size: var(--media-height)`, with `@media` rules switching to the mobile variants.

## Behavior

- **`output` param required.** Blank `output` triggers early `break` — no emission. Defends against caller drift (forgetting to pass `output`); v1.1.0 added this guard after the previous silent-fallthrough behavior left misuse undiagnosed.
- **`media_size` blank → empty output.** Caller's wrapping `{% capture %}` becomes empty; downstream consumers (modifier-list builder, dynamic-style capture) treat empty as no-op.
- **`fill` handle is the special-case.** `media_size.system.handle == 'fill'` triggers `sizing:fill` modifier and suppresses any custom-property emission in `vars` mode. Handle-routing makes `fill` load-bearing — renaming the seeded `fill` entry in the `media_size` metaobject catalog breaks both consumer surfaces.
- **`type.value` carries the ratio-vs-height classification.** For non-`fill` entries, `ratio` maps to ratio emission; `relative` and `fixed` both map to height emission. The two height-shape types differ semantically (relative units vs fixed units) but produce the same custom property — the `value.value` carries the unit-bearing CSS value verbatim.
- **`mobile_media_size` consulted only in `vars` mode.** Modifier mode does not branch on mobile — one `sizing:<class>` token applies to both breakpoints (the responsive switch happens via consumer-side `@media` rules reading `--mobile-media-*` variables). Branching modifiers per-breakpoint would multiply the modifier list; consolidating in `vars` keeps the modifier surface flat.
- **`value.value` interpolated verbatim.** The utility doesn't apply any unit transformation — `value.value` is the raw CSS value the merchant configured on the `media_size` entry (e.g. `16/9` for ratio, `50vh` for relative, `400px` for fixed). Per-value validation lives in the `media_size` metaobject's field-level Shopify-side validation.
- **Output mode dispatch is exclusive.** `output == 'modifier'` and `output == 'vars'` are the only two branches; any other value silently no-ops. Out-of-scope: a third mode emitting both at once — callers needing both call the utility twice.

## A11y

N/A — utility-snippet emitting modifier tokens and CSS values; no DOM, no rendered output.

## Locale keys

N/A — pure-logic utility, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: covered indirectly by `media` and `embed` block validation pages (`sections/validation--primitive--media.liquid`, `sections/validation--primitive--embed.liquid`). Each block's sizing matrix exercises the utility's emission for every `media_size` mode + the `mobile_media_size` override.
- **API surface** (matrix to exercise):
  - **Fill** — `media_size.system.handle == 'fill'`: modifier mode emits `sizing:fill`, vars mode emits nothing for `media_size` (still emits mobile variants if mobile is non-fill)
  - **Ratio** — `.type.value == 'ratio'`: modifier mode emits `sizing:ratio`, vars mode emits `--media-ratio: <value>;`
  - **Relative** — `.type.value == 'relative'`: modifier mode emits `sizing:height`, vars mode emits `--media-height: <value>;`
  - **Fixed** — `.type.value == 'fixed'`: same as relative (both map to height)
  - **Mobile override** — combinations of desktop + mobile entries; the mobile variants emit when mobile is non-fill
  - **Blank `media_size`** — no emission either mode
  - **Blank `output`** — no emission, no crash
- **Edge cases**:
  - Mobile override is `fill` while desktop is `ratio` — utility skips emitting mobile variants (the consumer-side CSS rule keyed off `sizing:fill` does not currently support per-breakpoint fill; out of scope)
  - `.type.value` is an unknown string — modifier mode emits no token (legitimate future-proofing for new types added to the metaobject schema)
  - `media_size.value.value` blank — utility emits the declaration verbatim with an empty value, producing `--media-ratio: ;` (caller's responsibility to validate via the metaobject's Shopify-side field constraints)
- **Visual showcase**: per consumer's validation matrix — DevTools confirms the `sizing:<class>` modifier on the block element + the `--media-*` custom properties on the scoped style block.
- **Assertions** (prose; Playwright once installed):
  - For each `media_size` mode, the rendered block carries the expected `sizing:<class>` modifier
  - For each non-fill mode, the scoped dynamic-style block carries the expected `--media-*` declaration with the expected value
  - When `mobile_media_size` differs from `media_size`, the scoped style block carries both desktop and mobile variants
- **Unit scope**: none (Liquid only).

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Third sizing classification.** The three classes (`fill` / `ratio` / `height`) cover the current `media_size` types. Adding a fourth (e.g. `intrinsic`, `aspect-fill`) requires both schema work on the `media_size` metaobject and matching consumer-side CSS rules — out of this utility's responsibility.
- **Per-breakpoint fill.** Mobile-side `fill` (e.g. desktop ratio, mobile full-viewport) currently no-ops; the consumer-side CSS does not support a per-breakpoint fill toggle. A future spec lands the `--mobile-sizing` modifier surface when the design need surfaces.
- **Unit validation.** The utility interpolates `value.value` verbatim. Type-level constraints (`ratio` must be a unitless fraction, `relative` must be a vh/vw/% value, `fixed` must be px) live in the `media_size` metaobject's Shopify-side field validation, not at this utility.
- **Value transformation.** No px → rem conversion, no unit normalization. The `media_size` metaobject's `value` field stores CSS-ready values per type; the utility passes them through. Consumers extending the utility's emission with their own transforms can do so in their `{% stylesheet %}` rules (via `calc()`).

## Related

- `.context/specs/media-size.md` — the `media_size` metaobject schema (modes, value field type-per-mode, seeded `fill` handle)
- `.context/specs/media.md` — primary consumer (block CSS keyed off `sizing:<class>`)
- `.context/specs/embed.md` — primary consumer (same modifier surface, different inner-content rules)
- `.context/specs/utility--dynamic-style.md` — the scoping wrapper consumers route the `vars`-mode output through
