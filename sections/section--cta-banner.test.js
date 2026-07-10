import { test, expect } from '@playwright/test';

// Tier 3 (preset / composition) assertions for the "cta-banner" pattern: a top
// separator, a centered group (title + divider + a row of two buttons), and a
// bottom separator. A Tier-3 page asserts the cascade-APPLIED result. This page
// owns the "separator collapse in flex parents" concern (the divider inside the
// flex group), the nested-group row layout, and the stack_below container-query
// in a nested/centered context — which surfaced the group v1.7.2 fix (a
// stack_below group shrink-wrapped by a centered parent collapsed to 0 and
// stacked permanently).
//
// Fixture in sections/section--cta-banner.validation.json. No seeded
// assets (separators + buttons + a placeholder-free group).

const PATH = '/?view=validation';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.getByText('Ready to ship?').waitFor();
});

function readCTA(page) {
  return page.locator('token-section').first().evaluate((sec) => {
    const strip = (s) => s.trim().replace(/^'|'$/g, '');
    const label = (b) => strip(getComputedStyle(b).getPropertyValue('--block-label'));
    const topBlocks = [...sec.querySelectorAll(':scope > .shopify-block')];
    const sepOf = (b) => {
      const hr = b && b.querySelector('hr');
      return { width: b ? Math.round(b.getBoundingClientRect().width) : null, borderWidth: hr ? getComputedStyle(hr).borderTopWidth : null };
    };
    const outer = sec.querySelector(':scope > .shopify-block--group');
    const outerLayout = outer.querySelector(':scope > token-layout');
    const title = outerLayout.querySelector(':scope > .shopify-block--title');
    const divider = outerLayout.querySelector(':scope > .shopify-block--separator');
    const inner = outerLayout.querySelector(':scope > .shopify-block--group');
    const innerLayout = inner.querySelector(':scope > token-layout');
    const btns = [...innerLayout.querySelectorAll(':scope > .shopify-block--button')].map((b) => ({
      text: b.textContent.split('#')[0].trim(),
      width: Math.round(b.getBoundingClientRect().width),
      top: Math.round(b.getBoundingClientRect().top),
      left: Math.round(b.getBoundingClientRect().left),
    }));
    return {
      topLevelKinds: topBlocks.map((b) => b.className.replace('shopify-block shopify-block--', '')),
      topSep: sepOf(topBlocks.find((b) => label(b) === 'top-separator')),
      botSep: sepOf(topBlocks.find((b) => label(b) === 'bottom-separator')),
      titleText: title ? title.textContent.split('#')[0].trim() : null,
      divider: divider ? sepOf(divider) : null,
      outerFlexDir: getComputedStyle(outerLayout).flexDirection,
      innerWidth: Math.round(inner.getBoundingClientRect().width),
      innerFlexDir: getComputedStyle(innerLayout).flexDirection,
      innerJustify: getComputedStyle(innerLayout).justifyContent,
      btns,
    };
  });
}

test.describe('section--cta-banner', () => {
  test('composition tree: top separator, centered group (title + divider + button row), bottom separator', async ({
    page,
  }) => {
    const r = await readCTA(page);
    expect(r.topLevelKinds).toEqual(['separator', 'group', 'separator']);
    expect(r.titleText).toContain('Ready to ship?');
    expect(r.divider).not.toBeNull(); // a separator nested inside the flex group
    expect(r.btns.map((b) => b.text)).toEqual(['Get started', 'Learn more']);
    expect(r.outerFlexDir).toBe('column');
  });

  test('separators do not collapse — including the divider inside the flex group', async ({ page }) => {
    const r = await readCTA(page);
    // section-level (grid children) fill the content track
    expect(r.topSep.width).toBeGreaterThan(0);
    expect(r.botSep.width).toBeGreaterThan(0);
    expect(r.topSep.borderWidth).toBe('1px');
    // the in-flex divider must fill the group width, not collapse to 0
    // (separator's inline-size:100% — the flex-parent guard this page owns)
    expect(r.divider.width).toBeGreaterThan(0);
    expect(r.divider.borderWidth).toBe('1px');
  });

  test('nested stack_below button row: side-by-side when wide, stacked when narrow', async ({ page }, testInfo) => {
    const r = await readCTA(page);
    // regression guard for group v1.7.2: a stack_below group centered by its
    // parent must NOT collapse to 0 (which forced a permanent column)
    expect(r.innerWidth).toBeGreaterThan(0);
    const [a, b] = r.btns;
    if (testInfo.project.name === 'desktop') {
      expect(r.innerFlexDir).toBe('row');
      expect(a.top).toBe(b.top); // same row
      expect(a.left).toBeLessThan(b.left);
    } else {
      expect(r.innerFlexDir).toBe('column'); // < 40rem → stacked
      expect(a.top).toBeLessThan(b.top);
    }
  });

  test('buttons hug their content in the row and the row is centered', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'row layout is the desktop case');
    const r = await readCTA(page);
    expect(r.innerJustify).toBe('center');
    // each button is content-sized, not filling the row (button justify-self is
    // ignored in flex → the row's alignment governs)
    for (const b of r.btns) expect(b.width).toBeLessThan(r.innerWidth / 2);
  });
});
