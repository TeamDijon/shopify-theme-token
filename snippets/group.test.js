import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the group container block, converted
// from snippets/group.spec.md § Validation. Matrix baked in
// snippets/group.validation.json.
//
// Groups have no stable text of their own, so each test selects a group by a
// unique child's text and walks up via .closest('.shopify-block--group').

const PATH = '/?view=validation';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
});

// Read group + its inner token-layout in one evaluate, keyed off a child's text.
function readGroup(page, childText, exact = true) {
  return page.getByText(childText, { exact }).first().evaluate((el) => {
    const g = el.closest('.shopify-block--group');
    const tl = g.querySelector(':scope > token-layout');
    const gcs = getComputedStyle(g);
    const lcs = getComputedStyle(tl);
    const gr = g.getBoundingClientRect();
    const pr = g.parentElement.getBoundingClientRect();
    return {
      mods: g.getAttribute('data-modifiers'),
      width: Math.round(gr.width),
      leftGap: Math.round(gr.left - pr.left),
      rightGap: Math.round(pr.right - gr.right),
      gridColumn: gcs.gridColumn,
      fd: lcs.flexDirection,
      justify: lcs.justifyContent,
      align: lcs.alignItems,
      gap: lcs.gap,
      gapVar: gcs.getPropertyValue('--gap').trim(),
      halignVar: gcs.getPropertyValue('--horizontal-alignment').trim(),
      contentWidth: gcs.getPropertyValue('--content-width').trim(),
      maxInline: gcs.maxInlineSize,
      schemeBg: gcs.getPropertyValue('--color-role-background').trim(),
      bg: gcs.backgroundColor,
      mobileMargin: gcs.getPropertyValue('--mobile-margin-block-start').trim(),
      desktopMargin: gcs.getPropertyValue('--desktop-margin-block-start').trim(),
    };
  });
}

