# layout

**Layer**: substrate

**Type**: layout (`layout/theme.liquid` + `layout/landing.liquid`)

**Status**: shipped

**Implementation**:
- `layout/theme.liquid` v1.0.0 (default layout — full chrome: skip-to-content + page-container + header-group + main + footer-group + overlay-group)
- `layout/landing.liquid` v1.0.0 (opt-in bare layout — skip-to-content + page-container + main only; no section groups)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- Head emitter utilities: `utility--meta-theme-color`, `utility--font-preload`, `utility--core-assets`, `utility--hreflang`, `utility--structured-data`, `utility--open-graph`, `utility--speculation-rules`
- Document-attribute emitters: `utility--language`, `utility--document-modifiers`
- Body chrome: `snippets/skip-to-content.liquid`
- Section-group manifests (theme.liquid only): `sections/header-group.json`, `sections/footer-group.json`, `sections/overlay-group.json`
- Theme settings: `settings.favicon`

**Consumers**:
- `templates/*.json` and `templates/*.liquid` — every page selects a layout, defaulting to `theme.liquid` unless the template explicitly declares `"layout": "landing"` (JSON) or `{% layout 'landing' %}` (Liquid). No current template selects `landing`; it ships as the parked option for future promo / single-purpose pages.

## Purpose

The two outermost render frames for every page. `theme.liquid` is the default — full chrome: `<head>` spine + skip-to-content + `.page-container` wrapping the header-group, the main-content anchor, the footer-group, and the overlay-group. `landing.liquid` is the opt-in bare frame — same `<head>` spine + skip-to-content + `.page-container` wrapping only `<main>`, with no section groups around it. Templates select between them; everything else flows through `{{ content_for_layout }}`.

Both layouts share the entire `<head>` block and the page-container / skip-to-content / main-anchor chrome verbatim. The divergence is one structural point — the three `{% sections %}` calls inside `.page-container`. Shared substrate of doc-level concerns (head ordering, document attributes, accessibility chrome, the `id="page_content"` anchor consumed by `dom.pageContent` and `skip-to-content`) stays uniform across page types; per-layout choice toggles only the inner page chrome.

## API

Layouts have no merchant-facing API — they're selected per-template, not configured. The interface is:

| Surface | Provided by | Consumed where |
|---|---|---|
| Layout selection | Template (`"layout": "<name>"` JSON or `{% layout '<name>' %}` Liquid) | Shopify renders the named file from `layout/` |
| Content slot | `{{ content_for_layout }}` | `<main id="page_content">` body |
| Head injection | `{{ content_for_header }}` | Last child of `<head>`, after every theme-side concern |
| Globals consumed | `page_title`, `page_description`, `canonical_url`, `settings.favicon` | Head literals (title, meta description, canonical link, favicon link) |

## Output shape

The two render-time DOM trees:

```html
<!-- theme.liquid -->
<html {language-attrs} {document-modifiers}>
  <head>
    <!-- meta + head-emitter pipeline (see Behavior § Head spine) -->
    {{ content_for_header }}
  </head>
  <body>
    <a class="sr-only" href="#page_content">…</a> <!-- skip-to-content -->
    <div class="page-container">
      <!-- header-group sections -->
      <main class="main-content" id="page_content">
        {{ content_for_layout }}
      </main>
      <!-- footer-group sections -->
      <!-- overlay-group sections -->
    </div>
  </body>
</html>
```

```html
<!-- landing.liquid -->
<html {language-attrs} {document-modifiers}>
  <head>
    <!-- identical head pipeline -->
    {{ content_for_header }}
  </head>
  <body>
    <a class="sr-only" href="#page_content">…</a>
    <div class="page-container">
      <main class="main-content" id="page_content">
        {{ content_for_layout }}
      </main>
    </div>
  </body>
</html>
```

The structural diff between the two layouts is exactly the three `{% sections %}` calls inside `.page-container` and the comment markers that frame them. Every other byte — `<!doctype>`, the `<html>` attribute set, the entire `<head>`, the skip-to-content, the `.page-container` wrapper, the `<main>` element, the closing tags — is byte-identical.

## CSS

N/A at the layout layer — the layouts themselves declare no CSS. The two structural classes (`.page-container`, `.main-content`) are styled in substrate stylesheets:

- `.page-container` — body-level page wrapper; styling lives in `assets/layer-theme.css` § body-level appearance rules
- `.main-content` — main element default layout; styling lives in `assets/layer-theme.css`
- `.sr-only` (skip-to-content link) — visually-hidden utility from `assets/layer-utilities.css`

## CSS custom properties (exposed)

N/A — layouts emit no CSS variables. Variable emission happens via `utility--css-variables` (rendered transitively through `utility--core-assets`).

## Behavior

### Head spine

Both layouts emit the same `<head>` in fixed order. Each stage delegates to a utility snippet or carries a small literal block keyed off a Shopify global / theme setting:

