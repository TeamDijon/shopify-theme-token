# utility--dynamic-style

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--dynamic-style.liquid` + `snippets/utility--base-selector.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/utility--dynamic-style.liquid` v1.1.0 (CSS-scoping emitter — wraps captured CSS in `#<base_selector> { ... }` and routes through `utility--asset-loader` as inline CSS)
- `snippets/utility--base-selector.liquid` v1.0.0 (id-string generator — produces a unique DOM id per render context: section, block, or static identifier within a section)

**Reconciled**: 2026-06-04

**Reviewed**: pending

**Depends on**:
- `snippets/utility--asset-loader.liquid` (downstream — receives the scoped CSS as inline content)
- `snippets/utility--css-minifier.liquid` (transitively via asset-loader — minifies the scoped output before inlining)

**Consumers**:
- Every L1 block snippet (9 shipped: `button`, `columns`, `embed`, `group`, `media`, `richtext`, `separator`, `spacer`, `title`) — capture per-instance CSS into a `dynamic_style` variable, then render `utility--dynamic-style` with the block's `base_selector` (computed via `utility--base-selector`)
- `sections/section.liquid` — same pattern at the section layer, scoped to `'shopify-section-' | append: section.id`
- `snippets/utility--block-layout-vars.liquid` — emits raw declarations that callers route through this utility's scoping wrapper

## Purpose

A paired utility for per-instance CSS scoping: `utility--base-selector` computes the unique DOM id, `utility--dynamic-style` wraps captured CSS declarations in `#<id> { ... }` and emits the result through the inline-CSS asset pipeline. The pair is the canonical mechanism for "this block / section needs CSS values derived from its settings, scoped to its instance only" — the alternative (inline `style="..."` attributes) loses cascade-aware fallbacks, can't carry custom properties readable by descendants, and can't be minified.

The paired design reflects two distinct concerns: id-generation (deterministic, branch-on-context) lives in `base-selector`; the scoping wrapper + asset-pipeline integration lives in `dynamic-style`. Most callers use both — render `base-selector` once to compute the id, capture their declarations, then render `dynamic-style` with the id + captured content.

## API

### `utility--base-selector`

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes | — | The section object. Always required; section context is the outer scope every id derives from. |
| `block` | block | no | — | The block object. When present, the id is `'shopify-block-' \| append: block.id`. Takes precedence over `identifier`. |
| `identifier` | string | no | — | Static identifier for components rendered inside a section but without a block (e.g., section-level chrome). The id is `'shopify-section-' \| append: section.id \| append: '__block-' \| append: identifier`. |

Returns the id string via `echo`. Callers capture via `{% capture base_selector %}{% render … %}{% endcapture %}` then `| strip` before use.

Branch precedence: `block` → `identifier` → section-only fallback (`'shopify-section-' | append: section.id`).

### `utility--dynamic-style`

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `base_selector` | string | yes | — | The unique DOM id to scope the CSS against. Typically computed by `utility--base-selector`. |
| `css_content` | string | yes | — | The raw CSS declarations to inject inside `#<base_selector> { ... }`. Captured by the caller via `{% capture %}`. |

