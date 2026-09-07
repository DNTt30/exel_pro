import { askAICopilot } from '../utils/aiSchedulerEngine.js';
import { test, expect } from 'vitest';

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
    '260716009': { T2: 'OFF', T3: '6-14', T4: '14-22', T5: '14-22', T6: '6-14', T7: '6-14', CN: '6-14' },
    '123': { T2: '14-22', T3: '6-14', T4: '6-14' },
    '456': { T3: '14-22', T5: '6-14' },
    '789': { T6: '14-22' }
  },
  schedule: {},
  stores: [ { id: 'VN0485', name: 'Cửa hàng 0485' } ],
  shiftSwaps: [
    { status: 'pending', requester_id: '123', target_id: '456', requester_shift: '6-14', target_shift: '14-22', date: 'T3' }
  ],
  feedbacks: []
};

const loggedInContext = {
  ...mockContext,
  user: mockContext.employees[0] // DƯƠNG NGỌC TÚ
};

const testQueries = [
  // Lịch cá nhân & Xưng hô
  "Tú mai làm ca mấy giờ?",
  "Mai em làm mấy giờ?",
  "Chị có làm ca 22-6 hôm nào không?",
  "Tuần này tao làm tổng bao nhiêu tiếng?",
  "Thứ 6 em có được nghỉ không?",
  "Thứ 2 em có được nghỉ không?",
  "Thứ 3 ai làm cùng ca với em?",
  // Giờ hủy từng món cụ thể
  "Mấy giờ hủy sandwich có rau?",
  "Burger hủy lúc mấy giờ?",
  "Gimbap hủy lúc nào?",
  "Onigiri hủy mấy giờ?",
  "Khi nào hủy sushi?",
  "Bento hủy lúc mấy giờ?",
  "Sandwich không rau hủy lúc nào?",
  "Mì hộp hủy lúc mấy giờ?",
  "Khi nào hủy hàng tươi?",
  "Hàng GM hủy khi nào?",
  // Công thức & SOP
  "Công thức mì tương đen",
  "Nấu lẩu chả cá bao nhiêu nước?",
  "Lò vi sóng ly chả cá bấm số mấy?",
  "Lò vi sóng tô mì chả cá bấm số mấy?",
  "Công thức nấu súp",
  // Quy định & Lương
  "Lương ca đêm tính sao?",
  "Part time một tuần làm tối đa bao nhiêu tiếng?",
  "Làm thêm ngày lễ tết được bao nhiêu phần trăm lương?",
  "Nghỉ giữa 2 ca tối thiểu bao lâu?",
  "Nhân viên mới có được làm ca 1 mình không?",
  "Fulltime một tuần được nghỉ mấy ngày?",
  // Đơn từ & Lịch
  "Có đơn đổi ca nào cần duyệt không?",
  "Kiểm tra xem lịch tuần này có lỗi gì không?",
  "Thứ 3 này ai làm?",
  // Câu hỏi bẫy từ khóa
  "Công việc dạo này ổn định không Tú?",
  "Tú hôm nay đẹp trai thế nhờ"
];

test('Test common AI queries output logging', () => {
  console.error("\n=== BẮT ĐẦU TEST CÁC CÂU HỎI THƯỜNG GẶP ===\n");
  testQueries.forEach((q, idx) => {
    const reply = askAICopilot(q, loggedInContext);
    console.error(`\n[Câu ${idx + 1}] User: "${q}"`);
    console.error(`AI: ${reply.replace(/\n/g, ' ')}`);
    console.error("-".repeat(80));
  });
});

