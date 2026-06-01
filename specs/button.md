# button

**Layer**: 1

**Type**: block (`blocks/button.liquid`) + matching snippet (`snippets/button.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/button.liquid` v1.4.0 (render surface)
- `blocks/button.liquid` v1.2.0 (block schema + render call)

**Reconciled**: 2026-05-31 (paired with `utility--css-variables` v1.11.0 — dropped internal `--button-color-rgb` intermediate; outline-hover translucency migrates to `rgb(from var(--button-color) r g b / α)`. Contract-neutral — `--button-color-rgb` was never exposed.)

**Reviewed**: pending

**Depends on**: `snippets/icon.liquid`, `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `button_style` metaobject, `icon` metaobject (optional), `content_width` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid`, `blocks/media.liquid`

## Purpose

Primary call-to-action primitive. Renders an `<a>` when a link is set, otherwise a `<button type="button">` — the same visual surface for navigation and trigger-style interactions. Style variants flow through the `button_style` metaobject, the optional leading or trailing icon flows through the `icon` metaobject, and an opt-in new-tab branch adds target/rel plus a screen-reader announcement.

This is the only L1 block whose visual identity is metaobject-driven across a structured matrix. Token's base ship covers a 3×3 family × variant set in this snippet's stylesheet — `solid-` / `outline-` / `link-` × `-primary` / `-secondary` / `-tertiary` — and seeds the matching `button_style` metaobject entries (see `metaobject-definitions.md`). The set is **a base, not a cap**: per-project, additional handles compose by (1) creating new `button_style` metaobject entries with new handles and (2) extending this snippet's stylesheet with matching `[data-modifiers*='button-style:<new-handle>']` rules. The metaobject system is the scalable surface; the CSS-rule pairing is the constraint that keeps appearance authored, not magic.

Text-link styling (visually flat, no padding/border, underlined) sits inside the base matrix as the `link-*` family rather than a separate primitive; merchants pick `link-primary` on a button block instead of reaching for a standalone link block (which the project deliberately doesn't ship).

## API

Snippet args (`{% render %}` interface) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` for the render context. Args fall back to `block.settings.<id>` via `| default:` chains, so direct snippet calls and block-driven renders share one resolution path.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. Section object passed by the block file. |
| `block` | block | yes (render) | — | Snippet-only. Block object carrying settings. |
| `block_id` | string | no | — | Snippet-only. Override for the base-selector identifier on direct (non-block) renders. |
| `content` | text | yes | `"Discover more"` | Button label. Snippet `break`s render when blank. |
| `link` | url | no | blank | When set, renders `<a href="...">`. When blank, renders `<button type="button">`. |
| `open_in_new_tab` | boolean | no | `false` | When `true` on a linked button, appends `target="_blank" rel="noopener noreferrer"` and a screen-reader-only "(opens in new tab)" string. The block schema `visible_if`-hides this setting when `link` is blank, so the no-op case isn't reachable in the editor. |
| `button_style` | metaobject (`button_style`) | no | blank → default appearance (solid-primary values) | Reads `.system.handle`; emits `button-style:<handle>` modifier. Handles matching the base 3×3 set get variant styling from this snippet's stylesheet. Per-project extensions: add the entry, then add a matching CSS rule (see Purpose for the pattern). A handle with no matching rule emits the modifier but applies no override — defaults stand, button renders with the solid-primary appearance as a development-time diagnostic that CSS hasn't been added yet. |
| `icon` | metaobject (`icon`) | no | blank | Inline SVG before/after the label via `snippets/icon.liquid`. No icon when blank. |
| `icon_position` | select (`start` / `end`) | no | `"start"` | Schema-level `visible_if`: shown only when `icon` is set. Snippet emits `icon-position:end` modifier when `end`; CSS flips `flex-direction: row-reverse`. |
| `content_width` | metaobject (`content_width`) | no | blank → no cap | Reads `.width.value` (px) and applies as `--content-width`. |
| `mobile_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin below the desktop breakpoint. Routed through `utility--block-layout-vars` → `--mobile-margin-block-start`. |
| `desktop_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. Routed through `utility--block-layout-vars` → `--desktop-margin-block-start`. |

The 3×3 button_style matrix:

| family ↓ \ variant → | `-primary` (accent) | `-secondary` (foreground) | `-tertiary` (background) |
|---|---|---|---|
| `solid-` | `solid-primary` (filled accent) | `solid-secondary` (filled scheme foreground) | `solid-tertiary` (filled scheme background) |
| `outline-` | `outline-primary` (1px accent border, transparent fill) | `outline-secondary` (1px foreground border) | `outline-tertiary` (1px background border) |
| `link-` | `link-primary` (no fill/border/padding; underlined accent) | `link-secondary` (foreground link) | `link-tertiary` (background link) |

Family CSS overrides shape vars (bg/border/padding/decoration); variant CSS overrides color vars (`--button-color`, `--button-on-color`). Selectors anchor on the trailing dash of the family prefix (`*='button-style:outline-'`) so substring matches stay scoped within a family.

## Output shape

```html
<!-- linked variant -->
<a class="shopify-block shopify-block--button"
   id="<base-selector>"
   {{ block.shopify_attributes }}
   href="<link>"
   data-modifiers="button-style:solid-primary">
  <svg>…icon…</svg>   <!-- optional -->
  <label content>
  <span class="sr-only">(opens in new tab)</span>  <!-- when open_in_new_tab -->
</a>

<!-- unlinked variant -->
<button type="button"
        class="shopify-block shopify-block--button"
        id="<base-selector>"
        {{ block.shopify_attributes }}
        data-modifiers="button-style:outline-secondary,icon-position:end">
  …
</button>
```

`data-modifiers` is omitted entirely when no `button_style` is set and `icon_position` is `start` (the no-op default) — the `utility--modifiers` helper emits nothing for a blank list, rather than `data-modifiers=""`.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--button`. Layered in `@layer components`. Variant composition uses CSS custom properties — families set shape vars, variants set color vars — keyed by `[data-modifiers*='...']` substring selectors.

```css
.shopify-block--button {
  /* Defaults: solid + primary appearance, no modifier required */
  --button-color: var(--color-role-primary);
  --button-color-rgb: var(--color-role-primary-rgb);
  --button-on-color: var(--color-role-primary-button-text);

  --button-background: var(--button-color);
  --button-foreground: var(--button-on-color);
  --button-border-color: var(--button-color);
  --button-padding-block: 0.75rem;
  --button-padding-inline: 1.5rem;
  --button-radius: 0.25rem;
  --button-decoration: none;
  --button-min-size: 2.75rem;

  /* …display/layout/visual rules using the vars… */

  /* Variant: secondary — scheme foreground/background pair */
  &:is([data-modifiers*='button-style:solid-secondary'],
       [data-modifiers*='button-style:outline-secondary'],
       [data-modifiers*='button-style:link-secondary']) {
    --button-color: var(--color-role-foreground);
    --button-on-color: var(--color-role-background);
  }

  /* Family: outline — transparent fill, colored text */
  &[data-modifiers*='button-style:outline-'] {
    --button-background: transparent;
    --button-foreground: var(--button-color);
  }

  /* Family: link — zero out shape, keep touch target */
  &[data-modifiers*='button-style:link-'] {
    --button-background: transparent;
    --button-foreground: var(--button-color);
    --button-border-color: transparent;
    --button-padding-block: 0;
    --button-padding-inline: 0;
    --button-radius: 0;
    --button-decoration: underline;
    /* --button-min-size stays 2.75rem — touch target preserved */
  }
}
```

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm` via the `utility--block-layout-vars` cascade (the section sets `--block-rhythm: var(--spacing-<picked-handle>)`).

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars` — see that spec for the variable contract + emission rules. Block-specific fallbacks consumed via `var(--<name>, <fallback>)` in this block's CSS: `--content-width` → `none`; `--mobile-margin-block-start` → `0`; `--desktop-margin-block-start` → inherits mobile.

Button-specific vars defined in the snippet's stylesheet (overridable by per-project CSS or future container-style variants):

| Variable | Purpose | Default |
|---|---|---|
| `--button-color` | Variant color token (drives bg + border for solid; fg for outline/link) | `var(--color-role-primary)` |
| `--button-color-rgb` | Same token, rgb triplet form for `rgba()` hover/focus surfaces | `var(--color-role-primary-rgb)` |
| `--button-on-color` | Foreground when sitting *on* the button color (solid family) | `var(--color-role-primary-button-text)` |
| `--button-background` | Resolved background (family-controlled) | `var(--button-color)` |
| `--button-foreground` | Resolved text/icon color (family-controlled) | `var(--button-on-color)` |
| `--button-border-color` | Border color | `var(--button-color)` |
| `--button-padding-block` / `--button-padding-inline` | Vertical / horizontal padding | `0.75rem` / `1.5rem` |
| `--button-radius` | Border radius | `0.25rem` |
| `--button-decoration` | Text decoration | `none` |
| `--button-min-size` | Minimum block-size / inline-size for touch target | `2.75rem` (44px) |

## Behavior

- **Tag selection.** `link != blank` → `<a href="…">`; `link == blank` → `<button type="button">`. The branch is the only structural decision; everything else (variants, icon, modifiers) overlays on either tag.
- **New-tab branch.** When `open_in_new_tab` is true AND the tag is `<a>`, the snippet appends `target="_blank" rel="noopener noreferrer"` to the behavior attribute and emits a sibling `<span class="sr-only">{{ 'accessibility.opens_in_new_tab' | t }}</span>` after the content for screen readers. The `rel` includes both `noopener` (security) and `noreferrer` (privacy); both are non-negotiable on external links from a Shopify storefront. The block schema `visible_if`-hides the setting when `link` is blank, so the unlinked-but-checked branch isn't reachable from the editor.
- **Modifier composition.** `data-modifiers` carries up to two tokens — `button-style:<handle>` (when `button_style` is set) and `icon-position:end` (when icon is set AND position is `end`). The default `start` icon position emits no modifier; the absence is the default. Both tokens accumulate via the `modifier_list` builder, then route through `utility--modifiers` for emission. Blank list → no attribute (not `data-modifiers=""`).
- **Per-project handle extension.** Token's base ship includes the 3×3 family/variant CSS in this snippet's stylesheet. Per-project, new handles are added in pairs: a `button_style` metaobject entry (gets the merchant a picker option) AND a matching `[data-modifiers*='button-style:<new-handle>']` rule (gets the merchant the styling). A handle present in the metaobject but missing CSS still emits the modifier on `data-modifiers`; with no variant override matching, the cascade leaves defaults in place and the button visually equals solid-primary — a development-time diagnostic signalling "CSS not yet added for this handle." In a properly-paired extension this state is transient (between adding the entry and authoring the rule); in production it indicates an incomplete extension.
- **Touch target preservation in `link-*`.** The link family zeroes padding, border, and background — but keeps `--button-min-size: 2.75rem`. The visible footprint is text-link, but the *hit target* stays at 44×44, satisfying WCAG 2.5.5 (Target Size). Documented because a casual CSS reader sees padding zeroed and might assume the target shrinks too.
- **Hover treatments per family.** `solid-*` darkens the bg via `color-mix(in oklab, var(--button-background), black 12%)`. `outline-*` adds a translucent tint of `--button-color` (uses the `-rgb` companion + `--opacity-subtle` fallback `0.05`). `link-*` reduces opacity to `0.75`, no background. All three differ deliberately — same intent (signal hover), shape-appropriate execution. Minimal by design — per-project button styles typically override the base ruleset wholesale; a future hover-state custom-property layer (`--button-background-hover`, `--button-foreground-hover`) is the additive path if "override hover only, keep base" becomes a real pattern.
- **Reduced motion.** `transition: var(--duration-fast) var(--ease-out)` (substrate motion vars defined in `layer-theme.css`) zeroes to `0s` under `@media (prefers-reduced-motion)`. The hover treatment still fires; only the animation is suppressed.
- **Focus ring.** `:focus-visible` outlines via `var(--color-role-focus-ring)` with `0.125rem` outline + `0.25rem` offset. Inherited from the scheme; no per-instance override.
- **Block-rhythm integration.** The block's `margin-block-start` chain falls through per-instance settings → section's `--block-rhythm` → 0, courtesy of `utility--block-layout-vars`. A button placed without explicit top spacing inherits the section's rhythm; an authored value overrides it.
- **`{{ block.shopify_attributes }}` emission.** Renders the theme-editor block-selection hook directly on the root. On a direct `{% render %}` outside a block context, `block` is nil and the expression resolves to blank — safe no-op.

## Locale keys

Schema strings under `blocks.button.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.button.name`
- `blocks.button.settings.button.content` (group header)
- `blocks.button.settings.content.{label,default}`
- `blocks.button.settings.link.label`
- `blocks.button.settings.open_in_new_tab.label`
- `blocks.button.settings.button_style.label`
- `blocks.button.settings.icon.label`
- `blocks.button.settings.icon_position.{label,options.{start,end}}`
- `blocks.button.settings.content_width.{label,info}`
- `blocks.button.settings.top_spacing.content` (group header)
- `blocks.button.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.button.presets.button.{name,category}`

Runtime string:

- `accessibility.opens_in_new_tab` (shared sr-only string defined in `locales/en.default.json` + `locales/fr.json` under the `accessibility.*` namespace per `a11y-conventions.md`)

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block; no L0 sub-component half)
- **Page**: `sections/validation--primitive--button.liquid` + `templates/index.validation--primitive--button.json` (shipped)
- **API surface** (block-backed only — no snippet-half group):
  - **Tag-emission branch**: `link` blank → `<button type="button">`; `link` set → `<a href="…">`
  - **New-tab branch**: `link` set × `open_in_new_tab: true` → `<a>` carries `target="_blank" rel="noopener noreferrer"` + sr-only span
  - **Top-spacing**: `mobile_margin_block_start` and `desktop_margin_block_start` set independently; render confirms the correct value applies per viewport
  - **Icon position**: with `icon` set, `icon_position: end` flips visual order; `start` is the default no-modifier baseline
- **Surface delegation**: variant styling (the 3×3 `button_style` matrix) is exercised on `validation--substrate--button-style.liquid` rather than re-tested here. The primitive page's intent is the snippet's *branching logic* (tags, attributes, modifier composition); the metaobject page's intent is the *visual matrix* per handle. Both intents stay legible by separating them.
- **Edge cases**:
  - `content` blank → snippet `break`s; nothing renders (the block emits no root element)
  - `link` blank → `open_in_new_tab` setting hidden in the editor by `visible_if`; the unlinked-with-new-tab branch is unreachable from the schema
  - `button_style` set to a handle with no matching CSS rule (e.g. seed a `solid-quaternary` entry on the validation store without adding a CSS rule) → button renders with default appearance (solid-primary values), modifier still emits the handle. Diagnostic surface for incomplete per-project extensions.
  - `icon` set + `icon_position: start` → no modifier emitted (start is default); icon precedes label
  - Both `mobile_margin_block_start` and `desktop_margin_block_start` blank → no per-instance margin, section block-rhythm cascade applies
- **Visual showcase**: a vertical list of block instances, each labelled by block ID via `utility--block-labels`. Reader confirms each row's tag-emission branch (anchor underline vs button button-styling), new-tab indicator presence, icon position, and inherited margins.
- **Assertions** (prose; Playwright once installed):
  - Each unlinked instance is a `<button>` with `type="button"` and no `href`
  - Each linked instance is an `<a>` with the configured `href`
  - New-tab instances carry `target="_blank"` AND `rel="noopener noreferrer"` AND the sr-only opens-in-new-tab span (visible to AT, hidden visually)
  - Icon-end instances carry `data-modifiers*='icon-position:end'`; computed flex-direction is `row-reverse`
  - Top-spacing instances' computed `margin-block-start` matches the setting per breakpoint
  - The `link-*` family preserves `min-block-size: 2.75rem` despite zero padding
- **Unit scope**: none (Liquid + CSS; no JS shipped)

## Out of scope

- **`type="submit"` form-submit buttons** — the snippet always emits `type="button"`. Form submission is the form primitive's domain (Bucket 2 + L0 form-field). When forms ship, the form block owns its own submit primitive — this `button` block stays no-submission. Per-project form needs outside the basic-ECOM surface (newsletter / contact / search / faceted-filter / account) reach for either a raw `<button type="submit">` or fork this snippet as a blueprint.
- **Disabled state** — no `disabled` attribute, no `aria-disabled` setting. The right shape is a snippet `disabled` arg propagating to the `disabled` HTML attribute on `<button>` (and `aria-disabled="true"` + a JS click-handler for `<a>`), plus a dimmed visual via `:disabled` and `[aria-disabled='true']` CSS hooks. Deferred until the first stateful consumer demands it (form primitive submit-state, cart drawer ATC during unavailable variant, pagination at first/last page). Tracked under Bucket C in `BACKLOG.md`.
- **Loading state** — no built-in `state:loading` modifier or spinner slot. A JS consumer (e.g. cart add) wires its own state via `ModifiersManager` (`modifier-system.md` covers the convention) and styles via per-project CSS. The primitive intentionally stops at static appearance.
- **Icon-only buttons** — `content` is required; passing only an `icon` produces nothing (snippet breaks on blank content). Icon-only buttons need an a11y-label arg + a different a11y contract (`aria-label`); ship as a separate per-project `icon-button` block when a project demands it. Token's general ship stays content-first.
- **Dropdown / menu buttons** — separate primitive (paired with `popup` or `disclosure` once those land); the button block stays single-action.
- **Cap on the base set** — the 3×3 family/variant matrix is Token's base ship, not an architectural ceiling. Projects extend by adding `button_style` metaobject entries paired with matching CSS rules. The constraint that keeps appearance authored (rather than open-ended for merchants) is the CSS-rule requirement, not the metaobject schema.
- **Per-button background override** beyond what `button_style` exposes — the variant matrix is the agreed customization surface. Off-axis tweaks (e.g. "make this button red on this page only") belong in per-project block-style CSS, not in the spec's API.
