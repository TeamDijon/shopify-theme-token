# utility--hreflang

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--hreflang.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--hreflang.liquid` v1.0.0 (multi-language SEO emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: Liquid globals `localization.available_languages`, `localization.language.root_url`, `request.path`, `request.origin`

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — head spine stage 7

## Purpose

Emits `<link rel="alternate" hreflang>` tags for multi-language Markets SEO. One tag per available language, plus an `x-default` pointing at the primary language. Single-language stores emit nothing — the tags are only meaningful when alternate locales exist.

Each language's URL is built by replacing the current locale's `root_url` prefix with the target's. Cross-locale path rewriting is the fragile part — single-language storefronts have `root_url == '/'` so no prefix needs swapping; multi-language storefronts have non-`/` prefixes (e.g. `/fr`, `/en-ca`) that must be stripped from `request.path` and re-prefixed.

## API

No params. Reads Liquid's `localization` and `request` objects.

## Output shape

For a multi-language store with English (primary, `/`) and French (`/fr`), on the page `/fr/products/example`:

```html
<link rel="alternate" hreflang="en" href="https://example.com/products/example">
<link rel="alternate" hreflang="x-default" href="https://example.com/products/example">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/products/example">
```

Single-language store → no output (early `break`).

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## Behavior

- **Single-language store → early `break`.** `localization.available_languages.size <= 1` triggers no emission. hreflang tags require multiple alternates by definition.
- **Bare-path extraction.** Strip the current locale's `root_url` from `request.path` to produce a locale-prefix-free path. If the result is blank (the current page is the locale's root), use `'/'` as the bare path.
- **Primary-language special-case.** The primary language's `root_url` is `'/'` (Shopify convention). The bare-path extraction is `request.path` verbatim (no prefix to strip). The re-prefix uses the bare path as-is.
- **`x-default` paired with the primary language entry.** Per Google's SEO spec, `x-default` is emitted on the same loop iteration as the primary language (which `language.primary` identifies), giving the same URL.
- **Whitespace trim markers throughout the iteration.** The for-loop uses `{%-` / `-%}` markers to suppress newline whitespace between emitted `<link>` tags, keeping the head compact.
- **Verify against Markets / translated preview.** Cross-locale path rewriting is the fragile part — verify behavior against a multi-language preview before relying on the URLs in production SEO.

## A11y

N/A — `<link rel="alternate">` is SEO-only, not consumer-facing.

## Locale keys

N/A — language codes come from `localization.available_languages[].iso_code`.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: validated on multi-language preview stores (no current validation page; behavior is locale-dependent and requires a Markets-enabled storefront)
- **API surface** (matrix to exercise):
  - Single-language store → no `<link rel="alternate">` emitted
  - Multi-language store with primary at `/` → one alternate per language + `x-default` pointing to the primary URL
  - Multi-language store with primary at non-`/` → same shape, prefixes correctly stripped + re-prepended
  - Bare-path is blank (current page is locale root) → emits `'/'` as the bare path
- **Edge cases**:
  - The current locale's `root_url` does not appear in `request.path` (unusual configuration) → `remove_first` is a no-op; the bare path retains the prefix, leading to incorrect target URLs. Out of scope; assumed to be Shopify-enforced.
  - Query strings in `request.path` → preserved verbatim through the bare-path / re-prefix flow
- **Visual showcase**: DevTools head view on multi-language preview
- **Assertions** (prose; Playwright once installed): on a 2-language store, head contains 3 `<link rel="alternate">` tags (2 hreflang + 1 x-default); URLs resolve to the same page in the target locale
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Per-region (country) hreflang values.** The utility emits language-only hreflang values (e.g. `en`, `fr`). Region-specific values (e.g. `en-CA`, `fr-FR`) require an `iso_code` that carries the region — currently the `localization.language.iso_code` is language-only; cross-region support lands when Shopify exposes region codes.
- **Canonical-URL coordination.** The canonical URL (emitted by the layout's head spine stage 6) and the hreflang alternates can carry conflicting signals if their domains differ. Out of scope; the canonical URL emission is independent.
- **Query-string normalization.** The utility preserves query strings verbatim. Canonicalizing them (sorting params, dropping tracking params) is out of scope.

## Related

- `.context/specs/layout.md` — head spine stage 7 consumer
- `.context/specs/utility--language.md` — sibling utility emitting the `<html lang>` + `dir` attributes from the same `localization.language` object
