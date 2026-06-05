# utility--json-ld

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--json-ld.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--json-ld.liquid` v1.0.0 (script-tag wrapper)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: none — leaf utility

**Consumers**:
- `snippets/utility--structured-data.liquid` — wraps each of the 4 schemas (Organization, WebSite, BreadcrumbList, Product / ProductGroup)
- Available for section- or block-scoped schemas (e.g. Article, FAQPage, Event) emitted inline by their files

## Purpose

Wraps a captured JSON-LD body in a `<script type="application/ld+json">` tag with content-safe minification. Strips newlines without collapsing whitespace inside string values — merchant-typed strings (titles, descriptions) retain their internal spaces while the surrounding indentation is removed. Returns nothing when the input is blank.

The content-safe minify is the design point. JSON-LD payloads carry merchant copy verbatim (titles, descriptions, slogans); collapsing whitespace inside string values would corrupt intentional multi-space sequences. This utility's contract — strip newlines + outer whitespace only — diverges from `utility--css-minifier`'s aggressive token collapse for exactly this reason.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `schema` | string | yes | — | The JSON-LD object/graph as a string, typically from a `{% capture %}`. Blank → no output. |

Output: `<script type="application/ld+json">{stripped schema}</script>` or nothing.

## Output shape

```liquid
{% capture faq %}
  {
    "@context": "https://schema.org",
    "@type": "FAQPage"
  }
{% endcapture %}
{% render 'utility--json-ld', schema: faq %}
```

Renders:

```html
<script type="application/ld+json">{ "@context": "https://schema.org", "@type": "FAQPage" }</script>
```

The output is one-line (newlines stripped) but inner-string whitespace is preserved.

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## Behavior

- **Blank `schema` → no output.** Early `break` defends against empty captures (no empty `<script>` tag emission).
- **`strip_newlines` + `strip`.** `strip_newlines` removes line breaks within the captured body; `strip` removes leading / trailing whitespace. The combination produces a single-line payload without touching interior multi-space sequences.
- **MIME type fixed.** Always `application/ld+json`. Crawlers and validators rely on the exact MIME type for JSON-LD recognition.
- **No JSON validation.** The utility trusts the caller — malformed JSON passes through and crawlers reject it. Construction-time validation lives at the caller (the schema-shape utility composing the capture).

## A11y

N/A — JSON-LD is consumed by crawlers, not visible content.

## Locale keys

N/A — JSON-LD payloads carry localized copy from the schema sources (product titles, article authors), not from locale files.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page rendering structured-data (i.e. every page, via `utility--structured-data`)
- **API surface**:
  - Non-blank schema → one `<script type="application/ld+json">` tag with the stripped payload
  - Blank schema → no output
  - Multi-line indented schema → newlines stripped, interior string whitespace preserved
- **Edge cases**:
  - Schema containing a JSON string with embedded newlines (rare; merchant copy with `\n`) → `strip_newlines` removes the literal newlines, corrupting the string value. Out of scope; merchant copy with embedded newlines should be JSON-escaped (`\\n`) at the schema-construction layer.
  - Schema containing leading / trailing spaces on the outermost braces → `strip` removes them; JSON is whitespace-insensitive between tokens
- **Visual showcase**: Google Rich Results Test against the deployed storefront; DevTools head view
- **Assertions** (prose; Playwright once installed): per-page JSON-LD blocks parse as valid JSON; required `@type` + `@id` fields are present per the consuming schema's contract
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Comment stripping + token collapse.** JSON-LD is valid JSON — no comments to strip. Token collapse (whitespace around `{`, `}`, `:`, `,`) would corrupt embedded string values. Output is moderately verbose by design.
- **Multi-schema bundling.** One schema per render. Composing a single `<script type="application/ld+json">` containing a JSON array of schemas (`@graph` shape) is the caller's responsibility — `utility--structured-data` emits one tag per schema instead.
- **Pretty-print.** Output is single-line. Pretty-printed JSON-LD (for human inspection) lives in the schema source, not the rendered output.
- **Schema validation.** The utility is a wrapper, not a validator. Crawlers + Google's Rich Results Test are the validation surface.
- **CSP-friendly emission.** Inline `<script>` blocks of `application/ld+json` are not subject to script-src CSP (per the spec — `application/ld+json` is a data type, not executable script). The utility emits inline; no per-CSP variant needed.

## Related

- `.context/specs/utility--structured-data.md` — primary consumer; wraps 4 schemas through this utility
- `.context/specs/utility--css-minifier.md` — sibling captured-content emitter; the divergent rules (content-safe vs aggressive token collapse) drive the split between the two