test('1. Đại từ nhân xưng tiếng Việt & Lịch cá nhân', () => {
  // Em
  const rEm = askAICopilot('Mai em làm mấy giờ?', loggedInContext);
  expect(rEm).toContain('DƯƠNG NGỌC TÚ');

  // Chị + 22-6
  const rChi = askAICopilot('Chị có làm ca 22-6 hôm nào không?', loggedInContext);
  expect(rChi).toContain('KHÔNG có ca đêm');

  // Tao + tổng tiếng
  const rTao = askAICopilot('Tuần này tao làm tổng bao nhiêu tiếng?', loggedInContext);
  expect(rTao).toContain('48h');

  // Tớ
  const rTo = askAICopilot('Tuần này tớ làm bao nhiêu tiếng?', loggedInContext);
  expect(rTo).toContain('48h');

  // Bản thân / Tôi
  const rToi = askAICopilot('Lương tuần này của tôi bao nhiêu?', loggedInContext);
  expect(rToi).toContain('DƯƠNG NGỌC TÚ');
  expect(rToi).toContain('48h');

  // Thứ 6 em có được nghỉ không? (T6 có ca 6-14 -> không được nghỉ)
  const rOffT6 = askAICopilot('Thứ 6 em có được nghỉ không?', loggedInContext);
  expect(rOffT6).toContain('T6');
  expect(rOffT6).toContain('6-14');
  expect(rOffT6).toContain('không được nghỉ');

  // Thứ 2 em có được nghỉ không? (T2 là OFF -> được nghỉ)
  const rOffT2 = askAICopilot('Thứ 2 em có được nghỉ không?', loggedInContext);
  expect(rOffT2).toContain('T2');
  expect(rOffT2).toContain('OFF');
  expect(rOffT2).toContain('được nghỉ');

  // Hôm nay ai làm cùng ca với em? / Thứ 3 ai làm cùng ca với em?
  const rCungCaT3 = askAICopilot('Thứ 3 ai làm cùng ca với em?', loggedInContext);
  expect(rCungCaT3).toContain('NGUYỄN VĂN A');
  expect(rCungCaT3).toContain('6-14');
});

test('2. Giờ hủy từng món cụ thể (ngắn gọn, đúng trọng tâm)', () => {
  // Sandwich có rau -> 11:00 & 22:00, không tuôn burger/gimbap
  const rSandwichRau = askAICopilot('Mấy giờ hủy sandwich có rau?', loggedInContext);
  expect(rSandwichRau).toContain('11:00');
  expect(rSandwichRau).toContain('22:00');
  expect(rSandwichRau).toContain('Sandwich có rau');
  expect(rSandwichRau).not.toContain('Burger');

  // Burger -> 11:00 & 22:00
  const rBurger = askAICopilot('Burger hủy lúc mấy giờ?', loggedInContext);
  expect(rBurger).toContain('11:00');
  expect(rBurger).toContain('22:00');
  expect(rBurger).toContain('Burger');
  expect(rBurger).not.toContain('Cơm nắm');

  // Gimbap -> 11:00 & 22:00
  const rGimbap = askAICopilot('Gimbap hủy lúc nào?', loggedInContext);
  expect(rGimbap).toContain('11:00');
  expect(rGimbap).toContain('22:00');
  expect(rGimbap).toContain('Gimbap');

  // Onigiri -> 19:00
  const rOnigiri = askAICopilot('Onigiri hủy mấy giờ?', loggedInContext);
  expect(rOnigiri).toContain('19:00');
  expect(rOnigiri).toContain('Onigiri');

  // Sushi -> 19:00
  const rSushi = askAICopilot('Khi nào hủy sushi?', loggedInContext);
  expect(rSushi).toContain('19:00');
  expect(rSushi).toContain('Sushi');

  // Bento -> 19:00
  const rBento = askAICopilot('Bento hủy lúc mấy giờ?', loggedInContext);
  expect(rBento).toContain('19:00');
  expect(rBento).toContain('Bento');

  // Sandwich không rau -> 19:00
  const rSandwichKoRau = askAICopilot('Sandwich không rau hủy lúc nào?', loggedInContext);
  expect(rSandwichKoRau).toContain('19:00');
  expect(rSandwichKoRau).toContain('Sandwich không rau');

  // Mì hộp -> 19:00
  const rMiHop = askAICopilot('Mì hộp hủy lúc mấy giờ?', loggedInContext);
  expect(rMiHop).toContain('19:00');
  expect(rMiHop).toContain('Mì hộp');

  // Hàng tươi -> 11:00 & 22:00
  const rHangTuoi = askAICopilot('Khi nào hủy hàng tươi?', loggedInContext);
  expect(rHangTuoi).toContain('11:00');
  expect(rHangTuoi).toContain('22:00');

  // Hàng GM -> HSD ≤ 7 ngày hủy trước 2h
  const rGM = askAICopilot('Hàng GM hủy khi nào?', loggedInContext);
  expect(rGM).toContain('HSD ≤ 7 ngày');
});