| Order | Stage | Implementation |
|---|---|---|
| 1 | Encoding / IE-compat / viewport | Three literal `<meta>` tags |
| 2 | Meta theme color | `{% render 'utility--meta-theme-color' %}` |
| 3 | Preload hints (fonts + manual additions) | `{% render 'utility--font-preload' %}` — comment block names this as the slot for additional `<link rel="preload">` / preconnect / dns-prefetch hints when a critical-path resource needs them |
| 4 | Core assets (CSS + JS substrate) | `{% render 'utility--core-assets' %}` |
| 5 | Title + meta description | Literal: `<title>{{ page_title }}</title>` + conditional `<meta name="description">` when `page_description` is non-blank |
| 6 | Canonical URL | Conditional `<link rel="canonical">` when `canonical_url` is non-blank |
| 7 | hreflang alternates | `{% render 'utility--hreflang' %}` |
| 8 | Favicon | Conditional `<link rel="shortcut icon">` when `settings.favicon` is set; sized via `image_url: width: 32, height: 32`, declared as `image/png` |
| 9 | Structured data | `{% render 'utility--structured-data' %}` |
| 10 | Open Graph | `{% render 'utility--open-graph' %}` |
| 11 | Speculation rules | `{% render 'utility--speculation-rules' %}` |
| 12 | `content_for_header` | Last child — Shopify's mandatory injection point for platform-side `<head>` content (analytics, app pixels, web pixels, App Bridge, theme editor wiring). MUST be last so theme-side meta is not overridden by platform injections. |

`{{ content_for_header }}` is a Shopify hard requirement — every layout must include it. Position-as-last is theme convention: theme-side concerns establish their meta first, then platform injections layer on top.

### Document attributes

The `<html>` opening tag in both layouts emits:

```
<html {% render 'utility--language' %} {% render 'utility--document-modifiers' %}>
```

`utility--language` emits `lang="<iso>"` + `dir="<direction>"` from the active Shopify locale. `utility--document-modifiers` emits `data-modifiers="<list>"` from the document-modifiers contract (the doc-level `data-modifiers` attribute consumed by `documentModifiers` in `document-utils.js` — see `.context/docs/modifier-system.md`).

### Body chrome

Both layouts emit, in order, inside `<body>`:

1. **Skip-to-content link** — `{% render 'skip-to-content' %}`. First focusable element on the page; jumps focus + scroll to `#page_content`. Visible on `:focus` only.
2. **`.page-container` wrapper** — top-level page wrapper. Receives body-level appearance defaults (background-color, color) from `layer-theme.css`.
3. **Inside `.page-container`** — diverges per layout.

### Divergence — `.page-container` inner content

`theme.liquid`:

```liquid
{% sections 'header-group' %}
<main class="main-content" id="page_content">
  {{ content_for_layout }}
</main>
{% sections 'footer-group' %}
{% sections 'overlay-group' %}
```

`landing.liquid`:

```liquid
<main class="main-content" id="page_content">
  {{ content_for_layout }}
</main>
```

The three section groups attach via `{% sections 'name' %}` — Shopify's section-group rendering mechanism — and read their manifest from `sections/<name>.json`. Each manifest names the sections + ordering + settings stored on that group. The three group manifests (`header-group.json`, `footer-group.json`, `overlay-group.json`) ship empty / minimal in the current state; they're the slots specialized header / footer / overlay sections will register into when those sections ship.

### `id="page_content"` anchor

The `<main>` element carries `id="page_content"`. Three contracts depend on this id literal:

- **`skip-to-content`** — its `href="#page_content"` jumps focus + scroll to this anchor.
- **`dom.pageContent`** (from `document-utils.js`) — lazy-getter returns `document.getElementById('page_content')`. Currently the only entry in the `dom` catalog (per `dom.spec.md` v2.0.0).
- **CSS anchor positioning** — future patterns that anchor to the main-content rectangle reference this id.

Renaming the id is a breaking change across three call sites — out of scope for either layout.

### Single-page-application opt-in

Neither layout currently registers a SPA / `view-transition` opt-in. The `@view-transition { navigation: auto; }` cross-document view-transition declaration in `layer-base.css` (per `design-constants.spec.md`) is the substrate's opt-in; layouts don't need a per-layout declaration.

## A11y

Substantial — every page's a11y chrome lives in the layout:

- **Skip-to-content link** — first focusable element; bypasses repeated header chrome for keyboard / SR users. Per `a11y-conventions.md` § Existing patterns.
- **Single `<main>` landmark per page** — the `<main class="main-content" id="page_content">` element. One main per page is a hard a11y rule; the layout enforces it structurally.
- **`<html lang>` + `<html dir>`** — emitted by `utility--language` from the active locale. SR pronunciation + bidi rendering depend on this.
- **`<title>`** — always emitted from `page_title`. Required for SR page-context announcement.
- **`<meta name="viewport">`** — emitted unconditionally; required for mobile-zoom accessibility.
- **Section-group ordering** (theme.liquid) — header before main, footer after main; overlay-group after footer (overlay-group hosts modal / drawer sections that render outside the document flow).

