import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the title block, converted from
// .context/specs/title.md § Validation. Matrix baked in
// templates/index.validation--primitive--title.json.

const PATH = '/?view=validation--primitive--title';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
});

test.describe('validation--primitive--title', () => {
  const TAGS = [
    ['Heading level 1 — display', 'H1'],
    ['Heading level 2', 'H2'],
    ['Heading level 3', 'H3'],
    ['Heading level 4', 'H4'],
    ['Heading level 5', 'H5'],
    ['Heading level 6', 'H6'],
    ['Paragraph tag — body text style', 'P'],
  ];

  for (const [text, tag] of TAGS) {
    test(`tag setting ${tag} renders a <${tag.toLowerCase()}> element`, async ({ page }) => {
      await expect(page.getByText(text, { exact: true })).toHaveJSProperty('tagName', tag);
    });
  }

  test('default instance (bare h2, no overrides) emits no data-modifiers and carries an id', async ({ page }) => {
    const h2 = page.getByText('Heading level 2', { exact: true });
    expect(await h2.getAttribute('data-modifiers')).toBeNull();
    expect(await h2.getAttribute('id')).toBeTruthy();
  });

  test('bare-tag bindings produce a descending font-size hierarchy (h1 > h2 > h3)', async ({ page }) => {
    const fsOf = (t) =>
      page.getByText(t, { exact: true }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const h1 = await fsOf('Heading level 1 — display');
    const h2 = await fsOf('Heading level 2');
    const h3 = await fsOf('Heading level 3');
    expect(h1).toBeGreaterThan(h2);
    expect(h2).toBeGreaterThan(h3);
  });

  test('text_style override emits the modifier and applies the entry typography over the bare tag', async ({
    page,
  }) => {
    const styled = page.getByText('H3 styled as H1', { exact: true });
    await expect(styled).toHaveJSProperty('tagName', 'H3');
    await expect(styled).toHaveAttribute('data-modifiers', 'text-style:h1');
    const h1fs = await page
      .getByText('Heading level 1 — display', { exact: true })
      .evaluate((el) => getComputedStyle(el).fontSize);
    const styledfs = await styled.evaluate((el) => getComputedStyle(el).fontSize);
    expect(styledfs).toBe(h1fs);
  });

  test('inline rich text is preserved (em / strong / a)', async ({ page }) => {
    const rt = page.getByText('Heading with', { exact: false });
    await expect(rt.locator('em')).toHaveCount(1);
    await expect(rt.locator('strong')).toHaveCount(1);
    await expect(rt.locator('a')).toHaveCount(1);
  });

  test('icon renders as a leading svg', async ({ page }) => {
    const t = page.getByText('Title with icon', { exact: true });
    await expect(t.locator('svg')).toHaveCount(1);
    const first = await t.evaluate((el) => el.firstElementChild?.tagName.toLowerCase());
    expect(first).toBe('svg');
  });

  test('text_align center emits the var and computes center', async ({ page }) => {
    const t = page.getByText('Centered title', { exact: true });
    const r = await t.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { v: cs.getPropertyValue('--text-align').trim(), ta: cs.textAlign };
    });
    expect(r.v).toBe('center');
    expect(r.ta).toBe('center');
  });

  test('text_align end emits the var and computes end', async ({ page }) => {
    const t = page.getByText('End-aligned title', { exact: true });
    const r = await t.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { v: cs.getPropertyValue('--text-align').trim(), ta: cs.textAlign };
    });
    expect(r.v).toBe('end');
    expect(r.ta).toBe('end');
  });

  test('text_color resolves to the theme_color and differs from the default heading color', async ({ page }) => {
    const colored = page.getByText('Accent-colored title', { exact: true });
    const cColor = await colored.evaluate((el) => getComputedStyle(el).color);
    const dColor = await page.getByText('Heading level 2', { exact: true }).evaluate((el) => getComputedStyle(el).color);
    expect(cColor).toBe('rgb(255, 107, 53)');
    expect(cColor).not.toBe(dColor);
  });

  test('content_width caps and centers the title', async ({ page }) => {
    const t = page.getByText('Width-capped title', { exact: false });
    const r = await t.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        cw: cs.getPropertyValue('--content-width').trim(),
        maxInline: cs.maxInlineSize,
        mStart: cs.marginInlineStart,
        mEnd: cs.marginInlineEnd,
      };
    });
    expect(r.cw).toBe('42.5rem');
    expect(r.maxInline).toBe('680px');
    expect(r.mStart).toBe(r.mEnd);
  });

  test('top-spacing emits positive margin custom properties', async ({ page }) => {
    const t = page.getByText('After 64px desktop top margin', { exact: true });
    const r = await t.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        m: cs.getPropertyValue('--mobile-margin-block-start').trim(),
        d: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
    expect(r.m).toBe('1.0rem');
    expect(r.d).toBe('4.0rem');
  });

  test('tighter-than-rhythm override emits an absolute margin below the rhythm', async ({ page }) => {
    const t = page.getByText('Tighter than the rhythm', { exact: false });
    const r = await t.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        m: cs.getPropertyValue('--mobile-margin-block-start').trim(),
        d: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
    expect(r.m).toBe('0.5rem');
    expect(r.d).toBe('1.0rem');
  });

  test('blank-content instance renders no element — no empty title leaks into the suite', async ({ page }) => {
    const titles = page.locator('token-section .shopify-block--title');
    const count = await titles.count();
    // 17 fixtures, minus the blank-content one which breaks before emitting a root.
    expect(count).toBe(16);
    for (let i = 0; i < count; i++) {
      const text = (await titles.nth(i).innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
