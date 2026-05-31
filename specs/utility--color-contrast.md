# utility--color-contrast

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--color-contrast.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--color-contrast.liquid` v1.0.0 (render surface)

**Reconciled**: 2026-05-29

**Depends on**: Liquid built-in `color_contrast` filter

**Consumers**: `sections/validation--substrate--theme-color.liquid` — picks the legible foreground for the "on-self" swatch per `theme_color` entry

No production consumers yet; the only user today is the theme_color validation page. Future foreground-on-arbitrary-background contexts (sections sourcing a background hex from a `theme_color` setting and wanting auto-legible text) are the next likely consumers.

## Purpose

Two-choice contrast picker. Given a background `color` and two reference colors (defaulting to pure black and pure white), echoes whichever reference has the higher computed contrast against the background. Wraps Liquid's `color_contrast` filter to spare callers the ratio comparison; the wrapper's output is a bare color string suitable for interpolation into a CSS custom property declaration or inline `style`.

Niche use. Most theme components consume `--color-role-foreground`, which flips with the surrounding color scheme. This snippet is for cases where the surrounding scheme can't be relied on — typically because the background is sourced from a `theme_color` palette entry (whose hex is scheme-independent) rather than a scheme-role token.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `color` | string (any CSS color literal Liquid's `color_contrast` accepts) | yes | `#ffffff` | The background color the contrast is computed against. Hex (`#rrggbb`, `#rgb`), color keywords, and `rgb()` / `hsl()` literals all work. |
| `black` | string | no | `#000000` | First reference color compared against `color`. |
| `white` | string | no | `#ffffff` | Second reference color compared against `color`. |

Param names are historical and reflect the dominant use case. The snippet doesn't require `black` to be black or `white` to be white; any two colors form a valid comparison pair.

## Output shape

A bare color string echoed into the template at the render site. No HTML, no surrounding tags, no whitespace decoration beyond what the surrounding `{% render %}` tag formatting introduces. Callers wrap in `{% capture %}` to assign the result to a variable, then `| strip` and interpolate.

```liquid
{% capture fg %}{% render 'utility--color-contrast', color: theme_color.hex_code.value %}{% endcapture %}
{% assign fg = fg | strip %}
<element style="--contrast: {{ fg }};">…</element>
```

The `| strip` is a caller obligation — the captured value carries leading/trailing whitespace from the `{% render %}` tag's formatting, which breaks inline-style parsing in strict contexts.

The echoed value is **the chosen reference arg exactly as passed**. If the caller passes `#000` or `rgb(0,0,0)`, the output is that same literal — not a normalized canonical hex.

## CSS

N/A — utility emits no markup.

## CSS custom properties (exposed)

N/A — utility emits no markup.

## Behavior

- **Branch logic**: `black_contrast > white_contrast` → echo `black`; otherwise echo `white`. The comparison is strict-greater, so on exact tie `white` wins (the `else` branch). Ties are rare with non-pathological inputs (true 50% grey backgrounds).
- **Default chain**: each param resolves via `| default:` against its literal default. Calling `{% render 'utility--color-contrast' %}` with zero args returns `#ffffff` (white-on-white tie, `else` branch).
- **Input format tolerance**: any color literal accepted by Liquid's `color_contrast` filter passes through. The wrapper does no normalization.
- **No internal whitespace handling**: capture-and-strip is the caller's responsibility; documented in Output shape.
- **WCAG note**: the snippet selects the *higher-contrast* of two references, not "the one meeting WCAG AA". A returned value can still fail 4.5:1 (or 3:1 for large text) if neither reference is sufficient against the input. Pair with a known-accessible reference set when conformance matters, or compute the achieved ratio caller-side (`{{ color | color_contrast: fg }}`) and branch on it. A dedicated `utility--meets-contrast` is the long-term home if multiple consumers need this — see Out of scope.

## Locale keys

N/A — pure-logic utility, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page**: `sections/validation--utility-snippet--color-contrast.liquid` + `templates/index.validation--utility-snippet--color-contrast.json` *(planned — Tier 1b has zero pages live; this would be the first)*
- **API surface** (matrix of `{% render %}` calls):
  - **Defaults pair (`black=#000`, `white=#fff`)** against:
    - Light backgrounds: `#ffffff`, `#faf8f5`, `#fff8dc` → `#000000` expected
    - Dark backgrounds: `#000000`, `#1a1a1a`, `#0d47a1` → `#ffffff` expected
    - Mid-tone backgrounds: `#808080`, `#c2410c`, `#16a34a` → record the runtime's pick per row
  - **Custom reference pair**: `color=#ffffff`, `black=#222222`, `white=#dddddd` → `#222222` expected (closer-to-black wins on white)
  - **Tie case**: `color=#808080`, `black=#404040`, `white=#bfbfbf` → near-symmetric contrast; document which branch the runtime picks (expected `#bfbfbf` on strict-tie since `else` branch wins).
  - **All-blank invocation**: `{% render 'utility--color-contrast' %}` → `#ffffff` (defaults tie, `else` branch).
- **Edge cases**:
  - Single-letter shorthand input (`#fff` / `#000`) → output preserves the shorthand format.
  - Color keyword input (`black`, `white`) → output is the keyword string, not a hex.
  - `rgb()` / `hsl()` literal input → output is the literal as passed.
  - Caller omits `| strip` after capture → output carries whitespace; the page demonstrates the failure mode (a row with intentional broken inline-style interpolation).
- **Visual showcase**: a three-column table per row — (1) input `color` as a background swatch with the hex label, (2) the literal text the snippet echoed, (3) a combined swatch with input as background + output as foreground rendering "Aa" sample text at body size. Reader confirms legibility per row.
- **Assertions** (prose; Playwright once installed):
  - Each row's echoed text matches the expected reference for its input.
  - Each combined swatch's computed-style contrast ratio is ≥ the alternative reference's ratio (the picker chose the better option, even when neither passes WCAG).
  - Tie-case row resolves to `white` (the `else` branch).
- **Unit scope**: none. Liquid-filter wrapper; behavior is fully exercised by the visual harness.

## Out of scope

- **N-way picking** — the snippet hardcodes a two-choice comparison. "Which of these 5 brand colors reads best on this background" is a different utility.
- **WCAG threshold checking** — the snippet returns the *better* of two references, not a `true`/`false` against a 4.5:1 / 3:1 threshold. A future `utility--meets-contrast` (or named variant) could wrap `color_contrast` for boolean conformance checks. Not built; revisit when a consumer demands it.
- **Color manipulation** — no mixing, lightening, darkening, transforming. The snippet only picks between two literals the caller provided.
- **Catalog-aware selection** — the snippet doesn't iterate metaobjects or read settings. Callers extract the hex value and pass it in. A higher-level utility could combine `theme_color` lookup + contrast pick; out of scope for this surface.
- **CSS-native `color-contrast()`** — landed in CSS Color 6, broadly unsupported as of 2026-05. Revisit migration when baseline coverage is acceptable; the Liquid-side utility can stay as a Shopify-Liquid-runtime fallback indefinitely.
