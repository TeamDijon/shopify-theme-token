# color-scheme

**Layer**: substrate

**Type**: utility-css

**Status**: shipped

**Implementation**: `snippets/utility--css-variables.liquid` v1.14.1 — per-scheme rule block, scoped across `:root, [data-modifiers*="color-scheme:scheme-1"]` (default scheme + opt-in selector) and `[data-modifiers*="color-scheme:scheme-N"]` (per-scheme selectors). Substrate stylesheet pinned by description per `spec-convention.md` § Substrate stylesheets — the structural anchor is the per-scheme rule's selector chain + the four-group emission shape (direct color settings + brightness-derived opacity + hover variants + derived translucent tokens).

**Reconciled**: 2026-06-04

**Reviewed**: 2026-06-04

**Depends on**:
- Shopify theme settings `color_schemes` — built-in `color_scheme_group` setting populating per-scheme background / foreground / primary / border / shadow + button sub-roles + input sub-roles + optional `background_gradient`
- `design-constants.md` — `--duration-*`, `--ease-*` (for body transitions consuming these tokens), `--radius-*` (consumers compose with role tokens for variant CSS)

**Consumers**:
- `assets/layer-theme.css` — `body` reads `--gradient-background` + `--color-role-foreground` + heading + input states; container-style variants read `--color-role-background`, `--color-role-foreground`
- `snippets/button.liquid` — `{% stylesheet %}` consumes `--color-role-{primary,secondary}-button-{background,text,border}` + `-hover` companions for the button-style variants
- Every block / section with scheme-aware styling — reads `--color-role-foreground`, `--color-role-background`, `--color-role-primary`, `--color-role-border`, `--color-role-shadow` as the canonical surface
- `theme_color` metaobject specs and consumers — explicitly defer the role-token system to this spec; the `--color-<handle>` namespace is deliberately disjoint

## Purpose

**Role-keyed tokens decouple consumers from the active scheme.** Every L0 / L1 / section block reads from `--color-role-*` tokens; the per-scheme rule block populates them with scheme-specific values. A modifier-bearing element (`data-modifiers="color-scheme:scheme-2"`) re-scopes its subtree to the picked scheme's tokens without leaking to siblings; descendants read the tokens transparently. Block CSS reads `var(--color-role-primary)` once; the same declaration resolves to scheme-1's primary in the default subtree, scheme-2's primary inside a scheme-2-modified subtree. No conditional Liquid, no per-scheme overrides at the block level — the substrate carries the scheme dispatch via cascade scoping.

The namespace is **deliberately disjoint** from `theme_color`'s `--color-<handle>` namespace (per `theme-color.md`). A `theme_color` entry whose handle happens to be `background` emits `--color-background` and does not interact with `--color-role-background` — the role-token system is per-scheme assignment; the palette is scheme-independent.

## API

N/A — pure CSS namespace; no Liquid params or render interface. Consumers read by CSS variable name as documented in CSS custom properties (exposed).

## Output shape

Per-scheme rule blocks, emitted in order: scheme-1 unioned with `:root` (so the document inherits its tokens by default), scheme-2 + scheme-3 (and any additional scheme the merchant enables) each targeting their own modifier selector.

