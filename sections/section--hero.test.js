import { test, expect } from '@playwright/test';

// Tier 3 (preset / composition) assertions for the hero pattern. Three labelled
// full-bleed media variants with overlaid title + body + button. Unlike a Tier-2
// primitive page (a block's emitted contribution), a Tier-3 page asserts the
// cascade-APPLIED result that only emerges in composition — bleed painting, the
// block-level scheme override re-resolving in the overlay children, the overlay
// tint, contents alignment.
//
// It also guards the authoring contract: media is media-driven + overflow:hidden
// by design, so overlay content taller than its box clips. That's an authoring
// mistake (too-short box), not a media bug — the content-fits guard below is the
// QA mechanism that catches it. centered-full / bottom-left carry a taller
// mobile_media_size so a full hero fits the narrow box; short-fit keeps 16:9 to
// show short content fits a wide box.
//
// Fixture in sections/section--hero.validation.json. Requires the seeded
// store image shopify://shop_images/landscape.png (.scripts/seed-validation-assets.mjs).

const PATH = '/?view=validation';
const VARIANTS = ['centered-full', 'bottom-left', 'short-fit'];

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.locator('.validation__intro').waitFor();
});

function readHero(page, label) {
  return page.locator('.shopify-block--media').evaluateAll((els, label) => {
    const strip = (s) => s.trim().replace(/^'|'$/g, '');
    const media = els.find((e) => strip(getComputedStyle(e).getPropertyValue('--block-label')) === label);
    if (!media) return null;
    const cs = getComputedStyle(media);
    const section = media.closest('token-section');
    const scs = getComputedStyle(section);
    const intro = section.querySelector(':scope > .validation__intro');
    const contents = media.querySelector(':scope > media-contents');
    const ccs = contents && getComputedStyle(contents);
    const overlay = media.querySelector(':scope > media-overlay');
    const title = media.querySelector('h1, h2');
    const img = media.querySelector('img');
    const btn = media.querySelector('.shopify-block--button');
    const mr = media.getBoundingClientRect();
    return {
      mods: media.getAttribute('data-modifiers'),
      gridColumn: cs.gridColumn,
      width: Math.round(mr.width),
      boxH: Math.round(mr.height),
      introWidth: intro ? Math.round(intro.getBoundingClientRect().width) : null,
      schemeBg: cs.getPropertyValue('--color-role-background').trim(),
      color: cs.color,
      sectionSchemeBg: scs.getPropertyValue('--color-role-background').trim(),
      sectionColor: scs.color,
      hasOverlay: !!overlay,
      overlayBg: overlay && getComputedStyle(overlay).backgroundColor,
      hasContents: !!contents,
      contentsScrollH: contents ? contents.scrollHeight : 0,
      justify: ccs && ccs.justifyContent,
      align: ccs && ccs.alignItems,
      gap: ccs && ccs.gap,
      titleText: title && title.textContent.trim(),
      titleColor: title && getComputedStyle(title).color,
      hasImg: !!img,
      imgSrc: img ? img.getAttribute('srcset') || img.getAttribute('src') || '' : '',
      btnText: btn && btn.textContent.trim(),
    };
  }, label);
}

