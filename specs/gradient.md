# gradient

**Layer**: substrate

**Type**: metaobject (`gradient`)

**Status**: shipped

**Implementation**:
- `snippets/utility--css-variables.liquid` v1.11.0 (CSS variable emitter — `:root` gradient block, one `--gradient-<handle>` per non-reserved entry)
- Metaobject definition itself — created per `metaobject-definitions.md` § `gradient`

**Reconciled**: 2026-05-31

**Reviewed**: pending

**Depends on**: theme settings `color_schemes` (the scheme role tokens — `--color-role-background` / `--color-role-foreground` / `--color-role-primary` — that gradient stops interpolate). No direct `theme_color` dependency — gradients use *roles*, not palette entries.

**Consumers**: any CSS context consuming `background: var(--gradient-<handle>)`. None on the shipped surface today; consumers are forthcoming as the seeded `hero` gradient gets adopted across hero / banner archetypes. Background gradients on `<token-section>` use the per-scheme `--gradient-background` (a different surface — see Out of scope).

## Purpose

A named scheme-adaptive linear gradient. Each entry defines an angle + two scheme-role endpoints (`background` / `foreground` / `primary`); the entry's handle becomes a `--gradient-<handle>` CSS variable emitted in `:root`, with stops as `var(--color-role-<endpoint>)` references. One declaration, scheme-aware output — `--gradient-hero` resolves to one set of colors under `scheme-1`, a different set under `scheme-2`, automatically.

The design choice is to bind gradient stops to **roles, not literal colors.** A `linear-gradient(#c2410c, #ffffff)` would look the same in every scheme; `linear-gradient(var(--color-role-primary), var(--color-role-background))` re-resolves per scheme. The metaobject's `color_start` / `color_end` fields are role names, not color values — a hard validation in the metaobject schema.

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

The emitter writes one line per entry inside the `:root` block that follows the theme-color palette:

```css
:root {
  /* …theme_color palette… */

  --gradient-hero: linear-gradient(135deg, var(--color-role-primary), var(--color-role-background));
  /* one line per non-reserved gradient entry */
}
```

Skipped emissions:

