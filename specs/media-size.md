# media-size

**Layer**: substrate

**Type**: metaobject (`media_size`)

**Status**: shipped

**Implementation**:
- `snippets/media.liquid` v1.4.0 (consumer — reads the picked entry's `type` + `value` to emit `aspect-ratio` / `block-size` / `block-size: 100%` per the mode dispatch)
- `snippets/embed.liquid` v1.2.0 (consumer — same dispatch logic for iframe sizing)
- `snippets/utility--media-sizing.liquid` v1.1.0 (helper — centralizes the mode-to-CSS emission logic so `media` and `embed` share the resolution)
- Metaobject definition itself — created per `metaobject-definitions.md` § `media_size`

**Reconciled**: 2026-06-04 (pin-format conformance — added version pins to consumer references per `spec-convention.md`; no code changes)

**Reviewed**: 2026-06-04

**Depends on**: none — substrate-root token type. Consumed by media-bearing primitives.

**Consumers**:
- `snippets/media.liquid` v1.3.0+ — primary consumer; reads the picked `media_size` entry from the media block, dispatches on `type` (or routes to the special `fill` handle) to emit the appropriate CSS via dynamic style
- `snippets/embed.liquid` — same dispatch logic for embedded video (YouTube / Vimeo iframes)
- `snippets/utility--media-sizing.liquid` — the shared resolver that both `media` and `embed` reach through
- `blocks/media.liquid`, `blocks/embed.liquid` — block schemas expose the `media_size` setting (metaobject picker)

## Purpose

A named media-sizing catalog. Each entry combines a `type` ("mode") with a `value` ("CSS value for the mode"). The catalog covers four sizing modes through a compact schema: three modes via the `type` field (`ratio` / `relative` / `fixed`), plus one mode routed by the special handle `fill` (no `type`/`value`, just a reserved handle).

The schema is **schema-light** by design — two optional fields (`type`, `value`) covering three modes; the fourth mode is the handle-routed special. Single-value-per-mode rather than per-mode field proliferation. The mode-to-CSS dispatch lives in `utility--media-sizing.liquid` (shared by `media` and `embed`); the metaobject contributes the data.

The "blank entry" mode (block setting unset) is the implicit fifth case — no CSS emitted, image renders at natural ratio. Useful for inline-flow media where the merchant wants natural proportions without picking an entry.

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name in admin (e.g., `1:1 (Square)`, `Half screen`, `Fill`). `system.handle` derives from it on creation; for the `fill` entry, the handle is load-bearing. |
| `type` | Single line text | no | Sizing mode. Validation: `choices: ["ratio", "relative", "fixed"]`. Leave blank for the special `fill` entry (handle-routed). |
| `value` | Single line text | no | CSS value matching the mode. Leave blank for `fill`. Mode-specific shapes: `ratio` accepts `<n>/<n>` like `16/9`; `relative` accepts viewport units like `100svh`; `fixed` accepts length values like `400px`. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

**Two optional fields covering three modes; one handle-routed special.** The 3+1 design is a minor inconsistency — `ratio` / `relative` / `fixed` use `type`+`value`, while `fill` uses neither. The handle-routed special is documented and works; uniformizing (e.g., `type: "fill"` with blank value) would be cosmetic-only.

## Output shape

The metaobject itself produces no CSS. The consumer (`media.liquid` / `embed.liquid` via `utility--media-sizing.liquid`) reads the picked entry's `type` + `value` (or the `fill` handle) and emits per-block CSS via dynamic style:

**Mode → CSS mapping:**

| Selection | Detection | Emitted CSS |
|---|---|---|
| Block setting unset | `media_size.value == blank` | none — image renders at natural ratio |
| Aspect ratio | `type: "ratio"`, `value: "16/9"` | `aspect-ratio: 16/9` |
| Relative height | `type: "relative"`, `value: "100svh"` | `block-size: 100svh` |
| Fixed height | `type: "fixed"`, `value: "400px"` | `block-size: 400px` |
| Fill parent | `system.handle == "fill"` | `block-size: 100%` |

The fill mode emits without reading `type` / `value` — the resolver branches on `media_size.system.handle == "fill"` first, falls through to the type dispatch otherwise.

`object-fit: cover` is hardcoded in the media block CSS (not in this metaobject). Per-context overrides live in the consuming block's stylesheet.

## CSS

N/A at the metaobject layer. The CSS emission happens at the consumer (`media` / `embed` snippets via `utility--media-sizing.liquid`). See `media.md` and `embed.md` for the full per-mode rendering contract.

## CSS custom properties (exposed)

N/A — the metaobject doesn't emit named CSS variables. The consumer emits direct CSS properties (`aspect-ratio` / `block-size`) per the picked mode.

## Behavior

- **Mode dispatch by handle then type.** The resolver checks `system.handle == "fill"` first (handle-routed special); falls through to `type` (`ratio` / `relative` / `fixed`) for the three field-driven modes. Block setting unset short-circuits before any emission.
- **`fill` handle is reserved and load-bearing.** A merchant renaming the `fill` entry's handle in admin loses the fill mode (the resolver's `handle == "fill"` check fails; the entry's blank `type` + `value` mean no other branch matches). The `fill` handle is documented as load-bearing per `metaobject-definitions.md` § media_size.
- **`type` validation is at admin authoring.** The schema's `choices: ["ratio", "relative", "fixed"]` prevents arbitrary strings at authoring. The runtime trusts validated input — no re-check at emit time. An off-list `type` reaching the runtime (admin schema bypass) would fail the dispatch and fall through to "no emission" (natural ratio).
- **`value` is unvalidated.** The schema accepts any string for `value` — `ratio` expects `<n>/<n>`; `relative` expects viewport units; `fixed` expects length values. Mismatched values (`type: "ratio"` with `value: "100svh"`) emit `aspect-ratio: 100svh` which CSS treats as invalid; the property is silently dropped + no aspect ratio applies. Merchant-responsibility footgun; not guarded.
- **`name` is decorative.** Display label for the admin. Not consumed at runtime. Renaming `name` doesn't change emission; renaming `handle` changes URL-friendliness but not the GID-stable reference.
- **`object-fit: cover` is the shipped default.** The media block CSS hardcodes `object-fit: cover` so the picked sizing (aspect ratio, relative height, fixed, fill) clips the image to the container's bounds. Per-context overrides (`contain` for product galleries, `none` for icon-style media) live in the consuming block's stylesheet, not in this metaobject.
- **Three modes + one handle-routed special.** The "blank entry" implicit fifth mode (block setting unset) covers natural-ratio image rendering — the resolver short-circuits when the picker is blank.

## Seed entries

Recommended catalog (adopted from the Liquified.dev media-block spec, per `metaobject-definitions.md` § media_size):

| Handle | Name | type | value |
|---|---|---|---|
| `1-1` | 1:1 (Square) | `ratio` | `1/1` |
| `4-3` | 4:3 | `ratio` | `4/3` |
| `3-2` | 3:2 | `ratio` | `3/2` |
| `16-9` | 16:9 (Widescreen) | `ratio` | `16/9` |
| `9-16` | 9:16 (Vertical) | `ratio` | `9/16` |
| `4-5` | 4:5 (Portrait) | `ratio` | `4/5` |
| `half-screen` | Half screen | `relative` | `50svh` |
| `full-screen` | Full screen | `relative` | `100svh` |
| `fill` | Fill | *(blank)* | *(blank)* |

The `fill` entry is **load-bearing by handle**: the resolver's `system.handle == "fill"` check is the only way to enter fill mode. Renaming it breaks the mode for that store.

The 6 ratio entries cover the most common compositions (square, classic photo, widescreen, vertical / portrait, four-by-five). The two relative entries cover viewport-relative (half-screen for hero band, full-screen for full takeover). Per-project additions extend the catalog per archetype need (e.g., `21-9` for ultrawide cinema, `tall` for fixed 800px, `compact` for `30svh`).

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page(s)**: `sections/validation--substrate--media-size.liquid` + `templates/index.validation--substrate--media-size.json` *(shipped)*. The page renders one media block per seeded entry, showing the sizing variation per mode.
- **API surface** (matrix to exercise):
  - **Per-entry rendering**: each `media_size` metaobject entry rendered as a media block with the picker resolved. Reader confirms the rendered size matches the entry's mode + value.
  - **Mode dispatch coverage**: ratio entries render with the expected `aspect-ratio`; relative entries with the expected viewport-relative height; fixed entries (if added per-project) with the expected absolute height; `fill` with `block-size: 100%`.
  - **`fill` handle-routed special**: the `fill` entry emits `block-size: 100%` regardless of its blank `type` / `value` fields (verifying the handle-routed branch fires before the type dispatch).
  - **Blank entry (unset picker)**: a media block with no `media_size` picked → no `aspect-ratio` / `block-size` emitted; image renders at its natural ratio.
- **Edge cases**:
  - `type` blank but `value` set → not a valid combo (schema allows it but no mode matches); falls through to no emission. Merchant footgun.
  - `type: ratio` with malformed `value` (e.g., `not-a-ratio`) → emits `aspect-ratio: not-a-ratio` which CSS drops as invalid; no aspect ratio applies. Diagnosable in DevTools.
  - `type: relative` with `value: 100vh` (vs `svh`) → emits `block-size: 100vh` which works but doesn't account for mobile UA chrome (svh is the small-viewport-height safe alternative). Merchant choice; not corrected by the metaobject.
  - `fill` entry renamed to `fills` → handle-routed branch fails; the entry's blank fields mean no other branch matches; falls through to no emission. The fill mode breaks for that store.
- **Visual showcase**: a grid of media blocks, each picking a different `media_size` entry. Labels show handle + mode + value. A reader scanning the grid confirms the sizing matches per entry. A second row demonstrates the blank-picker case (no `media_size` set) for the natural-ratio reference.
- **Assertions** (prose; Playwright once installed):
  - For each ratio entry: computed `aspect-ratio` on the media wrapper matches the entry's `value` (e.g., `1.778` for `16/9`).
  - For each relative entry: computed `block-size` on the media wrapper matches the entry's `value` resolved against the viewport (e.g., `50svh` ≈ half the viewport's safe height).
  - For the `fill` entry: computed `block-size` is `100%` of the parent's resolved size.
  - For the unset case: no `aspect-ratio` or `block-size` is set; the media renders at its natural intrinsic ratio.
