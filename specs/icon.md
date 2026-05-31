# icon

**Layer**: 0

**Type**: snippet (`snippets/icon.liquid`)

**Status**: shipped

**Implementation**: `snippets/icon.liquid` v1.4.1 (render surface)

**Reconciled**: 2026-05-31

**Reviewed**: pending

**Depends on**: `snippets/utility--inline-asset.liquid` (for the SVG inlining with missing-asset guard), `assets/icon-*.svg` files (the icon catalog), `icon` metaobject (optional dual-API input shape)

**Consumers**: `snippets/button.liquid` (leading/trailing icon), `snippets/title.liquid` (leading icon), future `snippets/star-rating.liquid` (star presets), per-project sections rendering brand iconography

## Purpose

Inline SVG icon primitive. Loads `assets/icon-<name>.svg` and emits its markup with two universal modifications: an `aria-hidden="true"` attribute (decorative-by-default) and an optional `data-preset="<value>"` attribute (CSS hook for stateful icon variants like full / half / empty stars).

Sub-component primitive — never the root of a theme block. Consumed inline by block-backed primitives that include iconography (button, title, future star-rating). The SVG markup is inlined directly into the consumer's output, so `currentColor` strokes/fills participate in the consumer's color cascade.

The snippet supports two input shapes — dual-API by what the caller has on hand, neither preferred:

- **Metaobject reference** (`icon` arg) — when the caller has an `icon` metaobject ref (from a schema setting or `metaobjects.icon.<handle>`). The snippet reads `file_name` and `preset` from the metaobject's fields.
- **Direct filename** (`file_name` arg, optional `preset` arg) — when the caller has the string directly (hardcoded icons in section markup).

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `icon` | metaobject (`icon`) | conditional | — | Icon metaobject entry; snippet reads `file_name.value` and `preset.value`. Required if `file_name` is not passed. |
| `file_name` | string | conditional | — | Filename stem without the `icon-` prefix or `.svg` extension (e.g. `chevron` for `assets/icon-chevron.svg`). Takes precedence over the metaobject's field when both are passed. Required if `icon` is not passed. |
| `preset` | string | no | metaobject's `preset.value` | CSS hook emitted as `data-preset="<value>"` on the SVG root. Escaped via `| escape` before interpolation. When both `preset` arg and `icon.preset.value` exist, the arg wins. |

Either `icon` or `file_name` must produce a non-blank filename; otherwise the snippet `break`s and emits nothing.

## Output shape

```html
<svg <preserved-attributes-from-file> aria-hidden="true" data-preset="<value>">
  <!-- inline path data from assets/icon-<name>.svg -->
</svg>
```

The snippet inlines the SVG file (via `utility--inline-asset` which guards against missing files) then injects `aria-hidden="true"` (always) and `data-preset="<value>"` (when set) by `replace_first`-ing the opening `<svg ...>` tag's `>` with the attributes + `>`. The injection preserves whatever attributes the source file declared (`viewBox`, `xmlns`, etc.).

Missing asset case — when `assets/icon-<name>.svg` doesn't exist, `utility--inline-asset` yields empty markup (not the raw "Asset not found" comment). The snippet emits nothing visible.

## Behavior

- **Dual-API resolution.** The snippet's `default:` chains pick:
  - `file_name` = explicit arg → falls through to `icon.file_name.value` → empty (break)
  - `preset` (= `icon_preset`) = explicit arg → falls through to `icon.preset.value` → empty (no data-preset emitted)
- **Filename composes to `assets/icon-<name>.svg`.** The snippet prepends `icon-` and appends `.svg` before passing to `utility--inline-asset`. Callers pass the stem only (`chevron`, not `icon-chevron.svg`).
- **`aria-hidden="true"` always emits.** Icons are decorative-by-default — semantic meaning comes from the consumer's accessible name (button label, link text). Suppression of redundant SR announcement is universal; consumers wanting icon-as-label express that via `aria-label` on the parent (button, link), and the SVG stays hidden in that case too.
- **`data-preset` provides a CSS hook for icon variants.** Used by future `star-rating` to cycle the same SVG file (`icon-star.svg`) through `full` / `half` / `empty` presets via per-path scaling rules in `layer-theme.css`. Escaped with `| escape` (v1.4.1) so callers passing untrusted strings can't break out of the attribute.
- **Missing asset = empty render.** v1.2.0 routed inlining through `utility--inline-asset` which guards against the raw "Asset not found" comment. A broken icon ref produces an empty span in the consumer's markup, not a visible broken-image affordance.
- **Early-exit when no filename resolves.** Both `file_name` arg and `icon.file_name.value` blank → snippet `break`s. v1.1.0 added this guard.
- **`replace_first` injection is load-bearing.** The opening `<svg>` tag's `>` is replaced once with ` aria-hidden="true" data-preset="..."` + `>`. Only the first occurrence — the SVG body's path data may include other `>` characters that shouldn't be touched.
- **SVG file conventions.** Per `.context/rules/icon-convention.md`: paths use `currentColor`, `stroke-width: 0.25rem`, optional `data-edge=""` for paths touching the viewBox edge (prevents stroke bleed), and optional `data-<part>` attributes for sub-element CSS hooks (e.g. `data-half-star` on the first path of `icon-star.svg` for half-star rendering).

