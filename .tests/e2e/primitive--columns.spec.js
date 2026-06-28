import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the columns container block, converted
// from .context/specs/columns.md § Validation. Matrix baked in
// templates/index.validation--primitive--columns.json.
//
// Columns have no stable text of their own, so each test selects a columns block
// by a unique child's text and walks up via .closest('.shopify-block--columns').
// The grid lives on the inner <token-layout>; the outer hosts the named container
// + per-instance custom properties.

const PATH = '/?view=validation--primitive--columns';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
});

// Read a columns block + its inner token-layout in one evaluate, keyed off a
// child's text.
function readCols(page, childText, exact = true) {
  return page
    .getByText(childText, { exact })
    .first()
    .evaluate((el) => {
      const c = el.closest('.shopify-block--columns');
      const tl = c.querySelector(':scope > token-layout');
      const ccs = getComputedStyle(c);
      const lcs = getComputedStyle(tl);
      const tracks = lcs.gridTemplateColumns.split(' ').map((n) => parseFloat(n));
      return {
        mods: c.getAttribute('data-modifiers'),
        width: Math.round(c.getBoundingClientRect().width),
        gridColumn: ccs.gridColumn,
        trackCount: tracks.length,
        tracks,
        gtcVar: ccs.getPropertyValue('--grid-template-columns').trim(),
        gap: lcs.gap,
        gapVar: ccs.getPropertyValue('--gap').trim(),
        align: lcs.alignItems,
        valignVar: ccs.getPropertyValue('--vertical-alignment').trim(),
        contentWidth: ccs.getPropertyValue('--content-width').trim(),
        maxInline: ccs.maxInlineSize,
        schemeBg: ccs.getPropertyValue('--color-role-background').trim(),
        bg: ccs.backgroundColor,
        mobileMargin: ccs.getPropertyValue('--mobile-margin-block-start').trim(),
        desktopMargin: ccs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
}

// Position of the named grid child (first / last) of the columns block holding
// `childText`, plus the block's width and track count — for sticky assertions.
function readSticky(page, childText) {
  return page
    .getByText(childText, { exact: true })
    .first()
    .evaluate((el) => {
      const c = el.closest('.shopify-block--columns');
      const tl = c.querySelector(':scope > token-layout');
      return {
        mods: c.getAttribute('data-modifiers'),
        width: Math.round(c.getBoundingClientRect().width),
        trackCount: getComputedStyle(tl).gridTemplateColumns.split(' ').length,
        firstPos: getComputedStyle(tl.firstElementChild).position,
        lastPos: getComputedStyle(tl.lastElementChild).position,
      };
    });
}

test.describe('validation--primitive--columns', () => {
  // ── Ratio matrix ────────────────────────────────────────────────────────
  const RATIOS = [
    { anchor: 'Equal-2 first', value: '2', gtc: 'repeat(2, 1fr)', count: 2 },
    { anchor: 'Equal-3 first', value: '3', gtc: 'repeat(3, 1fr)', count: 3 },
    { anchor: 'Equal-4 first', value: '4', gtc: 'repeat(4, 1fr)', count: 4 },
    { anchor: 'Ratio 1-2 narrow', value: '1-2', gtc: '1fr 2fr', count: 2 },
    { anchor: 'Ratio 2-1 wide (2fr)', value: '2-1', gtc: '2fr 1fr', count: 2 },
    { anchor: 'Ratio 1-3 narrow', value: '1-3', gtc: '1fr 3fr', count: 2 },
    { anchor: 'Ratio 3-1 wide (3fr)', value: '3-1', gtc: '3fr 1fr', count: 2 },
  ];

  for (const r of RATIOS) {
    test(`ratio ${r.value} emits columns:${r.value} + --grid-template-columns "${r.gtc}" and lays ${r.count} tracks`, async ({
      page,
    }) => {
      const c = await readCols(page, r.anchor);
      expect(c.mods).toContain(`columns:${r.value}`);
      expect(c.gtcVar).toBe(r.gtc);
      // stack_below:none on these, so the grid holds at every viewport.
      expect(c.trackCount).toBe(r.count);
    });
  }

  test('asymmetric ratios size tracks proportionally (1-3 → second ≈ 3× first)', async ({ page }) => {
    const c = await readCols(page, 'Ratio 1-3 narrow');
    expect(c.trackCount).toBe(2);
    expect(c.tracks[1] / c.tracks[0]).toBeCloseTo(3, 1);
  });

  test('equal ratios size tracks evenly (4 equal tracks)', async ({ page }) => {
    const c = await readCols(page, 'Equal-4 first');
    expect(c.trackCount).toBe(4);
    expect(c.tracks[3] / c.tracks[0]).toBeCloseTo(1, 1);
  });

  // ── Gap ─────────────────────────────────────────────────────────────────
  test('gap emits --gap (rem) and applies; zero gap emits nothing', async ({ page }) => {
    const withGap = await readCols(page, 'Stack-40 first'); // gap: 24
    expect(withGap.gapVar).toBe('1.5rem');
    expect(withGap.gap).toBe('24px');
    const noGap = await readCols(page, 'No-gap A'); // gap: 0
    expect(noGap.gapVar).toBe('');
    expect(parseFloat(noGap.gap)).toBe(0);
  });

  // ── Vertical alignment ────────────────────────────────────────────────────
  test('vertical_alignment start is zero-emission (var unset, align-items start)', async ({ page }) => {
    const c = await readCols(page, 'V-start short');
    expect(c.valignVar).toBe('');
    expect(c.align).toBe('start');
  });

  test('vertical_alignment center / end / stretch emit the var and set align-items', async ({ page }) => {
    const center = await readCols(page, 'V-center short');
    expect(center.valignVar).toBe('center');
    expect(center.align).toBe('center');
    const end = await readCols(page, 'V-end short');
    expect(end.valignVar).toBe('end');
    expect(end.align).toBe('end');
    const stretch = await readCols(page, 'V-stretch short');
    expect(stretch.valignVar).toBe('stretch');
    expect(stretch.align).toBe('stretch');
  });

  // ── Stack-below (container query against the block's OWN inline-size) ──────
  test('stack-below:40 → grid when block ≥ 40rem wide, single column when narrower', async ({ page }) => {
    const c = await readCols(page, 'Stack-40 first');
    expect(c.mods).toContain('stack-below:40');
    // 40rem = 640px. desktop block (~1217px) → 2 tracks; mobile (~342px) → 1.
    expect(c.trackCount).toBe(c.width >= 640 ? 2 : 1);
  });

  test('stack-below:60 → grid when block ≥ 60rem wide, single column when narrower', async ({ page }) => {
    const c = await readCols(page, 'Stack-60 first');
    expect(c.mods).toContain('stack-below:60');
    // 60rem = 960px. desktop (~1217px) → 3 tracks; mobile → 1.
    expect(c.trackCount).toBe(c.width >= 960 ? 3 : 1);
  });

  test('stack-below:80 stays single column when narrower than 80rem — @container, not @media', async ({ page }) => {
    const c = await readCols(page, 'Stack-80 first');
    expect(c.mods).toContain('stack-below:80');
    // 80rem = 1280px. The harness block (~1217px) never reaches it, so it stays
    // single-column even on the 1280px desktop viewport — proving the query is
    // against the block's own inline-size, not the viewport.
    expect(c.trackCount).toBe(c.width >= 1280 ? 2 : 1);
  });

  // ── Sticky track ──────────────────────────────────────────────────────────
  test('sticky-track:first pins the first track (no stack-below)', async ({ page }) => {
    const s = await readSticky(page, 'Sticky-first pinned');
    expect(s.mods).toContain('sticky-track:first');
    expect(s.firstPos).toBe('sticky');
  });

  test('sticky-track:second pins the last track, leaves the first static', async ({ page }) => {
    const s = await readSticky(page, 'Sticky-second pinned');
    expect(s.mods).toContain('sticky-track:second');
    expect(s.lastPos).toBe('sticky');
    expect(s.firstPos).toBe('static');
  });

  test('sticky disables when stack-below has collapsed the grid (regression: specificity fix)', async ({ page }) => {
    const s = await readSticky(page, 'Sticky-collapsed pinned');
    // stack-below:80 → collapsed at every harness viewport (block < 1280px).
    expect(s.trackCount).toBe(1);
    // The disable rule must win over the sticky enable rule, so the pinned child
    // falls back to static (no scroll runway in a single column). See
    // snippets/columns.liquid v1.8.1.
    expect(s.firstPos).toBe('static');
  });

  test('sticky re-enables when the grid re-expands (@container re-enable path)', async ({ page }) => {
    const s = await readSticky(page, 'Sticky-restack pinned');
    expect(s.mods).toContain('stack-below:40');
    expect(s.mods).toContain('sticky-track:first');
    // 40rem = 640px. desktop (~1217px) → grid active → first track sticky;
    // mobile (~342px) → collapsed → first track static.
    if (s.width >= 640) {
      expect(s.trackCount).toBe(2);
      expect(s.firstPos).toBe('sticky');
    } else {
      expect(s.trackCount).toBe(1);
      expect(s.firstPos).toBe('static');
    }
  });

  // ── Bleed: emission AND painting ──────────────────────────────────────────
  // The harness token-section is the real production theme-root bleed grid, so
  // bleed modifiers resolve to grid-column placement here (not just emission).
  test('bleed-both emits modifiers and paints full-bleed (grid-column + wider than content)', async ({ page }) => {
    const both = await readCols(page, 'Full-bleed columns A');
    const content = await readCols(page, 'Equal-2 first');
    expect(both.mods).toContain('bleed-desktop:both');
    expect(both.mods).toContain('bleed-mobile:both'); // bleeds at both viewports
    expect(both.gridColumn).toBe('bleed-start / bleed-end');
    expect(both.width).toBeGreaterThan(content.width);
  });

  test('bleed inline_start (desktop-only) paints one-sided on desktop, content track on mobile', async ({
    page,
  }, testInfo) => {
    const start = await readCols(page, 'Start-bleed columns A');
    const content = await readCols(page, 'Equal-2 first');
    // raw setting value carries the underscore (`inline_start`); layer-theme.css
    // matches the same form post the substrate bleed fix.
    expect(start.mods).toContain('bleed-desktop:inline_start');
    if (testInfo.project.name === 'desktop') {
      expect(start.gridColumn).toBe('bleed-start / content-end');
      expect(start.width).toBeGreaterThan(content.width);
    } else {
      // no bleed_mobile set → sits in the content track below 48rem
      expect(start.gridColumn).toBe('content-start / content-end');
    }
  });

  test('a non-bleed columns block sits in the content track', async ({ page }) => {
    const content = await readCols(page, 'Equal-2 first');
    expect(content.gridColumn).toBe('content-start / content-end');
  });

  // ── container_style ───────────────────────────────────────────────────────
  test('container_style card emits the modifier and pulls centralized variant CSS', async ({ page }) => {
    const r = await page.getByText('Card columns', { exact: true }).evaluate((el) => {
      const c = el.closest('.shopify-block--columns');
      const cs = getComputedStyle(c);
      return {
        mods: c.getAttribute('data-modifiers'),
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

  // ── color_scheme override ─────────────────────────────────────────────────
  test('color_scheme override emits the modifier, re-resolves scheme tokens, paints a band', async ({ page }) => {
    const sch = await readCols(page, 'Inside scheme-2 columns');
    const def = await readCols(page, 'Equal-2 first');
    expect(sch.mods).toContain('color-scheme:scheme-2');
    expect(sch.schemeBg).toBe('#faf8f5');
    expect(sch.schemeBg).not.toBe(def.schemeBg);
    // the override paints a real background band (scheme-2 bg); a plain columns
    // (no color-scheme) paints nothing.
    expect(sch.bg).toBe('rgb(250, 248, 245)');
    expect(def.bg).toBe('rgba(0, 0, 0, 0)');
  });

  // ── content_width ─────────────────────────────────────────────────────────
  test('content_width caps the block (--content-width + max-inline-size)', async ({ page }) => {
    const c = await readCols(page, 'Capped columns A');
    expect(c.contentWidth).toBe('42.5rem');
    expect(c.maxInline).toBe('680px');
  });

  // ── Recursion ─────────────────────────────────────────────────────────────
  test('recursive nesting: columns inside columns, each with its own ratio', async ({ page }) => {
    const r = await page.getByText('Nested inner left', { exact: true }).evaluate((el) => {
      const inner = el.closest('.shopify-block--columns');
      const outer = inner.parentElement.closest('.shopify-block--columns');
      return {
        distinct: inner !== outer && outer.contains(inner),
        innerVar: getComputedStyle(inner).getPropertyValue('--grid-template-columns').trim(),
        outerVar: getComputedStyle(outer).getPropertyValue('--grid-template-columns').trim(),
        innerWidth: Math.round(inner.getBoundingClientRect().width),
      };
    });
    expect(r.distinct).toBe(true);
    // a block-level nested columns sizes to its grid cell (no content-collapse),
    // so the named container has real width.
    expect(r.innerWidth).toBeGreaterThan(0);
    expect(r.outerVar).toBe('repeat(2, 1fr)');
    expect(r.innerVar).toBe('1fr 2fr');
  });

  // ── Child fill (regression: richtext/title margin-inline:auto) ────────────
  test('an uncapped richtext child fills its grid track (does not shrink to content)', async ({ page }) => {
    const r = await page.getByText('Equal-2 first', { exact: true }).evaluate((el) => {
      const rt = el.closest('.shopify-block--richtext');
      const tl = rt.closest('token-layout');
      const trackCount = getComputedStyle(tl).gridTemplateColumns.split(' ').length;
      const expectedTrack = tl.getBoundingClientRect().width / trackCount;
      return { rtWidth: rt.getBoundingClientRect().width, expectedTrack };
    });
    // an uncapped richtext (no content_width) must stretch to its 1fr track, not
    // collapse to its text width — guards snippet/richtext.liquid v1.2.2 (auto
    // margins emitted only when capped). Allow for the gap eating into the track.
    expect(r.rtWidth).toBeGreaterThan(r.expectedTrack * 0.9);
  });

  // ── Empty ─────────────────────────────────────────────────────────────────
  test('empty columns renders the outer + token-layout wrapper with no children', async ({ page }) => {
    const r = await page.evaluate(() => {
      const empties = [...document.querySelectorAll('.shopify-block--columns')].filter((c) => {
        const tl = c.querySelector(':scope > token-layout');
        return tl && tl.children.length === 0;
      });
      const c = empties[0];
      return {
        count: empties.length,
        isColumns: !!c && c.classList.contains('shopify-block--columns'),
        mods: c?.getAttribute('data-modifiers'),
        childCount: c?.querySelector(':scope > token-layout')?.children.length,
      };
    });
    expect(r.count).toBe(1);
    expect(r.isColumns).toBe(true);
    expect(r.mods).toContain('columns:2');
    expect(r.childCount).toBe(0);
  });

  // ── Top-spacing overrides (absolute custom properties) ────────────────────
  test('top-spacing overrides emit absolute margin custom properties (loose + tight)', async ({ page }) => {
    const loose = await readCols(page, 'After 64px desktop margin (cols)');
    expect(loose.mobileMargin).toBe('1.0rem');
    expect(loose.desktopMargin).toBe('4.0rem');
    const tight = await readCols(page, 'Tighter than rhythm (cols)');
    expect(tight.mobileMargin).toBe('0.5rem');
    expect(tight.desktopMargin).toBe('1.0rem');
  });
});
