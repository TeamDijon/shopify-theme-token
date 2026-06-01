# utility--css-variables

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--css-variables.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--css-variables.liquid` v1.11.0 (CSS variable emitter)

**Reconciled**: 2026-05-31

**Reviewed**: 2026-05-31

**Depends on**:
- `theme_color` metaobject (`system.handle`, `hex_code.value`)
- `gradient` metaobject (`system.handle`, `angle.value`, `color_start.value`, `color_end.value`)
- `text_style` metaobject (many fields — see `.context/docs/design-system-metaobjects.md`)
- `typeface` metaobject (transitively via `text_style.font_family`)
- Theme settings: `color_schemes` (built-in), `base_text_style`, `mono_font`, `serif_font`, `sans_serif_font`, `mobile_gutter`, `desktop_gutter`

**Consumers**: `snippets/utility--core-assets.liquid` — captures this snippet's output alongside `utility--font-face` and routes the combined block through `utility--asset-loader` as inline CSS

## Purpose

The design-system CSS variable emitter. Translates the design-system metaobjects (`theme_color`, `gradient`, `text_style`) and theme settings (`color_schemes`, gutters, base text style) into CSS custom properties on `:root` and per-scheme rule blocks. The output is the substrate every L0 / L1 / section consumer reads from when sourcing color, typography, or spacing.

Five emission domains: theme palette (`--color-<handle>`), gradient catalog (`--gradient-<handle>`), color-scheme role tokens (`--color-role-*`), text-style typography (`--<handle>-font-*` + `--base-*` aliases), and gutter spacing (`--gutter`). The color-scheme role token system is the surface `theme-color.md` § Out of scope defers to — its contract lives here.

## API

No Liquid params. The snippet reads global `metaobjects.*` and `settings.*` directly and is invoked parameter-free:

```liquid
{% render 'utility--css-variables' %}
```

The dependency surface is enumerated in `Depends on` above. Callers wrap the render in `{% capture %}` to pipe the output through the asset loader (see `Consumers`).

## Output shape

Six emission blocks captured together and echoed once. Block order is fixed; the per-scheme block depends on theme colors / gradients being declared first so that scheme-targeting selectors don't override the `:root` palette.

### 1. Theme palette (`:root`)

```css
:root {
  --color-white: #ffffff;
  --color-off-white: #faf8f5;
  /* one line per theme_color entry — system.handle drives the variable name */
}
```

Definition contract is owned by `theme-color.md`; this spec covers only emission.

### 2. Gradients (`:root`)

```css
:root {
  --gradient-primary: linear-gradient(135deg, var(--color-role-foreground), var(--color-role-background));
  /* one line per non-reserved gradient entry; angle defaults to 135deg when blank */
}
```

Scheme-adaptive: stops reference per-scheme role tokens (`var(--color-role-<start>)`, `var(--color-role-<end>)`), so one declaration re-resolves under each scheme block. The `background` handle is reserved for the per-scheme background-gradient and skips emission here. Entries with blank `color_start` or `color_end` skip emission.

### 3. `::selection`

```css
::selection {
  background-color: rgba(var(--color-role-primary-rgb), 0.3);
  color: var(--color-role-foreground);
}
```

A single document-wide selection style; values track the active scheme via role tokens.

### 4. Color-scheme role tokens (per-scheme rule)

```css
:root,
[data-modifiers*="color-scheme:scheme-1"] {
  --color-role-background: <hex>;
  --gradient-background: <gradient or background-fallback>;
  --color-role-foreground: <hex>;
  /* ...full role-token set... */
}