```css
:root,
[data-modifiers*="color-scheme:scheme-1"] {
  /* --- 1. Direct color settings (literal values from scheme.settings.*) --- */
  --color-role-background: #ffffff;
  --gradient-background: linear-gradient(...);  /* or fallback to the scheme's background hex literal (numerically identical to --color-role-background) when scheme.background_gradient is unset */
  --color-role-foreground: #1a1a1a;
  --color-role-foreground-heading: #000000;
  --color-role-primary: #c2410c;
  --color-role-border: #e0e0e0;
  --color-role-shadow: #000000;
  --color-role-primary-button-background: #c2410c;
  --color-role-primary-button-text: #ffffff;
  --color-role-primary-button-border: #c2410c;
  --color-role-secondary-button-background: #1a1a1a;
  --color-role-secondary-button-text: #ffffff;
  --color-role-secondary-button-border: #1a1a1a;
  --color-role-input-background: #ffffff;
  --color-role-input-text: #1a1a1a;
  --color-role-input-border: #e0e0e0;

  /* --- 2. Brightness-derived opacity scales (branch on scheme.background | color_brightness) --- */
  --opacity-subtle: 0.05;
  --opacity-muted: 0.40;
  --opacity-border-soft: 0.10;

  /* --- 3. Hover variants via color-mix(in oklab, ...) --- */
  --color-role-primary-button-background-hover: color-mix(in oklab, var(--color-role-primary-button-background), black 12%);
  --color-role-primary-button-border-hover:     color-mix(in oklab, var(--color-role-primary-button-border), black 12%);
  --color-role-primary-button-text-hover:       var(--color-role-primary-button-text);
  --color-role-secondary-button-background-hover: color-mix(in oklab, var(--color-role-secondary-button-background), var(--color-role-foreground) 8%);
  --color-role-secondary-button-text-hover:       var(--color-role-secondary-button-text);  /* passes through */
  --color-role-secondary-button-border-hover:     color-mix(in oklab, var(--color-role-secondary-button-border), black 12%);
  --color-role-input-background-hover:            color-mix(in oklab, var(--color-role-input-background), var(--color-role-foreground) 4%);
  --color-role-input-border-hover:                color-mix(in oklab, var(--color-role-input-border), var(--color-role-foreground) 20%);

  /* --- 4. Derived translucent tokens via rgb(from ... r g b / α) --- */
  --color-role-foreground-muted: rgb(from var(--color-role-foreground) r g b / var(--opacity-muted));
  --color-role-placeholder:      rgb(from var(--color-role-input-text) r g b / 0.5);
  --color-role-disabled-background: rgb(from var(--color-role-foreground) r g b / var(--opacity-subtle));
  --color-role-disabled-text:       rgb(from var(--color-role-foreground) r g b / 0.4);  /* hardcoded across schemes */
  --color-role-disabled-border:     rgb(from var(--color-role-foreground) r g b / var(--opacity-border-soft));
  --color-role-focus-ring: var(--color-role-primary);  /* alias, opaque */
  --color-role-backdrop:   rgb(from var(--color-role-shadow) r g b / 0.5);
  --shadow-sm: 0 1px 2px   rgb(from var(--color-role-shadow) r g b / 0.06);
  --shadow-md: 0 4px 12px  rgb(from var(--color-role-shadow) r g b / 0.10);
  --shadow-lg: 0 8px 24px  rgb(from var(--color-role-shadow) r g b / 0.14);
}

[data-modifiers*="color-scheme:scheme-2"] { /* same four-group shape, scheme-2 values */ }
[data-modifiers*="color-scheme:scheme-3"] { /* same four-group shape, scheme-3 values */ }
```

**Selector union for the default scheme.** Scheme-1 also targets `:root` — so the document inherits its tokens by default. Subsequent schemes target only the `[data-modifiers*='color-scheme:<id>']` form. A modifier-bearing element re-scopes its subtree to the picked scheme without leaking to unmodified siblings.

## CSS

Described above in Output shape. The implementation is the per-scheme rule block in `utility--css-variables.liquid`'s Liquid emission — the spec pins by description rather than by file version.

## CSS custom properties (exposed)

