# Specs index

Specs for elements in the theme — shipped (retrofit) and planned. Organized by composition layer (see `.context/docs/composition-strategy.md`). Each spec describes the API, output shape, behavior, and validation surface per `validation-contract.md`.

Originally sourced from the EXPLORATION-2 inventory pass (May 2026); retrofits added as shipped elements get documented.

## Substrate

- [theme-color](./theme-color.md) — named color tokens emitted as `--color-<handle>` in `:root`; scheme-role tokens (`--color-role-<role>`) live in a disjoint namespace *(shipped — retrofit)*
- [text-style](./text-style.md) — reusable typography style metaobject; entries emit `--<handle>-font-*` variables + a selector rule binding them; `h1`–`h6` handles auto-bind to bare tags; one entry (`base_text_style` setting) emits `--base-*` aliases consumed by the body rule *(shipped — retrofit)*
- [gradient](./gradient.md) — scheme-adaptive linear gradient metaobject; angle + two scheme-role endpoints emit one `--gradient-<handle>` declaration whose stops re-resolve per color scheme; `background` handle reserved for the color-scheme system *(shipped — retrofit)*
- [font-system](./font-system.md) — merged substrate spec for the font catalog: `font` + `typeface` metaobjects + `utility--font-face.liquid` emitter. Walks typefaces → fonts → `@font-face` rules; handles static + variable-weight modes, format mapping (woff2/woff/otf/ttf), skip rules; `font-display: swap` fixed *(shipped — retrofit)*
- theme-events — typed cross-component event bus (Bucket B dependency). `CartUpdateEvent` / `VariantUpdateEvent` carrying `detail.resource` + affected `sections`; deferred from `events-manager` (which covers add/remove of platform listeners only) and `modifiers-manager` (out-of-scope deferral). Lands when the dynamic-runtime cluster ships *(planned)*
- [container-style](./container-style.md) — named container variant (handles project-seeded; no canonical set); handle drives a centralized `[data-modifiers*='container-style:<handle>']` rule in `layer-theme.css` scoped across `group` / `columns` / `media` *(shipped — retrofit)*
- [spacing](./spacing.md) — named spacing token catalog with mobile/desktop px pairs; auto-emits `--spacing-<handle>` via `utility--css-variables` (mobile in `:root`, desktop in nested `@media`); T-shirt handles (`xs`/`sm`/`md`/`lg`/`xl`) override `layer-base.css` substrate defaults via cascade position; consumed by section `block_rhythm` setting and by any component reading the unified spacing namespace *(shipped — retrofit)*
- [content-width](./content-width.md) — named max-inline-size catalog; emitted as `--content-width: <value>px` per-section / per-block via dynamic style; cascades through nested block-level overrides; `125rem` substrate fallback in `layer-theme.css` covers unset case; `min(var(--content-width), 100% - 2 * --gutter)` clamp in the bleed-grid named-line cap *(shipped — retrofit)*
- [button-style](./button-style.md) — schema-light named button variant catalog; `system.handle` drives `[data-modifiers*='button-style:<handle>']` selectors in `snippets/button.liquid`'s `{% stylesheet %}` block; 3×3 family/variant matrix (solid/outline/link × primary/secondary/tertiary); CSS authored centrally, schema stays flat *(shipped — retrofit)*
- [media-size](./media-size.md) — named media sizing catalog; three modes via `type` field (`ratio` / `relative` / `fixed`) plus one handle-routed special (`fill` — reserved, load-bearing); 9 seed entries cover common compositions; mode dispatch lives in `utility--media-sizing.liquid`, shared by `media` and `embed` *(shipped — retrofit)*

## Layer 0 — Snippets


## Layer 1 — Theme blocks


## Section host


## Layer 2 — Presets on `section.liquid`

Parked. Authoring + validation lands after L1 block validation hardens. The 4 existing `sections/validation--preset--*.liquid` scaffolds (`hero`, `content`, `columns-features`, `cta-banner`) remain on disk as composition references but are not tracked here until preset work resumes — see local `BACKLOG.md`.

## Beyond L2 — Specialized sections

Parked. Authoring + validation lands after substrate confidence is established (subgrid migration ships + L1 block validation hardens). Earmarked: `header`, `footer`, future `cart` / `faq` / `collection-grid` / `featured-product` — see local `BACKLOG.md`.