[data-modifiers*="color-scheme:scheme-2"] { /* ... */ }
[data-modifiers*="color-scheme:scheme-3"] { /* ... */ }
```

**Selector union for the default scheme.** The first scheme also targets `:root`, so descendants of any unmodified ancestor read its tokens. Subsequent schemes target only the `[data-modifiers*='color-scheme:<id>']` form. A modifier-bearing element re-scopes its subtree without leaking onto unmodified siblings.

Each scheme block emits variables in four groups:

**Direct color settings** (literal values from `scheme.settings.*`):
- `--color-role-background`, `--color-role-foreground`, `--color-role-foreground-heading`, `--color-role-primary`, `--color-role-border`, `--color-role-shadow`
- `--gradient-background` — the scheme's `background_gradient` setting if set; falls through to `--color-role-background` value as a plain color
- Button sub-roles: `--color-role-{primary,secondary}-button-{background,text,border}`
- Input sub-roles: `--color-role-input-{background,text,border}`

**Brightness-derived opacity scales** — branch on `scheme.settings.background | color_brightness`:

| Background | Threshold | `--opacity-subtle` | `--opacity-muted` | `--opacity-border-soft` |
|---|---|---|---|---|
| Dark | `< 64` | 0.15 | 0.60 | 0.25 |
| Light | `≥ 64` | 0.05 | 0.40 | 0.10 |

Dark schemes need stronger overlays to register against deep grounds.

**Hover variants** — computed via `color-mix(in oklab, …)`:
- `--color-role-primary-button-{background,border}-hover` — shift toward `black` 12%
- `--color-role-primary-button-text-hover` — unchanged (passes through original text color)
- `--color-role-secondary-button-background-hover` — shift toward `var(--color-role-foreground)` 8%
- `--color-role-secondary-button-border-hover` — shift toward `black` 12%
- `--color-role-input-background-hover` — shift toward `var(--color-role-foreground)` 4%
- `--color-role-input-border-hover` — shift toward `var(--color-role-foreground)` 20%

**Derived translucent tokens** — composed via `rgb(from var(--color-role-X) r g b / <alpha>)` relative-color syntax:
- `--color-role-foreground-muted` = `rgb(from var(--color-role-foreground) r g b / var(--opacity-muted))`
- `--color-role-placeholder` = `rgb(from var(--color-role-input-text) r g b / 0.5)`
- `--color-role-disabled-{background,text,border}` — opacity-scaled foreground
- `--color-role-focus-ring` = `var(--color-role-primary)` (alias, opaque)
- `--color-role-backdrop` = `rgb(from var(--color-role-shadow) r g b / 0.5)`
- `--shadow-{sm,md,lg}` — three preset shadows composing shadow color at increasing alpha depth via `rgb(from)`

`color-mix(in oklab, …)` covers color *mixing* (hover state shifts toward another color); `rgb(from … r g b / α)` covers *transparency* (compose translucent from an opaque token). Two intents, two syntaxes, semantically distinct at a glance.

### 5. Text styles (mixed `:root` + tag/attribute selectors)

Each `text_style` metaobject emits a per-style block:

```css
:root {
  --<handle>-font-family: <family-chain>;
  --<handle>-font-style: <style>;
  --<handle>-font-size: <mobile-size>rem;
  --<handle>-line-height: <decimal>;
  --<handle>-font-weight: <weight>;
  --<handle>-letter-spacing: <rem>;
  --<handle>-text-transform: <transform>;
  --<handle>-text-decoration: <decoration>;

  /* When the style matches settings.base_text_style: */
  --base-font-family: var(--<handle>-font-family);
  --base-font-style: var(--<handle>-font-style);
  --base-font-size: var(--<handle>-font-size);
  --base-line-height: var(--<handle>-line-height);
  --base-font-weight: var(--<handle>-font-weight);
  --base-letter-spacing: var(--<handle>-letter-spacing);
  --base-text-transform: var(--<handle>-text-transform);
  --base-text-decoration: var(--<handle>-text-decoration);

  /* Only when mobile_font_size != desktop_font_size: */
  @media (width >= 48rem) {
    --<handle>-font-size: <desktop-size>rem;
  }
}

