# utility--color-contrast

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--color-contrast.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--color-contrast.liquid` v2.0.0 (render surface)

**Reconciled**: 2026-06-04 (v2.0.0 — params renamed for semantic clarity (`color` → `background`, `black` / `white` → `dark` / `light`); tie-breaking flipped from light-wins to dark-wins via `>=`)

**Reviewed**: 2026-06-04

**Depends on**: Liquid built-in `color_contrast` filter

**Consumers**: `sections/theme-color.liquid` (the `theme-color` page showcase) — picks the legible foreground for the "on-self" swatch per `theme_color` entry. No production consumers yet; future foreground-on-arbitrary-background contexts (sections sourcing a background hex from a `theme_color` setting and wanting auto-legible text) are the next likely consumers.

## Purpose

A two-choice contrast picker that echoes the higher-contrast of two reference colors against a `background` — explicitly "better-of-two", not WCAG-compliant: the returned reference may still fail AA when neither is sufficient. Wraps Liquid's `color_contrast` filter to spare callers the ratio comparison; output is a bare color string suitable for interpolation into a CSS custom property declaration or inline `style`.

Niche use. Most theme components consume `--color-role-foreground`, which flips with the surrounding color scheme. This snippet is for cases where the surrounding scheme can't be relied on — typically because the background is sourced from a `theme_color` palette entry (whose hex is scheme-independent) rather than a scheme-role token.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `background` | string (any CSS color literal Liquid's `color_contrast` accepts) | yes | `#ffffff` | The background color the contrast is computed against. Hex (`#rrggbb`, `#rgb`), color keywords, and `rgb()` / `hsl()` literals all work. |
| `dark` | string | no | `#000000` | Darker reference color compared against `background`. |
| `light` | string | no | `#ffffff` | Lighter reference color compared against `background`. |

The defaults (`#000000` / `#ffffff`) are the extreme pair; the snippet doesn't require `dark` to be black or `light` to be white. Any two colors form a valid comparison pair — the labels describe lightness intent, not enforced values.

## Output shape

A bare color string echoed into the template at the render site. No HTML, no surrounding tags, no whitespace decoration beyond what the surrounding `{% render %}` tag formatting introduces. Callers wrap in `{% capture %}` to assign the result to a variable, then `| strip` and interpolate.

```liquid
{% capture foreground %}{% render 'utility--color-contrast', background: theme_color.hex_code.value %}{% endcapture %}
{% assign foreground = foreground | strip %}
<element style="--contrast: {{ foreground }};">…</element>
```

The `| strip` is a caller obligation — the captured value carries leading/trailing whitespace from the `{% render %}` tag's formatting, which breaks inline-style parsing in strict contexts.

The echoed value is **the chosen reference arg exactly as passed**. If the caller passes `#000` or `rgb(0,0,0)`, the output is that same literal — not a normalized canonical hex.

## CSS

N/A — utility emits no markup.

## CSS custom properties (exposed)

N/A — utility emits no markup.

## Behavior

- **Branch logic**: `dark_contrast >= light_contrast` → echo `dark`; otherwise echo `light`. The comparison is greater-or-equal, so on exact tie `dark` wins — matches the canonical reading-direction (dark-on-light) and the browser default text color. Ties are rare with non-pathological inputs (true 50% grey backgrounds).
- **Default chain**: each param resolves via `| default:` against its literal default. Calling `{% render 'utility--color-contrast' %}` with zero args returns `#000000` (dark-on-white default — the tie-favors-dark branch on `background: #ffffff`, `dark: #000000`, `light: #ffffff`).
- **Input format tolerance**: any color literal accepted by Liquid's `color_contrast` filter passes through. The wrapper does no normalization.
- **No internal whitespace handling**: capture-and-strip is the caller's responsibility; documented in Output shape.
- **Picks better-of-two, not WCAG-compliant.** The returned reference may still fail AA against the input when neither is sufficient. See Out of scope for conformance patterns.

## Locale keys

N/A — pure-logic utility, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Source**: colocated `snippets/utility--color-contrast.validation.json` source (its `{% render %}` case matrix names a committed harness section, as with `image` / `video`) + `snippets/utility--color-contrast.test.js` — generate-and-drop through the `?view=validation` slot *(planned)*
- **API surface** (matrix of `{% render %}` calls):
  - **Defaults pair (`dark=#000`, `light=#fff`)** against:
    - Light backgrounds: `#ffffff`, `#faf8f5`, `#fff8dc` → `#000000` expected
    - Dark backgrounds: `#000000`, `#1a1a1a`, `#0d47a1` → `#ffffff` expected
    - Mid-tone backgrounds: `#808080`, `#c2410c`, `#16a34a` → record the runtime's pick per row
  - **Custom reference pair**: `background=#ffffff`, `dark=#222222`, `light=#dddddd` → `#222222` expected (closer-to-black wins on white)
  - **Tie case**: `background=#808080`, `dark=#404040`, `light=#bfbfbf` → near-symmetric contrast; expected `#404040` (the `>=` comparison favors `dark` on exact tie).
  - **All-blank invocation**: `{% render 'utility--color-contrast' %}` → `#000000` (defaults are `background=#ffffff`, `dark=#000000`, `light=#ffffff` — max contrast on dark, min on light, dark wins).
- **Edge cases**:
  - Single-letter shorthand input (`#fff` / `#000`) → output preserves the shorthand format.
  - Color keyword input (`black`, `white`) → output is the keyword string, not a hex.
  - `rgb()` / `hsl()` literal input → output is the literal as passed.
  - Caller omits `| strip` after capture → output carries whitespace; the page demonstrates the failure mode (a row with intentional broken inline-style interpolation).
- **Visual showcase**: a three-column table per row — (1) input `color` as a background swatch with the hex label, (2) the literal text the snippet echoed, (3) a combined swatch with input as background + output as foreground rendering "Aa" sample text at body size. Reader confirms legibility per row.
- **Assertions** (prose; Playwright once installed):
  - Each row's echoed text matches the expected reference for its input.
  - Each combined swatch's computed-style contrast ratio is ≥ the alternative reference's ratio (the picker chose the better option, even when neither passes WCAG).
  - Tie-case row resolves to `dark` (the `>=` branch favors dark on exact tie).
- **Unit scope**: none. Liquid-filter wrapper; behavior is fully exercised by the visual harness.

## Out of scope

- **N-way picking** — the snippet hardcodes a two-choice comparison. "Which of these 5 brand colors reads best on this background" is a different utility.
- **WCAG threshold checking** — the snippet returns the *better* of two references, not a `true`/`false` against a 4.5:1 / 3:1 threshold. For conformance, callers compute the achieved ratio with `{{ background | color_contrast: foreground }}` and branch on it, or pair with a known-accessible reference set. A future `utility--meets-contrast` could wrap `color_contrast` for boolean conformance checks; not built — revisit when a consumer demands it.
- **Color manipulation** — no mixing, lightening, darkening, transforming. The snippet only picks between two literals the caller provided.
- **Catalog-aware selection** — the snippet doesn't iterate metaobjects or read settings. Callers extract the hex value and pass it in. A higher-level utility could combine `theme_color` lookup + contrast pick; out of scope for this surface.
- **CSS-native `color-contrast()`** — the Liquid-side utility owns the contract; the CSS Color 6 native function isn't relied on. Migration becomes available once baseline browser coverage permits, but the Liquid utility can stay as a Shopify-Liquid-runtime emission path indefinitely.