The layout itself has no ARIA roles to declare — `<header>` / `<main>` / `<footer>` semantics are emitted by the section groups' constituent sections, not by the layout wrapper.

## Locale keys

N/A at the layout layer — layouts emit no user-facing strings. The strings they delegate to (skip-to-content text, hreflang labels, structured-data alt text fallbacks) live in their respective utilities' locale-key sections.

## Validation

Per `validation-contract.md` — substrate / layout sub-shape (no dedicated tier; layouts are validated by the page-shape they wrap rather than a per-layout page).

- **Tier**: substrate — layout sub-shape
- **Page(s)**: covered indirectly by every validation surface. The `?view=validation` generate-and-drop slot and the `page.<name>` metaobject showcases all render through `layout/theme.liquid`; the head spine + body chrome + main-anchor are observable on every validation page. `landing.liquid` has no current consumer; a future validation surface that exercises it would set `"layout": "landing"` in its template JSON.
- **API surface**:
  - Head spine ordering — DevTools shows the 12 stages in the documented order before `content_for_header`'s injections
  - `<html lang>` matches the active locale (defaults: `en`; flips to `fr` under FR locale)
  - `<html data-modifiers>` carries the document-modifiers list
  - `<main id="page_content">` is present exactly once per rendered page
  - skip-to-content link is the first focusable element (Tab from page top lands on it)
  - skip-to-content `href="#page_content"` resolves (focus + scroll lands on `<main>`)
- **Edge cases**:
  - `page_description` blank → no `<meta name="description">` tag emitted
  - `canonical_url` blank → no `<link rel="canonical">` emitted (Shopify only emits canonical on certain page types)
  - `settings.favicon` unset → no favicon link
  - FR locale active → `<html lang="fr">`, hreflang alternates change accordingly (per `utility--hreflang.spec.md`)
  - landing.liquid invoked → header / footer / overlay groups do not render; main + chrome unchanged
- **Visual showcase**: each validation page renders through the default layout; the rendered head + body chrome is itself the showcase. A dedicated layout validation page is not required — the layout's footprint is exhaustively exercised by every other validation surface.
- **Assertions** (prose; Playwright once installed):
  - `document.querySelectorAll('main').length === 1`
  - `document.getElementById('page_content')` returns the `<main>` element
  - The first focusable element (`document.querySelector(':focusable, [tabindex]')` simulated via tab order) is the skip-to-content link
  - The `<head>` child element order matches the documented 12-stage sequence (assertions per known stages — meta-charset before any other meta, content_for_header last)
- **Unit scope**: none (Liquid only; no JS module ships from the layout layer).

## Implementation-time decisions

Both files are shipped — this is a retrofit spec. No open decisions.

## Out of scope

- **Per-template layout selection logic.** Layouts are static files; selection between `theme` and `landing` is a per-template decision made in the template file's `layout` directive. No runtime branching inside either layout.
- **Section-group authoring.** This spec describes the *attachment point* (`{% sections '<name>' %}` for the three groups). The group manifests (`sections/header-group.json` etc.) and the specialized sections that register into them are out of scope; they live in their own (future) specs once specialized sections ship.
- **Conditional head stages by page type.** Every page emits the same 12-stage head spine. Per-page-type variations (e.g. richer Open Graph on `templates/product`, conditional structured-data shape) live inside the head-emitter utilities, not at the layout layer. Layouts pass straight through to the utilities; the utilities branch.
- **A third layout shape.** Two layouts cover the current need: full chrome (`theme`) + bare main (`landing`). A third layout would earn its keep only if a new page archetype's chrome diverges meaningfully from both shapes; current direction is to handle archetype-specific chrome through specialized sections inside the section groups, not new layout files.
- **`landing.liquid` consumer registration.** No current template selects `landing`. The file ships as the parked option for future promo / external-campaign / minimal-chrome pages. Adding a template that selects it (e.g. `templates/promo.liquid` with `{% layout 'landing' %}`) is a separate authoring step.

## Related

- `.context/docs/composition-strategy.md` — the layer model; layout is the outermost frame above section host
- `section.spec.md` — the next inner wrapper inside `content_for_layout`; merchant-composable sections render between layout's `<main>` and the L1 blocks
- `dom.spec.md` — `dom.pageContent` getter; depends on `id="page_content"` on `<main>`
- `document-utils.spec.md` — `documentModifiers` (consumes the `<html data-modifiers>` attribute emitted via `utility--document-modifiers`)
- `design-constants.spec.md` — substrate constants the `<head>` pipeline indirectly emits via `utility--core-assets`
- `.context/rules/a11y-conventions.md` § Existing patterns — names the skip-to-content link + reduced-motion / forced-colors handling
