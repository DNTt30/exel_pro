import { test, expect } from '@playwright/test';

test('tính nhanh tỷ lệ cà phê và công thức tùy chỉnh', async ({page}) => {
  await page.goto('/');
  const calculator = page.getByTestId('recipe-calculator');
  await calculator.getByTestId('recipe-choice').selectOption('custom');
  await expect(calculator.getByTestId('recipe-result')).toContainText('180 ml');
  await expect(calculator.getByTestId('recipe-result')).toContainText('260 ml');
  await calculator.getByTestId('recipe-target').fill('40');
  await expect(calculator.getByTestId('recipe-result')).toContainText('90 ml');
  await calculator.getByTestId('recipe-base').fill('10');
  await expect(calculator.getByTestId('recipe-result')).toContainText('180 ml');
  await calculator.getByTestId('recipe-target').fill('0');
  await expect(calculator.getByRole('alert')).toBeVisible();
  await expect(calculator.getByTestId('recipe-result')).toHaveCount(0);
  await calculator.getByTestId('recipe-target').fill('80,5');
  await expect(calculator.getByTestId('recipe-result')).toContainText('362,25 ml');
  await calculator.screenshot({path:`../artifacts/agent-playwright/${test.info().project.name}-recipe.png`});
});

test('chọn công thức đã duyệt, sửa tạm, khôi phục và nhớ món gần đây', async ({page}) => {
  await page.goto('/');
  const calc = page.getByTestId('recipe-calculator');
  await calc.getByTestId('recipe-choice').selectOption('sample-milo');
  await expect(calc.getByTestId('recipe-base')).toBeDisabled();
  await calc.getByLabel('Lượng bột Milo muốn pha (g)').fill('1200');
  await expect(calc.getByTestId('recipe-result')).toContainText('1.600 ml');
  await expect(calc.getByTestId('recipe-result')).toContainText('2.000 ml');
  await calc.getByRole('button',{name:'Điều chỉnh cho lần pha này'}).click();
  await calc.getByLabel('Lượng 1',{exact:true}).fill('900');
  await expect(calc.getByText(/Đã chỉnh so với công thức gốc/)).toBeVisible();
  await calc.getByRole('button',{name:'Khôi phục công thức gốc'}).click();
  await expect(calc.getByTestId('recipe-result')).toContainText('1.600 ml');
  await calc.getByTestId('recipe-choice').selectOption('sample-nestea');
  await calc.getByLabel('Lượng bột Nestea muốn pha (g)').fill('800');
  await expect(calc.getByTestId('recipe-result')).toContainText('6.000 ml');
  await page.reload();
  await expect(calc.getByTestId('recipe-choice')).toHaveValue('sample-nestea');
  await expect(calc.getByTestId('recipe-base')).toHaveValue('400');
  await calc.screenshot({path:`../artifacts/agent-playwright/${test.info().project.name}-recipe-catalog.png`});
});
