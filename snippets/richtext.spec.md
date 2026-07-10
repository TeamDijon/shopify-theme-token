# richtext

**Layer**: 1

**Type**: block (`blocks/richtext.liquid`) + matching snippet (`snippets/richtext.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/richtext.liquid` v1.2.3 (render surface)
- `blocks/richtext.liquid` v1.4.0 (block schema + render call)
- `assets/layer-utilities.css` `@layer utilities` — `[data-modifiers*='prose']` rhythm + reaffirmed list markers (`ul`/`ol` `list-style`)

**Reconciled**: 2026-06-29 (snippet v1.2.3 — capped block centers via `justify-self: center` instead of `margin-inline: auto`, so a capped richtext inside a flex container follows the container's `align-items` instead of force-centering; grid centering unchanged. Surfaced by the hero Tier-3 page. Block v1.4.0 unchanged.)

**Reviewed**: pending

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `theme_color` metaobject (optional), `prose` utility from `layer-utilities.css`

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid`, `blocks/media.liquid`

## Purpose

Long-form rich-text primitive. Renders a `<div>` wrapping a Shopify `richtext` setting's output (multiple paragraphs, lists, links, em/strong inline styling). Distinguishes from `title` by intent: richtext is the body-text companion that always carries the `prose` utility-modifier — `@layer utilities` rules apply the multi-paragraph **rhythm** (paragraph-to-paragraph spacing, list indentation, heading spacing) and reaffirm list markers (`disc` / `decimal`). Link underlines are the browser default, preserved because the reset never resets unclassed `<a>` decoration; the prose layer declares no `text-decoration` (see Behavior § marker provenance).

<!-- REVIEW: Spec - Per template:design-principle-upfront-purpose, would the Purpose lead better with the "opts into the global prose substrate" principle? Currently this lands in sentence 3 of ¶1. Draft: "The body-text companion to `title` — always opts into the substrate's `prose` utility modifier so paragraph spacing, list bullets, link underlines, and other multi-paragraph typographic affordances are applied globally from `@layer utilities` rather than re-declared per block. Renders a `<div>` wrapping a Shopify `richtext` setting's output (paragraphs, lists, links, em/strong inline styling)." Question: keep current framing, swap to draft, or split the difference? -->


Narrow-column readability (the ~65ch line-length sweet spot) is expressed via the `content_width` metaobject — a project seeds a `text-narrow` entry sized for prose readability and merchants pick it per-block. One setting expresses the intent; there is no separate `narrow` toggle.

## API

Snippet args (`{% render %}`) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` for render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. |
| `block` | block | yes (render) | — | Snippet-only. |
| `block_id` | string | no | — | Snippet-only. |
| `content` | richtext | yes | — | HTML rich-text body. Snippet `break`s when blank. |
| `text_align` | select (`start` / `center` / `end`) | no | `"start"` | Inline text alignment. Emits `--text-align` only when ≠ `start`. |
| `content_width` | metaobject (`content_width`) | no | blank → 100% | Caps `max-inline-size`. Centers via `justify-self: center` in grid contexts; inside a flex container follows the container's alignment. Pick a `text-narrow` entry (~65ch) for prose readability; pick wider entries for full-bleed body. |
| `text_color` | metaobject (`theme_color`) | no | blank → `--color-role-foreground` | Reads `.system.handle`; emits `--text-color: var(--color-<handle>)`. Note the role fallback is `--color-role-foreground` (body), not `--color-role-foreground-heading` — richtext is body copy. |
| `mobile_margin_block_start` | range (0–100, step 2, px) | no | `0` | Top margin below the desktop breakpoint. |
| `desktop_margin_block_start` | range (0–100, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. |

## Output shape

```html
<div class="shopify-block shopify-block--richtext"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="prose">
  {content}
</div>
```

`data-modifiers` always carries `prose`. No conditional emission; the `prose` modifier is the contract — it activates the `@layer utilities` typographic rules globally rather than re-declaring per-block.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--richtext`. Layered in `@layer components`.

```css
.shopify-block--richtext {
  max-inline-size: var(--content-width, 100%);
  color: var(--text-color, var(--color-role-foreground));
  text-align: var(--text-align, start);
  /* justify-self: center emitted per-instance only when content_width is set */
}
```

The block's own CSS is structural-only — width, color, alignment; centering (`margin-inline: auto`) is emitted per-instance only when a `content_width` cap is set (see Behavior § capped self-center). Multi-paragraph rhythm (paragraph spacing, list indentation/margins, heading spacing, first/last-child margin collapse) plus list markers live in `layer-utilities.css` under `[data-modifiers*='prose']`. The split is deliberate: the same prose treatment applies to richtext blocks, validation page bodies, and any consumer that opts in via the modifier. The prose layer declares spacing **and** list markers (`disc` / `decimal`); link underlines are the browser default (not reset for unclassed `<a>`), so the layer does not re-declare them.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm` via `utility--block-layout-vars` (the section sets `--block-rhythm: var(--spacing-<picked-handle>)`).

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars` — see that spec for the variable contract + emission rules. Block-specific fallbacks consumed via `var(--<name>, <fallback>)` in this block's CSS: `--content-width` → `100%`; `--mobile-margin-block-start` → `0`; `--desktop-margin-block-start` → inherits mobile.

Richtext-specific vars:

| Variable | Purpose | Default |
|---|---|---|
| `--text-color` | Body color | `var(--color-role-foreground)` |
| `--text-align` | Inline alignment | `start` |

Zero-emission discipline: `--text-color` only emitted when `text_color` is set; `--text-align` only emitted when ≠ `start`.

## Behavior

- **Always emits `prose` modifier.** The block doesn't ship a "plain text" mode — every richtext gets prose treatment. The contract is "rich content with affordances," not "any HTML body." Per-project escapes to non-prose treatment go through bare `<div>` markup in specialized sections, not through this block.
- **Body color, not heading color.** `--color-role-foreground` is the scheme's body text color; `--color-role-foreground-heading` is reserved for `title`. The richtext role and title role are intentionally disjoint — a scheme can tune body vs heading independently without breaking either block's contract.
- **`content_width` is the readability lever.** A blank `content_width` lets richtext span 100% — useful for full-bleed marketing copy. A `text-narrow` (~65ch) entry constrains line length for legible prose. The cap drives both layout and the visual rhythm of paragraphs; merchants picking a narrow value get classical-typography readability, picking a wide value get full-width body.
- **Capped width centers (grid) or follows the container (flex); uncapped fills.** `justify-self: center` is emitted only when `content_width` is set. In a grid context (section content track, columns track) it centers the capped block; in a flex container (`group`, `<media-contents>`) `justify-self` is ignored, so the container's `align-items` governs — a capped block follows the container's alignment instead of force-centering. Blank `content_width` → no `justify-self` override → the block fills its container (grid `justify-self: stretch`). `justify-self` replaced `margin-inline: auto` here: auto inline margins win over a flex parent's alignment (force-centering a capped block) and disable grid stretch (collapsing an uncapped one) — `justify-self` does neither. The two are identical in grid contexts (both content-size a capped block to its cap and center it).
- **No `text_style` setting.** Richtext doesn't expose `text_style` because the underlying rich-text content already has structural elements (`<p>`, `<ul>`, `<ol>`, `<blockquote>`, `<h2>`–`<h6>` inside the rich text) — those elements bind to their respective `text_style` entries via the bare-tag pattern in `utility--css-variables`. A merchant wanting "all paragraphs in this block at large size" picks a wider `content_width` or composes a `title` block before the richtext for the emphasis.
- **Marker provenance + first-last collapse.** The prose layer (`layer-utilities.css`) sets spacing — direct children get `margin-block: 1rem`, with `> :first-child` and `> :last-child` collapsed to `0`. A single-paragraph block therefore gets **no** rhythm (the lone `<p>` is both first and last); spacing appears only between siblings. The prose layer also **reaffirms list markers** (`& ul { list-style: disc outside }` / `& ol { list-style: decimal outside }`) so a downstream reset that blanket-strips `list-style` can't silently drop them. Link underlines remain the browser default (the reset never resets `a` decoration) — the prose layer does not re-declare `text-decoration`, so a future `a { text-decoration: none }` in reset/base would drop prose link underlines with nothing in the layer to restore them.
- **Schema input is Shopify's `richtext` type.** The setting accepts HTML markup with a restricted tag set (`<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<a>`, etc.). Shopify enforces sanitization; the snippet emits the value directly via `{{ content }}`.
- **Early-exit on blank content.** `content` blank → snippet `break`s; nothing renders.
- **`{{ block.shopify_attributes }}` emission.** On the outer wrapper, for theme-editor block selection.

## Locale keys

Schema strings under `blocks.richtext.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.richtext.name`
- `blocks.richtext.settings.richtext.content` (group header)
- `blocks.richtext.settings.content.{label,default}`
- `blocks.richtext.settings.text_align.{label,options.{start,center,end}}`
- `blocks.richtext.settings.content_width.{label,info}`
- `blocks.richtext.settings.text_color.{label,info}`
- `blocks.richtext.settings.top_spacing.content` (group header)
- `blocks.richtext.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.richtext.presets.richtext.{name,category}`

No runtime strings.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block-backed; no sub-component half)
- **Page**: `sections/validation--primitive--richtext.liquid` v1.2.0 (production-faithful — `token-section` is the real theme-root grid; chrome + the layout-neutral outline/label indicator come from the shared `validation--harness-styles` snippet; the dead `narrow` / `prose:narrow` fixtures were purged when that setting was removed in block v1.2.0) + `templates/index.validation--primitive--richtext.json` (shipped)
- **Tests**: `.tests/e2e/primitive--richtext.spec.js` (executable; `npm run test:e2e`)
- **Requires seeded**: `content_width/reading` (680px); `theme_color/accent`. The accent token's *value* is store-defined — the test resolves `--color-accent` at runtime rather than asserting a literal hex. (A `wide` cap was dropped from the matrix — the harness container never exceeds ~1232px, so a 1400px cap is a visual no-op; `reading` exercises the cap + self-center.)
- **API surface**:
  - **content variation**: single paragraph, multi-paragraph, list (`<ul>`, `<ol>`), links, inline em/strong — verify the `prose` rules apply (paragraph spacing, list bullets, link underline)
  - **text_align**: `start` (default), `center`, `end`
  - **content_width**: blank (100%), narrow (~65ch for prose readability), wide (1000px)
  - **text_color**: blank (defaults to role-foreground) vs each shipped `theme_color` entry
  - **Top-spacing**: independent mobile + desktop values
- **Surface delegation**: the `prose` modifier's typographic rules are exercised at the substrate level (`layer-utilities.css` rules apply universally to anything carrying `data-modifiers*='prose'`); this page exercises the **block-side emission contract** — that the modifier is always present and the content renders inside.
- **Edge cases**:
  - Blank `content` → snippet `break`s; nothing renders (no root element)
  - Content with nested `<h2>` (richtext field accepts headings) → bare-tag auto-binding via `text_style` applies the matching heading style inside the richtext block
  - Blank `content_width` → wrapper spans 100%; no `justify-self` override (grid stretch fills)
  - `text_color` set to a handle with no matching `theme_color` entry → `--text-color: var(--color-<handle>)` emits; the CSS variable resolves to its declaration default (or unset if not declared anywhere)
- **Visual showcase**: a vertical stack of richtext blocks demonstrating content variations × widths × alignments. Reader confirms prose rules apply (paragraph spacing, list bullets, link decoration); content_width caps line length where set; color resolution matches.
- **Assertions** (executable — `.tests/e2e/primitive--richtext.spec.js`):
  - Every richtext root carries `data-modifiers="prose"` (no conditional emission)
  - Paragraph rhythm: a lone paragraph collapses both margins (first AND last child → `0` top and bottom); in a multi-paragraph block the middle paragraph gets `16px` top + bottom, the first collapses its top, the last its bottom
  - Lists render markers: `<ul>` computes `list-style-type: disc` (position `outside`, non-zero `padding-inline-start`), `<ol>` computes `decimal` — reaffirmed by the prose layer (`list-style: disc/decimal outside`) so a downstream reset can't strip them
  - Inline: `<em>` computes `font-style: italic`, `<strong>` `font-weight ≥ 700`, `<a>` `text-decoration-line` contains `underline` (UA default, not reset)
  - A nested `<h2>` (not the block's first child) binds a larger `text_style` (`font-size` > the body paragraph) and gets the prose `:is(h2, h3)` top margin (`24px`)
  - `text_align` start is zero-emission (`--text-align` unset, computed `start`); center / end emit the var and set computed `text-align`
  - `content_width` reading caps `max-inline-size` to `680px` (`--content-width: 42.5rem`) and centers in the grid (symmetric leftGap ≈ rightGap on the desktop viewport where the cap is below available width; `justify-self: center`); blank spans `100%` and fills the container (no `justify-self` override — guarded on the `columns` page where an uncapped richtext child must fill its grid track, not shrink to content)
  - `text_color` emits `--text-color` and recolors computed `color` to the resolved `--color-accent` token (≠ the default body color); blank `text_color` resolves to `--color-role-foreground`
  - Top-spacing override emits `--mobile-margin-block-start: 1.0rem` / `--desktop-margin-block-start: 4.0rem` (absolute values)
  - Blank `content` renders no root (snippet `break`) — 11 of the 12 fixtures produce a `.shopify-block--richtext`
- **Deliberately unasserted**: `block.shopify_attributes` (editor-only); the prose layer's blockquote/`hr`-adjacency rules (no fixtures); `text_color` literal hex (store-defined — resolved at runtime).
- **Unit scope**: none (Liquid + CSS only)

## Out of scope

- **Per-block prose variations** (`prose:narrow`, `prose:compact`) — width concerns belong in `content_width`; spacing-density concerns belong in per-project utility modifiers. Adding `prose:<variant>` modifiers on this block would re-create the overlap `content_width` already covers.
- **`text_style` setting** — body typography flows from the bare-tag binding for `<p>` (and nested headings). Overriding body typography per-block isn't supported; the consistency across pages is intentional. A per-project richtext-with-style block would extend this snippet.
- **Markdown input** — the schema is `richtext` (Shopify HTML), not markdown. A markdown-input variant would be a separate primitive.
- **Code-block / pre-formatted treatment** — Shopify's `richtext` input doesn't expose `<pre>`/`<code>`; the prose utility doesn't style them. Documentation-heavy themes would extend with a markdown primitive or a code-block block.
- **Drop cap / first-letter treatments** — typographic flourishes belong in per-project CSS, not in the block's exposed surface.

## Related

- Composition strategy (title vs richtext distinction; prose utility as a substrate concern): `.context/docs/composition-strategy.md`
- Schema conventions (top-spacing pair, color-token setting naming): `.context/docs/schema-conventions.md`
- Design-system metaobjects (`content_width` consumption, `theme_color` consumption): `.context/docs/design-system-metaobjects.md`
- Modifier system (`data-modifiers` convention; opt-in utility modifiers): `.context/docs/modifier-system.md`
- Title spec (the heading-primitive sibling): `title.spec.md`
