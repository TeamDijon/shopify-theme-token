import { test, expect } from '@playwright/test';

// Tier 3 (preset / composition) assertions for the "content" pattern: a title +
// richtext + button stacked in a readable column. A Tier-3 page asserts the
// cascade-APPLIED result; here the headline concern is the inter-block rhythm
// (the section's --block-rhythm painting as each block's margin-block-start via
// the real theme-root rule), which a Tier-2 primitive page can't exercise — and
// that it coexists with the richtext's own prose paragraph spacing.
//
// Fixture in templates/index.validation--preset--content.json. The section caps
// the column via --content-width: 42.5rem (reading) and carries the harness base
// rhythm (--block-rhythm: var(--spacing-lg) → 48px desktop / 32px mobile).

const PATH = '/?view=validation--preset--content';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.getByText('What we believe').waitFor();
});

function readContent(page) {
  return page.locator('token-section').first().evaluate((sec) => {
    const title = sec.querySelector(':scope > .shopify-block--title');
    const rt = sec.querySelector(':scope > .shopify-block--richtext');
    const btn = sec.querySelector(':scope > .shopify-block--button');
    const sr = sec.getBoundingClientRect();
    const paras = rt ? [...rt.querySelectorAll('p')] : [];
    const tr = title.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    return {
      btnWidth: Math.round(br.width),
      btnLeftGap: Math.round(br.left - sr.left),
      hasTitle: !!title,
      hasRt: !!rt,
      hasBtn: !!btn,
      titleText: title && title.textContent.split('#')[0].trim(),
      btnText: btn && btn.textContent.trim(),
      paraCount: paras.length,
      rtMarginTop: rt && getComputedStyle(rt).marginTop,
      btnMarginTop: btn && getComputedStyle(btn).marginTop,
      para2MarginTop: paras[1] && getComputedStyle(paras[1]).marginTop,
      contentWidthVar: getComputedStyle(sec).getPropertyValue('--content-width').trim(),
      titleWidth: Math.round(tr.width),
      titleLeftGap: Math.round(tr.left - sr.left),
      titleRightGap: Math.round(sr.right - tr.right),
    };
  });
}

test.describe('validation--preset--content', () => {
  test('composition renders: title + 2-paragraph body + button stacked', async ({ page }) => {
    const r = await readContent(page);
    expect(r.hasTitle).toBe(true);
    expect(r.hasRt).toBe(true);
    expect(r.hasBtn).toBe(true);
    expect(r.titleText).toContain('What we believe');
    expect(r.btnText).toContain('Read more');
    expect(r.paraCount).toBe(2); // exercises prose paragraph spacing alongside the rhythm
  });

  test('inter-block rhythm paints as each block past the first margin (cascade-applied)', async ({
    page,
  }, testInfo) => {
    const r = await readContent(page);
    const rhythm = testInfo.project.name === 'mobile' ? '32px' : '48px'; // --spacing-lg
    expect(r.rtMarginTop).toBe(rhythm); // gap between title and body
    expect(r.btnMarginTop).toBe(rhythm); // gap between body and button
  });

  test('prose paragraph spacing coexists with the wider block rhythm', async ({ page }, testInfo) => {
    const r = await readContent(page);
    const rhythm = testInfo.project.name === 'mobile' ? '32px' : '48px';
    // the richtext's 2nd paragraph carries the prose 16px, distinct from the
    // block rhythm applied to the richtext block itself — two systems compose
    expect(r.para2MarginTop).toBe('16px');
    expect(r.para2MarginTop).not.toBe(rhythm);
  });

  // Regression guard for the bare-grid button fix (v1.5.1): a button is a direct
  // grid item here, which blockifies inline-flex → block-level flex; without
  // justify-self:start it filled the column (ignoring full_width:none). It must
  // hug its content and align to the column start.
  test('the CTA button hugs its content (not full-width) and aligns to the column start', async ({ page }) => {
    const r = await readContent(page);
    expect(r.btnWidth).toBeLessThan(r.titleWidth - 100); // content-sized, not filling the column
    expect(Math.abs(r.btnLeftGap - r.titleLeftGap)).toBeLessThanOrEqual(1); // shares the column's start edge
  });

  test('content_width caps the readable column and the grid centers it', async ({ page }, testInfo) => {
    const r = await readContent(page);
    expect(r.contentWidthVar).toBe('42.5rem'); // reading cap, inherited to the grid
    if (testInfo.project.name === 'desktop') {
      expect(r.titleWidth).toBeLessThanOrEqual(681); // blocks fill the capped 680 track
      expect(r.titleWidth).toBeGreaterThan(600);
      expect(Math.abs(r.titleLeftGap - r.titleRightGap)).toBeLessThanOrEqual(2); // centered in the surface
      expect(r.titleLeftGap).toBeGreaterThan(0);
    }
  });
});