- **Unit scope**: none (metaobject layer; no JS).

## Out of scope

- **`object-fit` per-entry.** The metaobject doesn't carry an `object-fit` field — it's hardcoded `cover` in the consumer's CSS. Per-context overrides happen at the block's stylesheet layer. Adding an `object_fit` field would let per-entry tuning, but the use case is narrow (product galleries needing `contain`); the consumer-side override is the documented escape hatch.
- **Per-viewport responsive sizes** (mobile_value + desktop_value). Single-value-per-mode today. Differential sizing per viewport requires either a new metaobject (`mobile_media_size`, already a separate block setting) or schema extension here. The current shape pairs with the media block's `mobile_media_size` setting that picks a separate `media_size` entry for mobile.
- **Aspect-ratio expressed as decimals.** Schema accepts strings like `16/9`; merchants writing `1.778` (decimal) get `aspect-ratio: 1.778` which CSS accepts. Diverging from the canonical `<n>/<n>` form is a merchant choice; not corrected.
- **Container-relative sizing.** Modes are `aspect-ratio` (relative to width) and `block-size` (relative to viewport or fixed). Container-relative units (`cqh`, `cqi`, `cqb`) aren't covered as a discrete mode but would work in the `value` field for `relative` type — projects compose freely.
- **CSS variable namespace for media sizes** (`--media-size-<handle>`). The metaobject doesn't emit named CSS variables; the consumer emits direct CSS properties per-block via dynamic style. Adding a variable namespace would let global-scope referencing but isn't supported by the current pattern.
- **Animation between sizes.** The metaobject is static; no JS reads or mutates the picked size at runtime. Animated transitions between sizes happen at the consumer's CSS layer (`transition: aspect-ratio …`), not in the metaobject.

## Related

- `media.md` — primary consumer spec; describes the full media rendering contract including the `media_size` resolution path and the per-mode CSS dispatch
- `embed.md` — secondary consumer spec; same sizing dispatch for iframe content
- `utility--media-sizing.liquid` (planned spec) — the shared resolver snippet that centralizes the mode-to-CSS dispatch logic; both `media` and `embed` reach through it
- `.context/docs/metaobject-definitions.md` § `media_size` — setup contract (Shopify admin metaobject definition schema, recommended entries, mode → CSS mapping table)
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (load-bearing handles incl. `fill`, handle-routed dispatch pattern)
