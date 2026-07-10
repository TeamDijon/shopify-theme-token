import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the richtext block, converted from
// snippets/richtext.spec.md § Validation. Matrix baked in
// snippets/richtext.validation.json.
//
// richtext renders a <div class="shopify-block--richtext" data-modifiers="prose">
// wrapping the rich-text content. Block-side contract: the prose modifier is
// always present; structural CSS (width cap + self-center, color, text-align)
// is component-rooted; the prose *typography* (paragraph rhythm, list markers,
// link decoration) is exercised here on the rendered output — note the markers
// and link underline are UA defaults preserved through the reset, NOT declared
// by the prose layer, so these assertions guard the whole chain.

const PATH = '/?view=validation';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
});

// Read the richtext root holding `childText`.
function readBlock(page, childText) {
  return page
    .getByText(childText, { exact: false })
    .first()
    .evaluate((el) => {
      const root = el.closest('.shopify-block--richtext');
      const cs = getComputedStyle(root);
      // Geometric gaps to the token-section edges. Grid auto-margins distribute
      // free space but getComputedStyle reports marginLeft/Right as 0, so
      // centering must be measured by position, not by the margin property.
      const ts = root.closest('token-section');
      const rRoot = root.getBoundingClientRect();
      const rTs = ts.getBoundingClientRect();
      return {
        mods: root.getAttribute('data-modifiers'),
        width: Math.round(rRoot.width),
        maxInline: cs.maxInlineSize,
        contentWidthVar: cs.getPropertyValue('--content-width').trim(),
        textAlign: cs.textAlign,
        textAlignVar: cs.getPropertyValue('--text-align').trim(),
        color: cs.color,
        textColorVar: cs.getPropertyValue('--text-color').trim(),
        leftGap: Math.round(rRoot.left - rTs.left),
        rightGap: Math.round(rTs.right - rRoot.right),
        mobileMargin: cs.getPropertyValue('--mobile-margin-block-start').trim(),
        desktopMargin: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
}

// Margin + font-size of the direct child of the richtext root that contains
// `childText` (climbs out of inline wrappers to the top-level prose element).
function readEl(page, childText) {
  return page
    .getByText(childText, { exact: false })
    .first()
    .evaluate((el) => {
      const root = el.closest('.shopify-block--richtext');
      let node = el;
      while (node.parentElement !== root) node = node.parentElement;
      const cs = getComputedStyle(node);
      return {
        tag: node.tagName.toLowerCase(),
        marginTop: cs.marginBlockStart,
        marginBottom: cs.marginBlockEnd,
        fontSize: parseFloat(cs.fontSize),
      };
    });
}

test.describe('validation--primitive--richtext', () => {
  // ── prose modifier (always emitted) ──────────────────────────────────────
  test('every richtext root carries the prose modifier', async ({ page }) => {
    const mods = await page.evaluate(() =>
      [...document.querySelectorAll('.shopify-block--richtext')].map((r) => r.getAttribute('data-modifiers'))
    );
    expect(mods.length).toBeGreaterThan(0);
    expect(mods.every((m) => m === 'prose')).toBe(true);
  });

  // ── Paragraph rhythm (prose) ──────────────────────────────────────────────
  test('a lone paragraph collapses both margins (first AND last child)', async ({ page }) => {
    const p = await readEl(page, 'Plain single standalone');
    expect(p.tag).toBe('p');
    // > :first-child and > :last-child both zero it — a single-paragraph block
    // gets no prose rhythm. Asserting the documented edge, not a bug.
    expect(p.marginTop).toBe('0px');
    expect(p.marginBottom).toBe('0px');
  });

  test('multi-paragraph: middle paragraph gets prose rhythm, edges collapse', async ({ page }) => {
    const first = await readEl(page, 'Multi first para');
    const middle = await readEl(page, 'Multi middle para');
    const last = await readEl(page, 'Multi last para');
    expect(first.marginTop).toBe('0px');
    expect(first.marginBottom).toBe('16px');
    expect(middle.marginTop).toBe('16px');
    expect(middle.marginBottom).toBe('16px');
    expect(last.marginTop).toBe('16px');
    expect(last.marginBottom).toBe('0px');
  });

  // ── Lists (markers present) ───────────────────────────────────────────────
  test('unordered list renders disc markers; ordered list renders decimal', async ({ page }) => {
    const ul = await page.getByText('UL item one', { exact: false }).first().evaluate((el) => {
      const list = el.closest('ul');
      const cs = getComputedStyle(list);
      return { type: cs.listStyleType, position: cs.listStylePosition, pad: cs.paddingInlineStart };
    });
    expect(ul.type).toBe('disc'); // UA default, preserved (reset only strips list[class])
    expect(ul.position).toBe('outside');
    expect(parseFloat(ul.pad)).toBeGreaterThan(0); // prose adds padding so the marker has room
    const ol = await page
      .getByText('OL step one', { exact: false })
      .first()
      .evaluate((el) => getComputedStyle(el.closest('ol')).listStyleType);
    expect(ol).toBe('decimal');
  });

  // ── Inline emphasis + link ────────────────────────────────────────────────
  test('em italic, strong bold, link underlined inside prose', async ({ page }) => {
    const em = await page
      .getByText('italic emphasis here', { exact: false })
      .first()
      .evaluate((el) => getComputedStyle(el).fontStyle);
    expect(em).toBe('italic');
    const weight = await page
      .getByText('bold weight here', { exact: false })
      .first()
      .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(Number(weight)).toBeGreaterThanOrEqual(700);
    const deco = await page
      .getByText('inline link here', { exact: false })
      .first()
      .evaluate((el) => getComputedStyle(el.closest('a')).textDecorationLine);
    // UA default underline, preserved (no layer resets a:not([class]) decoration).
    expect(deco).toContain('underline');
  });

  // ── Heading binding + prose heading spacing ───────────────────────────────
  test('nested h2 binds a larger text_style and gets prose top margin (mid-block)', async ({ page }) => {
    const h2 = await readEl(page, 'Heading inside prose');
    const p = await readEl(page, 'Intro paragraph before the heading');
    expect(h2.tag).toBe('h2');
    // bare-tag text_style binding → heading is visibly larger than body copy.
    expect(h2.fontSize).toBeGreaterThan(p.fontSize);
    // prose `:is(h2, h3)` rule → 1.5rem top margin when not the first child.
    expect(h2.marginTop).toBe('24px');
  });

  // ── text_align ────────────────────────────────────────────────────────────
  test('text_align start is zero-emission; center / end emit the var and apply', async ({ page }) => {
    const plain = await readBlock(page, 'Plain single standalone');
    expect(plain.textAlignVar).toBe('');
    expect(plain.textAlign).toBe('start');
    const center = await readBlock(page, 'Centered prose body');
    expect(center.textAlignVar).toBe('center');
    expect(center.textAlign).toBe('center');
    const end = await readBlock(page, 'End-aligned prose body');
    expect(end.textAlignVar).toBe('end');
    expect(end.textAlign).toBe('end');
  });

  // ── content_width cap + self-center ───────────────────────────────────────
  test('content_width reading caps at 680px and stays symmetric (self-centered)', async ({ page }) => {
    const r = await readBlock(page, 'Reading-width prose');
    expect(r.contentWidthVar).toBe('42.5rem');
    expect(r.maxInline).toBe('680px');
    // Centering is measured by geometry, not the margin property (grid auto
    // margins report 0 in computed style but distribute free space). Symmetric
    // at every viewport: equal gaps when capped, 0/0 when the block is narrower
    // than the cap.
    expect(r.leftGap).toBe(r.rightGap);
  });

  test('content_width reading actually centers on the desktop viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'centering only observable when cap < available width');
    const r = await readBlock(page, 'Reading-width prose');
    expect(r.width).toBe(680);
    // capped below the available width → real, equal gutters on both sides.
    expect(r.leftGap).toBeGreaterThan(0);
    expect(r.leftGap).toBe(r.rightGap);
  });

  test('blank content_width spans 100% (no cap)', async ({ page }) => {
    const r = await readBlock(page, 'Plain single standalone');
    expect(r.contentWidthVar).toBe('');
    expect(r.maxInline).toBe('100%');
  });

  // ── text_color ────────────────────────────────────────────────────────────
  test('text_color emits --text-color and recolors the body to the picked token', async ({ page }) => {
    const accent = await readBlock(page, 'Accent-colored prose');
    const plain = await readBlock(page, 'Plain single standalone');
    const accentToken = await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
      // resolve the token to an rgb() string for comparison
      const probe = document.createElement('span');
      probe.style.color = v;
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    });
    expect(accent.textColorVar).not.toBe(''); // var emitted (resolves to the accent token)
    expect(accent.color).toBe(accentToken);
    expect(accent.color).not.toBe(plain.color); // differs from the default body color
  });

  test('blank text_color falls back to the role foreground (default body color)', async ({ page }) => {
    const plain = await readBlock(page, 'Plain single standalone');
    expect(plain.textColorVar).toBe('');
    const roleFg = await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--color-role-foreground').trim();
      const probe = document.createElement('span');
      probe.style.color = v;
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    });
    expect(plain.color).toBe(roleFg);
  });

  // ── Top-spacing overrides ─────────────────────────────────────────────────
  test('top-spacing override emits absolute margin custom properties', async ({ page }) => {
    const r = await readBlock(page, 'Spacing override prose');
    expect(r.mobileMargin).toBe('1.0rem');
    expect(r.desktopMargin).toBe('4.0rem');
  });

  // ── Blank content edge ────────────────────────────────────────────────────
  test('blank content renders no root (snippet break) — 10 of 11 fixtures render', async ({ page }) => {
    const count = await page.evaluate(() => document.querySelectorAll('.shopify-block--richtext').length);
    expect(count).toBe(10);
  });
});
