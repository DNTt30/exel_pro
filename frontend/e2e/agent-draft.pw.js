import { test, expect } from '@playwright/test';

test('bot đọc nhân viên, xem lịch và lưu nháp tuần tiếp theo; chạy lại không trùng', async ({ page }) => {
  const external = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') { external.push(url.origin); return route.abort(); }
    return route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lịch Ca · Môi trường thử cho bot' })).toBeVisible();
  const employeeRows = page.getByTestId('employee-list').locator('tbody tr');
  await expect(employeeRows).toHaveCount(5);
  const ids = await employeeRows.locator('th').allTextContents();
  expect(new Set(ids).size).toBe(5);
  const original = await page.getByTestId('current-schedule').innerText();
  expect(original).toContain('6-14');
  for (let run = 0; run < 2; run++) {
    await page.getByTestId('open-scheduler').click();
    await page.getByTestId('load-draft').click();
    await expect(page.getByTestId('draft-status')).toContainText(run ? 'Đã mở bản nháp đã lưu' : 'Chưa có bản nháp');
    await page.getByTestId('generate-draft').click();
    await expect(page.getByTestId('draft-editor')).toBeVisible();
    await expect(page.getByTestId('draft-validation')).toContainText('Đủ người theo nhu cầu');
    // Inspect UI selections, independently count staffing and each employee's shifts.
    const totals = Array(7).fill(0);
    for (const id of ids) {
      const values = await page.getByTestId(`draft-employee-${id}`).locator('select').evaluateAll(nodes => nodes.map(node => node.value));
      expect(values.filter(value => value === 'selected')).toHaveLength(6);
      values.forEach((value, day) => { if (value === 'selected') totals[day]++; });
    }
    expect(totals).toEqual([4, 4, 4, 4, 4, 5, 5]);
    await expect(page.getByTestId('apply-draft')).toHaveCount(0);
    await page.getByTestId('save-draft').click();
    await expect(page.getByTestId('draft-status')).toContainText('Đã lưu bản nháp');
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.reload();
    await expect(page.getByTestId('current-schedule')).toBeVisible();
    expect(await page.getByTestId('current-schedule').innerText()).toBe(original);
  }
  // Reopen from persisted storage through the UI, then edit and reload again.
  await page.getByTestId('open-scheduler').click();
  await page.getByTestId('load-draft').click();
  await expect(page.getByTestId('draft-status')).toContainText('phiên bản 2');
  const cell = page.getByTestId(`draft-cell-${ids[0]}-T7`);
  await cell.selectOption('registered');
  await expect(page.getByTestId('draft-validation')).toContainText('khung giờ thiếu người');
  await cell.selectOption('selected');
  await page.getByTestId('save-draft').click();
  await expect(page.getByTestId('draft-status')).toContainText('phiên bản 3');
  // Storage inspection supplements UI checks; it is never used to seed or change a draft.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('agent-sandbox-drafts-v1')));
  expect(Object.keys(stored)).toEqual(['TEST01:2026-10-26']);
  await page.screenshot({ path: `../artifacts/agent-playwright/${test.info().project.name}-draft.png` });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('nêu rõ thiếu nhân sự khi giới hạn ca không đủ; giữ lỗi lưu để thử lại', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-scheduler').click();
  await page.getByText('Nhu cầu nhân sự & ghi chú', { exact: true }).click();
  await page.getByTestId('max-shifts').fill('1');
  await page.getByTestId('generate-draft').click();
  await expect(page.getByTestId('draft-validation')).toContainText('khung giờ thiếu người');
  await page.getByText('Vì sao còn thiếu?', { exact: true }).first().click();
  await expect(page.getByText(/đạt giới hạn 1 ca/).first()).toBeVisible();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Hết dung lượng thử', 'QuotaExceededError'); }; });
  await page.getByTestId('save-draft').click();
  await expect(page.getByRole('alert')).toContainText('Hết dung lượng thử');
  await expect(page.getByTestId('draft-status')).not.toContainText('Đã lưu');
});


test('quỹ giờ 224h giới hạn bản nháp và hiển thị thiếu định biên', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Cấu hình cửa hàng thử', { exact: true }).click();
  await page.getByTestId('store-weekly-hours-limit').fill('224');
  await page.getByTestId('open-scheduler').click();
  await page.getByTestId('generate-draft').click();
  await expect(page.getByTestId('store-hours-budget')).toContainText('Còn 0h');
  await expect(page.getByTestId('draft-validation')).toContainText('khung giờ thiếu người');
  await page.getByText('Vì sao còn thiếu?', { exact: true }).first().click();
  await expect(page.getByText(/vượt quỹ giờ cửa hàng 224h/).first()).toBeVisible();
  await page.getByTestId('save-draft').click();
  await expect(page.getByTestId('draft-status')).toContainText('Đã lưu bản nháp');
  await page.getByTestId('load-draft').click();
  await expect(page.getByTestId('store-hours-budget')).toContainText('Còn 0h');
  await page.getByTestId('store-hours-budget').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `../artifacts/agent-playwright/${test.info().project.name}-budget.png` });
});
