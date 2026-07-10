# Design-system metaobjects

The project exposes metaobject definitions that encode reusable design decisions. Block schemas should prefer a metaobject reference over free-form values when a matching metaobject exists.

This doc is the **consumption-side reference**: which metaobject types exist, which fields the Liquid utilities access, and how to use them in schemas. For the **type definitions** (field handles, types, and validations needed when creating these on a fresh Shopify store), see `metaobject-definitions.md`. The two docs are kept separate by audience: this one for developers consuming the metaobjects in code; the definitions doc for an agent or human setting up the store.

Populate as metaobjects are added; an undocumented metaobject should not be consumed by a block schema.

## Catalog

| `metaobject_type` | Common settings `id` | Observed access fields | Used for |
|---|---|---|---|
| `button_style` | `button_style` | `.system.handle` | Button visual variant. Handle set is a 3×3 family/variant matrix: family `solid-` / `outline-` / `link-` × variant `-primary` (accent) / `-secondary` (black) / `-tertiary` (white). Off-list handles fall through to `solid-primary`. |
| `content_width` | `content_width` | `.width.value` (numeric px) | Max inline-size of a component |
| `icon` | `icon` | `.file_name.value`, `.preset.value` | Consumed by `snippets/icon.liquid`; references `assets/icon-*.svg` by `file_name` |
| `theme_color` | `meta_theme_color` (settings), `background_color` (spacer), `text_color` (title, richtext), `line_color` (separator), `overlay_color` (media); also iterated via `metaobjects.theme_color.values` | `.system.handle` (used for CSS variable naming: `--color-<handle>`), `.hex_code.value` (hex string; only for non-CSS contexts like the `<meta name="theme-color">` tag — for CSS, reference the global `var(--color-<handle>)` instead) | Color token from the palette |
| `gradient` | — (iterated via `metaobjects.gradient.values`) | `.system.handle`, `.angle.value`, `.color_start.value`, `.color_end.value` | Scheme-adaptive linear gradient; consumed by `utility--css-variables` → `--gradient-<handle>` plus paired `--gradient-<handle>-start-opacity` / `-end-opacity` inputs (default `1`, consumer-overridable at block-level). Stops reference per-scheme `--color-role-<role>` wrapped in `rgb(from … / α)`. Handle `background` reserved (scheme background-gradient) |
| `typeface` | — (iterated via `metaobjects.typeface.values`) | `.name.value`, `.font_list.value` (size check + list of nested `font` entries) | Font family + its variants; consumed by `snippets/utility--font-face.liquid`. **Parent of `font`** — each typeface holds an inline list of `font` entries via the `font_list` field. |
| `font` | — (always accessed nested via `typeface.font_list.value`, never iterated top-level) | `.weight.value`, `.weight_range_start.value`, `.weight_range_end.value`, `.style.value`, `.asset_list.value` (list of file assets) | Single font variant inside a typeface. Supports static weights (100–900) and variable-font ranges (blank `weight` ⇒ use range fields). **Child of `typeface`** — not consumed independently. |
| `text_style` | `base_text_style` (singular); also iterated via `metaobjects.text_style.values` | `.system.handle`, `.font_family.value.name.value`, `.font_fallback_family.value` (`'mono'` / `'serif'` / `'sans-serif'`), `.font_style.value`, `.mobile_font_size.value` (px), `.desktop_font_size.value` (px), `.line_height.value` (decimal), `.weight.value`, `.letter_spacing.value` (px), `.uppercase.value`, `.underline.value` (booleans) | Typographic style definition; consumed by `snippets/utility--css-variables.liquid` which emits per-style `--<handle>-font-*` CSS variables and applies them to `[data-text-style=<handle>]`, `[data-modifiers*="text-style:<handle>"]`, plus bare `h1`–`h6` elements when the handle matches one. Entries matching the `base_text_style` setting also get re-exported as `--base-*` aliases |
| `container_style` | per-block `container_style` picker on `group`, `columns`, `media` | `.system.handle` | Named container variant; same handle-as-CSS-hook pattern as `button_style`, applied via `[data-modifiers*='container-style:<handle>']` from a centralized rule in `layer-theme.css` (see `container-style.spec.md`) |
| `media_size` | individual reference per media block | `.system.handle` (for the `fill` special), `.type.value` (`ratio` / `relative` / `fixed`), `.value.value` (CSS value: `16/9`, `100svh`, `400px`) | Sizing constraint for a media block; consumed by `media` and `embed` |
| `spacing` | section-level `block_rhythm`, optional per-block override; also auto-emitted globally | `.system.handle`, `.mobile_value.value` (px), `.desktop_value.value` (px) | Spacing token with mobile + desktop values; emitted globally as `--spacing-<handle>` by `utility--css-variables` (mobile in `:root`, desktop in nested `@media`). Substrate-aligned handles (`xs`/`sm`/`md`/`lg`/`xl`) override `layer-base.css` defaults via cascade position; custom handles add new slots. Block-rhythm consumes the namespace via `--block-rhythm: var(--spacing-<picked-handle>)` set per-section; the `spacer` block's `size` setting resolves a token to `var(--spacing-<handle>)` for its height |

