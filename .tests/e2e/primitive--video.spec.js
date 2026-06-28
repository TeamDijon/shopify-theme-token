import { test, expect } from '@playwright/test';

// Tier 1b/2 (L0 snippet) assertions for the video snippet, converted from
// .context/specs/video.md § Validation. video.liquid is a sub-component (no
// block), so the harness renders `{% render 'video' %}` directly — each case is
// tagged data-case=<id> in sections/validation--primitive--video.liquid.
//
// Sources are real store Files videos (seeded by .scripts/seed-validation-assets.mjs),
// referenced via `video` settings as shopify://files/videos/<filename> → real video
// objects (sources + preview_image) for the snippet.

const PATH = '/?view=validation--primitive--video';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.locator('.case').first().waitFor();
});

function readCase(page, id) {
  return page.locator(`[data-case="${id}"]`).evaluate((el) => {
    const v = el.querySelector('video');
    return {
      hasMediaVideo: !!el.querySelector('media-video'),
      hasVideo: !!v,
      v: v && {
        autoplay: v.hasAttribute('autoplay'),
        muted: v.hasAttribute('muted'),
        loop: v.hasAttribute('loop'),
        controls: v.hasAttribute('controls'),
        playsinline: v.hasAttribute('playsinline'),
        preload: v.getAttribute('preload'),
        hasPoster: !!v.getAttribute('poster'),
      },
      sources: [...el.querySelectorAll('source')].map((s) => ({
        media: s.getAttribute('media'),
        type: s.getAttribute('type'),
        hasSrc: !!s.getAttribute('src'),
      })),
    };
  });
}

test.describe('validation--primitive--video', () => {
  test('shopify://files/videos ref resolves; atmosphere = silent looping background video', async ({ page }) => {
    const r = await readCase(page, 'atmosphere');
    expect(r.hasMediaVideo).toBe(true); // <media-video> wrapper
    expect(r.hasVideo).toBe(true); // ref resolved to a real video object (else snippet would break)
    expect(r.v).toMatchObject({
      autoplay: true,
      muted: true,
      loop: true,
      controls: false,
      playsinline: true,
      preload: 'none',
      hasPoster: true, // poster from preview_image
    });
    expect(r.sources.some((s) => s.type === 'video/mp4' && s.hasSrc)).toBe(true);
  });

  test('content mode: minimal hides controls + no autoplay; full + autoplay forces muted', async ({ page }) => {
    const minimal = await readCase(page, 'content-minimal');
    expect(minimal.v.autoplay).toBe(false);
    expect(minimal.v.controls).toBe(false); // minimal hides controls
    expect(minimal.v.muted).toBe(false); // not autoplaying → not force-muted

    const full = await readCase(page, 'content-full-autoplay');
    expect(full.v.controls).toBe(true); // full → browser-native controls
    expect(full.v.autoplay).toBe(true);
    expect(full.v.muted).toBe(true); // autoplay forces muted (browser policy)
  });

  test('loop off drops the loop attribute', async ({ page }) => {
    const r = await readCase(page, 'loop-off');
    expect(r.v.loop).toBe(false);
  });

  test('preload metadata applies', async ({ page }) => {
    const r = await readCase(page, 'preload-metadata');
    expect(r.v.preload).toBe('metadata');
  });

  test('art-direction emits a mobile <source media> before the fallback source', async ({ page }) => {
    const r = await readCase(page, 'art-direction');
    expect(r.sources.length).toBe(2);
    expect(r.sources[0].media).toBe('(max-width: 47.99rem)'); // mobile source first
    expect(r.sources[0].type).toBe('video/mp4');
    expect(r.sources[1].media).toBeNull(); // fallback, no media query
    expect(r.sources.every((s) => s.hasSrc)).toBe(true);
  });

  test('blank video renders nothing (snippet break)', async ({ page }) => {
    const r = await readCase(page, 'blank');
    expect(r.hasMediaVideo).toBe(false);
    expect(r.hasVideo).toBe(false);
  });
});
