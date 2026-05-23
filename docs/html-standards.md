# HTML standards

Conventions for theme HTML output.

## Native elements first

Reach for native HTML before custom JS or ARIA. Native elements come with built-in keyboard support, screen-reader semantics, and focus management:

| Pattern | Native | Avoid |
|---|---|---|
| Toggle / disclosure | `<details>` + `<summary>` | Custom button + JS show/hide |
| Modal / dialog | `<dialog>` (with `showModal()`) | Custom div + focus trap |
| Floating content (menus, popovers, tooltips) | `popover` attribute + `popovertarget` | Custom JS positioning + show/hide |
| Form submission | `<form action>` + native validation | Pure JS submit handlers |
| Inline expandable content | `<details>` per item | Custom accordion JS |
| Lazy media | `loading="lazy"` on `<img>` / `<iframe>` | IntersectionObserver + JS |

When a native element solves the problem, use it. Custom components only when native semantics genuinely don't fit.

## Form input richness

Use the input type that matches the data — browsers provide built-in validation, mobile keyboard switches, and autocomplete:

- `<input type="email">` / `tel` / `url` / `date` / `time` / `number` / `range` / `color` / `search`
- Pair with `autocomplete` (e.g., `"email"`, `"tel"`, `"name"`, `"shipping address-line1"`, `"cc-number"`)
- `pattern`, `minlength`, `maxlength`, `required` for validation
- `placeholder` is a hint, not a label — labels go in `<label>` per `a11y-conventions.md`

## Semantic structure

- **`<main>` once per page** — wraps primary content
- **`<nav>` for navigation regions** — main nav, footer nav, in-page nav. Multiple `<nav>` elements need `aria-label` to disambiguate.
- **`<aside>` for tangential content** — related products, "you might also like", complementary info
- **`<header>` and `<footer>`** — page-level (one each, often as direct children of `<body>`) or section-level (multiple allowed within sectioning elements)
- **Heading hierarchy** — `<h1>` once per page; never skip levels (no `<h2>` followed by `<h4>`); use `<h2>`–`<h6>` for sub-sections

## Attributes

- **`lang`** on `<html>` — driven by Shopify's `request.locale` (handled by `utility--language`)
- **`alt`** on every `<img>` — empty `alt=""` only when the image is decorative AND `aria-hidden="true"` is appropriate
- **`title`** only on `<iframe>` — never on links or other elements (poor a11y; tooltips and labels belong elsewhere)
- **`role` and `aria-*`** sparingly — only when native semantics don't cover the pattern (per `a11y-conventions.md` principle #1)
- **`loading="lazy"`** on below-fold media; `loading="eager"` (default) on above-fold

## Forms specifically

- Wrap related controls in `<fieldset>` + `<legend>`
- Required fields use `aria-required="true"` (the native `required` attribute is also OK; both can coexist)
- Errors associated via `aria-invalid="true"` + `aria-describedby` pointing at an error message element
- Success messages use `role="status"` or `aria-live="polite"`

## Related

- `.context/rules/a11y-conventions.md` — accessibility principles for HTML
- `.context/docs/css-standards.md` — visual styling for the elements you choose