## Why three hidden `font_picker` theme settings exist

Fonts are self-hosted via the `typeface`/`font` metaobjects, rendered as `@font-face` by `utility--font-face` — not Shopify's `font_picker`/`font_modify` pipeline. The three `font_picker` theme settings (`mono_font`, `sans_serif_font`, `serif_font` in `config/settings_schema.json`) are `visible_if: false` (hidden from merchants) and exist purely to supply the generic-family fallback stack that `text_style.font_fallback_family` appends after the custom typeface in the CSS `font-family` cascade.

These settings are load-bearing despite being hidden — removing them would break fallback rendering when a custom typeface fails to load. Shopify's font ecosystem ships these stacks per generic family, and tapping into them is the cleanest way to inherit Shopify-curated fallbacks. Each setting carries an `info` field documenting this for any dev opening `settings_schema.json`.

## Schema usage

```json
{
  "type": "metaobject",
  "metaobject_type": "button_style",
  "id": "button_style",
  "label": "Style"
}
```

**Color setting naming**: prefer role-specific ids (`text_color`, `line_color`, `background_color`, `overlay_color`) over a generic `content_color`. Labels stay user-facing ("Color"), but the id self-documents which CSS property the value drives — and disambiguates when a block exposes multiple colors (e.g. text + background).

## Storing a metaobject reference value (handle, not GID)

A `"type": "metaobject"` setting stores its value as the entry **handle** wherever a value is written by hand — a JSON template (`templates/*.json`), a preset's `settings` block in a section/block schema, or `config/settings_data.json`. `settings.<id>` / `section.settings.<id>` / `block.settings.<id>` then resolves that handle to the metaobject object.

A `gid://shopify/Metaobject/<id>` value **silently resolves to `nil`** — no error, no theme-check offense; the setting reads blank and the consumer falls through to its default. This is the failure mode behind a section rendering on substrate defaults despite a populated-looking setting.

```json
// ✅ resolves
{ "media_size": "half-screen", "content_width": "reading", "button_style": "solid-primary" }
// ❌ silently nil — renders on defaults
{ "media_size": "gid://shopify/Metaobject/463668904322" }
```

Handles are portable: Token's seed catalog uses the same handles on every store, so a handle-valued setting resolves after a theme push; a GID is store-scoped and does not. (The Shopify editor writes the handle automatically when a merchant picks an entry — this only bites hand-authored JSON.)

## Liquid usage

Always guard with a blank check before accessing nested fields. Metaobject references can be blank even when a setting exists.

```liquid
{% if button_style != blank %}
  {{ button_style.system.handle }}
{% endif %}
```

When the value is passed through the modifier system, emit as `<key>:<handle>` — see `.context/docs/modifier-system.md`.

**Compare references by `.system.id`, not `==`.** Two metaobject drops of the same entry are distinct instances, so `a == b` is `false` even when they point to the same entry; `a.system.id == b.system.id` is the identity test. (This bit the `base_text_style` match in `utility--css-variables`, which silently emitted no `--base-*` aliases until it switched to `.system.id`.)

### Dual-API consumption (when a snippet accepts either)

Some snippets accept either a metaobject reference OR the primitive value(s) the metaobject would have provided. `snippets/icon.liquid` is the canonical example: it takes either an `icon` metaobject ref or a `file_name` string. Pick by what the caller has on hand — neither path is preferred:

