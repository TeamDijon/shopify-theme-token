# container-style

**Layer**: substrate

**Type**: metaobject (`container_style`)

**Status**: shipped

**Implementation**:
- `assets/layer-theme.css` `@layer theme` — variant CSS rules scoped across `:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:<handle>']`; substrate stylesheet pinned by description per `spec-convention.md` § Substrate stylesheets
- Metaobject definition itself — created per `metaobject-definitions.md` § `container_style`

**Reconciled**: 2026-05-31 (pin format clarified — substrate CSS pinned by description rather than version; structural anchor is the `:where()` selector chain in `@layer theme`)

**Reviewed**: pending

**Depends on**: none — substrate-root token type

**Consumers**:
- `snippets/group.liquid` — emits `container-style:<handle>` modifier when set; variant CSS comes from `layer-theme.css`
- `snippets/columns.liquid` — same emission pattern
- `snippets/media.liquid` — same emission pattern

## Purpose

A named container variant — visual identity (border, background, padding, shadow) applied to one of the three container blocks (`group`, `columns`, `media`) via a single metaobject reference. The handle drives a `[data-modifiers*='container-style:<handle>']` selector matched centrally in `layer-theme.css`'s `@layer theme`, scoped across all three container consumers so the same handle yields the same visual treatment regardless of which container block selected it.

Same handle-as-CSS-hook pattern as `button_style`: the intent ("I want this to look like a card") is decoupled from the appearance definition. The merchant picks a handle on a container block; the project's CSS defines what `card` looks like.

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | no | Display name in admin; `system.handle` derives from it. Never read by Liquid. |

No value-carrying fields. Visual configuration (border, radius, shadow, padding, background) lives in CSS, not in metaobject fields. Adding a new variant means seeding a new entry AND extending `layer-theme.css`'s `@layer theme` rules.

## Output shape

No direct emission. The `system.handle` of a referenced entry is appended to the consuming block's `data-modifiers` attribute as `container-style:<handle>`:

```html
<div class="shopify-block shopify-block--group"
     data-modifiers="container-style:card">
```

Variant CSS lives in `layer-theme.css` `@layer theme`:

```css
@layer theme {
  :where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:card'] {
    /* card variant: padding + scheme background + subtle shadow */
  }
}
```

`:where()` keeps specificity at zero so per-block stylesheets can override without escalation.

## CSS

N/A at the metaobject layer — the rules live in `layer-theme.css`, owned by the substrate-level variant ruleset. The metaobject contributes only the handle name; the CSS file holds the appearance.

## CSS custom properties (exposed)

N/A — variants drive concrete visual values (border, shadow, padding, background) directly. Per-project overrides are written as new variant rules, not via variable redefinition.

## Behavior

- **Same handle, same look across containers.** A `card` handle picked on a `group` looks the same as `card` on `columns` and `card` on `media`. The centralized `:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='...']` selector guarantees it.
- **No handle, no variant styling.** Blank `container_style` setting → no modifier emitted → no variant rule matches → block renders with its default chrome (transparent, no border, no padding beyond the block's own).
- **Off-list handle is the diagnostic mode.** A merchant-created entry whose handle has no matching CSS rule in `layer-theme.css` emits the modifier but produces no variant styling — same diagnostic as `button_style`'s off-list-handle behavior. In a properly-paired extension this is transient; in production it indicates an incomplete extension.
- **Per-project extension is two-step.** Token's base ship covers three variants (`card` / `outlined` / `elevated`). Adding a new variant requires (1) creating a `container_style` metaobject entry with the new handle AND (2) extending `layer-theme.css` `@layer theme` with a matching `:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:<new-handle>']` rule. The 3-selector `:where()` chain is the constraint that keeps semantics shared across the container family.
- **No cascading.** Selecting `card` on a group does NOT propagate to nested containers. Each container level opts in independently.

## Seed entries

| Handle | Name | Default visual (Token base ship) |
|---|---|---|
| `card` | Card | Padding + `--radius-default` + scheme background + subtle shadow |
| `outlined` | Outlined | Padding + `--radius-default` + foreground-color border, no fill |
| `elevated` | Elevated | Padding + `--radius-default` + scheme background + stronger shadow |

Per-project projects may extend with brand-specific variants (`panel`, `bordered-dashed`, `concave`, etc.) per the extension pattern above.

## Locale keys

N/A — handle-only metaobject, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page**: `sections/validation--substrate--container-style.liquid` + `templates/index.validation--substrate--container-style.json` (shipped)
- **Surface**: each variant (card / outlined / elevated) applied to each of the three container blocks (group / columns / media). Reader confirms identical appearance across containers per variant — verifying the centralized rule is what fires, not per-block duplicates.
- **Edge cases**:
  - Off-list handle → modifier emits, no variant styling, block renders with default chrome (diagnostic mode)
  - Stacked containers (group inside a card-styled group) → each level renders its own variant independently; no cascade
- **Visual showcase intent**: a reader confirms (1) all three variants render legibly, (2) the same variant looks identical across all three container blocks, (3) nested variants don't bleed into parents or children.
- **Assertions** (prose; Playwright once installed): variant CSS rules attach to elements carrying the matching modifier; computed-style source is `layer-theme.css`, not a per-block stylesheet.
- **Unit scope**: none (CSS only).

## QoL — variant browse page

The validation page doubles as the developer-facing variant catalog (same intent coincidence pattern as `theme_color`). A reader (developer, agent) browsing it can copy variant handles, see the visual per container, and confirm naming.

## Out of scope

- **Field-driven variant configuration.** Variants are CSS-defined, not field-defined. Adding `border_color`, `radius`, `shadow` fields would re-create what the cascade already provides via per-rule values. Variants are *named appearances*, not *configurable appearances*.
- **Per-container-block variant differences.** The centralized `:where()` selector intentionally makes the same handle look the same across all three containers. A project wanting "card on group looks different from card on media" should create separate handles (`group-card`, `media-card`) and per-block CSS rules — not parameterize the existing handle.
- **Cascading variants.** Selecting a variant on a parent container does not propagate to nested containers. Each level opts in independently.
- **`-rgb` companion handles.** Not applicable; container_style doesn't expose color tokens directly.

## Related

- Container patterns (inner padding as one of the three sizing concepts; composition with bleed): `.context/docs/container-patterns.md`