Renders nothing when either arg is blank — early-exit via `break` (the caller's wrapping `{% capture %}` produces an empty string, which subsequent consumers can treat as "no styling needed").

## Output shape

```liquid
{% liquid
  capture base_selector
    render 'utility--base-selector', section: section, block: block
  endcapture
  assign base_selector = base_selector | strip
%}

{% capture dynamic_style %}
  {% if content_width != blank %}
    --content-width: {{ content_width.width.value | divided_by: 16.0 | round: 3 }}rem;
  {% endif %}
  {% if mobile_margin_block_start > 0 %}
    --mobile-margin-block-start: {{ mobile_margin_block_start | divided_by: 16.0 | round: 3 }}rem;
  {% endif %}
{% endcapture %}

{% render 'utility--dynamic-style', base_selector: base_selector, css_content: dynamic_style %}
```

The rendered HTML (after `utility--asset-loader` injects + `utility--css-minifier` runs):

```html
<style>#shopify-block-abc123 { --content-width: 42.5rem; --mobile-margin-block-start: 1.5rem; }</style>
```

One `<style>` block per call site, scoped to the unique id.

## CSS

N/A at the utility-snippet layer — the snippet's effect is the scoped `<style>` block injected into the document via the asset pipeline.

## CSS custom properties (exposed)

N/A — this utility scopes whatever properties the caller's captured content emits. The properties themselves are owned by their emitting utility (e.g., `utility--block-layout-vars` owns `--content-width` / `--mobile-margin-block-start` / `--desktop-margin-block-start`).

## Behavior

- **Pair-by-convention, separate-by-concern.** `base-selector` and `dynamic-style` are designed to be used together but are separate files. Callers can use `base-selector` alone (e.g., to compute an id for a `data-base-selector` attribute) or `dynamic-style` alone (e.g., when the id is computed elsewhere). The split keeps each utility's concern minimal.
- **Skip-on-blank-content.** `utility--dynamic-style` early-exits when `css_content` is blank — no `<style>` block emitted. Pairs with the consumer-side `{% if value %}…{% endif %}` guards that skip individual declarations when their inputs are blank; the wrapping capture naturally evaluates to empty when every declaration skips, triggering the early-exit. See `dynamic-style-pattern.md` § Skip-on-default + var-fallback cascade for the multi-layer pattern this enables.
- **Skip-on-blank-selector.** Same early-exit when `base_selector` is blank — no `<style>` block emitted. Defensive against caller misuse (forgetting to compute the id).
- **One `<style>` block per call site.** The utility doesn't bundle multiple call sites into one block — each render emits its own scoped block. Bundling would require a centralized capture surface, which doesn't generalize across block + section layers.
- **`base-selector` branch precedence is deterministic.** `block` > `identifier` > section-only. The branch is exclusive — passing both `block` and `identifier` resolves to `block` (the `identifier` path is silently ignored). Documented at the snippet's @example; callers should pass one or the other.
- **Section-only fallback for section-level rendering.** When a section emits its own dynamic style (not block-level), the call is `render 'utility--base-selector', section: section` with no `block` and no `identifier` — produces `shopify-section-<section.id>`. This is the path `section.liquid` uses for its own dynamic style.
- **`identifier` path for section-rendered components.** When a snippet is rendered directly from a section (not from a block) but needs its own scoped style — e.g., a section-chrome helper — pass `identifier: 'custom-id'` to produce `shopify-section-<section.id>__block-<identifier>`. The double underscore separates the section context from the identifier scope.
- **Captured-id requires `| strip`.** `utility--base-selector` echoes its output; the surrounding `{% capture %}` tag introduces whitespace. Callers strip the captured string before interpolating into HTML attributes or render args. Documented in `dynamic-style-pattern.md` § The flow.
- **Downstream minification renders Liquid whitespace moot.** The captured CSS content's formatting (Liquid newlines, indentation) flows through `utility--css-minifier` via `utility--asset-loader (css: 'inline')`. Callers don't need to hand-format the CSS for size — minification handles it.

## A11y

N/A — utility-snippet emitting CSS scope wrappers; no DOM, no rendered output, no a11y surface.

## Locale keys

N/A — pure-logic utility, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: covered indirectly by every L1 block's primitive validation page + every section's validation page. The utility's behavior is observable through the rendered `<style>` blocks in `<head>`.
- **API surface** (matrix to exercise per consumer):
  - **Block-level emission**: a block with at least one dynamic CSS value (e.g., `content_width`) → rendered DOM has `<style>#shopify-block-<id> { … }` in head, with the expected declarations
  - **Section-level emission**: a section with its own dynamic style → `<style>#shopify-section-<id> { … }` in head
  - **`identifier`-scoped emission**: a section-rendered component with an explicit identifier → `<style>#shopify-section-<id>__block-<identifier> { … }`
  - **Blank-content skip**: a block with all dynamic settings blank → no `<style>` block emitted for the block
  - **Blank-selector skip**: invocation without `base_selector` → no `<style>` block emitted (defensive)
- **Edge cases**:
  - Both `block` and `identifier` passed to `base-selector` → `block` wins; `identifier` silently ignored
  - Section context missing → Liquid error (undefined `section.id`); not defended at runtime
  - Captured `css_content` carrying only whitespace → treated as blank by the early-exit (Liquid `blank` check)
- **Visual showcase**: per consumer's validation page — DevTools shows the scoped `<style>` block for each instance. Inspecting an instance's computed `--<property>` values resolves through the scoped block.
- **Assertions** (prose; Playwright once installed):
  - Each rendered block carries a scoped `<style>` block with the block's id as the selector
  - When all dynamic inputs are blank, no `<style>` block appears for that block
  - The `<style>` block's content is minified (single line, no inter-declaration whitespace)
- **Unit scope**: none (Liquid + CSS).

## Implementation-time decisions

- **One-file scoping vs caller-side scoping.** Both utilities are one-shot wrappers — the alternative was inlining the `#<id> { … }` boilerplate at every caller. The utility's value is the centralized scoping convention + skip-on-blank semantics + asset-pipeline integration; the cost is a render call per instance. Net: utility wins because it standardizes the call shape across 9+ consumers.
- **Paired vs merged file.** The two utilities live in separate files because `base-selector` has independent use cases (id-only computation for `data-base-selector` attributes, JS-side `getElementById` lookups). Merging would force every `base-selector` consumer to import the heavier `dynamic-style` machinery. The pair is the convention; either-alone is supported.

## Out of scope

- **Multi-instance bundling.** Each call emits one `<style>` block. A theme-wide "collect all dynamic styles into one head block" pattern would require a centralized capture surface that doesn't generalize across the block + section render order.
- **`<style>` deduplication.** Two blocks with identical computed CSS still emit two separate `<style>` blocks (different ids). Deduplication would require content-hashing + cross-block coordination; the runtime cost outweighs the saved bytes for typical themes.
- **Validation of captured CSS syntax.** The utility trusts the caller — invalid CSS declarations pass through and the browser silently drops them. Schema validation at the setting layer is the upstream defense.
- **Per-call minification policy.** Every inline CSS path through `utility--asset-loader (css: 'inline')` runs through the minifier. Per-call opt-out isn't surfaced; the convention is uniform.
- **`identifier` path for block-rendered components.** When a snippet is rendered from a block, the `block` arg is the correct path. The `identifier` arg exists for section-rendered components only.

## Related

- `.context/docs/dynamic-style-pattern.md` — pattern doc covering the full per-instance CSS flow, the skip-on-default + var-fallback cascade, and the per-iteration custom-property variant
- `.context/specs/utility--block-layout-vars.md` — the canonical L1-block consumer; emits the three shared per-instance vars (`--content-width`, `--mobile-margin-block-start`, `--desktop-margin-block-start`) through this utility's scoping wrapper
- `.context/docs/asset-loading.md` — inline-CSS routing through `utility--asset-loader` (the downstream this utility feeds)
- `.context/specs/section.md` (planned) — section-layer consumer; emits `--content-width` + `--block-rhythm` per-section via this utility
