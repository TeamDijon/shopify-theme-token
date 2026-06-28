import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the media container block, converted
// from .context/specs/media.md § Validation. Matrix baked in
// templates/index.validation--primitive--media.json.
//
// Strategy (decided 2026-06-28): the media block page validates the COMPOSITION
// surface — placeholder SVG (assets can't be handle-seeded) + handle-seeded
// media_size + modifier/structure emission. Real-pixel / asset behaviours
// (art-direction, object-fit pixels, srcset/sizes, video playback) are deferred
// to dedicated L0 image.liquid / video.liquid validation pages.
//
// Fixtures are anchored by their --block-label (the JSON key, set per block by
// validation--block-labels) — so feature fixtures carry no redundant overlay
// content; only content-placement fixtures (alignment / gap / group) have children.

const PATH = '/?view=validation--primitive--media';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.locator('.shopify-block--media').first().waitFor();
});

function readMedia(page, label) {
  return page.evaluate((label) => {
    const m = [...document.querySelectorAll('.shopify-block--media')].find(
      (el) => getComputedStyle(el).getPropertyValue('--block-label').replace(/['"\s]/g, '') === label
    );
    if (!m) return null;
    const cs = getComputedStyle(m);
    const overlay = m.querySelector(':scope > media-overlay');
    const contents = m.querySelector(':scope > media-contents');
    const mediaEl = m.querySelector(':scope > picture, :scope > img, :scope > svg, :scope > media-video');
    const ts = m.closest('token-section');
    const rM = m.getBoundingClientRect();
    const rTs = ts.getBoundingClientRect();
    return {
      mods: m.getAttribute('data-modifiers'),
      width: Math.round(rM.width),
      blockSize: parseFloat(cs.blockSize),
      innerHeight: window.innerHeight,
      aspectRatio: cs.aspectRatio,
      gridColumn: cs.gridColumn,
      maxInline: cs.maxInlineSize,
      leftGap: Math.round(rM.left - rTs.left),
      rightGap: Math.round(rTs.right - rM.right),
      radius: cs.borderTopLeftRadius,
      shadow: cs.boxShadow,
      mediaTag: mediaEl ? mediaEl.tagName.toLowerCase() : null,
      mediaObjectFit: mediaEl ? getComputedStyle(mediaEl).objectFit : null,
      hasOverlay: !!overlay,
      overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null,
      hasContents: !!contents,
      hasGroupChild: contents ? !!contents.querySelector('.shopify-block--group') : false,
      contentsJustify: contents ? getComputedStyle(contents).justifyContent : null,
      contentsAlign: contents ? getComputedStyle(contents).alignItems : null,
      contentsGap: contents ? getComputedStyle(contents).gap : null,
      gapVar: cs.getPropertyValue('--gap').trim(),
      schemeBg: cs.backgroundColor,
      mobileMargin: cs.getPropertyValue('--mobile-margin-block-start').trim(),
      desktopMargin: cs.getPropertyValue('--desktop-margin-block-start').trim(),
    };
  }, label);
}

test.describe('validation--primitive--media', () => {
  // ── media_type branch + placeholder ───────────────────────────────────────
  test('media_type:image renders a placeholder surface, no overlay/contents when childless', async ({ page }) => {
    const r = await readMedia(page, 'image-placeholder');
    expect(r.mods).toContain('media-type:image');
    expect(r.mods).not.toContain('has-children');
    expect(r.mediaTag).toBe('svg'); // placeholder (assetless)
    expect(r.hasContents).toBe(false);
    expect(r.hasOverlay).toBe(false);
  });

  test('media_type:video emits the modifier (placeholder when assetless)', async ({ page }) => {
    const r = await readMedia(page, 'type-video');
    expect(r.mods).toContain('media-type:video');
    expect(r.mediaTag).toBe('svg');
  });

  // ── Sizing (handle-seeded media_size) ─────────────────────────────────────
  test('media_size ratio → sizing:ratio modifier + computed aspect-ratio', async ({ page }) => {
    const r16 = await readMedia(page, 'image-placeholder');
    expect(r16.mods).toContain('sizing:ratio');
    expect(r16.aspectRatio).toBe('16 / 9');
    const r11 = await readMedia(page, 'size-ratio-11');
    expect(r11.aspectRatio).toBe('1 / 1');
  });

  test('media_size relative → sizing:height modifier + viewport-relative block-size', async ({ page }) => {
    const r = await readMedia(page, 'size-relative-half');
    expect(r.mods).toContain('sizing:height');
    expect(r.aspectRatio).toBe('auto');
    expect(r.blockSize / r.innerHeight).toBeCloseTo(0.5, 1); // 50svh
  });

  test('media_size fill → sizing:fill modifier + full viewport height', async ({ page }) => {
    const r = await readMedia(page, 'size-fill');
    expect(r.mods).toContain('sizing:fill');
    expect(r.blockSize / r.innerHeight).toBeCloseTo(1, 1); // 100svh
  });

  // ── image_fit ─────────────────────────────────────────────────────────────
  test('image_fit contain emits the modifier + sets object-fit; default is cover', async ({ page }) => {
    const contain = await readMedia(page, 'fit-contain');
    expect(contain.mods).toContain('image-fit:contain');
    expect(contain.mediaObjectFit).toBe('contain');
    const cover = await readMedia(page, 'image-placeholder');
    expect(cover.mods).not.toContain('image-fit');
    expect(cover.mediaObjectFit).toBe('cover');
  });

  // ── Overlay tint ───────────────────────────────────────────────────────────
  test('overlay_color renders a <media-overlay> tint; absent when unset', async ({ page }) => {
    const tint = await readMedia(page, 'overlay-tint');
    expect(tint.hasOverlay).toBe(true);
    expect(tint.overlayBg).toBe('rgba(0, 51, 153, 0.4)');
    const noTint = await readMedia(page, 'image-placeholder');
    expect(noTint.hasOverlay).toBe(false);
  });

  // ── Overlay content placement ─────────────────────────────────────────────
  test('overlay content alignment maps to media-contents justify/align', async ({ page }) => {
    const def = await readMedia(page, 'overlay-default');
    expect(def.contentsJustify).toBe('end'); // hero default: content at bottom
    expect(def.contentsAlign).toBe('start');
    const center = await readMedia(page, 'align-center');
    expect(center.contentsJustify).toBe('center');
    expect(center.contentsAlign).toBe('center');
    const end = await readMedia(page, 'align-end');
    expect(end.contentsJustify).toBe('start'); // vertical_alignment: start
    expect(end.contentsAlign).toBe('end'); // horizontal_alignment: end
  });

  test('gap emits --gap when > 0; zero gap computes to 0 (regression: media-contents fallback)', async ({ page }) => {
    const withGap = await readMedia(page, 'overlay-default');
    expect(withGap.gapVar).toBe('1.0rem');
    expect(withGap.contentsGap).toBe('16px');
    const noGap = await readMedia(page, 'gap-zero');
    expect(noGap.gapVar).toBe(''); // zero-emission
    // the fallback is now 0rem (was 1rem → unreachable 0) — see media.liquid v1.5.1
    expect(parseFloat(noGap.contentsGap)).toBe(0);
  });

  test('overlay blocks render in media-contents; a group child nests inside', async ({ page }) => {
    const grouped = await readMedia(page, 'grouped-overlay');
    expect(grouped.mods).toContain('has-children');
    expect(grouped.hasContents).toBe(true);
    expect(grouped.hasGroupChild).toBe(true);
  });

  // ── Bleed: emission AND painting (token-section is the real theme-root grid) ──
  test('bleed-both emits modifiers and paints full-bleed', async ({ page }) => {
    const both = await readMedia(page, 'bleed-both');
    const content = await readMedia(page, 'image-placeholder');
    expect(both.mods).toContain('bleed-desktop:both');
    expect(both.mods).toContain('bleed-mobile:both');
    expect(both.gridColumn).toBe('bleed-start / bleed-end');
    expect(both.width).toBeGreaterThan(content.width);
  });

  test('bleed inline_start (desktop-only) paints one-sided on desktop, content track on mobile', async ({
    page,
  }, testInfo) => {
    const start = await readMedia(page, 'bleed-start');
    const content = await readMedia(page, 'image-placeholder');
    expect(start.mods).toContain('bleed-desktop:inline_start');
    if (testInfo.project.name === 'desktop') {
      expect(start.gridColumn).toBe('bleed-start / content-end');
      expect(start.width).toBeGreaterThan(content.width);
    } else {
      expect(start.gridColumn).toBe('content-start / content-end');
    }
  });

  // ── container_style ───────────────────────────────────────────────────────
  test('container_style card emits the modifier and pulls centralized variant CSS', async ({ page }) => {
    const r = await readMedia(page, 'container-card');
    expect(r.mods).toContain('container-style:card');
    expect(r.radius).toBe('8px');
    expect(r.shadow).not.toBe('none');
  });

  // ── color_scheme override ─────────────────────────────────────────────────
  test('color_scheme override emits the modifier and paints a scheme band', async ({ page }) => {
    const sch = await readMedia(page, 'scheme-override');
    const def = await readMedia(page, 'image-placeholder');
    expect(sch.mods).toContain('color-scheme:scheme-2');
    expect(sch.schemeBg).toBe('rgb(250, 248, 245)');
    expect(def.schemeBg).toBe('rgba(0, 0, 0, 0)');
  });

  // ── content_width ─────────────────────────────────────────────────────────
  test('content_width caps the block (max-inline-size) and centers symmetrically', async ({ page }) => {
    const r = await readMedia(page, 'width-capped');
    expect(r.maxInline).toBe('680px');
    expect(r.leftGap).toBe(r.rightGap);
  });

  // ── Top-spacing overrides ─────────────────────────────────────────────────
  test('top-spacing override emits absolute margin custom properties', async ({ page }) => {
    const r = await readMedia(page, 'with-spacing');
    expect(r.mobileMargin).toBe('1.0rem');
    expect(r.desktopMargin).toBe('4.0rem');
  });
});
