import { test, expect } from '@playwright/test';

// Tier 1b/2 (L0 snippet) assertions for the image snippet, converted from
// snippets/image.spec.md § Validation. image.liquid is a sub-component (no
// block), so the harness renders `{% render 'image' %}` directly — each case is
// tagged data-case=<id> in sections/validation--primitive--image.liquid.
//
// Sources are real store Files (seeded by .scripts/seed-validation-assets.mjs),
// referenced via image_picker settings (shopify://shop_images/<file>) → real
// image objects, so image_url/image_tag emit a genuine responsive ladder.

const PATH = '/?view=validation';

// hardcoded ladders from snippets/image.liquid
const FULL = [360, 480, 640, 750, 900, 1080, 1200, 1350, 1440, 1600, 1800, 2000, 2560];
const DESKTOP = [768, 1000, 1024, 1280, 1440, 1600, 1800, 2000, 2560];
const MOBILE = [360, 480, 640, 750, 900, 1080, 1200, 1350, 1440];

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.locator('.case').first().waitFor();
});

function readCase(page, id) {
  return page.locator(`[data-case="${id}"]`).evaluate((el) => {
    const widths = (ss) =>
      (ss || '')
        .split(',')
        .map((s) => parseInt(s.trim().split(/\s+/)[1], 10))
        .filter((n) => !Number.isNaN(n));
    const img = el.querySelector('img');
    const source = el.querySelector('source');
    return {
      hasPicture: !!el.querySelector('picture'),
      hasImg: !!img,
      img: img && {
        widths: widths(img.getAttribute('srcset')),
        sizes: img.getAttribute('sizes'),
        loading: img.getAttribute('loading'),
        fetchpriority: img.getAttribute('fetchpriority'),
        width: img.getAttribute('width'),
        height: img.getAttribute('height'),
        hasSrc: !!img.getAttribute('src'),
        alt: img.getAttribute('alt'),
      },
      source: source && { media: source.getAttribute('media'), widths: widths(source.getAttribute('srcset')) },
    };
  });
}

test.describe('validation--primitive--image', () => {
  test('shopify:// ref resolves; single image emits the full responsive ladder', async ({ page }) => {
    const r = await readCase(page, 'single');
    expect(r.hasImg).toBe(true); // ref resolved to a real image object (else snippet would break)
    expect(r.hasPicture).toBe(false);
    expect(r.img.widths).toEqual(FULL);
    expect(r.img.sizes).toBe('auto, 100vw');
    expect(r.img.loading).toBe('lazy');
    expect(r.img.fetchpriority).toBe('auto');
    expect(r.img.width).toBe('2560');
    expect(r.img.height).toBe('1440');
    expect(r.img.hasSrc).toBe(true);
    expect(r.img.alt).toBeTruthy(); // alt from the file's metadata
  });

  test('art-direction wraps in <picture> with a mobile <source> + desktop <img> ladder', async ({ page }) => {
    const r = await readCase(page, 'art-direction');
    expect(r.hasPicture).toBe(true);
    expect(r.source.media).toBe('(max-width: 47.99rem)');
    expect(r.source.widths).toEqual(MOBILE);
    expect(r.img.widths).toEqual(DESKTOP); // desktop ladder drops the mobile widths
  });

  test('loading + fetchpriority knobs apply', async ({ page }) => {
    const eager = await readCase(page, 'eager-high');
    expect(eager.img.loading).toBe('eager');
    expect(eager.img.fetchpriority).toBe('high');
    const low = await readCase(page, 'low');
    expect(low.img.fetchpriority).toBe('low');
    expect(low.img.loading).toBe('lazy'); // default
  });

  test('sizes_value override carries to the sizes attribute', async ({ page }) => {
    const r = await readCase(page, 'sizes-override');
    expect(r.img.sizes).toBe('(min-width: 48rem) 33vw, 100vw');
  });

  test('preload emits an HTTP Link rel=preload header (as=image), not a DOM node', async ({ page }) => {
    const res = await page.goto(PATH);
    const link = res.headers()['link'] || '';
    expect(link).toContain('rel="preload"');
    expect(link).toContain('as="image"');
    expect(link).toContain('imagesrcset=');
    // image_tag couples preload → eager (a preloaded image shouldn't lazy-load)
    const r = await readCase(page, 'preload');
    expect(r.img.loading).toBe('eager');
  });

  test('blank image renders nothing (snippet break)', async ({ page }) => {
    const r = await readCase(page, 'blank');
    expect(r.hasImg).toBe(false);
    expect(r.hasPicture).toBe(false);
  });
});
