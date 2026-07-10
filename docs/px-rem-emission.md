# px-to-rem emission convention

Merchant-px input, front-end-rem emission. Settings authored in px (range inputs, metaobject Number fields), CSS values emitted in rem via `value | divided_by: 16.0 | round: 3`. Consumers read in rem and never see px.

The conversion happens at the emission site — every utility that writes a CSS custom property from a px-typed merchant setting applies the divisor before writing. Rem scales with the user's root font-size preference, so a merchant tuning a 16px value gets `1rem` that scales when the user adjusts their browser's default text size — the substrate preserves user accessibility preferences without per-merchant configuration.

## Conversion

```liquid
{{ value | divided_by: 16.0 | round: 3 }}rem
```

- `16.0` — the substrate's fixed root font-size, set in `assets/layer-base.css`. Not merchant-configurable.
- `| round: 3` — three-decimal precision. Preserves sub-pixel accuracy at typical font sizes without emitting excessive trailing digits (e.g., 24 px → 1.5 rem, 13 px → 0.813 rem).

Blank input coerces through Liquid arithmetic to `0`, so the emission is `0rem` (valid declaration). Don't rely on this — guard each declaration with a real-input check at the utility level.

## Exception cases — px-magic

Pixel values intentionally device-relative, not user-typography-relative:

- **Border-width scale** (`--border-thin: 1px`, `--border-default: 2px`, `--border-thick: 3px`) — a user setting a larger root font wants larger text, not thicker borders. Border weight is a device-pixel concept.
- **`--radius-pill: 9999px`** — pixel-magic floor for fully-rounded shapes. Rem would risk under-rounding at very-large block sizes.

Industry convention (Tailwind, Bootstrap, Material): px when the value is intentionally device-relative; rem otherwise.

## Consumers

Substrate emitters applying the convention:

- `snippets/utility--css-variables.liquid` — text-style font sizes, letter-spacing, gutter, spacing tokens
- `snippets/utility--block-layout-vars.liquid` — per-block content-width + margin pair
- `sections/section.liquid` — per-section content-width inline emission

`snippets/utility--font-face.liquid` doesn't apply the convention — its `font-weight` field is numeric (100–900 dimensionless) and emits as-is; no px / rem unit involved on either side.

Substrate specs documenting the convention at their emission boundary: `spacing.spec.md`, `content-width.spec.md`, `text-style.spec.md`, `utility--block-layout-vars.spec.md`, `utility--css-variables.spec.md`.

## Related

- `.context/docs/css-standards.md` — variable-naming conventions
- `design-constants.spec.md` — the px-magic exceptions (border-width scale, `--radius-pill`)
