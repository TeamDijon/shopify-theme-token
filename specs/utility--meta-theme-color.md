# utility--meta-theme-color

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--meta-theme-color.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--meta-theme-color.liquid` v1.1.0 (head-tag emitter)

**Reconciled**: 2026-06-05

**Reviewed**: pending

**Depends on**: `settings.meta_theme_color` (a `theme_color` metaobject reference; see `theme_color` metaobject schema)

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — head spine stage 2

## Purpose

Emits the page's `<meta name="theme-color">` tag from the merchant-selected `theme_color` metaobject entry. The tag controls mobile browser UI chrome color (status bar, URL bar tinting) on supporting platforms.

Omits the tag entirely when the merchant has not selected an entry — browsers fall back to their default UI chrome.

## API

No params. Reads `settings.meta_theme_color`.

## Output shape

```html
<meta name="theme-color" content="#000F9F">
```

The `content` value is the `theme_color` entry's `hex_code.value` field. No emission when the setting is blank.

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## Behavior

- **Blank setting → early `break`.** No tag emitted when `settings.meta_theme_color` is blank.
- **No scheme awareness.** The tag emits one color per page, sourced from the merchant-picked entry. Per-scheme tag emission (e.g. via `<meta name="theme-color" media="(prefers-color-scheme: dark)">`) is not currently supported; the picked entry's `hex_code` is the only output.
- **Hex value emitted verbatim from the metaobject.** No transformation. The `theme_color` metaobject's `hex_code` field carries a 7-character `#RRGGBB` string; the meta tag accepts that format.

## A11y

N/A — the tag affects mobile browser UI chrome, not page content. Per-scheme awareness when added would respect `prefers-color-scheme`.

## Locale keys

N/A — the value is a hex code, not localized content.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page (called from both layouts at head spine stage 2)
- **API surface**: setting set → `<meta name="theme-color" content="<hex>">` emitted; setting blank → no tag
- **Edge cases**: invalid hex (e.g. malformed metaobject entry) → emitted verbatim; browser silently ignores
- **Visual showcase**: DevTools `<head>` view + mobile preview (browser UI chrome color matches the picked value)
- **Assertions** (prose; Playwright once installed): when `settings.meta_theme_color` is set, the rendered head contains exactly one `<meta name="theme-color">` whose `content` matches the entry's `hex_code`; when blank, no such tag exists
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Per-scheme emission.** A future enhancement would emit one tag per scheme variant via `<meta name="theme-color" media="(prefers-color-scheme: …)">`. Currently single-tag.
- **Default fallback.** No automatic fallback to a substrate color when the setting is blank — browser uses its own default chrome.
- **Animation / runtime mutation.** The tag is set once at render. Runtime updates (e.g. scheme switch via JS) would require a separate JS-side update path; out of scope.

## Related

- `.context/specs/theme-color.md` — the metaobject this utility reads from
- `.context/specs/layout.md` — head spine stage 2 consumer
- `.context/docs/theme-settings.md` — documents the `settings.meta_theme_color` interface
