import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the separator block, converted from
// .context/specs/separator.md § Validation. Matrix baked in
// templates/index.validation--primitive--separator.json.
//
// Separators carry no text, so each case is selected by its --block-label
// (set per block by validation--block-labels, read off the wrapper). The page
// is the production theme-root grid, so content_width caps + centers the wrapper
// and line_color resolves on the <hr> border.

const PATH = '/?view=validation--primitive--separator';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.locator('.shopify-block--separator').first().waitFor();
});

// Find the separator whose --block-label matches `label` and read its wrapper
// + <hr> computed surface in one pass.
function readSep(page, label) {
  return page.locator('.shopify-block--separator').evaluateAll((els, label) => {
    const strip = (s) => s.trim().replace(/^'|'$/g, '');
    const el = els.find((e) => strip(getComputedStyle(e).getPropertyValue('--block-label')) === label);
    if (!el) return null;
    const hr = el.querySelector('hr');
    const cs = getComputedStyle(el);
    const hcs = getComputedStyle(hr);
    const r = el.getBoundingClientRect();
    return {
      contentWidthVar: cs.getPropertyValue('--content-width').trim(),
      lineColorVar: cs.getPropertyValue('--line-color').trim(),
      mobileMargin: cs.getPropertyValue('--mobile-margin-block-start').trim(),
      desktopMargin: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      maxInline: cs.maxInlineSize,
      width: Math.round(r.width),
      left: Math.round(r.left),
      right: Math.round(r.right),
      borderColor: hcs.borderTopColor,
      borderWidth: hcs.borderTopWidth,
      borderStyle: hcs.borderTopStyle,
    };
  }, label);
}

test.describe('validation--primitive--separator', () => {
  test('default: full-width hairline, no caps, role-border color', async ({ page }) => {
    const r = await readSep(page, 'default');
    expect(r).not.toBeNull();
    expect(r.contentWidthVar).toBe(''); // blank content_width → no var emitted
    expect(r.lineColorVar).toBe(''); // blank line_color → no var emitted
    expect(r.borderWidth).toBe('1px'); // 0.0625rem hairline
    expect(r.borderStyle).toBe('solid');
    expect(r.borderColor).not.toBe('rgba(0, 0, 0, 0)'); // resolves to --color-role-border
    expect(r.width).toBeGreaterThan(300); // spans the content track
  });

  test('content_width caps the wrapper (emitted rem var + computed px max-inline-size)', async ({ page }) => {
    const narrow = await readSep(page, 'width-narrow');
    expect(narrow.contentWidthVar).toBe('37.5rem'); // 600px / 16
    expect(narrow.maxInline).toBe('600px');

    const medium = await readSep(page, 'width-medium');
    expect(medium.contentWidthVar).toBe('62.5rem'); // 1000px / 16
    expect(medium.maxInline).toBe('1000px');
  });

  test('capped separator renders narrower than full and centers (desktop)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'capped width only fits below the viewport on desktop');
    const full = await readSep(page, 'default');
    const narrow = await readSep(page, 'width-narrow');
    expect(narrow.width).toBeLessThan(full.width);
    expect(narrow.width).toBeLessThanOrEqual(601); // capped at 600px
    // grid item with max-inline-size + margin-inline:auto centers in the content track
    const leftGap = narrow.left - full.left;
    const rightGap = full.right - narrow.right;
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);
    expect(leftGap).toBeGreaterThan(0);
  });

  test('line_color resolves on the hr border (vs the role-border default)', async ({ page }) => {
    const def = await readSep(page, 'default');
    const primary = await readSep(page, 'color-primary');
    const accent = await readSep(page, 'color-accent');
    // blank line_color → no var emitted → falls back to --color-role-border
    expect(def.lineColorVar).toBe('');
    expect(def.borderColor).toBe('rgb(230, 230, 230)'); // --color-role-border #e6e6e6
    // set → --line-color emitted (getComputedStyle resolves the var() to the token hex)
    // and paints the picked theme_color on the border
    expect(primary.lineColorVar).not.toBe('');
    expect(primary.borderColor).toBe('rgb(46, 91, 255)'); // theme_color primary #2E5BFF
    expect(accent.borderColor).toBe('rgb(255, 107, 53)'); // theme_color accent #FF6B35
    expect(primary.borderColor).not.toBe(def.borderColor);
  });

  test('top-spacing overrides emit per-breakpoint margin vars; a 0 value stays unset (rhythm fallback)', async ({
    page,
  }) => {
    const mobileOnly = await readSep(page, 'mobile-spacing');
    expect(mobileOnly.mobileMargin).toBe('2.0rem'); // 32px / 16
    expect(mobileOnly.desktopMargin).toBe(''); // 0 → not emitted → falls through to --block-rhythm

    const desktopOnly = await readSep(page, 'desktop-spacing');
    expect(desktopOnly.mobileMargin).toBe('');
    expect(desktopOnly.desktopMargin).toBe('4.0rem'); // 64px / 16

    const both = await readSep(page, 'both-spacings');
    expect(both.mobileMargin).toBe('1.0rem'); // 16px / 16
    expect(both.desktopMargin).toBe('3.0rem'); // 48px / 16
  });
});
