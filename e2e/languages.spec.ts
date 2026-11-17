import { expect, test } from '@playwright/test';
import { getDirection, locales } from '../src/lib/i18n/locales';

test.describe('languages', () => {
  for (const locale of locales) {
    test(`the home page renders in ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', locale);
      await expect(html).toHaveAttribute('dir', getDirection(locale));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }

  test('the language switcher keeps the page and flips the direction', async ({
    page,
  }) => {
    await page.goto('/en/claims');
    await page.getByLabel('Language').selectOption('fa');
    await expect(page).toHaveURL(/\/fa\/claims/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByLabel('زبان').selectOption('en');
    await expect(page).toHaveURL(/\/en\/claims/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