test('3. Công thức & SOP món', () => {
  // Mì tương đen
  const rMiTuongDen = askAICopilot('Công thức mì tương đen', loggedInContext);
  expect(rMiTuongDen).toContain('tương đen');
  expect(rMiTuongDen).toContain('Koreno');

  // Nấu lẩu chả cá bao nhiêu nước? -> 2000ml / 2 lít
  const rNuocLau = askAICopilot('Nấu lẩu chả cá bao nhiêu nước?', loggedInContext);
  expect(rNuocLau).toContain('2000ml');
  expect(rNuocLau).toContain('120g');

  // Lò vi sóng ly chả cá -> bấm số 3
  const rViSongLy = askAICopilot('Lò vi sóng ly chả cá bấm số mấy?', loggedInContext);
  expect(rViSongLy).toContain('SỐ 3');

  // Lò vi sóng tô mì -> bấm số 5
  const rViSongTo = askAICopilot('Lò vi sóng tô mì chả cá bấm số mấy?', loggedInContext);
  expect(rViSongTo).toContain('SỐ 5');

  // Công thức nấu súp
  const rSup = askAICopilot('Công thức nấu súp', loggedInContext);
  expect(rSup).toContain('2000ml');
  expect(rSup).toContain('bột súp cay');
});

test('4. Quy định & Lương', () => {
  // Lương ca đêm
  const rLuongDem = askAICopilot('Lương ca đêm tính sao?', loggedInContext);
  expect(rLuongDem).toContain('+30%');

  // Part-time tối đa
  const rPTMax = askAICopilot('Part time một tuần làm tối đa bao nhiêu tiếng?', loggedInContext);
  expect(rPTMax).toContain('23h');
  expect(rPTMax).toContain('91h');

  // Thêm ngày lễ tết -> 300%
  const rLeTet = askAICopilot('Làm thêm ngày lễ tết được bao nhiêu phần trăm lương?', loggedInContext);
  expect(rLeTet).toContain('300%');

  // Nghỉ giữa 2 ca tối thiểu
  const rNghi2Ca = askAICopilot('Nghỉ giữa 2 ca tối thiểu bao lâu?', loggedInContext);
  expect(rNghi2Ca).toContain('12 tiếng');
});

test('5. Bẫy từ khóa & Anti-collision', () => {
  // "Tuần này em làm tổng cộng mấy tiếng?" -> Tính tổng giờ, KHÔNG audit
  const rTongCong = askAICopilot('Tuần này em làm tổng cộng mấy tiếng?', loggedInContext);
  expect(rTongCong).toContain('48h');
  expect(rTongCong).not.toContain('vấn đề:');

  // "Công việc dạo này ổn định không Tú?" -> KHÔNG kích hoạt audit quét lỗi
  const rOnDinh = askAICopilot('Công việc dạo này ổn định không Tú?', loggedInContext);
  expect(rOnDinh).not.toContain('vấn đề:');
  expect(rOnDinh).not.toContain('0 lỗi');

  // "Kiểm tra xem lịch tuần này có ổn không?" -> KÍCH HOẠT audit quét lỗi
  const rAuditOn = askAICopilot('Kiểm tra xem lịch tuần này có ổn không?', loggedInContext);
  expect(rAuditOn).toContain('vấn đề:');
});


