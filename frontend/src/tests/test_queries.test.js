import { askAICopilot } from '../utils/aiSchedulerEngine.js';

const mockContext = {
  storeId: 'VN0485',
  currentWeek: '2026-08-10',
  employees: [
    { id: '260716009', name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485', type: 'STFT' },
    { id: '123', name: 'NGUYỄN VĂN A', dept: 'VN0485', type: 'STPT' },
    { id: '456', name: 'CSR_NEW 1', dept: 'VN0485', type: 'STPT', role: 'Thử việc' },
    { id: '789', name: 'TRẦN THỊ B', dept: 'VN0485', type: 'STPT', role: 'Bạn cứng' }
  ],
  weekSchedule: {
    '260716009': { T2: 'OFF', T3: '6-14', T4: '14-22', T5: '14-22', T6: '6-14', T7: '6-14', CN: '6-14' }
  },
  schedule: {},
  stores: [ { id: 'VN0485', name: 'Cửa hàng 0485' } ],
  shiftSwaps: [
    { status: 'pending', requester_id: '123', target_id: '456', requester_shift: '6-14', target_shift: '14-22', date: 'T3' }
  ],
  feedbacks: []
};

const testQueries = [
  // Lịch cá nhân
  "Tú mai làm ca mấy giờ?",
  // Giờ nghỉ / Chế độ
  "Ca đêm được nghỉ mấy phút?",
  "Nghỉ giữa 2 ca tối thiểu bao lâu?",
  "Làm ca đêm có được thêm tiền không?",
  // Quy định
  "Part time một tuần làm tối đa bao nhiêu tiếng?",
  "Nhân viên mới có được làm ca 1 mình không?",
  "Fulltime một tuần được nghỉ mấy ngày?",
  // Đơn từ
  "Có đơn đổi ca nào cần duyệt không?",
  // Lỗi & Cảnh báo
  "Kiểm tra xem lịch tuần này có lỗi gì không?",
  // Thời gian thực
  "Hôm nay ngày mấy?",
  "Mai là thứ mấy?",
  // Lịch theo ngày
  "Thứ 3 này ai làm?",
  // Câu hỏi "bẫy"
  "Tú hôm nay đẹp trai thế nhờ"
];

import { test } from 'vitest';

test('Test common AI queries', () => {
  console.error("\n=== BẮT ĐẦU TEST CÁC CÂU HỎI THƯỜNG GẶP ===\n");
  testQueries.forEach((q, idx) => {
    console.error(`\n[Câu ${idx + 1}] User: "${q}"`);
    const reply = askAICopilot(q.toLowerCase(), mockContext);
    console.error(`AI: ${reply.replace(/\n/g, ' ')}`); // flatten lines for easier reading in terminal
    console.error("-".repeat(80));
  });
});