| Group | Variable | Source | Notes |
|---|---|---|---|
| **Background / foreground** | `--color-role-background` | `scheme.settings.background` | Solid color; cascade root for descendants |
| | `--gradient-background` | `scheme.settings.background_gradient` (or fallback to `--color-role-background`) | Either gradient or flat color; consumed by `body` background |
| | `--color-role-foreground` | `scheme.settings.foreground` | Primary text color |
| | `--color-role-foreground-heading` | `scheme.settings.foreground_heading` | Heading-specific text color; falls back to `inherit` when consumer reads via `var(--color-role-foreground-heading, inherit)` |
| | `--color-role-foreground-muted` (derived) | `--color-role-foreground` × `--opacity-muted` via `rgb(from)` | Secondary text / metadata color |
| **Primary** | `--color-role-primary` | `scheme.settings.primary` | Accent color (links, focus accents, primary buttons) |
| | `--color-role-focus-ring` (alias) | `var(--color-role-primary)` | Focus-ring color; opaque; aliased to primary so per-project re-pointing happens at the source |
| **Border / shadow** | `--color-role-border` | `scheme.settings.border` | Default border color |
| | `--color-role-shadow` | `scheme.settings.shadow` | Base shadow color (used as the alpha source for `--shadow-{sm,md,lg}`) |
| | `--color-role-backdrop` (derived) | `--color-role-shadow` × 0.5 alpha via `rgb(from)` | Modal / drawer backdrop overlay |
| **Button: primary** | `--color-role-primary-button-{background,text,border}` | `scheme.settings.primary_button_*` | Direct scheme-setting values |
| | `--color-role-primary-button-{background,border}-hover` | `color-mix(in oklab, …, black 12%)` | Darkening shift toward black |
| | `--color-role-primary-button-text-hover` | passes through | Text unchanged on hover |
| **Button: secondary** | `--color-role-secondary-button-{background,text,border}` | `scheme.settings.secondary_button_*` | Direct scheme-setting values |
| | `--color-role-secondary-button-background-hover` | `color-mix(…, foreground 8%)` | Shift toward foreground |
| | `--color-role-secondary-button-text-hover` | passes through | Text unchanged on hover |
| | `--color-role-secondary-button-border-hover` | `color-mix(…, black 12%)` | Darkening shift |
| **Input** | `--color-role-input-{background,text,border}` | `scheme.settings.input_*` | Direct scheme-setting values |
| | `--color-role-input-{background,border}-hover` | `color-mix(…, foreground 4%/20%)` | Shifts toward foreground at varying weights |
| | `--color-role-placeholder` (derived) | `--color-role-input-text` × 0.5 alpha via `rgb(from)` | Placeholder color (50% input-text opacity) |
| **Disabled** | `--color-role-disabled-background` | `--color-role-foreground` × `--opacity-subtle` | Subtle disabled-state fill (alpha scales per scheme) |
| | `--color-role-disabled-text` | `--color-role-foreground` × `0.4` (hardcoded) | Disabled-state text; alpha hardcoded across schemes for consistent mid-tone readability |
| | `--color-role-disabled-border` | `--color-role-foreground` × `--opacity-border-soft` | Disabled-state border (alpha scales per scheme) |
| **Opacity scales** | `--opacity-subtle`, `--opacity-muted`, `--opacity-border-soft` | Brightness-conditional (dark vs light scheme) | Branch on `scheme.settings.background \| color_brightness < 64` |
| **Shadows** | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | `--color-role-shadow` × alphas 0.06 / 0.10 / 0.14 via `rgb(from)`; dimensions in px (`0 1px 2px` / `0 4px 12px` / `0 8px 24px`) | Three preset elevation shadows; px dimensions per the device-pixel rationale (same as border-width scale) |

## Behavior

