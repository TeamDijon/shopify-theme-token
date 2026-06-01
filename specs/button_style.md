# button_style

**Layer**: substrate

**Type**: metaobject (`button_style`)

**Status**: shipped

**Implementation**:
- `snippets/button.liquid` v1.2.0+ (consumer — appends `button-style:<handle>` to `data-modifiers`; the snippet's `{% stylesheet %}` block carries per-handle CSS rules targeting `[data-modifiers*='button-style:<handle>']`)
- Metaobject definition itself — created per `metaobject-definitions.md` § `button_style`

**Reconciled**: 2026-06-01

**Reviewed**: pending

**Depends on**: none — substrate-root token type. Consumed via the modifier system per `modifier-system.md`.

**Consumers**:
- `snippets/button.liquid` — primary consumer; reads the `button_style` setting from the button block, appends `button-style:<handle>` to `data-modifiers`, and applies the matching `{% stylesheet %}` rule
- `blocks/button.liquid` — block schema exposes the `button_style` setting (metaobject picker)
- Future consumers wanting a button-style cascade (e.g., a `cta-banner` preset configuring nested button blocks' style) — set the modifier on a parent wrapper; descendant button rules inherit via the attribute-contains selector

## Purpose

A named button variant catalog. Each entry's `system.handle` drives the `[data-modifiers*='button-style:<handle>']` CSS selector in `snippets/button.liquid`'s `{% stylesheet %}` block. The catalog is **schema-light** — the only field is `name` (admin-display) — because the visual configuration (background, border, padding, decoration, color tokens) lives in CSS, not metaobject fields. Merchants pick from a fixed handle vocabulary that the theme's CSS recognizes.

The handle set is the **3×3 family/variant matrix**:

|  | `-primary` (accent) | `-secondary` (black) | `-tertiary` (white) |
|---|---|---|---|
| `solid-` | `solid-primary` | `solid-secondary` | `solid-tertiary` |
| `outline-` | `outline-primary` | `outline-secondary` | `outline-tertiary` |
| `link-` | `link-primary` | `link-secondary` | `link-tertiary` |

Families set structural style (`bg` / `border` / `padding` / `text-decoration`); variants set the active color token (primary-button / secondary-button / link). Composing the matrix into 9 named handles gives merchants a vocabulary covering the common button intents without exploding the schema with per-property fields.

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name in admin (e.g., `Solid primary`, `Outline secondary`). `system.handle` derives from it on creation — the handle is what the CSS targets, so handle accuracy matters more than `name` polish. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

**No additional fields.** Visual configuration lives in `snippets/button.liquid`'s `{% stylesheet %}` block — adding a new style means extending the stylesheet, not adding metaobject fields. The design choice trades per-variant schema flexibility for centralized CSS authorship (one stylesheet, one source of truth for all 9 variants).

## Output shape

The metaobject itself produces no CSS or HTML — it's a catalog of named handles. The consumer (`button.liquid`) reads the picked entry's `system.handle` and renders:

```html
<button class="shopify-block shopify-block--button"
        data-modifiers="button-style:solid-primary">
  Click me
</button>
```

The `{% stylesheet %}` block in `button.liquid` provides per-handle rules:

```css
.shopify-block--button[data-modifiers*='button-style:solid-primary'] {
  background: var(--color-role-primary-button-background);
  color: var(--color-role-primary-button-text);
  border: var(--border-default) solid var(--color-role-primary-button-border);
  /* ... */
}
```

(Exact CSS lives in the consumer's stylesheet; this is illustrative.)

Off-list handles emitted by a merchant (e.g., custom-added `button_style` entry with handle `gradient-fancy`) get `data-modifiers="button-style:gradient-fancy"` on the rendered button, but no matching CSS rule fires — the button falls through to the default `solid-primary` appearance (per the snippet's CSS cascade). Per-project surfaces wanting custom variants add the CSS rule in their project stylesheet.

## CSS

N/A at the metaobject layer. The CSS for each variant lives in `snippets/button.liquid`'s `{% stylesheet %}` block. See `button.md` for the full per-handle styling contract.

## CSS custom properties (exposed)

N/A — the metaobject doesn't emit CSS variables. The button snippet's stylesheet composes from `--color-role-*-button-*`, `--radius-*`, `--border-*`, etc. (substrate tokens) per handle.

## Behavior

- **`system.handle` is the load-bearing key.** The handle drives the modifier value (`button-style:<handle>`) and the CSS selector match. Renaming a handle in admin moves the modifier value rendered on the button; if the CSS doesn't have a rule for the new handle, the button falls through to the default appearance.
- **`name` is decorative.** Display label for the admin picker. Not consumed at runtime. Renaming `name` doesn't change emission.
- **Off-list handles fall through to default.** A merchant adding a `gradient-fancy` entry gets the `button-style:gradient-fancy` modifier on the rendered button, but no matching CSS rule. The CSS cascade picks the base button rule (or whatever default-styling applies to off-list `button-style:*` modifiers). Per-project additions of the matching CSS rule in project stylesheets activate the variant.
- **Handles are kebab-case `family-variant`.** The two-word handle form (`solid-primary`, `outline-secondary`, etc.) matches the modifier-system convention — kebab-case for handles, the colon separator (`button-style:<handle>`) carries the namespace.
- **CSS via `{% stylesheet %}`, not metaobject fields.** Visual configuration is centralized; metaobject is the picker vocabulary. Adding a new family or variant means editing the snippet's stylesheet + seeding a matching entry in admin — two-step, but keeps the schema flat.
- **No CSS variable namespace.** Unlike `theme_color` → `--color-<handle>` or `spacing` → `--spacing-<handle>`, the button_style metaobject doesn't emit `--button-<handle>` variables. The styling composes from substrate tokens per handle inside the snippet's stylesheet.
- **Modifier system convention.** The `button-style:<handle>` value lives in `data-modifiers` per `modifier-system.md` — categorical state goes in `data-modifiers`, not classes. CSS uses attribute-contains selectors (`[data-modifiers*='button-style:<handle>']`).

## Seed entries

The full 3×3 matrix the snippet's stylesheet covers (per `metaobject-definitions.md` § button_style):

| Handle | Name |
|---|---|
| `solid-primary` | Solid primary |
| `solid-secondary` | Solid secondary |
| `solid-tertiary` | Solid tertiary |
| `outline-primary` | Outline primary |
| `outline-secondary` | Outline secondary |
| `outline-tertiary` | Outline tertiary |
| `link-primary` | Link primary |
| `link-secondary` | Link secondary |
| `link-tertiary` | Link tertiary |

The `link-*` family is what the BACKLOG-noted "link L1 block isn't needed" resolution leans on — a button block with `button_style: link-primary` renders as a text-link, covering the merchant's text-link use case without a separate primitive. See `composition-strategy.md` for the resolution rationale.

Per-project additions extend the catalog per archetype (`solid-cta-large`, `outline-promo`, etc.). Each addition pairs a seeded handle + matching CSS rule in the project stylesheet.

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page(s)**: `sections/validation--substrate--button-style.liquid` + `templates/index.validation--substrate--button-style.json` *(shipped)*. The page renders one button per seeded entry, showing the family × variant matrix at a glance.
- **API surface** (matrix to exercise):
  - **Per-entry rendering**: each `button_style` metaobject entry rendered as a button with `data-modifiers="button-style:<handle>"`. Reader confirms each button matches the family + variant intent (solid filled, outline ring-only, link text-decoration; primary uses accent, secondary uses black, tertiary uses white).
  - **3×3 matrix completeness**: all 9 family × variant combinations render with distinct styling. No two render identically.
  - **Modifier-attribute presence**: each button's `data-modifiers` attribute contains the expected `button-style:<handle>` token (verifiable in DevTools).
  - **Off-list handle (out-of-band test)**: a merchant-added entry with a custom handle (`promo-fancy`) renders with `data-modifiers="button-style:promo-fancy"` but no matching CSS rule → button visually falls through to default appearance. Diagnostic only — not validated visually since per-project surfaces handle the custom case.
- **Edge cases**:
  - Handle renamed in admin → button still picks the renamed entry (the metaobject reference is GID-stable); rendered `data-modifiers` now carries the new handle; CSS doesn't match unless a rule exists. Per-project response: rename the CSS selector too, OR seed a new entry with the original handle.
  - Entry with empty `name` → handle defaults to a Shopify-generated GID-suffix; CSS rule likely doesn't exist; falls through to default. Merchant footgun.
  - 10+ entries (per-project additions) → each just emits its own modifier value; the catalog is open-ended.
- **Visual showcase**: a 3×3 grid (rows: families, columns: variants), each cell rendering its named button. Per-cell label shows handle + name. A reader scanning the grid confirms the family-variant intent reads correctly visually.
- **Assertions** (prose; Playwright once installed):
  - Each rendered button carries `data-modifiers` containing `button-style:<handle>` matching its entry.
  - Computed `background-color`, `border-color`, `color`, `text-decoration` on each button match the family + variant intent per the snippet's stylesheet rules.
  - Hover / focus states fire per the snippet's `:hover` / `:focus-visible` rules using scheme-role `*-hover` tokens.
- **Unit scope**: none (metaobject layer; no JS in the metaobject itself).

## Out of scope

- **Per-variant schema fields** (per-entry `background`, `border-radius`, `padding` fields). Visual configuration lives in `snippets/button.liquid`'s `{% stylesheet %}` block; metaobject schema stays flat. Adding per-variant fields would split the source of truth between CSS and metaobject; the current design keeps CSS authoritative.
- **CSS variable namespace for buttons** (`--button-<handle>-*`). The snippet composes from substrate tokens per handle; no per-entry CSS variables emit. Adding them would either duplicate the substrate tokens (palette) or require per-variant overrides (outside the named-variant pattern).
- **Disabled state.** The `disabled` arg on the button snippet is queued in BACKLOG Bucket C (C9, surfaced from button spec retrofit 2026-05-29). Lives in `button.md`, not here — the metaobject just names variants; disabled is an orthogonal state.
- **Loading state.** Similar to disabled; orthogonal state surfacing on the button snippet, not the metaobject's concern.
- **Icon-only buttons.** The button snippet handles icon presence via its own settings; not a metaobject variant. A merchant wanting "icon-only solid-primary" composes via the button's `icon` setting + `content: ""` (or future schema for icon-only mode), not via a new metaobject entry.
- **Cross-platform / dark-mode-aware variants.** Color scheme handling lives in `theme_color` + scheme-role tokens; buttons inherit the active scheme's `*-button-*` colors. No per-scheme metaobject variants needed.

## Related

- `button.md` — primary consumer spec; describes the full button rendering contract (snippet args, schema, output shape, CSS rules per handle, locale keys); the `{% stylesheet %}` block details live there
- `theme-color.md` — sibling substrate metaobject (color palette); button styling composes from scheme-role `--color-role-*-button-*` tokens emitted per-scheme via `utility--css-variables`
- `container-style.md` — sibling named-variant metaobject (container variants for `group` / `columns` / `media`); identical schema-light pattern, CSS-centralized authorship
- `.context/docs/modifier-system.md` — categorical-state vocabulary; the `button-style:<handle>` value follows the convention's namespace pattern
- `.context/docs/metaobject-definitions.md` § `button_style` — setup contract (Shopify admin metaobject definition schema, recommended entries)
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (load-bearing handles, named-variant philosophy)
