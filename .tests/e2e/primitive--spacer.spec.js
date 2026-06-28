import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the spacer block, converted from
// .context/specs/spacer.md § Validation. Matrix baked in
// templates/index.validation--primitive--spacer.json.
//
// Spacers carry no text, so each case is selected by its --block-label (set per
// block by validation--block-labels, read off the wrapper). The page is the real
// theme-root grid carrying a base --block-rhythm, so the rhythm-neutral substrate
// rule is exercised here, not just emitted.

const PATH = '/?view=validation--primitive--spacer';

// spacing tokens (px): [mobile, desktop] — seeded by .scripts/seed-metaobjects.mjs.
// Desktop project (1280) is ≥ the 48rem (768px) breakpoint → desktop value;
// mobile project (390) is below → mobile value.
const TOKENS = {
  xs: [4, 8],
  sm: [8, 12],
  md: [16, 24],
  lg: [32, 48],
  xl: [64, 96],
};

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  // Spacers are often 0-height / transparent (hidden to Playwright's visibility
  // check), so wait on the always-visible chrome instead, then read via DOM.
  await page.locator('.validation__intro').waitFor();
});

function readSpacer(page, label) {
  return page.locator('.shopify-block--spacer').evaluateAll((els, label) => {
    const strip = (s) => s.trim().replace(/^'|'$/g, '');
    const el = els.find((e) => strip(getComputedStyle(e).getPropertyValue('--block-label')) === label);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      blockSizeVar: cs.getPropertyValue('--spacer-block-size').trim(),
      bgVar: cs.getPropertyValue('--background-color').trim(),
      height: Math.round(r.height),
      width: Math.round(r.width),
      marginTop: cs.marginTop,
      bg: cs.backgroundColor,
    };
  }, label);
}

test.describe('validation--primitive--spacer', () => {
  for (const [handle, [mobile, desktop]] of Object.entries(TOKENS)) {
    test(`size ${handle} resolves to its spacing height per viewport`, async ({ page }, testInfo) => {
      const r = await readSpacer(page, handle);
      expect(r).not.toBeNull();
      expect(r.blockSizeVar).not.toBe(''); // --spacer-block-size emitted (resolves to the token rem)
      const expected = testInfo.project.name === 'mobile' ? mobile : desktop;
      expect(Math.abs(r.height - expected)).toBeLessThanOrEqual(1);
      expect(r.width).toBeGreaterThan(300); // inline-size:100% fills the content track
    });
  }

  test('blank size emits no var and collapses to 0 height, transparent', async ({ page }) => {
    const r = await readSpacer(page, 'blank');
    expect(r.blockSizeVar).toBe(''); // no --spacer-block-size emitted
    expect(r.height).toBe(0);
    expect(r.bg).toBe('rgba(0, 0, 0, 0)'); // no background_color → transparent
  });

  test('background_color renders a colored band via --color-<handle>', async ({ page }) => {
    const accent = await readSpacer(page, 'md-bg');
    expect(accent.bgVar).not.toBe(''); // --background-color emitted (resolves to the token hex)
    expect(accent.bg).toBe('rgb(255, 107, 53)'); // accent #FF6B35

    const muted = await readSpacer(page, 'lg-bg');
    expect(muted.bgVar).not.toBe('');
    expect(muted.bg).toBe('rgb(107, 114, 128)'); // muted #6B7280
  });

  test('spacer is rhythm-neutral: no top margin despite the section --block-rhythm', async ({ page }) => {
    // The harness token-section sets --block-rhythm: var(--spacing-lg); the spacer
    // substrate rule still forces margin-block-start: 0 (the spacer's height IS the
    // gap), so a non-first spacer takes no rhythm margin.
    const r = await readSpacer(page, 'md');
    expect(r.marginTop).toBe('0px');
  });
});
