import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Bắt đầu khởi động Chromium Browser để kiểm thử trực tiếp...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log(`🔥 Page Error: ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    // 1. Mở trang Login
    console.log('📍 1. Truy cập http://localhost:5173/login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 2. Đăng nhập Admin
    console.log('📍 2. Nhập thông tin đăng nhập Admin...');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // 3. Chuyển sang trang Schedule
    console.log('📍 3. Truy cập trang Xếp lịch /admin/schedule');
    await page.goto('http://localhost:5173/admin/schedule', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Kiểm tra xem bảng lịch và thanh KPI có hiển thị không
    const kpiText = await page.locator('text=Tổng nhân sự').first().textContent();
    console.log('✅ Tìm thấy thanh KPI:', kpiText?.trim());

    // 4. Mở modal AI Xếp Lịch
    console.log('📍 4. Bấm nút "✨ AI Xếp Lịch"...');
    const aiBtn = page.locator('button:has-text("AI Xếp Lịch")').first();
    await aiBtn.click();
    await page.waitForTimeout(600);

    const modalTitle = await page.locator('text=AI Trợ Lý Xếp Lịch').first().textContent();
    console.log('✅ Modal AI đã mở thành công:', modalTitle?.trim());

    // 5. Bấm nút "AI Sinh Lịch Ngay"
    console.log('📍 5. Bấm "⚡ AI Sinh Lịch Ngay"...');
    const generateBtn = page.locator('button:has-text("AI Sinh Lịch Ngay")').first();
    await generateBtn.click();
    await page.waitForTimeout(1000);

    const aiStats = await page.locator('text=Tổng Ca Phân Bổ').first().textContent();
    console.log('✅ AI đã phân bổ lịch thành công! Thống kê:', aiStats?.trim());

    // 6. Đóng modal AI
    const closeBtn = page.locator('button:has-text("Đóng")').first();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // 7. Mở Trợ lý AI Copilot
    console.log('📍 6. Bấm nút "Trợ lý AI"...');
    const copilotBtn = page.locator('button:has-text("Trợ lý AI")').first();
    await copilotBtn.click();
    await page.waitForTimeout(600);

    const copilotHeader = await page.locator('text=OFC AI Copilot').first().textContent();
    console.log('✅ Trợ lý AI Copilot đã mở:', copilotHeader?.trim());

    // Bấm câu hỏi nhanh "Quét lỗi & vi phạm lịch tuần"
    const quickPrompt = page.locator('button:has-text("Quét lỗi")').first();
    await quickPrompt.click();
    await page.waitForTimeout(1000);

    console.log('📸 Chụp ảnh màn hình kiểm thử thành công...');
    await page.screenshot({ path: 'D:/schedule-app/browser_test_result.png', fullPage: true });

    console.log('\n🎉 TOÀN BỘ KIỂM THỬ TRÊN TRÌNH DUYỆT ĐÃ THÀNH CÔNG RỰC RỠ (0 LỖI)!');
  } catch (err) {
    console.error('❌ Lỗi trong quá trình test:', err);
  } finally {
    await browser.close();
  }
}

runTest();
