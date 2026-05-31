# theme_color

**Layer**: substrate

**Type**: metaobject (`theme_color`)

**Status**: shipped (retrofit)

**Implementation**:
- `snippets/utility--css-variables.liquid` v1.11.0 (CSS variable emitter — `:root` `--color-<handle>` lines)
- `snippets/utility--meta-theme-color.liquid` v1.1.0 (head meta tag emitter)
- Metaobject definition itself — created per `metaobject-definitions.md` § `theme_color`

**Reconciled**: 2026-05-31

**Reviewed**: pending

**Depends on**: none — substrate-root token type

**Consumers**:
- `snippets/utility--css-variables.liquid` — iterates `metaobjects.theme_color.values`, emits `--color-<handle>` in `:root`
- `snippets/utility--meta-theme-color.liquid` — re-extracts `hex_code.value` for the `<meta name="theme-color">` head tag
- `snippets/utility--color-contrast.liquid` — accepts a hex via its `color:` param (callers pass `hex_code.value` when feeding a theme_color)
- Block settings (role-named ids): `spacer.background_color`, `title.text_color`, `richtext.text_color`, `separator.line_color`, `media.overlay_color`
- Theme settings: `meta_theme_color` (singular metaobject picker in `config/settings_schema.json`)

## Purpose

A named color token in the design system's palette. Each entry pairs a stable handle with a hex value; the consumption surface is the `--color-<handle>` CSS variable emitted at `:root`. Brand colors (`accent`), neutrals (`white`, `black`, `muted`), and semantic state colors (`success`, `warning`, `error`, `info`) all live here.

**Boundary with color-scheme roles.** Color-scheme settings (background, foreground, primary, border, shadow, button sub-roles, input sub-roles) populate the **`--color-role-<role>`** namespace, not `--color-<handle>`. The two are disjoint: `theme_color` is a flat palette catalog; scheme roles are per-section role assignments. A theme_color entry whose handle happens to be `background` emits `--color-background` and does not interact with `--color-role-background`.

## Schema (definition contract)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | no | Display name in admin; `system.handle` derives from it. Never read by Liquid. |
| `hex_code` | Color | yes | Hex string consumed for CSS variable emission and for the `<meta>` tag. Stored as the canonical `#rrggbb`. |

Type-level metadata: project default (publishable + translatable, `storefront: PUBLIC_READ`). Full definition in `metaobject-definitions.md`.

## Output shape

Two emission contexts.

**CSS variables** (via `utility--css-variables`, captured into the inline-CSS asset):

```css
:root {
  --color-white: #ffffff;
  --color-off-white: #faf8f5;
  --color-black: #1a1a1a;
  /* one line per entry — handle drives the variable name */
}
```

**Head meta tag** (via `utility--meta-theme-color`, only when `settings.meta_theme_color` is set):

```html
<meta name="theme-color" content="#c2410c">
```

The meta tag's content is the literal `hex_code.value` of the chosen entry — not a `var()` reference, since `<meta>` does not resolve custom properties.

## CSS custom properties (emitted)

| Variable | Source | Default |
|---|---|---|
| `--color-<handle>` | One per `metaobjects.theme_color.values` entry — `hex_code.value` | n/a (no global fallback; rule-by-rule callers should provide one if a handle may be absent) |

`-rgb` companion variables are **not** emitted for theme_color entries. Translucent treatments (`rgba(var(--color-<handle>-rgb), <alpha>)`) currently rely on scheme-role tokens, which carry `-rgb` companions emitted by the scheme block of `utility--css-variables`. Adding `-rgb` for theme_color entries is an additive change; spec says no until a consumer needs it.

## Behavior

- **Emission iterates active entries.** Draft entries are not exposed at the storefront and therefore do not emit.
- **No reserved handles.** Unlike `gradient` (where `background` is owned by the scheme system) or `media_size` (where `fill` triggers a special-case branch), every `theme_color` handle is treated identically. Handle collisions with `--color-role-*` names cause no conflict — the two namespaces are disjoint after the role rename.
- **Blank `hex_code`.** The field is required at the definition level; a populated entry that somehow ships a blank `hex_code` emits a malformed declaration (`--color-<handle>: ;`) which the browser drops. Defensive guard is not added — entries are merchant-controlled and the cost of a malformed line is one ignored declaration. Out of scope for the spec.
- **Load-bearing handles.** These handles are referenced by component CSS as `var(--color-<handle>)`. Renaming them in admin silently breaks the consuming rules:
  - `success` — positive state (inventory in-stock, form success, confirmation badges)
  - `warning` — caution state (low-stock pills, pending states, advisory banners)
  - `error` — negative state (form errors, out-of-stock pills, destructive actions)
  - `info` — neutral informational state (tips, neutral notices)

  Brand/neutral handles (`accent`, `white`, `off-white`, `black`, `muted`) are referenced from settings on blocks (`background_color`, `text_color`, etc.) by GID, so renames are safe for those.

