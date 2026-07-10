import { test, expect } from '@playwright/test';

// Tier 3 (preset / composition) assertions for the "columns-features" pattern:
// section → columns(3) → 3 × group(column) → media + title + richtext. The
// deepest cross-block cascade in the corpus. A Tier-3 page asserts the
// cascade-APPLIED result; the headline concern is the nested container-query
// (the columns stack against their OWN inline-size, not the viewport) plus the
// group-within-column nesting and the two distinct gap scopes.
//
// Fixture in sections/section--columns-features.validation.json. Media
// uses the placeholder svg (no seeded image needed).

const PATH = '/?view=validation';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
  await page.getByText('Reliable').waitFor();
});

function readCF(page) {
  return page.locator('.shopify-block--columns').first().evaluate((cols) => {
    const colLayout = cols.querySelector(':scope > token-layout');
    const clcs = getComputedStyle(colLayout);
    const groups = [...colLayout.querySelectorAll(':scope > .shopify-block--group')];
    const readGroup = (g) => {
      const gl = g.querySelector(':scope > token-layout');
      const glcs = getComputedStyle(gl);
      const r = g.getBoundingClientRect();
      const kids = [...gl.querySelectorAll(':scope > .shopify-block')];
      const media = gl.querySelector('.shopify-block--media');
      return {
        left: Math.round(r.left),
        top: Math.round(r.top),
        flexDir: glcs.flexDirection,
        gap: glcs.gap,
        title: gl.querySelector('.shopify-block--title')?.textContent.split('#')[0].trim() ?? null,
        hasRichtext: !!gl.querySelector('.shopify-block--richtext'),
        mediaSvg: !!(media && media.querySelector('svg')),
        mediaImg: !!(media && media.querySelector('img')),
        kinds: kids.map((k) => k.className.replace('shopify-block shopify-block--', '')),
        kidTops: kids.map((k) => Math.round(k.getBoundingClientRect().top)),
      };
    };
    return {
      display: clcs.display,
      trackCount: clcs.gridTemplateColumns.split(' ').length,
      colGap: clcs.gap,
      groups: groups.map(readGroup),
    };
  });
}

test.describe('section--columns-features', () => {
  test('composition tree: 3 feature columns, each a group of media + title + richtext', async ({ page }) => {
    const r = await readCF(page);
    expect(r.groups.length).toBe(3);
    expect(r.groups.map((g) => g.title)).toEqual(['Reliable', 'Fast', 'Flexible']);
    for (const g of r.groups) {
      expect(g.hasRichtext).toBe(true);
      expect(g.mediaSvg).toBe(true); // placeholder svg (no seeded image)
      expect(g.mediaImg).toBe(false);
      expect(g.kinds).toEqual(['media', 'title', 'richtext']);
    }
  });

  test('nested container-query: 3-up when wide, stacked when narrow (block width, not viewport)', async ({
    page,
  }, testInfo) => {
    const r = await readCF(page);
    expect(r.display).toBe('grid');
    const [a, b, c] = r.groups;
    if (testInfo.project.name === 'desktop') {
      // columns ~1232px (≥ 60rem) → 3 tracks side by side
      expect(r.trackCount).toBe(3);
      expect(a.left).toBeLessThan(b.left);
      expect(b.left).toBeLessThan(c.left);
      expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(2); // same row
    } else {
      // columns ~358px (< 60rem) → stacks to 1 track
      expect(r.trackCount).toBe(1);
      expect(Math.abs(a.left - b.left)).toBeLessThanOrEqual(2); // same column
      expect(a.top).toBeLessThan(b.top);
      expect(b.top).toBeLessThan(c.top);
    }
  });

  test('group-within-column nesting: each column stacks media → title → richtext via its own gap', async ({
    page,
  }) => {
    const r = await readCF(page);
    for (const g of r.groups) {
      expect(g.flexDir).toBe('column');
      expect(g.gap).toBe('16px');
      expect(g.kidTops[0]).toBeLessThan(g.kidTops[1]); // media above title
      expect(g.kidTops[1]).toBeLessThan(g.kidTops[2]); // title above richtext
    }
  });

  test('two gap scopes compose: columns track gap (32) is distinct from the inner group gap (16)', async ({
    page,
  }) => {
    const r = await readCF(page);
    expect(r.colGap).toBe('32px'); // between the feature columns
    expect(r.groups[0].gap).toBe('16px'); // inside a feature column
  });
});