- **Role-keyed tokens decouple consumers from the active scheme.** Block CSS reads `var(--color-role-X)` once; the value resolves to whichever scheme's tokens are active at the consumer's cascade scope. No conditional Liquid, no per-scheme override rules at the block level.
- **Scheme-1 unions with `:root` for default-scheme inheritance.** The first scheme targets both `:root` and `[data-modifiers*="color-scheme:scheme-1"]`, so descendants of any unmodified ancestor read its tokens by default. Subsequent schemes target only the modifier form. A modifier-bearing element re-scopes its subtree without leaking to unmodified siblings.
- **No descendant catch-all leak.** The selector chain doesn't include `.shopify-section:has([data-modifiers*='color-scheme:...'])` — that pattern would re-emit scheme tokens on the section whenever any nested element carried an override, clobbering the outer scheme's tokens across the entire section. Color tokens live only on the modifier-bearing element; descendants inherit normally.
- **Disjoint namespace from `theme_color`.** `--color-role-<role>` (scheme-assigned, per-section role) and `--color-<handle>` (palette-flat, scheme-independent) are deliberately disjoint. A `theme_color` entry handled `background` emits `--color-background` and does not interact with `--color-role-background`. See `theme-color.md` Behavior for the contract from the palette side.
- **Brightness-derived opacity threshold at 64/255.** `scheme.settings.background | color_brightness < 64` selects the dark-scheme opacity scale (wider — 0.15 / 0.60 / 0.25); above the threshold uses the light-scheme scale (tighter — 0.05 / 0.40 / 0.10). Dark grounds need stronger overlays to register against deep grounds; light grounds need lighter overlays to stay subtle. Threshold separates near-black grounds from mid/light tones where subtle overlays disappear unless boosted.
- **Hover variants composed via `color-mix(in oklab, …)`.** Perceptual color space. Primary buttons darken toward black 12% (uniform across primary). Secondary buttons shift toward foreground 8% so hover reads against the surrounding ground. Inputs shift toward foreground at 4% (background) / 20% (border) — border picks up more contrast than background. Primary button text passes through unchanged on hover (no color shift; only the background / border change).
- **`color-mix` for color mixing; `rgb(from)` for transparency.** Two distinct syntaxes for two distinct intents. Hover variants (color shifts toward another color) use `color-mix(in oklab, ...)`. Translucent compositions (alpha applied to an opaque source) use `rgb(from var(--color-role-X) r g b / α)`. Distinguishable at a glance — readers don't have to parse the operation to know the intent.
- **Derived translucent tokens preserve the fractional `--opacity-*` chain.** `--color-role-foreground-muted` is `rgb(from var(--color-role-foreground) r g b / var(--opacity-muted))`. The opacity reference lets the brightness-derived scale drive multiple derived tokens without re-declaring the alpha per token. Pairs with the brightness threshold to produce scheme-appropriate translucence.
- **Disabled-text alpha is hardcoded across schemes.** `--color-role-disabled-text` uses a hardcoded `0.4` alpha rather than `var(--opacity-muted)` (which scales per scheme). The hardcode keeps disabled text at a consistent mid-tone readability target regardless of scheme background — on light schemes `--opacity-muted` is 0.40 (which matches), on dark schemes it's 0.60 (where disabled text would read too prominent). Disabled-background and disabled-border continue to consume the per-scheme opacity vars (`--opacity-subtle`, `--opacity-border-soft`) because their visual targets are scheme-dependent.
- **Focus-ring is an alias.** `--color-role-focus-ring: var(--color-role-primary)` — opaque, single alias. Per-project re-pointing happens at the source (`--color-role-primary`) rather than per-consumer; the alias-by-reference shape keeps the focus-ring color in sync with the primary color automatically.
- **`--shadow-{sm,md,lg}` compose alpha depth via `rgb(from)`.** Three preset elevation shadows — `sm` (0.06 alpha), `md` (0.10 alpha), `lg` (0.14 alpha). Color source is `--color-role-shadow`; depth scales with size on a +0.04 increment per step. Dimensions emitted in px (`0 1px 2px` / `0 4px 12px` / `0 8px 24px`) per the device-pixel rationale that governs the border-width scale and `--radius-pill`; alpha values are uniform across schemes (not brightness-conditional — only the shadow color shifts with the scheme).
- **No JavaScript dependency.** Scheme switching at runtime happens via toggling the `data-modifiers="color-scheme:scheme-N"` attribute on the section / element root. CSS variables re-resolve immediately; the body's transition (`--duration-base var(--ease-standard)` from `layer-theme.css`) animates the change.
- **Scheme set is open-ended.** Token ships with three seed schemes (scheme-1/2/3). Per-project schemes (scheme-4, scheme-5, etc.) follow the same emission shape — merchants add them via Shopify's color-schemes setting; the snippet iterates without modification.

## A11y

- **Focus-visible color via `--color-role-focus-ring`.** The focus ring uses an opaque alias of `--color-role-primary` — never a translucent token. Pairs with `design-constants.md`'s `--focus-ring-width` (`0.125rem`) and `--focus-ring-offset` (`0.125rem`) for the full focus-visible style.
- **WCAG contrast is the merchant's responsibility per scheme.** The snippet emits whatever colors the merchant configures via `scheme.settings.*` — it doesn't validate contrast ratios. Brightness-derived opacity scales preserve contrast within scheme (subtle / muted / border-soft scale per scheme background brightness), but the underlying foreground vs background contrast is merchant-configured.
- **Forced-colors mode.** Tokens pass through; `:focus-visible` inherits system focus styling under `forced-colors: active`. The substrate doesn't override forced-colors behavior.