## A11y

- **Decorative-by-default via `aria-hidden="true"`.** Always set. Semantic icons (icon-as-label) require `aria-label` on the parent interactive element; the SVG itself stays hidden to prevent redundant announcement.
- **No `<title>` / `<desc>` inside the SVG.** Source files don't carry these; the snippet doesn't inject them. An icon-only button uses `aria-label` on the button, not a `<title>` inside the SVG.
- **`currentColor` semantics.** Icons inherit color from the consumer's `color` property — `<button>`'s text color, `<a>`'s text color, etc. Forced-colors mode (Windows high-contrast) honors the inherited `currentColor` correctly.

## Locale keys

None — the snippet emits no text. Accessible labels live on the parent element (button, link) via `aria-label`.

## Validation

Per `validation-contract.md` Tier 1c (utility-CSS) for the icon-rendering pipeline; Tier 2 (theme-primitive — snippet-half group) for the dual-API + preset emission.

- **Tier**: utility-snippet (Tier 1b) — input → output conformity check
- **Page**: covered indirectly today through L1 block validation (`validation--primitive--button.liquid`, `validation--primitive--title.liquid`); a dedicated `validation--primitive--icon.liquid` snippet-half page slots here when L0 validation is staffed
- **API surface** *(as a snippet)*:
  - **`icon` metaobject input**: pass an `icon` metaobject ref → snippet reads `file_name` + `preset` from fields; emits the SVG with `data-preset` if set
  - **`file_name` direct input**: pass a string → snippet loads the matching SVG; emits with no `data-preset` if `preset` arg is blank
  - **Both inputs passed**: `file_name` arg wins over `icon.file_name.value`; `preset` arg wins over `icon.preset.value`
  - **`preset` variation**: blank, `inline-badge`, `full`, `half`, `empty` (future star-rating use case)
  - **Missing asset**: `file_name: 'nonexistent'` → `utility--inline-asset` returns empty; snippet emits no markup
- **Edge cases**:
  - Both `icon` and `file_name` blank → snippet `break`s; nothing renders
  - `icon` set but `icon.file_name.value` blank (malformed metaobject entry) → break
  - `preset` arg with HTML-unsafe characters (`"><script>`) → escaped via `| escape`; emits as `data-preset="&quot;&gt;&lt;script&gt;"`
  - SVG file with existing `aria-*` attributes → snippet's injected `aria-hidden` appears alongside; if a source SVG had `aria-labelledby`, both would emit. Source files conventionally don't carry aria attributes.
  - SVG file with internal `>` characters in path data → `replace_first` touches only the opening tag, not the body
- **Visual showcase**: a grid of every shipped icon (enumerated from `assets/icon-*.svg`), labelled by handle. Inline at various sizes via `--icon-size`. Reader confirms each icon renders, inherits `currentColor`, applies preset variations correctly.
- **Assertions** (prose; Playwright once installed):
  - Output is a single SVG root element
  - Root has `aria-hidden="true"`
  - When `preset` is set, root has `data-preset="<value>"` with the value `| escape`d
  - When the file is missing, no markup emits
  - Inline paths consume `currentColor` (rendered color matches the consumer's `color`)
- **Unit scope**: none (pure Liquid + filesystem read; no JS)

## Out of scope

- **External SVG references (`<use href>` patterns)** — every icon inlines. Pros: no sprite file load coordination, no fetch latency, color-cascade works seamlessly. Cons: repeated icons re-inline. The inline pattern is the agreed Token approach.
- **Icon catalog browsing UI** — the validation page (future) doubles as the catalog. No separate browse-page primitive.
- **Animated icons** — source SVG files can carry SMIL or CSS animation; the snippet doesn't gate. Per-project icons opt-in.
- **Icon font support** — SVG-only. Icon fonts are an alternative approach Token doesn't ship.
- **Color variants via attributes** — color comes from `currentColor` and the consumer's cascade. Per-icon color overrides happen by changing the consumer's `color`, not by passing a color arg.
- **Sub-element CSS hooks beyond `data-<part>`** — the convention in `icon-convention.md` covers `data-edge` and arbitrary `data-<part>` attributes for stateful targeting. Beyond that, per-project sections add their own classes via `replace_first` on the SVG markup.
- **Icon metaobject `name.value` consumption** — the name field is for admin display; the snippet doesn't read it.

## Related

- Icon convention (SVG file authoring: paths, `data-edge`, `data-<part>`, `currentColor` discipline): `.context/rules/icon-convention.md`
- Utility--inline-asset spec (the missing-asset guard the snippet routes through): inlined here — no separate spec; `snippets/utility--inline-asset.liquid` wraps `inline_asset_content`
- Button spec (consumer; icon at start / end via `icon_position`): `.context/specs/button.md`
- Title spec (consumer; leading icon at fixed sizing): `.context/specs/title.md`
- Star-rating spec (planned consumer; uses `preset` arg to cycle full/half/empty): `.context/specs/star-rating.md`
- Icon metaobject (the input shape for the metaobject path): `.context/docs/metaobject-definitions.md` § `icon`
