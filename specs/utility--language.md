# utility--language

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--language.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--language.liquid` v1.0.0 (HTML-attribute emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: Liquid global `request.locale.iso_code`

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — emitted inside the `<html>` opening tag

## Purpose

Emits `lang="<iso>"` and `dir="<direction>"` attributes for the `<html>` element from the active Shopify locale. Bidi direction is resolved by checking the locale's ISO code against a literal RTL-language list — Shopify exposes no `direction` field on `request.locale`, so the utility carries its own mapping.

Both attributes are required for accessibility (SR pronunciation depends on `lang`; bidi rendering of mixed-script content depends on `dir`) and for substrate CSS / JS that branches on `:dir(rtl)` or `[lang]` selectors.

## API

No params. Reads Liquid's `request.locale.iso_code`.

## Output shape

Renders the two attributes as bare text — not an element wrapper. Consumed inline by the layouts:

```liquid
<html {% render 'utility--language' %} {% render 'utility--document-modifiers' %}>
```

Renders, for an English store:

```html
<html lang="en" dir="ltr">
```

For an Arabic store:

```html
<html lang="ar" dir="rtl">
```

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## Behavior

- **`lang` always emitted from `request.locale.iso_code`.** Shopify guarantees the value is non-blank on a rendered page; no defensive fallback.
- **`dir` defaults to `ltr`.** Set to `rtl` when the locale's ISO code matches the internal RTL list.
- **RTL language list is local to the utility.** A comma-split literal lists ISO codes for major RTL languages: `ae, ar, arc, bcc, bqi, ckb, dv, fa, glk, ha, he, kwh, ks, ku, mzn, nqo, pnb, ps, sd, ug, ur, yi`. Sourced from the canonical Unicode CLDR list. New RTL locales added by the merchant (rare) require an edit to this list.
- **No locale-tag normalization.** `request.locale.iso_code` is emitted verbatim (e.g. `en-CA`, `fr-FR`, `pt-BR`). Region tags pass through.
- **No element-scope rendering.** The utility emits attribute strings, not an element. It's designed to be interpolated inside an existing tag.

## A11y

The `<html lang>` and `<html dir>` attributes are foundational accessibility chrome — every page emits them. Per `.context/rules/a11y-conventions.md`, semantic HTML first.

- **SR pronunciation** depends on `lang`. Without it, screen readers fall back to their default pronunciation engine, which may mispronounce non-English content.
- **Bidi rendering** depends on `dir`. RTL languages without explicit `dir="rtl"` mis-render punctuation and mixed-script content; CSS-level RTL handling depends on `:dir(rtl)` matching against this attribute.

## Locale keys

N/A — the utility derives values from `request.locale`.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page; explicitly observable on rendered `<html>` element
- **API surface** (matrix to exercise):
  - LTR locale (`en`, `fr`, `de`, …) → `dir="ltr"`
  - RTL locale (`ar`, `he`, `fa`, …) → `dir="rtl"`
  - Locale with region tag (`en-CA`, `pt-BR`) → `lang` carries the full tag verbatim, `dir` resolved on the base language
- **Edge cases**:
  - `request.locale.iso_code` containing a region tag (`fa-IR`) → the substring `fa-IR` is matched against the RTL list, which contains bare `fa` only — `contains` does match (`fa-IR contains fa` → true). Verify-as-needed against the live storefront.
  - Region-only RTL (no current case) — out of scope; RTL list is language-keyed
- **Visual showcase**: DevTools shows `<html lang dir>` attributes on every rendered page
- **Assertions** (prose; Playwright once installed): `document.documentElement.lang === request.locale.iso_code`; `document.documentElement.dir === 'ltr' or 'rtl'`
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **CLDR-sourced lookup.** The internal RTL list is hand-maintained. A future enhancement would source from a generated catalog or a Shopify-side affordance; current list covers every shipped RTL locale.
- **Region-direction overrides.** A locale's region tag does not override its language's direction. Out of scope; no current case.
- **`xml:lang` emission.** Modern HTML doesn't need `xml:lang`. Out of scope.
- **Locale-direction announcement on dynamic locale switch.** The utility renders once per page; runtime locale switching (e.g. JS-side language picker) would need to also mutate `documentElement.lang` and `documentElement.dir`. Currently no such switcher ships.

## Related

- `.context/specs/utility--hreflang.md` — sibling locale-aware emitter; produces `<link rel="alternate" hreflang>` from the same `localization` object
- `.context/specs/layout.md` — `<html>` attribute consumer
- `.context/rules/a11y-conventions.md` — names `lang` + `dir` as required substrate chrome