h1, /* one of h1..h6, only when handle matches a heading tag */
[data-modifiers*='text-style:<handle>'] {
  font-family: var(--<handle>-font-family);
  font-style: var(--<handle>-font-style);
  font-size: var(--<handle>-font-size);
  line-height: var(--<handle>-line-height);
  font-weight: var(--<handle>-font-weight);
  letter-spacing: var(--<handle>-letter-spacing);
  text-transform: var(--<handle>-text-transform);
  text-decoration: var(--<handle>-text-decoration);
}
```

Selector auto-bind: text_style handles `h1`–`h6` get the corresponding tag selector appended (so `<h1>` reads its style without any attribute). Every handle also matches `[data-modifiers*='text-style:<handle>']` — the unified modifier surface used by primitives like `title` to pick a non-default style.

### 6. Gutter spacing (`:root`)

```css
:root {
  --mobile-gutter: <rem>;
  --desktop-gutter: <rem>;
  --gutter: var(--mobile-gutter);

  @media (width >= 48rem) {
    --gutter: var(--desktop-gutter);  /* only when mobile != desktop */
  }
}
```

`--gutter` is the responsive alias every layout consumer reads; the explicit `--mobile-gutter` / `--desktop-gutter` are available for callers that need the breakpoint values directly. Source is `settings.mobile_gutter` / `settings.desktop_gutter` (pixel values converted to rem at the 16px divisor).

## CSS

N/A — utility emits CSS as captured text, not as a per-element stylesheet attached to any markup.

## CSS custom properties (exposed)

| Group | Variables | Source |
|---|---|---|
| Theme palette | `--color-<handle>` (one per entry) | `theme_color.hex_code.value` |
| Gradients | `--gradient-<handle>` (one per non-reserved entry) | `gradient` metaobject; scheme-adaptive via role-token interpolation |
| Scheme background | `--color-role-background`, `--gradient-background` | `scheme.settings.background` (+ optional `background_gradient`) |
| Scheme foreground | `--color-role-foreground`, `--color-role-foreground-heading`, `--color-role-foreground-muted` (derived) | `scheme.settings` + opacity scale |
| Scheme primary | `--color-role-primary`, `--color-role-focus-ring` (alias) | `scheme.settings.primary` |
| Scheme border / shadow | `--color-role-border`, `--color-role-shadow`, `--color-role-backdrop` (derived) | `scheme.settings` + 0.5 alpha via `rgb(from)` |
| Button roles | `--color-role-{primary,secondary}-button-{background,text,border}` + `-hover` companions | `scheme.settings` + `color-mix` |
| Input roles | `--color-role-input-{background,text,border}` + `-hover`; `--color-role-placeholder` (derived) | `scheme.settings` + `rgb(from)` derivation |
| Disabled states | `--color-role-disabled-{background,text,border}` | foreground × opacity scales via `rgb(from)` |
| Opacity scales | `--opacity-subtle`, `--opacity-muted`, `--opacity-border-soft` | brightness-conditional |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | shadow color × alpha depth via `rgb(from)` |
| Text styles | `--<handle>-font-family`, `-font-style`, `-font-size`, `-line-height`, `-font-weight`, `-letter-spacing`, `-text-transform`, `-text-decoration` (×8 per style) | `text_style` metaobject |
| Base aliases | `--base-font-family`, `-font-style`, `-font-size`, `-line-height`, `-font-weight`, `-letter-spacing`, `-text-transform`, `-text-decoration` | text_style matching `settings.base_text_style` |
| Gutter | `--mobile-gutter`, `--desktop-gutter`, `--gutter` | `settings.{mobile,desktop}_gutter` |

## Behavior

- **Scheme selector union for the default scheme.** The first scheme targets both `:root` and its modifier selector; the document inherits its tokens by default. A modifier-bearing element re-scopes its subtree without leaking to siblings. No descendant catch-all like `.shopify-section:has([data-modifiers*='color-scheme:…'])` — that pattern would re-emit scheme tokens on the section whenever any nested element carried an override, clobbering the outer scheme's tokens across the entire section.
- **Brightness-derived opacity threshold at 64/255.** `scheme.settings.background | color_brightness < 64` selects the dark-scheme opacity scale (wider — 0.15 / 0.60 / 0.25); above the threshold uses the light-scheme scale (tighter — 0.05 / 0.40 / 0.10). The threshold separates near-black grounds from mid/light tones where subtle overlays disappear unless boosted.
- **Hover variants computed via `color-mix(in oklab, …)`.** Perceptual color space. Mixes are toward `black` for primary buttons (12% — uniform darkening), toward `var(--color-role-foreground)` for secondary buttons (8%) and input fields (4% background / 20% border) so hover state reads against the surrounding ground.
- **Gradient stops reference role tokens, not hex.** A `gradient` metaobject's `color_start` / `color_end` are role-token handles (e.g., `foreground`, `primary`). The emitted `--gradient-<handle>` interpolates `var(--color-role-<start>)` / `var(--color-role-<end>)`, so the same gradient declaration re-resolves under each scheme — one definition, scheme-adaptive output.
- **Reserved gradient handle: `background`.** The `background` handle is skipped in the top-level gradient loop; the per-scheme block emits `--gradient-background` from `scheme.settings.background_gradient` (with a fall-through to the flat background color when no gradient is set on the scheme).
- **Incomplete gradient entries skip emission.** A gradient metaobject with blank `color_start` or `color_end` produces no `--gradient-<handle>` line. The runtime tolerates partial entries by skipping rather than emitting a malformed `linear-gradient(…, var(--color-role-), …)` declaration.
- **`--base-*` aliases gate on `text_style == settings.base_text_style`.** Exactly one text_style emits the alias set (the one referenced by the project's `base_text_style` setting). Consumers reading `var(--base-font-family)` resolve to the project default body typography; the body rule in `layer-theme.css` is the canonical consumer.
- **`h1`–`h6` auto-bind.** A text_style whose handle equals one of `h1`, `h2`, …, `h6` adds the matching tag selector to its rule block — `<h1>` reads its style without any attribute. Handles outside the heading set (`hero-display`, `caption`, …) require `[data-modifiers*='text-style:<handle>']` to apply.
- **Transparency via `rgb(from var(--*) r g b / α)`.** Derived translucent tokens (foreground-muted, placeholder, disabled-*, backdrop, shadows) compose alpha from an opaque source color via relative-color syntax. Drop-in replacement for the legacy `rgba(var(--*-rgb), α)` pattern (removed in v1.11.0) — preserves Token's fractional `--opacity-*` alpha format without separate channel storage. `color-mix(in oklab, …)` is reserved for color *mixing* (hover state shifts); `rgb(from)` handles *transparency*. Two intents, two syntaxes — distinguishable at a glance.
- **Responsive font-size collapse.** When a text_style's mobile and desktop font sizes match, no `@media (width >= 48rem)` override is emitted — the rem value is single-source. When they differ, the override emits. Same pattern applies to `--gutter` (mobile vs desktop gutter).
- **font-size auto-fill on zero.** When both `mobile_font_size` and `desktop_font_size` are 0 → both fall through to 1rem. When one is 0, the other backfills (a single-breakpoint declaration becomes both breakpoints).
- **`line_height` zero fallback.** Blank line_height (resolves to 0) falls through to 1.5.
- **font-family fallback chain.** Per-style font-family resolves through three layers: the style's `font_family.value.name.value`, then the `default_font_family` (from `settings.base_text_style.font_family.value.name.value` with terminal fallback `system-ui`), then a `fallback_family` selected by `text_style.font_fallback_family.value` (`mono` / `serif` / `sans` → maps to `settings.{mono,serif,sans_serif}_font.{family, fallback_families}`). The chain emits as a CSS `font-family: <primary>, <fallback-family>, <fallback-families-list>;` declaration.

## Locale keys

N/A — pure CSS emitter, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: `sections/validation--utility-snippet--css-variables.liquid` + `templates/index.validation--utility-snippet--css-variables.json` *(planned — Tier 1b currently has zero pages live)*. The existing `validation--substrate--theme-color` page covers a subset (the `--color-<handle>` emission); a future page or sister-pages exercise the per-scheme switching + text-style + gutter outputs.
- **API surface** (the matrix to exercise):
  - **Scheme isolation**: a section with three child blocks, each carrying `color-scheme:scheme-N` modifier. Reader confirms each block renders with its scheme's role tokens; the outer ancestor stays in scheme-1 (no descendant catch-all leak).
  - **Text-style selector binding**: each `text_style` entry shown via tag binding (when `h1`–`h6`) and `[data-modifiers*='text-style:<handle>']`. Reader confirms identical typography across both selector surfaces.
  - **Base alias resolution**: an element styled via `--base-*` aliases. Reader confirms the computed values match the text_style referenced by `settings.base_text_style`.
  - **Gradient under each scheme**: every non-reserved gradient entry rendered as a swatch under each scheme. Reader confirms color stops re-resolve per scheme (same declaration, different appearance).
  - **Gutter responsive switch**: a guide element with `inline-size: var(--gutter)` shown at narrow and wide viewports.
- **Edge cases**:
  - text_style with mobile == desktop font-size → no `@media` override emitted (DevTools inspection)
  - text_style with both font-sizes blank → both fall through to 1rem
  - text_style with line_height blank → falls through to 1.5
  - gradient with reserved `background` handle → no `--gradient-background` line in the top-level `:root` block; appears only in per-scheme blocks
  - gradient with blank `color_start` or `color_end` → entry produces no emission
  - dark scheme (`background | color_brightness < 64`) → wider opacity scales; subtle / muted overlays read stronger
- **Visual showcase**: a single section with three scheme-override children (scheme-1 inherited, scheme-2 + scheme-3 overridden). Inside each, the full role-token palette as labeled swatches (background, foreground, foreground-heading, primary, border, shadow, button preview, input preview). A separate row catalogs every text_style by handle, showing tag binding vs attribute binding side-by-side. A third row catalogs gradients per scheme. A fourth row demonstrates the gutter at narrow and wide viewports.
- **Assertions** (prose; Playwright once installed):
  - Computed `--color-role-background` on `[data-modifiers*='color-scheme:scheme-2']` equals the scheme-2 background hex; on the outer ancestor it equals scheme-1's background.
  - Computed `font-family` on `<h1>` equals the h1 text_style's resolved family chain.
  - Computed `font-size` on the base-style element matches `--base-font-size`.
  - Computed `--gradient-primary` resolves to a `linear-gradient(...)` whose color stops carry the active scheme's foreground/background hex values.
- **Unit scope**: none — Liquid emitter; behavior is fully exercised by the rendered CSS in `<head>` plus the visual harness.

## Out of scope

- **`theme_color` definition contract** — covered by `theme-color.md`. This spec covers only emission of `--color-<handle>` lines from those entries.
- **`gradient` metaobject definition** — belongs in a future `gradient.md` substrate spec. Field schema, seed entries, and consumer patterns live there; this spec covers only the `--gradient-<handle>` emission shape and skip rules.
- **`text_style` metaobject definition** — belongs in a future `text-style.md` substrate spec. Field schema, the `h1`–`h6` handle convention, base-text-style settings binding, and per-style sizing semantics live there; this spec covers only how those entries translate into CSS variables + selectors.
- **`typeface` / `font` metaobject definitions** — covered by `metaobject-definitions.md`; this snippet reads font-family transitively via `text_style.font_family`, but the typeface / font schemas themselves are out of this spec's surface.
- **`<meta name="theme-color">` head tag** — covered by `utility--meta-theme-color.liquid` (its own snippet). Both consume `theme_color` entries; this spec emits to `:root`, that snippet emits to `<head>`.
- **Asset pipeline / inline-CSS routing** — captured by `utility--core-assets`, piped through `utility--asset-loader`. This spec describes the snippet's output text; loader routing is out of scope.
- **Per-block dynamic styles** — handled by `utility--dynamic-style`. This spec emits *theme-level* variables that consumers inherit; per-instance overrides live in a separate per-block asset.

## Related

- `theme-color.md` — `theme_color` metaobject contract; consumer of the `--color-<handle>` emission. Its Out of scope explicitly defers the color-scheme role token system to this spec.
- `utility--color-contrast.md` — sibling substrate utility; complementary picker for foreground-on-arbitrary-background cases where the surrounding scheme can't be relied on.
- `.context/docs/metaobject-definitions.md` — definitions for `theme_color`, `gradient`, `text_style`, `typeface`, `font`. The setup contract for every metaobject this snippet reads.
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (referencing, fallback chains, override scopes).
- `.context/docs/asset-loading.md` — inline-CSS routing through `utility--core-assets` and `utility--asset-loader`.
