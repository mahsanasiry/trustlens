import { expect, test, type Page } from '@playwright/test';

// The seed script creates these accounts with a public password. See
// docs/auth.md; the values are not secrets.
const password = process.env.E2E_DEMO_PASSWORD ?? 'TrustLens-Demo-2026';

async function signIn(page: Page, email: string, secret = password) {
  await page.goto('/en/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(secret);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('signed out', () => {
  for (const path of [
    'studio',
    'review',
    'bookmarks',
    'collections',
    'reports',
    'profile',
  ]) {
    test(`/${path} sends a visitor to sign in`, async ({ page }) => {
      await page.goto(`/en/${path}`);
      await expect(page).toHaveURL(/\/en\/sign-in/);
    });
  }

  test('a wrong password is explained', async ({ page }) => {
    await signIn(page, 'member@demo.trustlens.example', 'not-the-password');
    // Next.js keeps its own empty role="alert" element for route changes, so the
    // message is found by its text instead.
    await expect(page.getByText('The email or password is not correct.')).toBeVisible();
  });

  test('an empty form asks for the missing values', async ({ page }) => {
    await page.goto('/en/sign-in');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Enter your password.')).toBeVisible();
  });
});

test.describe('roles', () => {
  test('a researcher reaches the studio and can sign out', async ({ page }) => {
    await signIn(page, 'researcher@demo.trustlens.example');
    const menu = page.getByRole('button', { name: /Signed in as/ });
    await expect(menu).toBeVisible();

    await menu.click();
    await page.getByRole('link', { name: 'Studio' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Studio' })).toBeVisible();

    await menu.click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('a researcher cannot open the review queue', async ({ page }) => {
    await signIn(page, 'researcher@demo.trustlens.example');
    await expect(page.getByRole('button', { name: /Signed in as/ })).toBeVisible();
    const response = await page.goto('/en/review');
    expect(response?.status()).toBe(404);
  });

  test('a member has no studio', async ({ page }) => {
    await signIn(page, 'member@demo.trustlens.example');
    await expect(page.getByRole('button', { name: /Signed in as/ })).toBeVisible();
    const response = await page.goto('/en/studio');
    expect(response?.status()).toBe(404);
  });

  test('an administrator opens the review queue', async ({ page }) => {
    await signIn(page, 'admin@demo.trustlens.example');
    await expect(page.getByRole('button', { name: /Signed in as/ })).toBeVisible();
    await page.goto('/en/review');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Review queue' }),
    ).toBeVisible();
  });

  test('a member can save a claim, find it in the list and remove it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page, 'member@demo.trustlens.example');
    await expect(page.getByRole('button', { name: /Signed in as/ })).toBeVisible();

    await page.goto('/en/claims');
    await page.locator('.claim-card__link').first().click();
    // The link is followed in the browser, so the address changes a moment after
    // the click. Read it only once it points at the claim itself.
    await expect(page).toHaveURL(/\/en\/claims\/[0-9a-f-]{36}/);
    const claimUrl = page.url();
    const title = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
    expect(title).not.toBe('');

    const save = page.getByRole('button', { name: 'Save', exact: true });
    const remove = page.getByRole('button', { name: 'Remove from saved', exact: true });

    // A previous run may have been interrupted with the claim still saved. The
    // button is not there the instant the page opens, so wait for either one
    // before deciding which state this claim is in.
    await expect(save.or(remove)).toBeVisible();
    if (await remove.isVisible()) {
      await remove.click();
      await expect(save).toBeVisible();
    }

    await save.click();
    await expect(remove).toBeVisible();

    await page.goto('/en/bookmarks');
    await expect(page.getByRole('link', { name: title })).toBeVisible();

    await page.goto(claimUrl);
    await remove.click();
    await expect(save).toBeVisible();
  });
});
