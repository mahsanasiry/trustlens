import { expect, test } from '@playwright/test';

test.describe('public pages', () => {
  test('the root address leads to the English home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Account' })).toBeVisible();
  });

  test('the skip link is the first thing a keyboard reaches', async ({ page }) => {
    await page.goto('/en');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });

  test('claims can be listed, paged and filtered', async ({ page }) => {
    await page.goto('/en/claims');
    await expect(page.getByRole('heading', { level: 1, name: 'Claims' })).toBeVisible();
    await expect(page.getByRole('status').first()).toContainText(/Claims found: [1-9]/);

    const cards = page.locator('.claim-card');
    await expect(cards.first()).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Pages' })
      .getByRole('link', { name: 'Next' })
      .click();
    await expect(page).toHaveURL(/page=2/);
    await expect(cards.first()).toBeVisible();

    await page.goto('/en/claims');
    await page.getByLabel('Category').selectOption('science');
    await page.getByRole('button', { name: 'Show claims' }).click();
    await expect(page).toHaveURL(/category=science/);
    const categories = page.locator('.claim-card__category');
    await expect(categories.first()).toBeVisible();
    for (const text of await categories.allTextContents()) expect(text).toBe('Science');
  });

  test('a claim shows its evidence and says it is not a verdict', async ({ page }) => {
    await page.goto('/en/claims');
    await page.locator('.claim-card__link').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Evidence' })).toBeVisible();
    await expect(
      page.getByText('never says whether a claim is true or false'),
    ).toBeVisible();
  });

  test('sources can be listed and opened', async ({ page }) => {
    await page.goto('/en/sources');
    await expect(page.getByRole('heading', { level: 1, name: 'Sources' })).toBeVisible();
    await page.locator('.claim-card__link').first().click();
    await expect(page).toHaveURL(/\/en\/sources\/[0-9a-f-]{36}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('search finds published content and rejects one-letter queries', async ({
    page,
  }) => {
    await page.goto('/en/search');
    await page.getByLabel('Search claims and sources').fill('Brightwater');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('status').first()).toContainText(/Results found: [1-9]/);

    await page.goto('/en/search?q=a');
    await expect(page.getByText('Enter at least two characters.')).toBeVisible();
  });

  test('an unknown claim is a 404 page', async ({ page }) => {
    const response = await page.goto('/en/claims/00000000-0000-4000-8000-000000000000');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('the theme choice is applied and remembered', async ({ page }) => {
    await page.goto('/en');
    const theme = page.getByRole('group', { name: 'Theme' });
    await theme.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await theme.getByRole('button', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
