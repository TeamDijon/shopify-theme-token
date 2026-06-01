# quote

**Layer**: 0

**Type**: snippet (`snippets/quote.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Substrate typography cascade (inherits `<blockquote>` styling from `assets/layer-base.css` / `assets/core.css` — body font, foreground color, paragraph rhythm)
- No JS, no nested primitives

**Consumers**:
- `pull-quote` L1 block (planned) — wraps the quote in a `<figure>` with optional figcaption layout; larger typographic treatment
- `testimonial` L1 block (planned) — embeds inside a testimonial card alongside author/role/avatar/optional `star-rating`
- Future `article-body` specialized sections (planned) — direct blockquote embeds when richtext isn't the source

## Purpose

A `<blockquote>` primitive — the canonical blockquote-rendering surface across the theme. Renders quoted text with optional decorative marks and an optional citation (text + URL). Sub-component primitive: never the root of a theme block; L1 wrappers (`pull-quote`, `testimonial`) carry the schema and add their surrounding semantic structure.

The point of an L0 quote primitive is to lift the blockquote/cite markup choices, the decorative-mark vocabulary, and the CSS custom-property surface out of every L1 consumer. Future quote-bearing blocks reach for this snippet instead of re-implementing the structure — keeps one source of truth for typography, mark glyphs, and citation linking.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `content` | string (inline_richtext or plain) | yes | — | The quoted text. Blank → snippet `break`s (emits nothing). |
| `cite_text` | string | no | blank | Citation / attribution text (author, source title, etc.). When set, renders inside a `<cite>` element after the quote. |
| `cite_url` | string (URL) | no | blank | Canonical source URL. When set, emits as the `<blockquote cite="...">` attribute; if `cite_text` is also set, the cite text becomes an anchored link. When `cite_text` is blank but `cite_url` is set, the URL is exposed via the attribute only — no visible `<cite>` element. |
| `decorative_marks` | boolean | no | `false` | When `true`, the snippet renders decorative `“` / `”` quote glyphs as `::before` / `::after` pseudo-elements on the `<blockquote>`. Toggled via a `data-modifiers="marks:visible"` attribute so CSS can branch without an inline style. |

Consumers invoke inline from their L1 render path:

```liquid
{% render 'quote',
  content: block.settings.content,
  cite_text: block.settings.attribution,
  cite_url: block.settings.source_url,
  decorative_marks: block.settings.show_marks %}
```

## Output shape

```html
<blockquote class="quote"
            data-modifiers="marks:visible"
            cite="https://example.com/source">
  <p>The quoted text. Multi-paragraph quotes split into multiple <p> elements when the source uses inline_richtext.</p>
  <cite>
    <a href="https://example.com/source">Author Name, Publication</a>
  </cite>
</blockquote>
```

Variants by argument combination:

| `cite_text` | `cite_url` | `<blockquote cite>` | `<cite>` block emitted |
|---|---|---|---|
| blank | blank | omitted | omitted |
| set | blank | omitted | `<cite>{{ cite_text }}</cite>` (plain) |
| blank | set | `cite="<url>"` | omitted |
| set | set | `cite="<url>"` | `<cite><a href="<url>">{{ cite_text }}</a></cite>` |

The `data-modifiers="marks:visible"` attribute is omitted entirely when `decorative_marks` is `false` — the absence drives the CSS branch.

`content` enters wrapped in a single `<p>` when it's a plain string; an inline_richtext source preserves the merchant's paragraph breaks (Shopify renders them as `<p>` elements). Either way, the `<blockquote>` carries paragraph children, not naked text — matches HTML spec recommendation (content of `<blockquote>` is flow content; `<p>` wrappers give the paragraph rhythm CSS something to target).

## CSS

Component-rooted per `css-standards.md`:

```css
.quote {
  margin-block: 0;
  padding-inline-start: var(--quote-padding-inline-start, 1rem);
  border-inline-start: var(--quote-border-width, 2px) solid var(--quote-border-color, var(--color-role-border));
  font-size: var(--quote-font-size, 1em);
  line-height: var(--quote-line-height, 1.5);
  color: var(--quote-color, var(--color-role-foreground));

  & > p {
    margin-block: 0;

    & + p {
      margin-block-start: 0.75em;
    }
  }

  & > cite {
    display: block;
    margin-block-start: 0.75em;
    font-size: var(--quote-cite-font-size, 0.875em);
    font-style: normal;
    color: var(--quote-cite-color, var(--color-role-foreground-muted));

    & > a {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  }

  &[data-modifiers~="marks:visible"] {
    position: relative;
    padding-inline-start: var(--quote-mark-padding-inline-start, 2.5em);
    border-inline-start: none;

    &::before {
      content: "\201C"; /* left double quotation mark */
      position: absolute;
      inset-inline-start: 0;
      inset-block-start: -0.125em;
      font-size: var(--quote-mark-size, 3em);
      line-height: 1;
      color: var(--quote-mark-color, var(--color-role-primary));
    }
  }
}
```

The default (no marks) is a left-border-rail blockquote — the conventional editorial treatment, low visual weight. The `marks:visible` modifier swaps the border for a leading typographic mark (left double-quotation-mark glyph as the `::before` content). Only the opening mark is rendered by default — the closing mark would compete with the cite element's vertical position and the open-only treatment is the more common editorial pattern. A consumer wanting both marks adds `::after` in their own scope.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--quote-padding-inline-start` | Inline-start padding (rail mode) | `1rem` |
| `--quote-border-width` | Border-left rail width (rail mode) | `2px` |
| `--quote-border-color` | Border-left rail color (rail mode) | `var(--color-role-border)` |
| `--quote-font-size` | Quote text size relative to surrounding text | `1em` |
| `--quote-line-height` | Quote text line-height | `1.5` |
| `--quote-color` | Quote text color | `var(--color-role-foreground)` |
| `--quote-cite-font-size` | Cite line text size | `0.875em` |
| `--quote-cite-color` | Cite line text color | `var(--color-role-foreground-muted)` |
| `--quote-mark-padding-inline-start` | Inline-start padding when marks are visible (room for the glyph) | `2.5em` |
| `--quote-mark-size` | Decorative mark glyph size | `3em` |
| `--quote-mark-color` | Decorative mark glyph color | `var(--color-role-primary)` |

`em`-relative defaults so quotes nested in larger typography (e.g., a `pull-quote` L1 with `font-size: 1.5rem` on its container) scale proportionally without per-consumer overrides.

## Behavior

- **Early exit on blank `content`.** A `quote` render with empty `content` produces no output — protects consumers passing a metafield that's not set. The L1 wrapper (figure / card / etc.) should also handle the empty case at its own layer to avoid an empty surrounding shell.
- **`<p>` wrapping is automatic.** Plain strings emit as a single `<p>`; inline_richtext preserves paragraph breaks. The `<blockquote>` always carries paragraph children, never naked text.
- **`cite_url` without `cite_text` populates the attribute only.** The HTML `cite` attribute is the canonical source pointer regardless of whether a visible `<cite>` block renders. Crawlers and assistive tech can discover the source; the visible UI stays minimal.
- **`<cite>` font-style is normalized to `normal`.** UA defaults italicize `<cite>`; the snippet overrides since per-locale typography varies (italic vs. oblique vs. straight is editorial-design territory, not semantic). Consumers wanting italic re-apply via the override knob.
- **Decorative mark is opening-only by default.** The `::before` glyph renders left of the quoted text. Pseudo-elements aren't announced by SR; no `aria-hidden` needed. A closing `::after` is intentionally omitted — the cite element provides the visual closure of the quote block. Consumers wanting both marks add `::after` themselves.
- **Marks are toggled via `data-modifiers`, not a separate attribute.** Aligns with the project's single-categorical-state surface (`modifier-system.md`). CSS branches via `[data-modifiers~="marks:visible"]`; absence means the rail mode applies.
- **No `<figure>` wrapper at the snippet layer.** The L1 caller (`pull-quote`) owns figure/figcaption semantics. The snippet renders the blockquote alone so multiple wrapping contexts (figure for pull-quote, card for testimonial, naked for article-body inline) all reuse the same internal structure.

## A11y

- **`<blockquote>` is the semantic element.** Native screen-reader handling: announces "blockquote" before content, "end of blockquote" after.
- **`<cite>` carries citation semantics.** SR users hear the citation as a citation, not as adjacent text.
- **`cite="<url>"` is the machine-discoverable source pointer.** Search engines and SR may surface it even when no visible link exists.
- **Decorative marks are pseudo-elements.** Not announced by SR. No `aria-hidden` needed.
- **No SR-only label required.** The semantic structure carries the announcement; adding an explicit label would duplicate the inferred role.

## Locale keys

N/A — pure renderer, no merchant-facing or user-facing strings injected by the snippet. The content/cite text reaches the snippet pre-translated by the consumer's settings (richtext fields are inherently translatable; cite_text is a plain string typically authored alongside the quote).

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half group).

- **Tier**: theme-primitive (Tier 2 — snippet-half)
- **Page(s)**: `sections/validation--primitive--quote.liquid` + `templates/index.validation--primitive--quote.json` *(planned)*. Co-located with the eventual `pull-quote` / `testimonial` block-half pages when those L1 specs ship.
- **API surface** (matrix to exercise):
  - **Cite combinations**: all four cells of the `cite_text` × `cite_url` matrix (`blank/blank`, `set/blank`, `blank/set`, `set/set`)
  - **Mark variants**: `decorative_marks: false` (rail mode), `decorative_marks: true` (mark mode); both rendered side-by-side
  - **Content shapes**: single-line short quote, multi-paragraph quote (inline_richtext with two paragraphs), very-long quote spanning 6+ lines (line-height + wrap behavior visible)
  - **Typographic context**: same quote rendered at `font-size: 1rem` (default), `1.5rem` (pull-quote-like context), and inside a `<figure>` (figure-margin coexistence)
- **Edge cases**:
  - `content` blank → no output (snippet `break`)
  - `cite_url` malformed (no protocol, e.g., `example.com/source`) → renders as-is in the `cite` attribute + `href`; browser may treat as relative
  - `content` with HTML tags inside richtext (`<em>`, `<strong>`) → preserved verbatim; substrate typography handles styling
  - Decorative mark in RTL context (Arabic, Hebrew) → opening glyph appears on the right (the `\201C` glyph flips visually via `direction: rtl`; positional `inset-inline-start: 0` resolves correctly)
- **Visual showcase**: a 4×3 grid — cite combinations × mark variants — with each cell labeled with its argument vector. A second row demonstrates the typographic-context matrix (rail-mode quote at 3 sizes; mark-mode quote at 3 sizes). A third row demonstrates content-shape variations.
- **Assertions** (prose; Playwright once installed):
  - Output root is `<blockquote class="quote">` with optional `cite="<url>"` matching `cite_url`
  - Content is wrapped in `<p>` element(s); paragraph count matches the source's paragraph breaks
  - `<cite>` block presence matches the `cite_text` argument; nested `<a href>` presence matches the `cite_url` argument per the truth table
  - `data-modifiers~="marks:visible"` present iff `decorative_marks` is `true`
  - Computed `::before` `content` is the left double-quotation-mark glyph when marks are visible; absent otherwise
  - SR walkthrough announces "blockquote", reads the content, reads the cite (when present), announces "end of blockquote"
- **Unit scope**: none (Liquid + CSS; no JS).

## Implementation-time decisions

- **Multi-paragraph rendering choice.** Two options: (a) consumer passes a richtext string and the snippet emits it verbatim (Shopify pre-wraps in `<p>` for richtext fields); (b) consumer passes a plain string and the snippet wraps in a single `<p>` itself. Both work. Lean: accept either — detect by string content (presence of `<p>` already) or always single-wrap and let consumers use richtext if they need breaks. Defer the detection logic shape to the build pass.
- **Close-mark opt-in surface.** If a consumer wants both opening + closing marks (more editorial than the default), should the snippet expose a second modifier value (`marks:both`) or leave it to consumer-side CSS? Lean: leave to consumer CSS (`::after` on the consumer's wrapper). Revisit if 2+ consumers want the same closing-mark treatment.
- **Locale-aware glyphs.** Some locales prefer guillemets (`«` `»`, French / Spanish) over English double-quotation-marks. The CSS could use `content: open-quote` with a per-locale `quotes` property declaration in the substrate. Defer to the locale-keys / typography pass; static glyphs are the shipped default.
- **`<cite>` italic / non-italic.** Snippet ships `font-style: normal`. If editorial design later wants italic, the override is `--quote-cite-font-style` (add the variable then). Defer until a consumer expresses the need.

## Out of scope

- **Inline `<q>` quotations.** Browser-native short inline quotes use `<q>`; this snippet covers block-level `<blockquote>` only. Consumers needing inline quotation marks compose `<q>` directly in their richtext.
- **Multi-author / nested-quote markup.** A quote-within-a-quote (`<blockquote><blockquote>…</blockquote></blockquote>`) is uncommon enough that consumers handle it manually if needed. The snippet renders one level.
- **Pull-quote / testimonial framing.** The figure-with-figcaption / card-with-avatar structures are L1 concerns. This snippet renders the `<blockquote>` core; L1 wrappers add the surrounding semantics.
- **Schema.org `Quotation` JSON-LD emission.** Schema.org markup for quotes is consumer-level (the testimonial block, the article-body section) — not a per-blockquote concern at L0.
- **Decorative SVG quote-marks (custom typography).** The current shipped vocabulary uses Unicode glyphs (`\201C` / `\201D`) for portability and zero-asset cost. SVG decorative marks for brand-specific typography are per-project work; consumers override `::before` in their own scope when they need a custom glyph.
- **Auto-detected source domain rendering.** When `cite_url` is set but `cite_text` is blank, the snippet does NOT auto-extract `example.com` as visible link text — leaves the visible cite empty and exposes the URL via the attribute only. Auto-extraction would surprise editorial intent (sometimes the URL is for crawlers, not human display).

## Related

- `richtext.md` — L1 block that handles long-form rich-text body content; consumers may compose `<blockquote>` inline via richtext editorial rather than reaching for this snippet when the quote is one paragraph among many in flowing prose
- `pull-quote.md` (planned L1) — primary consumer; wraps this snippet in `<figure>` + figcaption
- `testimonial.md` (planned L1) — consumer; embeds this snippet alongside author/avatar/role/optional star-rating
- `.context/docs/modifier-system.md` — `data-modifiers` categorical-state surface (the `marks:visible` value lives in this namespace)
- `.context/rules/a11y-conventions.md` — semantic-element-first principle; `<blockquote>` + `<cite>` are the native primitives this snippet uses