test.describe('section--hero', () => {
  test('centered-full: content_for pipeline + real seeded image + bleed paints', async ({ page }) => {
    const r = await readHero(page, 'centered-full');
    expect(r.hasContents).toBe(true); // children wrapped in <media-contents>
    expect(r.titleText).toContain('Built for the long haul'); // title root is the <h1> + its injected <style>
    expect(r.btnText).toContain('Get started');
    expect(r.hasImg).toBe(true);
    expect(r.imgSrc).toContain('landscape'); // shopify://shop_images/landscape.png → CDN srcset (not placeholder)
    expect(r.mods).toContain('bleed-desktop:both');
    expect(r.mods).toContain('bleed-mobile:both');
    expect(r.gridColumn).toBe('bleed-start / bleed-end');
    expect(r.width).toBeGreaterThan(r.introWidth); // wider than a content-track sibling
  });

  test('centered-full: block-level scheme override re-resolves in the overlay children', async ({ page }) => {
    const r = await readHero(page, 'centered-full');
    expect(r.mods).toContain('color-scheme:scheme-3');
    expect(r.schemeBg).toBe('#1a1a1a'); // scheme-3 background, differs from the section's scheme-1
    expect(r.schemeBg).not.toBe(r.sectionSchemeBg);
    expect(r.titleColor).toBe(r.color); // child inherits the media's re-resolved foreground
    expect(r.color).toBe('rgb(255, 255, 255)'); // scheme-3 light foreground
    expect(r.color).not.toBe(r.sectionColor);
  });

  test('centered-full: overlay tint + centered contents + gap', async ({ page }) => {
    const r = await readHero(page, 'centered-full');
    expect(r.hasOverlay).toBe(true);
    expect(r.overlayBg).toBe('rgba(0, 0, 0, 0.45)');
    expect(r.justify).toBe('center'); // vertical_alignment
    expect(r.align).toBe('center'); // horizontal_alignment
    expect(r.gap).toBe('24px');
  });

  test('bottom-left: default alignment (content at bottom, start-aligned)', async ({ page }) => {
    const r = await readHero(page, 'bottom-left');
    expect(r.justify).toBe('end'); // vertical_alignment default = end (content at bottom)
    expect(r.align).toBe('start'); // horizontal_alignment default = start
    expect(r.mods).toContain('color-scheme:scheme-3'); // still overrides
    expect(r.hasOverlay).toBe(true);
  });

  // Regression guard for the capped-text-block self-centering bug: a capped
  // child (the reading-width richtext) must follow the flex container's start
  // alignment, NOT self-center. Asserting the container's align-items alone
  // (above) misses it — the child geometry is what regressed. The fix
  // (justify-self:center, ignored in flex) makes all children share the start
  // edge; the old margin-inline:auto centered the capped one.
  test('bottom-left: the capped richtext child aligns start with its siblings (not centered)', async ({ page }) => {
    const lefts = await page.locator('.shopify-block--media').evaluateAll((els, label) => {
      const strip = (s) => s.trim().replace(/^'|'$/g, '');
      const media = els.find((e) => strip(getComputedStyle(e).getPropertyValue('--block-label')) === label);
      const contents = media.querySelector(':scope > media-contents');
      const L = (sel) => Math.round(contents.querySelector(sel).getBoundingClientRect().left);
      const rt = contents.querySelector('.shopify-block--richtext');
      return {
        title: L('.shopify-block--title'),
        richtext: Math.round(rt.getBoundingClientRect().left),
        button: L('.shopify-block--button'),
        rtWidth: Math.round(rt.getBoundingClientRect().width),
        rtMaxInline: getComputedStyle(rt).maxInlineSize,
      };
    }, 'bottom-left');
    // capped (so a self-center would be visible): max-inline-size is the reading cap
    expect(lefts.rtMaxInline).toBe('680px');
    // the capped richtext shares the start edge with the uncapped title + the button
    expect(Math.abs(lefts.richtext - lefts.title)).toBeLessThanOrEqual(1);
    expect(Math.abs(lefts.richtext - lefts.button)).toBeLessThanOrEqual(1);
  });

  test('short-fit: keeps the wide 16:9 box (no portrait mobile override) — short content still fits', async ({
    page,
  }, testInfo) => {
    const r = await readHero(page, 'short-fit');
    expect(r.justify).toBe('center');
    // no mobile_media_size → 16:9 at both viewports. On mobile that's landscape
    // (boxH < width), unlike centered-full's portrait 4:5 — the authoring
    // counterpoint: short content fits the wide box, so no taller box is needed.
    if (testInfo.project.name === 'mobile') {
      expect(r.boxH).toBeLessThan(r.width);
      const cf = await readHero(page, 'centered-full');
      expect(cf.boxH).toBeGreaterThan(cf.width); // portrait 4:5 on mobile
    }
  });

  // The QA mechanism for the authoring contract: media is media-driven +
  // overflow:hidden, so overlay content must fit its box. A too-short box clips
  // silently — an authoring mistake this guard catches. Every variant is sized
  // (mobile_media_size where needed) so its content fits at both viewports.
  for (const label of VARIANTS) {
    test(`${label}: overlay content fits the media box (no clip)`, async ({ page }) => {
      const r = await readHero(page, label);
      expect(r).not.toBeNull();
      expect(r.contentsScrollH).toBeLessThanOrEqual(r.boxH + 2); // +2 sub-pixel tolerance
    });
  }
});
