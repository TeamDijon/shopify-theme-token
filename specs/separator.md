# separator

**Layer**: 1

**Type**: block (`blocks/separator.liquid`) + matching snippet (`snippets/separator.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/separator.liquid` v1.0.5 (render surface)
- `blocks/separator.liquid` v1.0.0 (block schema + render call)

**Reconciled**: 2026-05-31

**Reviewed**: pending

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `content_width` metaobject (optional), `theme_color` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid`

## Purpose

A horizontal-rule primitive. Renders `<hr>` inside a `.shopify-block--separator` wrapper, with optional inline-size cap (from `content_width`) and optional line color (from a `theme_color` handle). The visual identity is one hairline border on the inner `<hr>`, no shadow / radius / decoration — separator is the minimal divider. Color falls back to `--color-role-border` when no `line_color` is set, so the divider sits at the scheme's structural-border weight by default.

## API

Snippet args (`{% render %}`) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` for render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. |
| `block` | block | yes (render) | — | Snippet-only. |
| `block_id` | string | no | — | Snippet-only. Override for the base-selector identifier on direct renders. |
| `content_width` | metaobject (`content_width`) | no | blank → 100% | Caps `max-inline-size` via `--content-width`. The wrapper self-centers via `margin-inline: auto`. |
| `line_color` | metaobject (`theme_color`) | no | blank → `--color-role-border` | Reads `.system.handle`; emits `--line-color: var(--color-<handle>)`. The `<hr>`'s `border-block-start` consumes the var with the role-border fallback. |
| `mobile_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin below the desktop breakpoint. |
| `desktop_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. |

## Output shape

```html
<div class="shopify-block shopify-block--separator"
     id="<base-selector>"
     {{ block.shopify_attributes }}>
  <hr>
</div>
```

No `data-modifiers` emitted — separator has no modifier-driven behavior. The wrapper sizing and the `<hr>` color flow through CSS custom properties only.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--separator`. Layered in `@layer components`.

```css
.shopify-block--separator {
  inline-size: 100%;
  max-inline-size: var(--content-width, 100%);
  margin-inline: auto;

  & hr {
    margin: 0;
    border: none;
    border-block-start: 0.0625rem solid var(--line-color, var(--color-role-border));
  }
}
```

The outer `inline-size: 100%` is load-bearing inside flex parents — `<hr>` has no intrinsic width, and `margin-inline: auto` + `max-inline-size` alone leave the wrapper at zero size on a flex item. The explicit 100% guarantees a width to size against.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm` via `utility--block-layout-vars` (the section sets `--block-rhythm: var(--spacing-<picked-handle>)`).

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars`:

| Variable | Purpose | Default |
|---|---|---|
| `--content-width` | `max-inline-size` cap (px from metaobject) | `100%` |
| `--mobile-margin-block-start` | Top margin below the desktop breakpoint | `0` |
| `--desktop-margin-block-start` | Top margin at/above the desktop breakpoint | inherits mobile |

Separator-specific var:

| Variable | Purpose | Default |
|---|---|---|
| `--line-color` | `<hr>` border color | `var(--color-role-border)` |

Zero-emission discipline: `--line-color` is only emitted when `line_color` is set.

## Behavior

- **Hairline border on `<hr>`.** `border-block-start: 0.0625rem solid` (= 1px on 16px base). Logical property handles RTL/vertical writing modes; the rule reads as "top side in horizontal-tb writing mode."
- **No `<hr>` UA defaults leak.** The snippet zeroes `margin` and removes the UA `border` shorthand, then adds back only the block-start side. Browsers ship `<hr>` with `inline-size` set to a small value and a 3D `inset` border by default; the wrapper-then-hairline pattern overrides both.
- **Color resolution chain.** `--line-color` is emitted when `line_color` is set, in the form `var(--color-<handle>)` (consuming the `theme_color` system). The CSS rule's fallback is `var(--color-role-border)` — the scheme's structural-border token. The chain is two layers: the explicit `--line-color` declaration overrides the role; blank `line_color` keeps the role.
- **Capped width centers.** When `content_width` is set, the wrapper caps at the value and centers via `margin-inline: auto`. Blank `content_width` → wrapper spans 100% of its containing block.
- **`{{ block.shopify_attributes }}` emission.** On the outer wrapper, for theme-editor block selection. Safe no-op on direct snippet renders (no `block` context).
- **No early-exit.** Separator has no required input; an empty configuration still renders the line at default color/width.

## Locale keys

Schema strings under `blocks.separator.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.separator.name`
- `blocks.separator.settings.separator.content` (group header)
- `blocks.separator.settings.content_width.{label,info}`
- `blocks.separator.settings.line_color.{label,info}`
- `blocks.separator.settings.top_spacing.content` (group header)
- `blocks.separator.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.separator.presets.separator.{name,category}`

No runtime strings; separator is structural with no semantic role announcement beyond `<hr>` (which is `role="separator"` natively).

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block-backed; no sub-component half)
- **Page**: `sections/validation--primitive--separator.liquid` + `templates/index.validation--primitive--separator.json` (shipped)
- **API surface**:
  - **content_width variation**: blank, narrow (e.g. 30rem), medium (60rem), wide (100rem) → wrapper caps and centers at each value
  - **line_color variation**: blank (defaults to `--color-role-border`), each shipped `theme_color` entry → border color matches
  - **Top-spacing**: independent mobile and desktop values; render confirms the correct one applies per viewport
- **Edge cases**:
  - Blank `content_width` → wrapper spans 100% of parent
  - Blank `line_color` → border color resolves to `--color-role-border` (scheme structural border)
  - Inside a flex parent (e.g. as a child of `direction:row` group) → wrapper still renders at 100% width thanks to the explicit `inline-size: 100%` (without this, the wrapper would collapse to 0 — see CSS rationale)
  - Inside a narrow container with `content_width` > container width → CSS `min()` semantics handled by browser; effectively caps at container
- **Visual showcase**: a vertical stack of separators demonstrating width and color variants, each labelled. Reader confirms hairline weight is consistent, color resolution matches the picker, and the flex-parent case renders the line at full width.
- **Assertions** (prose; Playwright once installed):
  - Each instance's computed `inline-size` matches the configured `content_width` (or 100% when blank)
  - Each instance's `<hr>` computed `border-block-start-color` matches the configured `line_color` (or the scheme's `--color-role-border` when blank)
  - The `<hr>` has computed `border-block-start-width: 1px`
  - Top-spacing instances' computed `margin-block-start` matches per breakpoint
- **Unit scope**: none (Liquid + CSS only)

## Out of scope

- **Thicker borders / decorative dividers** — separator ships at hairline weight only. A merchant wanting "thick decorative line" composes with `group` + `container_style` (card / outlined / elevated all carry visible chrome) or with `media` for image-based dividers. Adding a `weight` setting would re-create what `container_style` already provides.
- **Vertical separators** — the snippet renders a horizontal-axis divider only. Vertical-axis dividers belong inside a `columns` block's gap styling (CSS), not as a separator block. The columns block doesn't currently expose a "gap line" setting; ships when a consumer needs it.
- **Dashed / dotted styles** — `border-style: solid` is hardcoded. A merchant wanting alternative styles per-project extends this CSS rule; no setting surface.
- **Gradient or multi-color lines** — single-color border only. Multi-color treatments belong in `media` (image-based dividers) or per-project block extensions.
- **Top-margin coupling with the block above** — separator's `margin-block-start` is independent of whatever sits above it. The section's `block_rhythm` cascade still applies — a separator carries inter-block spacing on top of any explicit `margin_block_start` override.

## Related

- Schema conventions (top-spacing pair, color-token setting naming): `.context/docs/schema-conventions.md`
- Container patterns (horizontal sizing, content_width cap): `.context/docs/container-patterns.md`
- Theme-color spec (the `--color-<handle>` namespace consumed by `line_color`): `.context/specs/theme-color.md`
