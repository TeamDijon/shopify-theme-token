# title

**Layer**: 1

**Type**: block (`blocks/title.liquid`) + matching snippet (`snippets/title.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/title.liquid` v1.1.5 (render surface)
- `blocks/title.liquid` v1.3.0 (block schema + render call)

**Reconciled**: 2026-06-29 (snippet v1.1.5 — capped block centers via `justify-self: center` instead of `margin-inline: auto`, so a capped title inside a flex container follows the container's `align-items` instead of force-centering; grid centering unchanged. Surfaced by the hero Tier-3 page. Block v1.3.0 unchanged.)

**Reviewed**: pending

**Depends on**: `snippets/icon.liquid` (optional, for leading icon), `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `text_style` metaobject (optional), `icon` metaobject (optional), `content_width` metaobject (optional), `theme_color` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid`, `blocks/media.liquid`

## Purpose

Heading primitive. Renders one of `<h1>`–`<h6>` or `<p>` with rich inline content, optional leading icon, and per-instance text styling. Distinguishes from `richtext` by intent: title is a single-line semantic heading consumed as a structural anchor (sidebar IA, contents-of-page hierarchy); richtext is a multi-paragraph rich body. The tag is a separate setting from styling — a merchant picks `tag: h3` for the heading hierarchy and `text_style: display-large` for the visual treatment independently.

`text_style` flows through the `text_style` metaobject's handle-driven binding system. Blank `text_style` falls through to the bare-tag binding (e.g. `<h2>` auto-binds to the `h2` text_style entry via `utility--css-variables`), so the default rendering is "the heading tag's theme-default style."

## API

Snippet args (`{% render %}`) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` for render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. |
| `block` | block | yes (render) | — | Snippet-only. |
| `block_id` | string | no | — | Snippet-only. |
| `content` | inline_richtext | yes | — | Title text; supports inline rich text (em, strong, links). Snippet `break`s when blank. |
| `tag` | select (`h1` / `h2` / `h3` / `h4` / `h5` / `h6` / `p`) | no | `"h2"` | HTML tag for the rendered element. Drives both the bare-tag text_style auto-binding and the document heading hierarchy. `p` is the non-heading escape hatch for visually heading-like text that shouldn't appear in the document outline. |
| `text_style` | metaobject (`text_style`) | no | blank → bare-tag auto-binding | Reads `.system.handle`; emits `text-style:<handle>` modifier. The global text_style rules in `utility--css-variables` match `[data-modifiers*='text-style:<handle>']` and apply the entry's font-family/size/weight/etc. Blank → no modifier; the bare-tag rule wins. |
| `icon` | metaobject (`icon`) | no | blank | Inline SVG before the title content via `snippets/icon.liquid`. Sized to `0.75em` block-size, sits inline with text via `display: inline-flex`. |
| `text_align` | select (`start` / `center` / `end`) | no | `"start"` | Inline text alignment. Emits `--text-align` only when ≠ `start`. |
| `content_width` | metaobject (`content_width`) | no | blank → 100% | Caps `max-inline-size`. Centers via `justify-self: center` in grid contexts when capped; inside a flex container follows the container's alignment. |
| `text_color` | metaobject (`theme_color`) | no | blank → `--color-role-foreground-heading` | Reads `.system.handle`; emits `--text-color: var(--color-<handle>)`. |
| `mobile_margin_block_start` | range (0–100, step 2, px) | no | `0` | Top margin below the desktop breakpoint. |
| `desktop_margin_block_start` | range (0–100, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. |

## Output shape

```html
<{tag} class="shopify-block shopify-block--title"
       id="<base-selector>"
       {{ block.shopify_attributes }}
       data-modifiers="text-style:display-large">  <!-- when text_style is set -->
  <svg>…icon…</svg>   <!-- optional, when icon is set -->
  {content}
</{tag}>
```

Tag selection happens via Liquid string interpolation — the same `id` / `class` / `data-modifiers` apply regardless of which tag emits. `data-modifiers` is omitted entirely when `text_style` is blank (the modifier-emitter helper returns nothing for an empty list).

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--title`. Layered in `@layer components`.

```css
.shopify-block--title {
  max-inline-size: var(--content-width, 100%);
  color: var(--text-color, var(--color-role-foreground-heading));
  text-align: var(--text-align, start);
  /* justify-self: center emitted per-instance only when content_width is set */

  & svg {
    display: inline-flex;
    block-size: 0.75em;
    min-inline-size: 0.75em;
    margin-inline-end: 0.25em;
    vertical-align: -0.05em;
  }
}
```

Typography (font-family, size, weight, line-height, letter-spacing) is **not** declared on `.shopify-block--title`. The bare-tag binding in `utility--css-variables` (matching `h1`–`h6`, `p`) or the `[data-modifiers*='text-style:<handle>']` rule supplies typography. Title-block CSS only handles structure (width, centering, color, alignment) and the inline-icon adjacency.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm` via `utility--block-layout-vars` (the section sets `--block-rhythm: var(--spacing-<picked-handle>)`).

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars` — see that spec for the variable contract + emission rules. Block-specific fallbacks consumed via `var(--<name>, <fallback>)` in this block's CSS: `--content-width` → `100%`; `--mobile-margin-block-start` → `0`; `--desktop-margin-block-start` → inherits mobile.

Title-specific vars:

| Variable | Purpose | Default |
|---|---|---|
| `--text-color` | Heading color | `var(--color-role-foreground-heading)` |
| `--text-align` | Inline alignment | `start` |

Zero-emission discipline: `--text-color` only emitted when `text_color` is set; `--text-align` only emitted when ≠ `start`.

## Behavior

- **Tag-as-string interpolation.** `<{{ tag }}>...</{{ tag }}>` emits the selected element. Liquid handles the substitution at render time; the snippet's output is one of seven concrete tags depending on the setting. The tag carries the same class / id / modifiers regardless.
- **Bare-tag auto-binding via `text_style`.** When `text_style` is blank, the rendered element inherits typography from the matching `text_style` metaobject entry whose handle equals the tag name (`h1` → entry `h1`, `h2` → entry `h2`, …). `utility--css-variables` emits `h1, h2, h3, ..., p { ... }` rules per entry. The pattern means "default headings look right" without per-block configuration; merchants override only when a specific block needs a non-default style.
- **`text_style` override path.** Setting `text_style` to a non-blank metaobject emits `data-modifiers="text-style:<handle>"`; the corresponding selector (`[data-modifiers*='text-style:<handle>']`) in `utility--css-variables` re-applies that entry's typography, overriding the bare-tag rule. Modifier-driven overrides win cleanly because they sit later in the cascade by virtue of selector specificity (`[data-modifiers*='']` adds one attribute selector beyond the bare tag).
- **Icon placement.** Optional inline SVG before the title text, scaled to `0.75em` so it sits comfortably with cap-height. `vertical-align: -0.05em` corrects optical balance against the baseline. The icon's color inherits from the title's `color` (which itself resolves to `--text-color` or the heading role).
- **`p` tag is the non-heading escape.** When a title-style visual element shouldn't appear in the document outline (e.g. a card eyebrow, a styled subtitle inside a richtext block), `tag: p` renders the same visual treatment without polluting the heading hierarchy. The bare-tag binding for `p` is the body text_style by default; setting `text_style` explicitly is the typical pairing here.
- **Content-width caps; centers (grid) or follows the container (flex); uncapped fills.** `justify-self: center` is emitted only when `content_width` is set. In a grid context (section content track, columns track) it centers the capped block; in a flex container (`group`, `<media-contents>`) `justify-self` is ignored, so the container's `align-items` governs. Blank `content_width` → no `justify-self` override → fills the container (grid `justify-self: stretch`). Replaced `margin-inline: auto`, which would win over a flex parent's alignment (force-centering a capped block) and disable grid stretch (collapsing an uncapped one); identical to it in grid contexts.
- **Color fallback.** `--text-color` overrides `--color-role-foreground-heading` (the scheme's heading-emphasis color). Blank `text_color` keeps the role's value, which is typically a deeper / more saturated value than `--color-role-foreground` (body color).
- **Early-exit on blank content.** `content` is `inline_richtext`; blank → snippet `break`s and the block emits no DOM. Consistent with button / richtext.
- **`{{ block.shopify_attributes }}` emission.** On the root tag, for theme-editor block selection.

## Locale keys

Schema strings under `blocks.title.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.title.name`
- `blocks.title.settings.title.content` (group header)
- `blocks.title.settings.content.{label,default}`
- `blocks.title.settings.tag.{label,options.{h1,h2,h3,h4,h5,h6,p}}`
- `blocks.title.settings.text_style.{label,info}`
- `blocks.title.settings.icon.label`
- `blocks.title.settings.text_align.{label,options.{start,center,end}}`
- `blocks.title.settings.content_width.{label,info}`
- `blocks.title.settings.text_color.{label,info}`
- `blocks.title.settings.top_spacing.content` (group header)
- `blocks.title.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.title.presets.title.{name,category}`

No runtime strings (the visual element renders the merchant's `content` directly).

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block-backed; no sub-component half)
- **Source**: `snippets/title.validation.json` — colocated fixture matrix (`{ settings, blocks, block_order }`), staged into the generic `?view=validation` slot by `.scripts/validation-generate.mjs` (`sections/validation.liquid` harness + a generated, gitignored `templates/index.validation.json`) for the run, then dropped.
- **Tests**: `snippets/title.test.js` (executable; `npm run test:e2e`)
- **Requires seeded**: `text_style/h1`, `theme_color/accent`, `icon/arrow`, `content_width/reading` — Token's shipped seed catalog (see `text-style.spec.md`, `theme-color.spec.md`, `icon.spec.md`, `content-width.spec.md` § Seed entries). A test needing an unseeded handle signals a seed-set gap, not a test workaround.
- **API surface**:
  - **Tag matrix**: render the same content across `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `p` — verify the DOM element tag matches the setting per instance
  - **text_style override**: with `tag: h2`, set `text_style` to each shipped entry → verify the modifier is emitted and the typography matches the entry (overriding the bare `h2` style)
  - **text_style blank**: blank → no modifier emitted; computed typography matches the bare-tag entry from `text_style.values`
  - **Icon variation**: with and without `icon` — verify SVG presence, sizing, inline placement
  - **text_align**: `start` (default, no modifier or var), `center` (var emitted), `end` (var emitted)
  - **content_width**: blank vs narrow vs wide → verify cap and centering
  - **text_color**: blank (defaults to role-heading) vs each shipped `theme_color` entry → verify color
  - **Top-spacing**: independent mobile + desktop values
- **Surface delegation**: text_style metaobject legibility is exercised at the `text-style` page showcase; this run exercises only the **resolution chain** (setting → metaobject lookup → render), not the entry's typography quality.
- **Edge cases**:
  - Blank `content` → snippet `break`s; nothing renders (no root element emitted)
  - `tag: p` with `text_style` set → `<p data-modifiers="text-style:display-large">…</p>` (mixed tag + style is valid)
  - `text_style` set to a handle with no matching entry (e.g. seed an off-list value) → modifier still emitted; CSS rule does not match; bare-tag binding stays in effect (graceful fall-through, no broken render)
  - Inline rich text in `content` (em / strong / links) → preserved in the heading; document outline still uses the visible text
- **Visual showcase**: matrix of tags × text_styles × alignments. Reader confirms tag-emission branch, style application via modifier, alignment per setting, color resolution, icon placement.
- **Assertions** (executable — `snippets/title.test.js`):
  - Each instance's rendered DOM element matches the configured `tag` (`h1`–`h6`, `p`)
  - Default instance (bare `h2`, no overrides) emits no `data-modifiers`; root carries an `id`
  - Bare-tag bindings produce a descending font-size hierarchy (`h1` > `h2` > `h3`)
  - `text_style` override emits `data-modifiers="text-style:<handle>"` and applies the entry typography over the bare tag (an `h3` set to `text_style: h1` computes the `h1` font-size)
  - Inline rich text (`em` / `strong` / `a`) is preserved
  - `icon` renders as a leading `<svg>` (first child)
  - `text_align` `center` / `end` emit `--text-align` and compute the matching `text-align`; `start` emits nothing
  - `text_color` resolves to the `theme_color` value (`accent` → `rgb(255, 107, 53)`) and differs from the default heading color
  - `content_width` emits `--content-width` (`reading` → `42.5rem` / `680px`) and centers in the grid (`justify-self: center`; symmetric leftGap ≈ rightGap)
  - Top-spacing emits `--mobile-/--desktop-margin-block-start` — a loose override (`1.0rem` / `4.0rem`) and a tighter-than-rhythm override (`0.5rem` / `1.0rem`), both absolute values that replace the section rhythm; painted in the production-faithful harness
  - Blank `content` renders no element — no empty title leaks into the suite
- **Deliberately unasserted**: `block.shopify_attributes` (editor-only, not emitted on `?view=` renders); off-list `text_style` handle fall-through (needs a seeded handle with no matching binding, which the shipped catalog omits). text_style typographic legibility is delegated to the `text-style` page showcase.
- **Unit scope**: none (Liquid + CSS only)

## Out of scope

- **Multi-line auto-balancing** (`text-wrap: balance`) — not declared; per-project CSS adds when a project wants it. The Liquid contract stays type-agnostic.
- **Anchor / `id` generation for in-page navigation** — `id` on the root is the unique `base-selector` (for dynamic-style scoping), not a slug derived from content. Anchor-link patterns need a separate setting or per-project pattern.
- **Heading-level auto-detection from section nesting** — the `tag` is explicit per-block. Headings are merchant intent, not derived.
- **`text_decoration` setting** — underline / strikethrough are per-text_style decisions, not per-title-instance. A merchant wanting an underlined title picks a `text_style` entry that includes underline.
- **Multi-style spans inside `content`** — `inline_richtext` supports a single nested style application (em / strong / link inline). Multiple distinct visual styles inside one title require either rich-text spans (per-project markup) or composing multiple title blocks.

## Related

- Composition strategy (title vs richtext distinction; bare-tag substrate styling): `.context/docs/composition-strategy.md`
- Schema conventions (top-spacing pair, color-token setting naming): `.context/docs/schema-conventions.md`
- Design-system metaobjects (`text_style` consumption, `icon` consumption, `theme_color` consumption): `.context/docs/design-system-metaobjects.md`
- Modifier system (`data-modifiers` convention for `text-style:<handle>`): `.context/docs/modifier-system.md`
- Theme-color spec (the `--color-<handle>` namespace consumed by `text_color`): `theme-color.spec.md`