## Locale keys

N/A — pure CSS-variable emitter; the upstream scheme-setting labels live in Shopify's settings UI.

## Validation

Per `validation-contract.md` Tier 1c (substrate / utility-css).

- **Tier**: substrate — utility-css sub-shape
- **Page(s)**: planned dedicated page `sections/validation--substrate--color-scheme.liquid` + `templates/index.validation--substrate--color-scheme.json`. The existing `validation--substrate--theme-color` covers the `--color-<handle>` palette but not the scheme-role surface — the planned page surfaces every role-token under each scheme as labeled swatches + state demos (idle / hover / focus / disabled).
- **API surface** (the matrix to exercise):
  - **Scheme isolation**: a section with three child blocks, each carrying `color-scheme:scheme-N` modifier. Reader confirms each block renders with its scheme's role tokens; the outer ancestor stays in scheme-1 (no descendant catch-all leak).
  - **Direct color settings per scheme**: each of the 16 direct scheme settings rendered as a labeled swatch under each scheme (3 schemes × 16 settings = 48 cells).
  - **Brightness-derived opacity per scheme**: each of `--opacity-{subtle,muted,border-soft}` rendered as an overlay swatch under each scheme. Reader confirms dark schemes show wider overlays than light schemes.
  - **Hover variants**: button + input previews showing idle → hover transition under each scheme. Reader confirms hover shifts match the documented `color-mix` directions (toward black 12% for primary, toward foreground 8% for secondary background, etc.).
  - **Derived translucent tokens**: foreground-muted, placeholder, disabled-* swatches under each scheme. Reader confirms alpha-derived appearance matches opacity scales.
  - **Shadows**: three boxes per scheme showing `--shadow-{sm,md,lg}`. Reader confirms alpha depth increases sm → md → lg.
  - **Focus ring alias**: a tabbable input under each scheme; outline picks up `--color-role-primary` (the alias source).
- **Edge cases**:
  - Scheme without `background_gradient` set → `--gradient-background` falls through to flat `--color-role-background`; visual is uniform color, not a gradient
  - Scheme with `background_gradient` set → `--gradient-background` renders the gradient
  - Scheme whose background passes `color_brightness < 64` → opacity scales are 0.15 / 0.60 / 0.25 (dark-scheme path)
  - Scheme whose background passes `color_brightness >= 64` → opacity scales are 0.05 / 0.40 / 0.10 (light-scheme path)
  - Threshold edge case: scheme with `color_brightness == 64` → light-scheme branch wins (the comparison is `<`, not `<=`)
  - Nested scheme override (`scheme-2` inside `scheme-3`) → no leak; the inner element re-scopes its subtree to scheme-3; the outer remains scheme-2
- **Visual showcase intent**: a reader scanning the page confirms (a) every role token resolves to a sensible value per scheme, (b) scheme switching produces visually distinct subtree-scoped styling, (c) hover + disabled + focus states track the active scheme correctly, (d) brightness-derived opacities adapt to dark vs light schemes.
- **Assertions** (prose; Playwright once installed):
  - Computed `--color-role-background` on `[data-modifiers*='color-scheme:scheme-2']` equals the scheme-2 background hex; on the outer ancestor it equals scheme-1's background
  - Computed `--color-role-focus-ring` equals `--color-role-primary` (same value)
  - Computed `--color-role-foreground-muted` resolves to a `rgb(...)` with alpha matching the scheme's `--opacity-muted` value
  - Computed `--shadow-md` resolves to a `box-shadow`-compatible string with alpha 0.10
  - Toggle scheme on an element at runtime → computed `--color-role-background` updates to the new scheme's value (verifies attribute-toggle propagation through the cascade)
- **Unit scope**: none — Liquid + CSS; behavior is fully exercised by the rendered per-scheme blocks plus the visual harness.

## Implementation-time decisions

