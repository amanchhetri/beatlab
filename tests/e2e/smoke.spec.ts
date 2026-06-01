import { test, expect } from '@playwright/test';

test('boots, lights steps, plays, persists across refresh', async ({ page }) => {
  await page.goto('/');

  // Start gate visible
  const startBtn = page.getByRole('button', { name: /tap to start/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // App shell appears
  await expect(page.locator('.transport-bar')).toBeVisible();
  await expect(page.locator('.channel-rack')).toBeVisible();
  await expect(page.locator('.playlist')).toBeVisible();

  // Light step 0 of the kick row (first row in the channel rack)
  const kickRow = page.locator('.rack-row').first();
  const firstStep = kickRow.locator('.step-cell').first();
  await firstStep.click();
  await expect(firstStep).toHaveClass(/is-lit/);

  // Play / stop
  await page.getByRole('button', { name: /play/i }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /stop/i }).click();

  // Refresh and check persistence
  await page.reload();
  await page.getByRole('button', { name: /tap to start/i }).click();
  const persistedFirstStep = page.locator('.rack-row').first().locator('.step-cell').first();
  await expect(persistedFirstStep).toHaveClass(/is-lit/);
});
