# gradient

**Layer**: substrate

**Type**: metaobject (`gradient`)

**Status**: shipped

**Implementation**:
- `snippets/utility--css-variables.liquid` v1.14.1 (CSS variable emitter — `:root` gradient block, one `--gradient-<handle>` + paired `--gradient-<handle>-start-opacity` / `--gradient-<handle>-end-opacity` per non-reserved entry)
- Metaobject definition itself — created per `metaobject-definitions.md` § `gradient`

**Reconciled**: 2026-06-15 (pin v1.12.0 → v1.14.0; css-variables v1.13.0/v1.14.0 touched only `--spacing-*` emission, leaving the gradient block — paired `--gradient-<handle>` + start/end-opacity vars introduced at v1.12.0 — unchanged)

**Reviewed**: 2026-06-01

**Depends on**: theme settings `color_schemes` (the scheme role tokens — `--color-role-background` / `--color-role-foreground` / `--color-role-primary` — that gradient stops interpolate). No direct `theme_color` dependency — gradients use *roles*, not palette entries.

**Consumers**: any CSS context consuming `background: var(--gradient-<handle>)`. None on the shipped surface today; consumers are forthcoming as the seeded `hero` gradient gets adopted across hero / banner archetypes. Background gradients on `<token-section>` use the per-scheme `--gradient-background` (a different surface — see Out of scope).

## Purpose

A named scheme-adaptive linear gradient. Each entry defines an angle + two **scheme-role endpoints** (`background` / `foreground` / `primary`, validated by the metaobject schema — not literal colors). The entry's handle becomes a `--gradient-<handle>` CSS variable emitted in `:root`, accompanied by `--gradient-<handle>-start-opacity` / `--gradient-<handle>-end-opacity` (default `1`) consumers can override at block-level.

The role binding is the load-bearing design choice. A `linear-gradient(#c2410c, #ffffff)` would look identical in every scheme; `linear-gradient(var(--color-role-primary), var(--color-role-background))` re-resolves per scheme — one declaration, scheme-adaptive output.

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | yes | Display name in admin (e.g., `Hero`, `Page wash`). `system.handle` derives from it. |
| `angle` | Integer | yes | Gradient angle in degrees. Validated `0–360`. Defaults to `135` in the emitter when blank. |
| `color_start` | Single line text | yes | Scheme role for the first stop. **Validated** to `background` / `foreground` / `primary`. |
| `color_end` | Single line text | yes | Scheme role for the second stop. Same validation as `color_start`. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

Two design constraints encoded in the validation:

1. **Role-only stops.** The validation list (`background` / `foreground` / `primary`) is the same set as the scheme settings exposing those roles. Adding a new endpoint role would require both extending this validation list AND ensuring the role exists in every color scheme. Today's three roles cover the common gradient compositions (light-to-dark wash, primary-accent fade, etc.).
2. **Linear only.** No `type: linear | radial` field. Radial gradients can be added later as a schema extension when a consumer needs them.

## Output shape

The emitter writes a three-line block per entry inside the `:root` block that follows the theme-color palette:

```css
:root {
  /* …theme_color palette… */

  --gradient-hero-start-opacity: 1;
  --gradient-hero-end-opacity: 1;
  --gradient-hero: linear-gradient(
    135deg,
    rgb(from var(--color-role-primary) r g b / var(--gradient-hero-start-opacity)),
    rgb(from var(--color-role-background) r g b / var(--gradient-hero-end-opacity))
  );
  /* three lines per non-reserved gradient entry */
}
```

The two opacity variables default to `1`, so the shipped behavior is identical to a plain `linear-gradient(angle, color, color)`. Consumers wanting a translucent stop override either variable at block-level:

```css
.hero-banner {
  --gradient-hero-start-opacity: 0.7;
  background: var(--gradient-hero);
}
```

Skipped emissions:

- **Reserved handle `background`** — the color-scheme system owns `--gradient-background` (each scheme's background-gradient setting, emitted in the per-scheme block). An entry with `system.handle == 'background'` is skipped here to prevent collision. Editor-side authoring should avoid the handle.
- **Incomplete entries** — when `color_start.value` or `color_end.value` is blank, no line emits. Skipping is safer than emitting a malformed `linear-gradient(…, var(--color-role-), var(--color-role-))` declaration.

## CSS

N/A at the metaobject layer — emission rules live in `utility--css-variables`'s output. The metaobject contributes the data; the snippet composes the rule.

## CSS custom properties (exposed)

| Variable | Type | Source |
|---|---|---|
| `--gradient-<handle>` | CSS `linear-gradient(<angle>deg, rgb(from …), rgb(from …))` | one per entry; angle + two role-token references wrapped in alpha-aware composition |
| `--gradient-<handle>-start-opacity` | number `0–1` | default `1`; per-stop alpha for the first stop; overridable at block-level |
| `--gradient-<handle>-end-opacity` | number `0–1` | default `1`; per-stop alpha for the second stop; overridable at block-level |

`--gradient-background` is a **separate variable** owned by the color-scheme system (see Out of scope § `--gradient-background`); it's emitted per scheme inside the role-token block, not from this metaobject.

## Behavior

- **`angle` default at `135deg`.** When blank, the emitter falls through to `135deg` (conventional diagonal). The metaobject schema also sets `default: 135`, so the fallback rarely fires in practice.
- **Reserved handle `background` skipped.** See Output shape § skipped emissions and Out of scope § `--gradient-background` for the full collision rationale.
- **Incomplete entries skip emission.** A gradient with blank `color_start` or `color_end` produces no `--gradient-<handle>` line. Skipping over emitting a malformed declaration.
- **Per-stop opacity defaults to `1`.** The `--gradient-<handle>-start-opacity` / `-end-opacity` variables emit at `1` per entry. Consumers override either at block-level (`--gradient-hero-start-opacity: 0.7`) to soften a stop without composing a new gradient. The opacity inputs flow through the `rgb(from var(--color-role-X) r g b / α)` syntax that the substrate already uses for translucent treatments per `utility--css-variables` v1.11.0 — same vocabulary, applied at the gradient layer.
- **Scheme-role validation is a content invariant, not a runtime guard.** The metaobject schema's `choices` validation (`background` / `foreground` / `primary`) prevents arbitrary strings at authoring. The emitter trusts the validated input — no re-check at render time. An off-list value reaching the runtime (admin schema bypass) emits `var(--color-role-<bogus>)`, which CSS resolves to the variable's `initial` value, and the `rgb(from <initial> …)` composition falls to the spec's invalid-color behavior. Diagnosable at a glance; not actively guarded.
- **`system.handle` is the load-bearing key.** The handle drives the emitted variable names (`--gradient-<handle>` + the two opacity inputs). Renaming an entry's handle moves every consumer's `var(--gradient-<old>)` to undefined. `name` is decorative.

## Seed entries

Recommended catalog (full details in `metaobject-definitions.md` § gradient):

| Handle | Name | angle | color_start | color_end |
|---|---|---|---|---|
| `hero` | Hero | 135 | `primary` | `background` |

The seed covers the most common composition (primary-accent fading to the scheme background — a hero-banner wash). Per-project additions extend the catalog per their archetype needs (`section-divider` for subtle washes, `accent-bar` for narrow strips, etc.).

## Locale keys

N/A — design-system catalog, no user-facing strings beyond the `name` field for admin display.

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page(s)**: `sections/validation--substrate--gradient.liquid` + `templates/index.validation--substrate--gradient.json` *(planned — does not exist today)*. May co-locate with the `utility--css-variables` validation page once that lands (gradient emission is one of the snippet's five domains).
- **API surface** (matrix to exercise):
  - **Per-entry gradient catalog**: each `gradient` metaobject entry rendered as a swatch — a sized box with `background: var(--gradient-<handle>)`. Reader confirms the rendered gradient matches the angle + role pair on the entry.
  - **Scheme cycling**: every gradient entry shown under each color scheme (parent block carries `color-scheme:scheme-N` modifier). Reader confirms the gradient re-resolves visually per scheme — same declaration, different colors because the role tokens themselves change.
  - **Per-stop opacity override**: a row where the swatch overrides `--gradient-<handle>-start-opacity: 0.5` at block-level. Reader confirms the first stop renders translucent against the page background; the second stop stays opaque.
  - **Reserved-handle behavior**: a developer-test entry with handle `background` exists transiently → confirm no `--gradient-background` emission in `:root` (DevTools); only the per-scheme `--gradient-background` (set inside scheme rule blocks) is present.
  - **Incomplete-entry behavior**: a developer-test entry with blank `color_start` → confirm no emission.
- **Edge cases**:
  - Entry with `angle` blank → emits `135deg` (the emitter's `| default: 135` fallback)
  - Entry with `system.handle == 'background'` → no emission at this surface; per-scheme `--gradient-background` is separate
  - Entry with `color_start` and `color_end` set to the same role → emits a no-op gradient (a flat color); accepted, not flagged
  - Off-list role value (would require admin schema bypass) → emits `rgb(from var(--color-role-<bogus>) r g b / 1)`, which CSS treats as invalid; the gradient stop falls to transparent
  - Per-stop opacity overridden to `0` → that stop renders fully transparent, leaving the gradient looking like a fade-to-page-background on that end
- **Visual showcase**: a grid of gradient swatches, one per entry, each labeled with handle + angle + role pair. The grid renders under three scheme-override children (scheme-1 inherited, scheme-2 + scheme-3 overridden) so a reader can verify scheme re-resolution at a glance. A second row demonstrates per-stop opacity overrides (start=0.5, end=0.5, both=0.7) on the same entry.
- **Assertions** (prose; Playwright once installed):
  - Computed `background` on a swatch styled `background: var(--gradient-hero)` resolves to a `linear-gradient(135deg, rgb(…) ,rgb(…))` whose two stops match the active scheme's `--color-role-primary` and `--color-role-background` hexes at α=1.
  - The same swatch inside a `color-scheme:scheme-2` ancestor resolves to a gradient with different rgb stop values — different hexes, identical declaration.
  - A swatch overriding `--gradient-hero-start-opacity: 0.5` resolves to a gradient whose first stop has α=0.5; the second stop stays α=1.
  - A `--gradient-<handle>` lookup on `:root` for `handle == 'background'` returns the empty string (no emission); the per-scheme block sets `--gradient-background` only inside scheme rule scopes.
- **Unit scope**: none (metaobject layer; no JS).

## Out of scope

- **CSS emission mechanics** — covered by `utility--css-variables.md`. This spec describes the data contract and runtime semantics; that spec covers how the snippet composes the gradient emission alongside the four other domains.
- **`--gradient-background` (per-scheme background gradient)** — a *separate* variable, emitted by the color-scheme block of `utility--css-variables`, not by this metaobject. Per-scheme settings (`scheme.settings.background_gradient`) drive it; the `background` handle on this metaobject is reserved (skipped) to avoid the namespace collision.
- **Radial / conic / mesh gradients** — schema is linear-only by design. Adding a radial variant would require a new field (`type: linear | radial`) and emission branching. Defer until a consumer demands it.
- **Stops beyond two** — schema is two-stop only (`color_start` + `color_end`). Three-stop or N-stop gradients require schema changes (a multi-line text field for stops? a list of role pairs?). Defer until a consumer demands it.
- **Non-role color stops** — the validation list (`background` / `foreground` / `primary`) is intentional. Role-binding is the load-bearing design choice that makes gradients scheme-adaptive. Per-project surfaces wanting a palette-fixed gradient (e.g., a brand-driven banner that should look identical across schemes) compose at the consumer side using `theme_color` palette variables directly:

  ```css
  .promo-banner {
    background: linear-gradient(135deg, var(--color-brand-orange), var(--color-cream));
  }
  ```

  This is project-CSS territory, not a metaobject extension. Splitting the schema into "role select OR palette picker" would erode the scheme-adaptive invariant for limited per-project gain.

## Related

- `utility--css-variables.md` — the substrate emitter that materializes gradient entries into CSS. Defers the data + scheme-adaptivity contract to this spec.
- `theme-color.md` — sibling metaobject spec (color palette tokens). Disjoint namespace: `theme_color` emits `--color-<handle>` (scheme-independent palette); this spec emits `--gradient-<handle>` (scheme-adaptive via role tokens).
- `.context/docs/metaobject-definitions.md` § `gradient` — setup contract (Shopify admin metaobject definition schema, field validations, recommended seed entry).
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (referencing, fallback chains, override scopes).
