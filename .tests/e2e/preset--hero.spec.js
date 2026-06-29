import { test, expect } from '@playwright/test';

// Tier 3 (preset / composition) assertions for the hero pattern: one full-bleed
// media block with an overlaid title + body + button. Unlike a Tier-2 primitive
// page (which asserts a block's emitted contribution), a Tier-3 page asserts the
// cascade-APPLIED result that only emerges in composition — bleed actually
// painting, the block-level scheme override re-resolving in the overlay's
// children, the overlay tint, contents alignment. See validation-contract.md § 3.
//
// Fixture in templates/index.validation--preset--hero.json. Requires the seeded
// store image shopify://shop_images/landscape.png (.scripts/seed-validation-assets.mjs).

const PATH = '/?view=validation--preset--hero';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.getByText('Built for the long haul').waitFor();
});

function readHero(page) {
  return page.locator('.shopify-block--media').first().evaluate((media) => {
    const cs = getComputedStyle(media);
    const section = media.closest('token-section');
    const scs = getComputedStyle(section);
    const intro = section.querySelector(':scope > .validation__intro');
    const contents = media.querySelector(':scope > media-contents');
    const ccs = contents && getComputedStyle(contents);
    const overlay = media.querySelector(':scope > media-overlay');
    const title = media.querySelector('h1');
    const img = media.querySelector('img');
    const btn = media.querySelector('.shopify-block--button');
    return {
      mods: media.getAttribute('data-modifiers'),
      gridColumn: cs.gridColumn,
      width: Math.round(media.getBoundingClientRect().width),
      introWidth: intro ? Math.round(intro.getBoundingClientRect().width) : null,
      schemeBg: cs.getPropertyValue('--color-role-background').trim(),
      color: cs.color,
      sectionSchemeBg: scs.getPropertyValue('--color-role-background').trim(),
      sectionColor: scs.color,
      overlayBg: overlay && getComputedStyle(overlay).backgroundColor,
      hasContents: !!contents,
      justify: ccs && ccs.justifyContent,
      align: ccs && ccs.alignItems,
      gap: ccs && ccs.gap,
      titleText: title && title.textContent.trim(),
      titleColor: title && getComputedStyle(title).color,
      hasImg: !!img,
      imgSrc: img ? img.getAttribute('srcset') || img.getAttribute('src') || '' : '',
      btnText: btn && btn.textContent.trim(),
    };
  });
}

test.describe('validation--preset--hero', () => {
  test('composition renders: title + body + button overlaid inside <media-contents>', async ({ page }) => {
    const r = await readHero(page);
    expect(r.hasContents).toBe(true); // the container's content_for pipeline wrapped the children
    // the title block root IS the <h1> and carries its injected dynamic <style>,
    // so match on contains rather than the exact textContent
    expect(r.titleText).toContain('Built for the long haul');
    expect(r.btnText).toContain('Get started');
    expect(r.mods).toContain('has-children');
    expect(r.mods).toContain('media-type:image');
  });

  test('real seeded image resolves (not the placeholder svg)', async ({ page }) => {
    const r = await readHero(page);
    expect(r.hasImg).toBe(true);
    expect(r.imgSrc).toContain('landscape'); // shopify://shop_images/landscape.png → CDN srcset
  });

  test('bleed paints: media escapes the content track to the section edge (both viewports)', async ({ page }) => {
    const r = await readHero(page);
    expect(r.mods).toContain('bleed-desktop:both');
    expect(r.mods).toContain('bleed-mobile:both'); // bleeds at mobile too
    expect(r.gridColumn).toBe('bleed-start / bleed-end');
    expect(r.width).toBeGreaterThan(r.introWidth); // wider than a content-track sibling
  });

  test('block-level scheme override re-resolves in the overlay children', async ({ page }) => {
    const r = await readHero(page);
    expect(r.mods).toContain('color-scheme:scheme-3');
    // the media re-paints scheme-3 (dark), differing from the section's scheme-1 (light)
    expect(r.schemeBg).toBe('#1a1a1a'); // scheme-3 background token
    expect(r.schemeBg).not.toBe(r.sectionSchemeBg);
    // the cascade reaches the child title: it inherits the media's re-resolved
    // light foreground, not the section's dark one
    expect(r.titleColor).toBe(r.color);
    expect(r.color).toBe('rgb(255, 255, 255)'); // scheme-3 foreground #ffffff
    expect(r.color).not.toBe(r.sectionColor); // scheme-1 foreground is dark
  });

  test('overlay tint paints between the image and the contents', async ({ page }) => {
    const r = await readHero(page);
    expect(r.overlayBg).toBe('rgba(0, 0, 0, 0.45)');
  });

  test('media-contents centers content (horizontal + vertical) with the gap', async ({ page }) => {
    const r = await readHero(page);
    expect(r.justify).toBe('center'); // vertical_alignment
    expect(r.align).toBe('center'); // horizontal_alignment
    expect(r.gap).toBe('24px');
  });
});
