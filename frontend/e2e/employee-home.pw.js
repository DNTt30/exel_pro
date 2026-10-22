import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-10-22T10:00:00+07:00')); });
test('trang chủ tách giờ đăng ký, giờ đã xếp, OFF và mở đúng luồng đăng ký', async ({ page }, info) => {
  await page.goto('/?preview=home');
  await expect(page.getByTestId('employee-home')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
  await expect(page.getByTestId('registered-hours')).toContainText('24');
  await expect(page.getByTestId('registered-days')).toContainText('3');
  await expect(page.getByTestId('assigned-hours')).toContainText('8');
  await expect(page.getByTestId('blank-days')).toContainText('1');
  await expect(page.getByTestId('blank-days')).toContainText('2 ngày OFF');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `../artifacts/agent-playwright/${info.project.name}-employee-home.png` });
  await page.getByRole('button', { name: 'Đăng ký tuần sau', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lịch của tôi', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
test('lỗi tải lịch không được hiện thành số 0 và có nút thử lại', async ({ page }) => {
  await page.goto('/?preview=home&failSchedule=1');
  await expect(page.getByRole('alert')).toContainText('Chưa tải được lịch', { timeout: 20000 });
  await expect(page.getByTestId('registered-hours')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
});