- Caller has the metaobject (from a `"type": "metaobject"` setting, or from `metaobjects.<type>.<handle>`) → pass the ref. Snippet reads the relevant fields.
- Caller has the primitive directly (typical in hardcoded markup) → pass it. Snippet uses it as-is, bypassing the metaobject lookup.

The snippet's doc block specifies which fields the metaobject path reads, so the primitive path is one-to-one with those fields — same render output, different input shape.

## Adding a new metaobject

1. Create the metaobject definition in the Shopify admin (or via an agent following `metaobject-definitions.md`)
2. Document it in **both** docs: this one (consumption — which fields code accesses) and `metaobject-definitions.md` (creation — field handles, types, validations)
3. Only then reference it in a block schema

## Load-bearing handles

Most field references resolve by GID, so handle renames are safe. A few patterns *do* couple to the entry's `system.handle` directly — renaming the entry in admin will silently break them. Keep these handle sets stable:

- `theme_color` — handles drive `--color-<handle>` CSS variable names; consumed by every CSS rule that uses `var(--color-X)`. Semantic seeds (`success`, `warning`, `error`, `info`) are referenced from component CSS for state-driven styling — renaming silently breaks consumers
- `text_style` — handles `h1`–`h6` auto-bind to bare HTML headings (`utility--css-variables`); other handles drive the `[data-modifiers*="text-style:<handle>"]` selector
- `typeface` — entry's `name.value` is read by `utility--font-face` and emitted as the quoted `font-family` value in `@font-face` rules + the `--<style>-font-family` CSS variable. Renaming a typeface entry's `name` silently changes the CSS `font-family` token everywhere it's consumed
- `media_size` — handle `fill` is a special-case branch in the media block (no type/value, emits `block-size: 100%`)
- `button_style`, `container_style` — handles drive `[data-modifiers*='button-style:<handle>']` / `[data-modifiers*='container-style:<handle>']` CSS rules in the respective stylesheets (button's in the snippet, container's centralized in `layer-theme.css`)
- `gradient` — handles drive `--gradient-<handle>` CSS variable names. The `background` handle is reserved (the per-scheme `--gradient-background` from the color-scheme system owns it) and is skipped at emit time in `utility--css-variables`
- `spacing` — handles drive `--spacing-<handle>` CSS variable names; T-shirt handles (`xs`/`sm`/`md`/`lg`/`xl`) align with `layer-base.css`'s substrate scale and override the substrate defaults via cascade position. Block-rhythm consumes the namespace via `--block-rhythm: var(--spacing-<picked-handle>)` set per-section. Renaming a substrate-aligned entry drops the override (substrate default reapplies at the slot; renamed entry becomes a custom slot)

If you need to rename one of these, audit consumers first.

## Extending a substrate scale (two-emitter cascade-position override)

When a substrate stylesheet seeds a named scale (e.g., `assets/layer-base.css` seeds `--spacing-xs/sm/md/lg/xl`) and a metaobject catalogs the same scale (e.g., `spacing` entries via `utility--css-variables`), the two emitters live in the same `:root` and the metaobject's later emission wins by cascade position. No special-case logic in either emitter — matching handles override, non-matching handles add new slots.

The pattern works wherever a substrate provides a default scale that a project might want to extend or rebase per-brand without a separate `--project-<scale>-<handle>` namespace. Candidates: `--spacing-*` (active today, via `spacing`), hypothetical future `--radius-*` (via a `radius` metaobject), `--duration-*` (via a `motion` metaobject).

The contract names three commitments:

1. **Substrate seeds first** in `layer-base.css` (or equivalent) — provides defaults for the named handles every L0/L1 consumer can read unconditionally
2. **Metaobject emits later** in `utility--css-variables` (after the substrate file in the inline-CSS sequence) — entries override matching handles via cascade position
3. **Non-matching handles add new slots** — the metaobject is open-ended; per-project entries coexist with the substrate scale

This is what spacing does today. New scale extensions should follow the same shape rather than inventing per-scale override mechanisms.

## Related

- `metaobject-definitions.md` — type definitions for setup (audience: agent/human creating definitions on the store)
- `schema-conventions.md` — when to prefer a metaobject picker over a hardcoded select
