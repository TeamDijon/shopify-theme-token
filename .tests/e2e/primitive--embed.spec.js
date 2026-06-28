import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the embed block, converted from
// .context/specs/embed.md § Validation. Matrix baked in
// templates/index.validation--primitive--embed.json.
//
// embed's real logic is the Liquid URL parser; the tests assert the emitted
// iframe markup (src per provider, loading/allow/title) + the provider/sizing
// modifiers, the placeholder + editor-only diagnostic branch, and the
// media_size / content_width / top-spacing emission. Iframe runtime behavior is
// the provider's concern, deliberately unasserted. Each case is selected by its
// --block-label (embed carries no stable text).

const PATH = '/?view=validation--primitive--embed';
const YT_EMBED = 'https://www.youtube.com/embed/aqz-KE-bpKQ';
const VIMEO_EMBED = 'https://player.vimeo.com/video/76979871';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  // The embed wrapper (overflow:hidden, absolutely-positioned iframe) reads as
  // "hidden" to Playwright's visibility check, so wait on the always-visible
  // chrome instead; readEmbed reads attributes/computed-style via the DOM.
  await page.locator('.validation__intro').waitFor();
});

function readEmbed(page, label) {
  return page.locator('.shopify-block--embed').evaluateAll((els, label) => {
    const strip = (s) => s.trim().replace(/^'|'$/g, '');
    const el = els.find((e) => strip(getComputedStyle(e).getPropertyValue('--block-label')) === label);
    if (!el) return null;
    const iframe = el.querySelector('iframe');
    const diag = el.querySelector('.diagnostic');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      mods: el.getAttribute('data-modifiers'),
      iframe: iframe && {
        src: iframe.getAttribute('src'),
        title: iframe.getAttribute('title'),
        loading: iframe.getAttribute('loading'),
        allow: iframe.getAttribute('allow'),
        allowfullscreen: iframe.hasAttribute('allowfullscreen'),
      },
      hasSvg: !!el.querySelector('svg'),
      hasDiagnostic: !!diag,
      diagnosticDisplay: diag ? getComputedStyle(diag).display : null,
      aspectRatio: cs.aspectRatio,
      mediaRatioVar: cs.getPropertyValue('--media-ratio').trim(),
      contentWidthVar: cs.getPropertyValue('--content-width').trim(),
      mobileMargin: cs.getPropertyValue('--mobile-margin-block-start').trim(),
      desktopMargin: cs.getPropertyValue('--desktop-margin-block-start').trim(),
    };
  }, label);
}

test.describe('validation--primitive--embed', () => {
  // All four YouTube URL shapes normalize to the same /embed/<id> src.
  for (const label of ['youtube-watch', 'youtube-short-url', 'youtube-shorts', 'youtube-embed']) {
    test(`youtube ${label} → /embed/<id> iframe + provider modifier`, async ({ page }) => {
      const r = await readEmbed(page, label);
      expect(r.mods).toContain('provider:youtube');
      expect(r.iframe).not.toBeNull();
      expect(r.iframe.src).toBe(YT_EMBED);
      expect(r.iframe.loading).toBe('lazy');
      expect(r.iframe.allow).toContain('encrypted-media'); // YouTube allow policy
      expect(r.iframe.allowfullscreen).toBe(true);
    });
  }

  // Regression guard: the wrapper's content is all position:absolute, so without
  // an explicit inline-size:100% it shrinks-to-fit to 0 in a non-stretching
  // parent (and grid margin-inline:auto disables justify-self:stretch). embed
  // v1.2.1 added inline-size:100% (matching separator v1.0.2).
  test('wrapper fills its track (does not collapse to 0)', async ({ page }) => {
    const r = await readEmbed(page, 'youtube-watch');
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
    // capped at the harness 30rem (480px); the point is it's a real box, not 0
    expect(r.width).toBeGreaterThan(200);
  });

  test('iframe title carries the merchant value for screen readers', async ({ page }) => {
    const r = await readEmbed(page, 'youtube-watch');
    expect(r.iframe.title).toBe('YouTube watch URL');
  });

  test('vimeo public → player.vimeo embed + provider modifier + vimeo allow', async ({ page }) => {
    const r = await readEmbed(page, 'vimeo');
    expect(r.mods).toContain('provider:vimeo');
    expect(r.iframe.src).toBe(VIMEO_EMBED);
    expect(r.iframe.allow).toContain('fullscreen'); // Vimeo allow policy
  });

  test('vimeo unlisted → embed src carries the ?h=<hash>', async ({ page }) => {
    const r = await readEmbed(page, 'vimeo-unlisted');
    expect(r.iframe.src).toBe(`${VIMEO_EMBED}?h=abcdef1234`);
  });

  test('vimeo player URL is used as-is', async ({ page }) => {
    const r = await readEmbed(page, 'vimeo-player');
    expect(r.iframe.src).toBe(VIMEO_EMBED);
  });

  test('unparseable URL → placeholder svg + editor-only diagnostic (hidden outside editor)', async ({ page }) => {
    const r = await readEmbed(page, 'unparseable');
    expect(r.iframe).toBeNull(); // no iframe for an unrecognized provider
    expect(r.hasSvg).toBe(true); // placeholder_svg_tag
    expect(r.hasDiagnostic).toBe(true); // url set but unparseable → diagnostic element present
    expect(r.diagnosticDisplay).toBe('none'); // hidden without the shopify-design-mode document modifier
  });

  test('blank URL → placeholder svg, no diagnostic', async ({ page }) => {
    const r = await readEmbed(page, 'blank-url');
    expect(r.iframe).toBeNull();
    expect(r.hasSvg).toBe(true);
    expect(r.hasDiagnostic).toBe(false); // blank = "not configured yet", not "configured wrong"
  });

  test('default (no media_size) renders at 16/9; media_size 1:1 emits sizing:ratio + 1/1', async ({ page }) => {
    const def = await readEmbed(page, 'youtube-watch');
    expect(def.aspectRatio).toContain('16 / 9');
    expect(def.mods).not.toContain('sizing:');

    const square = await readEmbed(page, 'sized-square');
    expect(square.mods).toContain('sizing:ratio');
    expect(square.mediaRatioVar).not.toBe(''); // --media-ratio emitted
    expect(square.aspectRatio).toContain('1 / 1');
  });

  test('content_width caps via the emitted --content-width var', async ({ page }) => {
    // The harness caps embed display width, so assert the emitted var (Tier-2
    // boundary), not the painted max-inline-size.
    const r = await readEmbed(page, 'capped');
    expect(r.contentWidthVar).toBe('37.5rem'); // narrow 600px / 16
  });

  test('top-spacing overrides emit per-breakpoint margin vars', async ({ page }) => {
    const r = await readEmbed(page, 'with-spacing');
    expect(r.mobileMargin).toBe('1.0rem'); // 16px / 16
    expect(r.desktopMargin).toBe('4.0rem'); // 64px / 16
  });
});
