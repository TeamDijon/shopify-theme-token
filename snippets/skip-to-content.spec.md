# skip-to-content

**Layer**: 0

**Type**: snippet (`snippets/skip-to-content.liquid`)

**Status**: shipped

**Implementation**: `snippets/skip-to-content.liquid` v1.1.0 (accessibility chrome helper)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- `actions.skip_to_content` locale key (runtime locale file)
- `.skip-to-content` CSS class — declared in `assets/layer-utilities.css` § skip-to-content rule group
- `#page_content` anchor target — emitted by `layout/theme.liquid` + `layout/landing.liquid` on the `<main>` element

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — rendered as the first child of `<body>`, before `.page-container`

## Purpose

The page's first focusable element — a single `<a class="skip-to-content" href="#page_content">` that lets keyboard and screen-reader users bypass repeated navigation chrome (header group + nav links) and jump straight to the main content. Visually hidden by default; revealed on focus via the `.skip-to-content:focus-within` rule in `layer-utilities.css`.

Native `<a>` semantics carry the link role + tab-stop + Enter activation — no `role`, `tabindex`, or `aria-label` needed. Matching `aria-label` against the visible text is an anti-pattern (Tab announcer reads the visible text already; an `aria-label` would override and create a duplicate-announcement risk).

## API

No params. Renders a static link.

## Output shape

```html
<a class="skip-to-content" href="#page_content">Skip to content</a>
```

(EN; FR equivalent renders `Passer au contenu`.)

## CSS

N/A at the snippet layer — styling lives in `assets/layer-utilities.css` § skip-to-content rule group (`@layer utilities`). Default state is screen-reader-only (1px positioned-off-screen, clipped); `:focus-within` repositions to top-left with white background, black border, `--layer-temporary` z-index. See `layer-utilities.spec.md` § Skip-to-content link.

## CSS custom properties (exposed)

N/A.

## Behavior

- **`href="#page_content"` targets the `<main>` element.** Both layouts emit `<main class="main-content" id="page_content">`. Renaming the id breaks this link's target. See `layout.spec.md` § `id="page_content"` anchor for the load-bearing nature.
- **Render order matters.** Called first thing inside `<body>` so it's the first tab stop. Placing it after section groups would defeat the purpose — keyboard users would tab through header navigation first.
- **Native semantics only.** No ARIA — `role="link"`, `tabindex="0"`, `aria-label` are dropped. Native `<a href>` carries link role + tab-stop; Enter / Space activates; the visible text is the accessible name.
- **Localized via `actions.skip_to_content` runtime locale key.** EN: "Skip to content" / FR: "Passer au contenu". Cross-cutting top-level `actions` namespace per `locale-conventions.md`.
- **Whitespace-trimmed text interpolation.** `{{- 'actions.skip_to_content' | t -}}` — trims surrounding whitespace inside the `<a>` so the rendered anchor contains no extra whitespace nodes.

## A11y

The snippet is itself the accessibility surface. Per `a11y-conventions.md` § Existing patterns — skip-to-content link is the named pattern.

- **First-focusable position.** Tab from page top → focus lands here.
- **Visible-on-focus.** `:focus-within` reveal so keyboard users see the link's intent; screen-readers announce it via native `<a>` role + visible text.
- **Activation behavior.** Enter / Space activates → browser jumps focus + scroll to `#page_content` (the `<main>` element). The `:focus { scroll-margin-block: 5rem }` rule in `layer-reset.css` ensures the jump clears any sticky chrome.
- **Locale keys live under `accessibility.*` … not for this one.** The `actions.*` namespace is used because `skip_to_content` is a verb (action label), not SR-only text. See `locale-conventions.md` § Cross-cutting top-level namespaces.

## Locale keys

| Key | Value (EN) | Value (FR) |
|---|---|---|
| `actions.skip_to_content` | `"Skip to content"` | `"Passer au contenu"` |

## Validation

Per `validation-contract.md` Tier 2 (primitive) — sub-shape: L0 snippet without block pairing.

- **Tier**: primitive (L0 snippet)
- **Page(s)**: every page (every layout call); no dedicated validation page
- **API surface** (matrix to exercise):
  - Tab from page top → focus lands on the skip-to-content link
  - Focused link → visible with white background + black border at top-left
  - Enter key on focused link → page scrolls + focus moves to `<main>` element
  - Locale switched to FR → link text changes to "Passer au contenu"
  - DevTools → page source shows the `<a class="skip-to-content" href="#page_content">` as the first focusable element in `<body>`
- **Edge cases**:
  - User-agent stylesheets overriding `:focus-within` reveal — defensive against; the `layer-utilities.css` rule has higher specificity via the layered cascade
  - Page with no `<main id="page_content">` (e.g. a custom layout that drops the anchor) → link jumps to top of document (browser default for missing fragment). Out of scope; both shipped layouts emit the anchor.
- **Visual showcase**: every page implicitly exercises; Tab from top of any rendered page reveals the link
- **Assertions** (prose; Playwright once installed):
  - `document.querySelector('body > a.skip-to-content')` is the first focusable element
  - Pressing Tab on page load focuses the link; pressing Enter scrolls to `#page_content`
  - On FR locale, the link's visible text matches the FR translation
- **Unit scope**: none (pure markup)

## Out of scope

- **Multi-section skip targets.** Single skip target (`#page_content`). Per-section anchors (`#header`, `#footer`) would require additional skip links — out of scope at the substrate; specialized sections can add their own inline if needed.
- **Skip-link customization.** No per-template variation. The link is identical across pages.
- **Soft `position: absolute` fallback.** Browsers without `:focus-within` (none modern) would never reveal the link. Defensive fallback (`:focus` matching) was considered and dropped — every supported browser handles `:focus-within`.
- **`role="navigation"` wrapping.** A `<nav>` wrapper around the link would create a landmark for a one-link nav — overkill. The plain `<a>` is sufficient per the WAI-ARIA Authoring Practices skip-link pattern.

## Related

- `layout.spec.md` — primary consumer; calls this snippet as first child of `<body>` in both layouts
- `layer-utilities.spec.md` § Skip-to-content link — styling source
- `.context/rules/a11y-conventions.md` § Existing patterns — names the skip-to-content link as the canonical theme-level pattern
- `.context/docs/locale-conventions.md` — `actions.*` namespace placement