- **Selector union for scheme-1 vs per-scheme-only.** Scheme-1 targets `:root` AND its modifier selector; subsequent schemes target only their modifier. The union lets the document inherit scheme-1's tokens by default — without it, every section would need to explicitly carry `color-scheme:scheme-1` to opt in.
- **Brightness threshold at 64/255 vs alternative thresholds.** 64 separates near-black grounds (where subtle overlays disappear at low alpha) from mid/light grounds (where subtle overlays read at low alpha). Per-project override is possible by editing the threshold in `utility--css-variables.liquid`.
- **`color-mix(in oklab, ...)` vs `lch` / `hsl`.** Oklab is perceptually uniform; `lch` clips at extreme gamut values; `hsl` mixes in RGB-derived space and produces muddy mid-tones.
- **`rgb(from var(--*) r g b / α)` vs `rgba(var(--*-rgb), α)`.** Relative-color syntax (`rgb(from`) reads channels from an opaque source without requiring a pre-computed `-rgb` companion variable. The companion-variable pattern would double the variable surface (one `-rgb` triplet per role); relative-color reads channels at use-site, preserving the fractional `--opacity-*` alpha format with no channel-storage overhead.

## Out of scope

- **`theme_color` palette tokens (`--color-<handle>`).** Owned by `theme-color.md`. Scheme-independent; do not interact with the role-token namespace.
- **Gradient catalog (`--gradient-<handle>`).** Owned by `gradient.md`. The `--gradient-background` token in this spec is scheme-driven (one per scheme); the gradient catalog's named entries are scheme-adaptive via role-token interpolation but lives in a separate namespace.
- **Text-style typography tokens (`--<handle>-font-*` + `--base-*`).** Owned by `text-style.md`. Body-level transitions in `layer-theme.css` consume `--base-*` independently of the role-token system.
- **Scheme-setting validation.** The snippet trusts Shopify's color-scheme setting infrastructure to provide valid hex values for each role. Malformed values pass through; the browser drops invalid declarations.
- **WCAG-compliance enforcement.** The brightness-derived opacity scales preserve contrast *within* a scheme but don't enforce foreground vs background contrast at the scheme-setting layer. Merchants pick contrasting colors; the substrate doesn't validate.
- **Runtime scheme switching via JS API.** Scheme switching happens by toggling the `color-scheme:scheme-N` modifier — typically via Liquid (per-section setting) or via JS attribute mutation. No dedicated JS helper for runtime scheme switching; consumers use `ModifiersManager` per `modifier-system.md`.
- **Per-project scheme additions beyond 3.** The emission iterates `settings.color_schemes` without limit; per-project themes adding a 4th, 5th, etc. scheme follow the same shape. Documentation of seeded scheme intent (scheme-1 light, scheme-2 dark, scheme-3 accent) is per-project.
- **Custom-property emission shape.** Owned by `utility--css-variables.md` — this spec describes the role-token contract; that spec describes how the emission integrates with the other five emission domains (palette, gradients, text-style, gutter, spacing).

## Related

- `.context/specs/theme-color.md` — sibling substrate metaobject spec; the `--color-<handle>` palette catalog. Explicitly defers the role-token system to this spec (its Out of scope cross-references); the two namespaces are deliberately disjoint
- `.context/specs/utility--css-variables.md` — the emitter that materializes this spec's contract; the per-scheme rule block lives there. This spec owns the contract; that spec owns the emission shape across all six domains
- `.context/specs/gradient.md` — sibling substrate metaobject; gradient stops reference `--color-role-<role>` from this namespace
- `.context/specs/design-constants.md` — provides `--duration-*` / `--ease-*` for body transitions consuming these tokens; `--radius-*` for variant CSS
- `.context/specs/layer-theme.md` — the consumer aggregator stylesheet; body-level appearance + form-input states + container-style variants all read from this namespace
- `.context/docs/modifier-system.md` — the `data-modifiers` system that the `color-scheme:scheme-N` modifier piggy-backs on
- `.context/rules/a11y-conventions.md` — focus + reduced-motion accessibility rules; focus-visible color routes through `--color-role-focus-ring`
