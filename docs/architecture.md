# Theme architecture

The high-level map of how the pieces fit together. Detailed rules live in `.context/rules/` (path-scoped, auto-loading per file type); detailed docs live in `.context/docs/` (cross-referenced from rules). This file is the navigation layer above both — meant for an agent or developer landing in the repo cold, or for re-orientation after a break.

It does not duplicate content from rules or docs. It points and gives context.

## Repo layout

| Directory | Contents |
|---|---|
| `assets/` | JS modules (`*.js`), CSS (`core.css`), SVG icons (`icon-*.svg`) |
| `blocks/` | Schema wrappers — render a matching snippet by the same name; no rendering logic |
| `sections/` | Section files (standard sections wrap `<theme-section>`; specialized sections use `<theme-<name>>`) |
| `snippets/` | All actual rendering logic; consumed by blocks, sections, layouts, and other snippets |
| `layout/` | `theme.liquid` (default), `landing.liquid` (alt) |
| `templates/` | JSON section-list per page type |
| `config/` | Theme settings schema + values |
| `locales/` | Runtime + schema translation files |
| `.context/` | Git-worktree subtree with `rules/` (auto-load by `paths:` frontmatter) and `docs/` (cross-referenced) |

## Section render model

Every section renders as two nested wrappers:

```html
<section class="shopify-section shopify-section--<name>">
  <theme-section data-modifiers="...">
    <!-- content -->
  </theme-section>
</section>
```

Three layers, three audiences:

- **Outer `.shopify-section`** — universal scope (ours + apps'). Only outer-flow concerns: anchor scrolling, scroll-behavior. **No typography or background here** — would bleed into apps.
- **Per-section `.shopify-section--<name>`** — identity hook. Used rarely, only for outer-level overrides that can't live on the inner element (e.g., `position: sticky` for header sections).
- **Inner `<theme-section>` / `<theme-<name>>`** — our domain. All content-level appearance + behavior. JS runtime hooks via `BaseComponent`.

→ See `.context/rules/section-convention.md` Architecture for the full breakdown.

## Custom elements + JS runtime

`BaseComponent` (in `assets/base-component.js`) extends `HTMLElement` and lazy-loads four manager classes: `EventsManager`, `ObserversManager`, `CacheManager`, `ModifiersManager`. Every theme-* element gets all four through getters.

- **Standard sections** register `<theme-section>` directly as `BaseComponent`.
- **Specialized sections** define a class extending `BaseComponent` (e.g. `class ThemeCart extends BaseComponent`). > **Forward-looking** — no specialized sections authored yet; pattern documented for when we add them.

Module imports use `@theme/<name>` specifiers via the import map (`snippets/utility--import-map.liquid`). Liquid doesn't run in `assets/`, so the import map is the only place we can interpolate cache-busted URLs.

→ See `.context/rules/js-asset-convention.md`.

## Design system via metaobjects

Reusable design decisions (colors, typography, dimensions, icons, button styles) come from metaobjects, not hardcoded values. Seven types: `theme_color`, `text_style`, `typeface` + nested `font`, `content_width`, `icon`, `button_style`.

Two docs, separated by audience:

- `.context/docs/metaobject-definitions.md` — creation (for an agent setting up a fresh store)
- `.context/docs/design-system-metaobjects.md` — consumption (which Liquid utilities access which fields)

Schema settings prefer metaobject pickers (`"type": "metaobject"`) over hardcoded selects when content is curated. Hardcoded selects are fine for stable theme constants (breakpoints, alignment).

→ See `.context/docs/schema-conventions.md` for the picker-vs-select rule.

## Asset pipeline

Three flows, each with its own strategy:

- **Liquid-captured CSS** (output of `utility--css-variables`, `utility--font-face`, `utility--dynamic-style`) → `utility--css-minifier` → wrapped in `<style>` inline. The minifier does whitespace pass + comment strip + token collapse.
- **Static CSS files** (e.g., `core.css`, per-component CSS) → `utility--asset-loader`. Strategies: `link` (default, external `<link>`), `inline` (via `utility--inline-asset` → raw `<style>`), `false` (skip).
- **JS modules** → `utility--asset-loader`. Strategies: `module` (default, `<script type="module">`), `preload` (modulepreload + script), `inline`, `false`.

`utility--inline-asset` wraps `inline_asset_content` to handle blank input + missing-asset error strings; never call the raw filter.

→ See `.context/docs/asset-loading.md`.

## CSS layering

`assets/core.css` declares `@layer reset, theme, utilities;`:

- **`@layer reset`** — universal hygiene (box-sizing, margin/padding zero, media defaults, common typography).
- **`@layer theme`** — `.shopify-section` (outer, universal — minimal) + `:is(theme-section, theme-cart, theme-header, theme-footer, theme-overlay)` (theme defaults — typography, background, transition) + `theme-section` specific (layout, gutter, max-inline-size, form inputs).
- **`@layer utilities`** — opt-in modifiers like prose, skip-to-content.

When adding a specialized section root, add its tag to the `:is(...)` list so it inherits theme defaults.

## Conventions worth knowing upfront

| Convention | Cross-ref |
|---|---|
| `data-modifiers="key:value,..."` for state and dimensional tagging | `.context/docs/modifier-system.md` |
| `break` works outside `for` blocks for snippet early-exit | `.context/rules/snippet-convention.md` |
| `squish` is a no-op in this runtime — use `strip_newlines \| split: ' ' \| join: ' '` | `.context/rules/liquid-filter-gotchas.md` |
| `inline_asset_content` requires `utility--inline-asset` wrapper for safety | `snippets/utility--inline-asset.liquid` |
| `t:` prefix in schema JSON resolves into `*.schema.json` locale files | `.context/docs/locale-conventions.md` |
| Object construction via `null \| default:` for named-property objects | `.context/rules/liquid-object-construction.md` |
| Array building via `uniq \| concat \| reverse` for incremental list construction | `.context/rules/liquid-array-building.md` |

## Where to start when adding

- **New snippet** — `snippet-convention.md` for structure (header, doc block, liquid, output)
- **New block** — `block-convention.md` (thin schema wrapper that renders a matching snippet of the same name)
- **New section** — `section-convention.md` (standard or specialized; specialized roots also need adding to the `:is(...)` list in core.css)
- **New JS module** — `js-asset-convention.md` + append the filename (without `.js`) to `module_list` in `utility--import-map.liquid`
- **New icon** — drop `icon-<name>.svg` in `assets/`, create a matching `icon` metaobject entry. See `icon-convention.md` for SVG structure.
- **New metaobject** — document in **both** `metaobject-definitions.md` (creation) and `design-system-metaobjects.md` (consumption) before referencing in a schema
- **New translation key** — `locale-conventions.md` (taxonomy + decision flow)