test.describe('validation--primitive--group', () => {
  test('direction column → token-layout flex-direction column', async ({ page }) => {
    const r = await readGroup(page, 'First button');
    expect(r.mods).toContain('direction:column');
    expect(r.fd).toBe('column');
  });

  test('direction row → token-layout flex-direction row, justify start by default', async ({ page }) => {
    const r = await readGroup(page, 'First');
    expect(r.mods).toContain('direction:row');
    expect(r.fd).toBe('row');
    expect(r.justify).toBe('start');
  });

  test('row horizontal_alignment center → justify-content center', async ({ page }) => {
    const r = await readGroup(page, 'Centered first');
    expect(r.halignVar).toBe('center');
    expect(r.justify).toBe('center');
  });

  test('row horizontal_alignment end → justify-content end', async ({ page }) => {
    const r = await readGroup(page, 'End first');
    expect(r.justify).toBe('end');
  });

  test('row horizontal_alignment space-between → justify-content space-between', async ({ page }) => {
    const r = await readGroup(page, 'Spread first');
    expect(r.justify).toBe('space-between');
  });

  test('row vertical_alignment center → align-items center', async ({ page }) => {
    const r = await readGroup(page, 'Vertically centered');
    expect(r.align).toBe('center');
  });

  test('space-between in column direction normalizes to start (no invalid align-items)', async ({ page }) => {
    const r = await readGroup(page, 'Normalized A');
    expect(r.halignVar).toBe(''); // normalized to start → zero-emission, var unset
    expect(r.align).toBe('start');
    expect(r.align).not.toBe('space-between');
  });

  test('column horizontal_alignment maps to align-items (center / end)', async ({ page }) => {
    const center = await readGroup(page, 'Col-centered A');
    expect(center.align).toBe('center');
    const end = await readGroup(page, 'Col-end A');
    expect(end.align).toBe('end');
  });

  test('stack-below:40 → container query: row when group ≥ 40rem wide, column when narrower', async ({ page }) => {
    const r = await readGroup(page, 'Stack first');
    expect(r.mods).toContain('stack-below:40');
    // @container query against the group's OWN inline-size (not the viewport):
    // desktop project (~1217px ≥ 640px) → row; mobile project (~360px) → column.
    expect(r.fd).toBe(r.width >= 640 ? 'row' : 'column');
  });

  test('stack-below:80 stays column when narrower than 80rem — @container, not @media', async ({ page }) => {
    const r = await readGroup(page, 'Wide-stack first');
    expect(r.mods).toContain('stack-below:80');
    // 80rem = 1280px. The harness group (~1217px) never reaches it, so it stays
    // column even on the 1280px desktop viewport — proving the query is against
    // the group's own inline-size, not the viewport.
    expect(r.fd).toBe(r.width >= 1280 ? 'row' : 'column');
  });

  test('gap emits --gap (rem) and applies; zero gap emits nothing', async ({ page }) => {
    const withGap = await readGroup(page, 'Stack first');
    expect(withGap.gapVar).toBe('1.5rem');
    expect(withGap.gap).toBe('24px');
    const noGap = await readGroup(page, 'No gap A');
    expect(noGap.gapVar).toBe('');
    expect(parseFloat(noGap.gap)).toBe(0);
  });

  // The harness token-section is the real production theme-root bleed grid, so
  // bleed modifiers resolve to grid-column placement here (not just emission).
  // The modifier value is the raw setting value `inline_start` (underscore);
  // layer-theme.css matches the same underscore form (substrate bleed fix).
  test('bleed-both emits modifiers and paints full-bleed (grid-column + wider than content)', async ({ page }) => {
    const both = await readGroup(page, 'Full-bleed group');
    const content = await readGroup(page, 'First button');
    expect(both.mods).toContain('bleed-desktop:both');
    expect(both.mods).toContain('bleed-mobile:both'); // bleeds at both viewports
    expect(both.gridColumn).toBe('bleed-start / bleed-end');
    expect(both.width).toBeGreaterThan(content.width);
  });

  test('bleed inline_start (desktop-only) paints one-sided on desktop, content track on mobile', async ({
    page,
  }, testInfo) => {
    const start = await readGroup(page, 'Start-bleed group');
    const content = await readGroup(page, 'First button');
    expect(start.mods).toContain('bleed-desktop:inline_start');
    if (testInfo.project.name === 'desktop') {
      expect(start.gridColumn).toBe('bleed-start / content-end');
      expect(start.width).toBeGreaterThan(content.width);
    } else {
      expect(start.gridColumn).toBe('content-start / content-end');
    }
  });

  test('container_style card emits the modifier and pulls centralized variant CSS', async ({ page }) => {
    const r = await page.getByText('Card container', { exact: true }).evaluate((el) => {
      const g = el.closest('.shopify-block--group');
      const cs = getComputedStyle(g);
      return {
        mods: g.getAttribute('data-modifiers'),
        radius: cs.borderTopLeftRadius,
        padding: cs.paddingTop,
        shadow: cs.boxShadow,
      };
    });
    expect(r.mods).toContain('container-style:card');
    expect(r.radius).toBe('8px');
    expect(r.padding).toBe('24px');
    expect(r.shadow).not.toBe('none');
  });

  test('color_scheme override emits the modifier and re-resolves scheme tokens', async ({ page }) => {
    const sch = await readGroup(page, 'Inside scheme-2');
    const def = await readGroup(page, 'First button');
    expect(sch.mods).toContain('color-scheme:scheme-2');
    expect(sch.schemeBg).toBe('#faf8f5');
    expect(sch.schemeBg).not.toBe(def.schemeBg);
    // the override now paints a real background band (scheme-2 bg); a plain group
    // (no color-scheme) paints nothing
    expect(sch.bg).toBe('rgb(250, 248, 245)');
    expect(def.bg).toBe('rgba(0, 0, 0, 0)');
  });

  test('content_width caps the group (--content-width + max-inline-size) and centers it in the track', async ({
    page,
  }) => {
    const r = await readGroup(page, 'Capped-width group');
    expect(r.contentWidth).toBe('42.5rem');
    expect(r.maxInline).toBe('680px');
    // A capped container fills to the cap (inline-size:100%) and centers via
    // justify-self — the block-alignment model's fill-to-cap family. Symmetric
    // gaps prove the center; equal both viewports (0/0 when the track ≤ cap).
    expect(Math.abs(r.leftGap - r.rightGap)).toBeLessThanOrEqual(2);
  });

  test('recursive nesting: a group contains a group, each with its own layout', async ({ page }) => {
    const r = await page.getByText('Inner A', { exact: true }).evaluate((el) => {
      const inner = el.closest('.shopify-block--group');
      const outer = inner.parentElement.closest('.shopify-block--group');
      return {
        distinct: inner !== outer && outer.contains(inner),
        innerMods: inner.getAttribute('data-modifiers'),
        innerFd: getComputedStyle(inner.querySelector(':scope > token-layout')).flexDirection,
        outerFd: getComputedStyle(outer.querySelector(':scope > token-layout')).flexDirection,
        innerWidth: Math.round(inner.getBoundingClientRect().width),
      };
    });
    expect(r.distinct).toBe(true);
    // regression guard: a non-querying nested group must NOT collapse to 0 (it
    // has no container-type, so its content sizes it) — see snippets/group.liquid.
    expect(r.innerWidth).toBeGreaterThan(0);
    expect(r.outerFd).toBe('row');
    expect(r.innerFd).toBe('column');
    expect(r.innerMods).toContain('direction:column');
  });

  test('empty group renders the outer + token-layout wrapper with no children', async ({ page }) => {
    const r = await page.evaluate(() => {
      const empties = [...document.querySelectorAll('.shopify-block--group')].filter((g) => {
        const tl = g.querySelector(':scope > token-layout');
        return tl && tl.children.length === 0;
      });
      const g = empties[0];
      return {
        count: empties.length,
        isGroup: !!g && g.classList.contains('shopify-block--group'),
        mods: g?.getAttribute('data-modifiers'),
        childCount: g?.querySelector(':scope > token-layout')?.children.length,
      };
    });
    expect(r.count).toBe(1);
    expect(r.isGroup).toBe(true);
    expect(r.mods).toContain('direction:column');
    expect(r.childCount).toBe(0);
  });

  test('top-spacing overrides emit absolute margin custom properties (loose + tight)', async ({ page }) => {
    const loose = await readGroup(page, 'After 64px desktop margin');
    expect(loose.mobileMargin).toBe('1.0rem');
    expect(loose.desktopMargin).toBe('4.0rem');
    const tight = await readGroup(page, 'Tighter than the rhythm');
    expect(tight.mobileMargin).toBe('0.5rem');
    expect(tight.desktopMargin).toBe('1.0rem');
  });
});
