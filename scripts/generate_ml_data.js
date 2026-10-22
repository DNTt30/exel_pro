import fs from 'fs';
import path from 'path';

/**
 * Script giả lập dữ liệu lịch sử (Mock Data Generator) cho mô hình ML.
 * ĐÃ FIX LỖI: Date Timezone Mismatch, Data Leakage, Target Labeling, Seeded Random.
 */

const OUTPUT_FILE = path.join(process.cwd(), 'ml_mock_history_VN0485.csv');

// Tham số cấu hình giả lập
const STORE_ID = 'VN0485';
const BASE_DAILY_REVENUE_WEEKDAY = 16500000;
const BASE_DAILY_REVENUE_WEEKEND = 9000000;
const AVG_BILL_VALUE = 45000;

// LCG Seeded Random
let seed = 12345;
function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const SHIFT_RATIOS = {
  'MORNING': 0.45,
  'AFTERNOON': 0.40,
  'NIGHT': 0.15
};

function getRandomFluctuation(baseValue, variancePercent = 0.15) {
  const min = baseValue * (1 - variancePercent);
  const max = baseValue * (1 + variancePercent);
  return Math.floor(seededRandom() * (max - min + 1) + min);
}

function calculateIdealStaff(revenue) {
  if (revenue < 3000000) return 2;
  if (revenue < 6000000) return 3;
  if (revenue < 8500000) return 4;
  return 5;
}

function generateData(daysToGenerate = 180) {
  const data = [];
  data.push('store_id,shift_date,day_of_week,shift_type,is_weekend,is_holiday,has_extreme_weather,shift_revenue_vnd,shift_foot_traffic,ideal_staff_count,assigned_staff_count,is_mock_data');

  // Khởi tạo UTC Date để đồng nhất múi giờ trên mọi máy
  let currentDate = new Date(Date.UTC(2026, 3, 1)); // Tháng 4 là 3 (0-indexed)

  for (let i = 0; i < daysToGenerate; i++) {
    // Luôn dùng các hàm UTC để trích xuất dữ liệu
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    const isHoliday = seededRandom() < 0.03;
    const hasExtremeWeather = seededRandom() < 0.05;

    let dailyRevenue = isWeekend ? BASE_DAILY_REVENUE_WEEKEND : BASE_DAILY_REVENUE_WEEKDAY;
    if (isHoliday) dailyRevenue *= 0.7; 
    if (hasExtremeWeather) dailyRevenue *= 0.6;

    for (const [shiftType, ratio] of Object.entries(SHIFT_RATIOS)) {
      let shiftRevenue = getRandomFluctuation(dailyRevenue * ratio);
      let footTraffic = Math.floor(shiftRevenue / AVG_BILL_VALUE);
      
      const idealStaffCount = calculateIdealStaff(shiftRevenue);
      let assignedStaffCount = idealStaffCount;
      const humanError = seededRandom();
      if (humanError < 0.1 && assignedStaffCount > 2) assignedStaffCount -= 1; 
      if (humanError > 0.9) assignedStaffCount += 1; 

      data.push(`${STORE_ID},${dateStr},${dayOfWeek},${shiftType},${isWeekend},${isHoliday},${hasExtremeWeather},${shiftRevenue},${footTraffic},${idealStaffCount},${assignedStaffCount},true`);
    }

    // Tăng ngày một cách an toàn bằng UTC
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return data.join('\n');
}

const csvData = generateData(180);
fs.writeFileSync(OUTPUT_FILE, csvData, 'utf-8');
console.log(`✅ Đã tạo thành công dữ liệu lịch sử tại: ${OUTPUT_FILE}`);
