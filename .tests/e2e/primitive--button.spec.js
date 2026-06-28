import { test, expect } from '@playwright/test';

// Tier 2 (theme-primitive) assertions for the button block, converted from
// .context/specs/button.md § Validation. The matrix under test is baked in
// templates/index.validation--primitive--button.json.

const PATH = '/?view=validation--primitive--button';

test.beforeEach(async ({ page }) => {
  await page.goto(PATH);
});

test.describe('validation--primitive--button', () => {
  test('unlinked instance renders <button type="button"> with no href', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Submit' });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveJSProperty('tagName', 'BUTTON');
    await expect(btn).toHaveAttribute('type', 'button');
    expect(await btn.getAttribute('href')).toBeNull();
  });

  test('linked instance renders <a> with the configured href', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Read more' });
    await expect(link).toBeVisible();
    await expect(link).toHaveJSProperty('tagName', 'A');
    await expect(link).toHaveAttribute('href', '/');
  });

  test('new-tab instance carries target, rel, and an sr-only new-tab announcement', async ({ page }) => {
    const link = page.getByRole('link', { name: /External site/ });
    await expect(link).toHaveJSProperty('tagName', 'A');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const srOnly = link.locator('span.sr-only');
    await expect(srOnly).toHaveCount(1);
    await expect(srOnly).not.toBeEmpty();
  });

  test('every button preserves the 44px (2.75rem) min touch target', async ({ page }) => {
    const buttons = page.locator('.block-validation-suite .shopify-block--button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const minBlock = await buttons.nth(i).evaluate((el) => getComputedStyle(el).minBlockSize);
      expect(parseFloat(minBlock)).toBeGreaterThanOrEqual(44);
    }
  });

  test('icon-end instance carries the modifier and computes row-reverse', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Icon trails' });
    await expect(link).toHaveAttribute('data-modifiers', /icon-position:end/);
    await expect(link.locator('svg')).toHaveCount(1);
    await expect(link).toHaveCSS('flex-direction', 'row-reverse');
  });

  test('link-family instance keeps the 44px min touch target with zero padding', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Link style' });
    await expect(link).toHaveAttribute('data-modifiers', /button-style:link-primary/);
    const { minBlock, padTop } = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { minBlock: cs.minBlockSize, padTop: cs.paddingTop };
    });
    expect(parseFloat(minBlock)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(padTop)).toBe(0);
  });

  // Top-spacing is asserted at the EMIT level: the block's Tier-2 API is emitting the
  // margin custom properties (16px->1rem, 64px->4rem). Whether they paint as a margin
  // depends on the theme-root rhythm rule, which only matches direct children of
  // token-section — a section/preset-tier (Tier 3) concern, not the block's own API.
  test('top-spacing instance emits the per-breakpoint margin custom properties', async ({ page }) => {
    const link = page.getByRole('link', { name: /After 64px/ });
    const vars = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        mobile: cs.getPropertyValue('--mobile-margin-block-start').trim(),
        desktop: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
    expect(vars.mobile).toBe('1.0rem');
    expect(vars.desktop).toBe('4.0rem');
  });

  test('default instance (no style, no icon, no spacing) emits no data-modifiers and no margin vars', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Read more' });
    expect(await link.getAttribute('data-modifiers')).toBeNull();
    expect(await link.getAttribute('id')).toBeTruthy();
    const margins = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        mobile: cs.getPropertyValue('--mobile-margin-block-start').trim(),
        desktop: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
    expect(margins.mobile).toBe('');
    expect(margins.desktop).toBe('');
  });

  test('icon-start instance emits no icon-position modifier and the icon leads the label', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Icon leads' });
    expect(await link.getAttribute('data-modifiers')).toBeNull();
    await expect(link.locator('svg')).toHaveCount(1);
    const firstChildTag = await link.evaluate((el) => el.firstElementChild?.tagName.toLowerCase());
    expect(firstChildTag).toBe('svg');
    await expect(link).toHaveCSS('flex-direction', 'row');
  });

  test('content is escaped — HTML in the label renders as text, not markup', async ({ page }) => {
    const link = page.getByRole('link', { name: /Save/ });
    await expect(link.locator('b')).toHaveCount(0);
    expect(await link.innerText()).toContain('<b>50%</b>');
  });

  test('content_width instance emits and applies the --content-width cap', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Capped width' });
    const { cw, maxInline } = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { cw: cs.getPropertyValue('--content-width').trim(), maxInline: cs.maxInlineSize };
    });
    expect(cw).toBe('42.5rem');
    expect(maxInline).toBe('680px');
  });

  test('tighter-than-rhythm override emits an absolute margin below the rhythm', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Tight spacing' });
    const vars = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        mobile: cs.getPropertyValue('--mobile-margin-block-start').trim(),
        desktop: cs.getPropertyValue('--desktop-margin-block-start').trim(),
      };
    });
    expect(vars.mobile).toBe('0.5rem');
    expect(vars.desktop).toBe('1.0rem');
  });

  test('two-token instance comma-joins button-style and icon-position modifiers', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Combo' });
    await expect(link).toHaveAttribute('data-modifiers', 'button-style:outline-primary,icon-position:end');
  });

  test('href is escaped — a hostile link value stays contained in the href attribute', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Escaped href' });
    expect(await link.getAttribute('href')).toBe('/x" data-x="y');
    expect(await link.getAttribute('data-x')).toBeNull();
  });

  test('blank-content instance renders no element — no empty button leaks into the suite', async ({ page }) => {
    const buttons = page.locator('.block-validation-suite .shopify-block--button');
    const count = await buttons.count();
    // 13 fixtures, minus the blank-content one which breaks before emitting a root.
    expect(count).toBe(12);
    for (let i = 0; i < count; i++) {
      const text = (await buttons.nth(i).innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
