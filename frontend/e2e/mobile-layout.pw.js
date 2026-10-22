import { test, expect } from '@playwright/test';

test('lịch cửa hàng mặc định và tiếng Việt đọc được trên mobile', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?preview=employee');
  await expect(page.getByTestId('store-schedule-tab')).toHaveAttribute('aria-pressed', 'true', { timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Lịch của tôi', exact: true })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const board = page.getByTestId('store-day-schedule');
    await board.getByRole('button', { name: 'T2', exact: true }).click();
    await expect(board.getByRole('row', { name: /Nhân viên mẫu Bình/ })).toContainText('14-22');
    await expect(board.getByRole('row', { name: /Nhân viên mẫu Chi/ })).toContainText('22-6');
    await expect(board.locator('tbody tr')).toHaveCount(5);
    const rect = await board.boundingBox();
    expect(rect.height).toBeGreaterThan(250);
    const nav = await page.getByRole('navigation').boundingBox();
    expect(rect.y + rect.height).toBeLessThanOrEqual(nav.y + 1);
  }
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Lá»|cá»|Ä‘|ðŸ/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `../artifacts/agent-playwright/${testInfo.project.name}-employee-schedule.png` });
  expect(errors).toEqual([]);
});

test('Dashboard mobile có hai cột KPI và không tràn màn hình', async ({ page }, testInfo) => {
  await page.goto('/?preview=dashboard');
  await expect(page.getByRole('heading', { name: /Tổng Quan Quản Trị/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cards = page.getByTestId('dashboard-kpis');
  if (testInfo.project.name === 'mobile') {
    const columns = await cards.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(2);
  }
  await page.screenshot({ path: `../artifacts/agent-playwright/${testInfo.project.name}-dashboard.png` });
});