- **Reserved handle `background`** — the color-scheme system owns `--gradient-background` (each scheme's background-gradient setting, emitted in the per-scheme block). An entry with `system.handle == 'background'` is skipped here to prevent collision. Editor-side authoring should avoid the handle.
- **Incomplete entries** — when `color_start.value` or `color_end.value` is blank, no line emits. Skipping is safer than emitting a malformed `linear-gradient(135deg, var(--color-role-), var(--color-role-)` declaration.

## CSS

N/A at the metaobject layer — emission rules live in `utility--css-variables`'s output. The metaobject contributes the data; the snippet composes the rule.

## CSS custom properties (exposed)

| Variable | Type | Source |
|---|---|---|
| `--gradient-<handle>` | CSS `linear-gradient(<angle>deg, <var>, <var>)` | one per entry; angle + two role-token references |

Note that `--gradient-background` is a **separate variable** owned by the color-scheme system (see Out of scope) — it's emitted per scheme inside the role-token block, not from this metaobject. The two namespaces are disjoint: this metaobject emits `--gradient-<arbitrary-handle>` in `:root`; the scheme system emits `--gradient-background` inside scheme rule blocks.

## Behavior

- **Stops reference scheme role tokens, not literal colors.** `color_start.value` (e.g., `primary`) interpolates as `var(--color-role-primary)` in the emitted `linear-gradient(...)`. The stored gradient declaration is a single line; CSS variable resolution at consumption time picks up whichever scheme is active on the consuming element. One definition → scheme-adaptive output.
- **`angle` default at `135deg`.** When blank, the emitter falls through to `135deg`. The choice is conventional (diagonal top-left → bottom-right). The metaobject schema also sets `default: 135`, so the fallback rarely fires in practice.
- **Reserved handle: `background`.** An entry with handle `background` is skipped during emission. The color-scheme system uses `--gradient-background` for the per-scheme background gradient (set per scheme via `scheme.settings.background_gradient`, falling back to the flat `--color-role-background` value when absent). The two surfaces would clash if a user-defined entry emitted `--gradient-background` in `:root` — the per-scheme rule blocks come later in the cascade but at equal specificity, so the consequence would be a tangled override chain. Skipping the user entry keeps the system's invariant simple.
- **Incomplete entries skip emission.** A gradient metaobject with blank `color_start` or `color_end` produces no `--gradient-<handle>` line. The runtime tolerates partial entries by skipping rather than emitting a malformed declaration.
- **Scheme-role validation is a content invariant, not a runtime guard.** The metaobject schema's `choices` validation (`background` / `foreground` / `primary`) prevents merchants from typing arbitrary strings into the field. The emitter trusts the validated input — it doesn't re-check at render time. An off-list value that somehow reaches the runtime (e.g., via a Shopify admin bypass) would emit `var(--color-role-<bogus>)`, which CSS resolves to the variable's `initial` value (an empty token), and the gradient stop falls through to the spec's `invalid` color (transparent). Diagnosable at a glance — the stop looks "missing" — but not actively guarded.
- **`system.handle` is the load-bearing key.** The handle drives the emitted variable name. Renaming an entry's handle moves every consumer's `var(--gradient-<old>)` to undefined. `name` is decorative.

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
  - **Reserved-handle behavior**: a developer-test entry with handle `background` exists transiently → confirm no `--gradient-background` emission in `:root` (DevTools); only the per-scheme `--gradient-background` (set inside scheme rule blocks) is present.
  - **Incomplete-entry behavior**: a developer-test entry with blank `color_start` → confirm no emission.
- **Edge cases**:
  - Entry with `angle` blank → emits `135deg` (the emitter's `| default: 135` fallback)
  - Entry with `system.handle == 'background'` → no emission at this surface; per-scheme `--gradient-background` is separate
  - Entry with `color_start` and `color_end` set to the same role → emits a no-op gradient (`linear-gradient(Xdeg, var(--color-role-Y), var(--color-role-Y))` resolves to a flat color); accepted, not flagged
  - Off-list role value (would require admin schema bypass) → emits `var(--color-role-<bogus>)`, which CSS treats as invalid; the gradient stop falls to transparent
- **Visual showcase**: a grid of gradient swatches, one per entry, each labeled with handle + angle + role pair. The grid renders under three scheme-override children (scheme-1 inherited, scheme-2 + scheme-3 overridden) so a reader can verify scheme re-resolution at a glance.
- **Assertions** (prose; Playwright once installed):
  - Computed `background` on a swatch styled `background: var(--gradient-hero)` matches `linear-gradient(135deg, <scheme-1-primary-hex>, <scheme-1-background-hex>)`.
  - The same swatch inside a `color-scheme:scheme-2` ancestor matches `linear-gradient(135deg, <scheme-2-primary-hex>, <scheme-2-background-hex>)` — different hexes, identical declaration.
  - A `--gradient-<handle>` lookup on `:root` for `handle == 'background'` returns the empty string (no emission); the per-scheme block sets `--gradient-background` only inside scheme rule scopes.
- **Unit scope**: none (metaobject layer; no JS).

## Out of scope

- **CSS emission mechanics** — covered by `utility--css-variables.md`. This spec describes the data contract and runtime semantics; that spec covers how the snippet composes the gradient emission alongside the four other domains.
- **`--gradient-background` (per-scheme background gradient)** — a *separate* variable, emitted by the color-scheme block of `utility--css-variables`, not by this metaobject. Per-scheme settings (`scheme.settings.background_gradient`) drive it; the `background` handle on this metaobject is reserved (skipped) to avoid the namespace collision.
- **Radial / conic / mesh gradients** — schema is linear-only by design. Adding a radial variant would require a new field (`type: linear | radial`) and emission branching. Defer until a consumer demands it.
- **Stops beyond two** — schema is two-stop only (`color_start` + `color_end`). Three-stop or N-stop gradients require schema changes (a multi-line text field for stops? a list of role pairs?). Defer until a consumer demands it.
- **Per-stop alpha** — stops are opaque scheme-role references. Translucent gradients require either an alpha-bearing variant of the role tokens (would need its own emission path) or composition at the consumer side (`background: linear-gradient(135deg, rgb(from var(--color-role-primary) r g b / 0.5), …)`). Per-project; not modeled at the metaobject layer.
- **Non-role color stops** — the validation list (`background` / `foreground` / `primary`) is intentional. A merchant wanting a gradient bound to a `theme_color` palette entry (rather than a scheme role) would need either a schema extension or a custom CSS rule outside this metaobject. The role binding is the load-bearing design choice — it's what makes gradients scheme-adaptive.

## Related

- `utility--css-variables.md` — the substrate emitter that materializes gradient entries into CSS. Defers the data + scheme-adaptivity contract to this spec.
- `theme-color.md` — sibling metaobject spec (color palette tokens). Disjoint namespace: `theme_color` emits `--color-<handle>` (scheme-independent palette); this spec emits `--gradient-<handle>` (scheme-adaptive via role tokens).
- `.context/docs/metaobject-definitions.md` § `gradient` — setup contract (Shopify admin metaobject definition schema, field validations, recommended seed entry).
- `.context/docs/design-system-metaobjects.md` — catalog-wide consumer patterns (referencing, fallback chains, override scopes).