- **Hex re-extraction is restricted.** All CSS consumers read `var(--color-<handle>)` rather than `hex_code.value` directly. The only re-extraction site is `utility--meta-theme-color` (the `<meta>` tag, which can't consume custom properties).

## Seed entries

The canonical seed set the theme expects to find on a freshly provisioned store. The palette is intentionally tame — projects extend it per-brand.

| Handle | Name | hex_code | Role |
|---|---|---|---|
| `white` | White | `#ffffff` | Neutral |
| `off-white` | Off white | `#faf8f5` | Neutral |
| `black` | Black | `#1a1a1a` | Neutral |
| `muted` | Muted | `#6b6b6b` | Neutral |
| `accent` | Accent | `#c2410c` | Brand |
| `success` | Success | `#16a34a` | Semantic (load-bearing) |
| `warning` | Warning | `#d97706` | Semantic (load-bearing) |
| `error` | Error | `#dc2626` | Semantic (load-bearing) |
| `info` | Info | `#2563eb` | Semantic (load-bearing) |

The four semantic seeds and `accent` are the minimum a project ships with. Neutrals can be replaced or extended per-brand.

## Locale keys

None at the type level. Consumers (block settings, theme settings) carry their own locale keys for the picker labels (`blocks.spacer.settings.background_color.label`, `colors.meta_theme_color.label`, etc.).

## Validation

Per `validation-contract.md` Tier 1a (substrate / metaobject).

- **Tier**: substrate — metaobject sub-shape
- **Page**: `sections/validation--substrate--theme-color.liquid` + `templates/index.validation--substrate--theme-color.json`.
- **Surface**: every entry of `metaobjects.theme_color.values` × three contexts (on-self with computed contrast foreground, on-light `#ffffff`, on-dark `#000000`).
- **Edge cases**:
  - Empty catalog (zero entries) → empty-state row renders, no malformed CSS emitted.
  - Single-entry catalog → single row renders, three swatches present.
  - Entry with blank `hex_code` → row renders with handle visible; `on-self` swatch background is unset (browser-default), contrast helper picks against `#ffffff` fallback.
  - Handle colliding with a scheme role name (e.g. an entry handled `background`) → emits `--color-background`; scheme system continues to populate `--color-role-background` independently. No visual regression on the validation page.
- **Visual showcase intent**: a reader scanning the page confirms every palette entry resolves to a usable color and that contrast against both extremes (white, black) is legible enough for the entry's intended role. Failing entries are immediately visible as illegible swatches.
- **Assertions** (prose; Playwright once installed):
  - Each entry row's `--color-<handle>` resolves to a valid `<color>` (no `unset`/`initial`).
  - The `on-self` swatch's foreground color (`var(--contrast)`) is whichever of `#000000` / `#ffffff` `color_contrast` deemed higher.
  - The `on-light` and `on-dark` swatches preserve the entry's hue as foreground; the contrast helper's pick is not applied here.
  - Entry handles appear as inline-code labels next to their hex strings.
- **Unit scope**: none (Liquid-only emission; `color_contrast` is a Liquid filter, not a JS helper).

## QoL — token-browse page

A separate spec deliverable from validation, even when the implementation shares a surface.

- **Intent**: developer-facing reference for the palette as it exists on the connected store. A reader (developer, agent, merchant designer in collab mode) browses the available `theme_color` entries, copies handles into block settings or stylesheet rules, and confirms hex values at a glance.
- **What's surfaced** (in addition to the validation harness): handle (as the copy-paste token), `name.value` (display label, for context), `hex_code.value` (literal hex), and an inline swatch.
- **Surface decision**: shared with the validation page. The validation contract permits this when "the two intents coincide naturally" (`validation-contract.md` § "QoL vs validation") — for color tokens, an entry shown three ways is both the validation harness and the browse surface. Implementation merges them; the spec records both intents for downstream clarity.
- **If split** (deferred until a project demands a clean browse-only page): the QoL page is `templates/index.theme-color-tokens.json` against a section `sections/qol--substrate--theme-color.liquid` that renders one row per entry with handle / name / hex / swatch in a flat tabular layout — no contrast contexts.

## Out of scope

- **Color-scheme role tokens** (`--color-role-background`, `--color-role-foreground`, `--color-role-primary`, `--color-role-border`, `--color-role-shadow`, button sub-roles, input sub-roles, derived tokens like `--color-role-foreground-muted`). These come from `settings.color_schemes` and emit via the scheme block of `utility--css-variables` — full contract in `utility--css-variables.md`.
- **Gradient stops** — the `gradient` metaobject composes stops by referencing `--color-role-<role>` for scheme-adaptive stops. A theme_color handle is not a valid stop name.
- **Runtime contrast computation** — handled by `snippets/utility--color-contrast.liquid` (its own spec). theme_color's spec is the input shape; the contrast utility is a separate consumer.
- **Translucent companion (`-rgb`)** for theme_color entries — additive; revisit when a consumer needs `rgba(var(--color-<handle>-rgb), <alpha>)` directly off a palette color rather than a scheme role.
