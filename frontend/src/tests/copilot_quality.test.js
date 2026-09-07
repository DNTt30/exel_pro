import { describe, it, expect } from 'vitest';
import { askAICopilot } from '../utils/aiSchedulerEngine.js';

// Ngữ cảnh mẫu phủ đủ loại dữ liệu để kiểm chứng chất lượng trả lời.
const ctx = {
  storeId: 'VN0485',
  currentWeek: '2026-08-10',
  employees: [
    { id: '260716009', name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485', type: 'STFT' },
    { id: '123456789', name: 'NGUYỄN VĂN A', dept: 'VN0485', type: 'STPT' },
    { id: '987654321', name: 'TRẦN THỊ B', dept: 'VN0485', type: 'STPT' },
  ],
  weekSchedule: {
    // TÚ: 48h / 7 ca — đủ chuẩn FT
    '260716009': { T2: 'OFF', T3: '6-14', T4: '14-22', T5: '14-22', T6: '6-14', T7: '6-14', CN: '6-14' },
    // VĂN A: 12h / 3 ca
    '123456789': { T2: '6-10', T4: '6-10', T6: '6-10' },
    // THỊ B: 32h / 4 ca — PT vượt 23h/tuần
    '987654321': { T2: '14-22', T3: '14-22', T4: '14-22', T5: '14-22' },
  },
  stores: [{ id: 'VN0485', name: 'CH 0485' }],
  shiftSwaps: [],
  feedbacks: [],
};

describe('AI Copilot — các intent nâng cấp', () => {
  it('ước tính lương cá nhân khi nêu tên cụ thể (không trả FAQ chung)', () => {
    const r = askAICopilot('Lương tuần này của Tú bao nhiêu?', ctx);
    expect(r).toContain('Lương tuần này của DƯƠNG NGỌC TÚ');
    expect(r).toContain('48h');
    expect(r).not.toContain('150%');
  });

  it('liệt kê PT vượt định mức thay vì đọc quy định chung', () => {
    const r = askAICopilot('PT nào sắp vượt 91h tháng?', ctx);
    expect(r).toContain('TRẦN THỊ B');
  });

  it('báo trạng thái chuẩn 48h của Full-time', () => {
    const r = askAICopilot('Tuần này ai chưa đủ 48h?', ctx);
    expect(r).toContain('48h');
  });

  it('so sánh giờ hai người', () => {
    const r = askAICopilot('So sánh giờ Tú và Văn A', ctx);
    expect(r).toContain('DƯƠNG NGỌC TÚ');
    expect(r).toContain('NGUYỄN VĂN A');
    expect(r).toContain('nhiều hơn');
  });

  it('trả lời câu không dấu (ít giờ nhất)', () => {
    const r = askAICopilot('ca nao vang nhat tuan nay', ctx);
    expect(r).toContain('NGUYỄN VĂN A');
  });

  it('gợi ý danh sách NV khi hỏi người không tồn tại', () => {
    const r = askAICopilot('Hùng tuần này làm ca gì?', ctx);
    expect(r).toContain('Không thấy bạn này trong VN0485');
  });

  it('hướng dẫn đổi ca — không nhảy sang công thức món', () => {
    const r = askAICopilot('tôi muốn đổi ca thì làm sao?', ctx);
    expect(r).toContain('Quy trình đổi ca');
    expect(r).not.toContain('Trà');
  });

  it('trả lời mã nhân viên của tôi chính xác', () => {
    const ctxWithUser = { ...ctx, user: { id: '260716009', name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485', role: 'STFT' } };
    const r = askAICopilot('mã nhân viên của tôi', ctxWithUser);
    expect(r).toContain('260716009');
    expect(r).toContain('DƯƠNG NGỌC TÚ');
  });

  it('trả lời thông tin tài khoản của tôi', () => {
    const ctxWithUser = { ...ctx, user: { id: '260716009', name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485', role: 'STFT' } };
    const r = askAICopilot('thông tin của tôi', ctxWithUser);
    expect(r).toContain('260716009');
    expect(r).toContain('Thông tin tài khoản');
  });
});

describe('AI Copilot — giữ hành vi cũ (không hồi quy)', () => {
  it('FAQ định mức PT vẫn trả quy định', () => {
    const r = askAICopilot('part time một tuần làm tối đa bao nhiêu tiếng?', ctx);
    expect(r).toContain('16–23h/tuần');
  });

  it('FAQ hệ số lương chung khi không nhắc người cụ thể', () => {
    const r = askAICopilot('làm ca đêm có được thêm tiền không?', ctx);
    expect(r).toContain('+30%');
  });
});

describe('AI Copilot — Nhận diện đại từ nhân xưng Việt Nam & Lịch cá nhân', () => {
  const loggedInCtx = {
    ...ctx,
    user: ctx.employees[0] // DƯƠNG NGỌC TÚ
  };

  it('nhận diện "em": tính lương cá nhân', () => {
    const r = askAICopilot('Lương tuần này của em bao nhiêu?', loggedInCtx);
    expect(r).toContain('DƯƠNG NGỌC TÚ');
    expect(r).toContain('48h');
  });

  it('nhận diện "chị" + hỏi ca 22-6', () => {
    const r = askAICopilot('Chị có làm ca 22-6 hôm nào không?', loggedInCtx);
    expect(r).toContain('DƯƠNG NGỌC TÚ');
    expect(r).toContain('KHÔNG có ca đêm');
  });

  it('nhận diện "anh": hỏi lịch làm', () => {
    const r = askAICopilot('Lịch của anh tuần này', loggedInCtx);
    expect(r).toContain('DƯƠNG NGỌC TÚ');
    expect(r).toContain('T3: 6-14');
  });

  it('nhận diện "tao": hỏi tổng số tiếng', () => {
    const r = askAICopilot('Tuần này tao làm tổng bao nhiêu tiếng?', loggedInCtx);
    expect(r).toContain('48h');
  });

  it('nhận diện "tớ": hỏi giờ làm', () => {
    const r = askAICopilot('Tuần này tớ làm bao nhiêu tiếng?', loggedInCtx);
    expect(r).toContain('48h');
  });

  it('nhận diện "cháu": hỏi lịch tuần', () => {
    const r = askAICopilot('Lịch của cháu tuần này thế nào?', loggedInCtx);
    expect(r).toContain('DƯƠNG NGỌC TÚ');
  });

  it('nhận diện "bản thân": hỏi thông tin tài khoản', () => {
    const r = askAICopilot('Thông tin của bản thân', loggedInCtx);
    expect(r).toContain('Thông tin tài khoản');
    expect(r).toContain('260716009');
  });

  it('trả lời ngày có ca trực khi hỏi nghỉ: "Thứ 6 em có được nghỉ không?"', () => {
    const r = askAICopilot('Thứ 6 em có được nghỉ không?', loggedInCtx);
    expect(r).toContain('T6');
    expect(r).toContain('6-14');
    expect(r).toContain('không được nghỉ');
  });

  it('trả lời ngày OFF khi hỏi nghỉ: "Thứ 2 em có được nghỉ không?"', () => {
    const r = askAICopilot('Thứ 2 em có được nghỉ không?', loggedInCtx);
    expect(r).toContain('T2');
    expect(r).toContain('OFF');
    expect(r).toContain('được nghỉ');
  });
});

describe('AI Copilot — Tra cứu ai làm cùng ca', () => {
  const loggedInCtx = {
    ...ctx,
    user: ctx.employees[0] // DƯƠNG NGỌC TÚ
  };

  it('trả lời khi đang OFF: không có ai làm cùng ca', () => {
    const r = askAICopilot('Thứ 2 ai làm cùng ca với em?', loggedInCtx);
    expect(r).toContain('OFF');
    expect(r).toContain('không có ai làm cùng ca');
  });

  it('trả lời đồng nghiệp trực cùng ca nếu có người trùng ca', () => {
    const r = askAICopilot('Thứ 3 ai làm cùng ca với em?', loggedInCtx);
    expect(r).toContain('6-14');
  });
});

describe('AI Copilot — Giờ hủy từng món cụ thể (ngắn gọn, đúng trọng tâm)', () => {
  it('Sandwich có rau: 11:00 & 22:00, không tuôn món khác', () => {
    const r = askAICopilot('Mấy giờ hủy sandwich có rau?', ctx);
    expect(r).toContain('11:00');
    expect(r).toContain('22:00');
    expect(r).toContain('Sandwich có rau');
    expect(r).not.toContain('Burger');
  });

  it('Burger: 11:00 & 22:00', () => {
    const r = askAICopilot('Burger hủy lúc mấy giờ?', ctx);
    expect(r).toContain('11:00');
    expect(r).toContain('22:00');
    expect(r).toContain('Burger');
  });

  it('Gimbap: 11:00 & 22:00', () => {
    const r = askAICopilot('Gimbap hủy lúc nào?', ctx);
    expect(r).toContain('11:00');
    expect(r).toContain('22:00');
    expect(r).toContain('Gimbap');
  });

  it('Cơm nắm Onigiri: 19:00', () => {
    const r = askAICopilot('Onigiri hủy mấy giờ?', ctx);
    expect(r).toContain('19:00');
    expect(r).toContain('Onigiri');
  });

  it('Sushi: 19:00', () => {
    const r = askAICopilot('Khi nào hủy sushi?', ctx);
    expect(r).toContain('19:00');
    expect(r).toContain('Sushi');
  });

  it('Bento: 19:00', () => {
    const r = askAICopilot('Bento hủy lúc mấy giờ?', ctx);
    expect(r).toContain('19:00');
    expect(r).toContain('Bento');
  });

  it('Sandwich không rau: 19:00', () => {
    const r = askAICopilot('Sandwich không rau hủy lúc nào?', ctx);
    expect(r).toContain('19:00');
    expect(r).toContain('Sandwich không rau');
  });

  it('Mì hộp: 19:00', () => {
    const r = askAICopilot('Mì hộp hủy lúc mấy giờ?', ctx);
    expect(r).toContain('19:00');
    expect(r).toContain('Mì hộp');
  });

  it('Hàng tươi / FF rau: 11:00 & 22:00', () => {
    const r = askAICopilot('Khi nào hủy hàng tươi?', ctx);
    expect(r).toContain('11:00');
    expect(r).toContain('22:00');
  });

  it('Hàng GM: quy định HSD', () => {
    const r = askAICopilot('Hàng GM hủy khi nào?', ctx);
    expect(r).toContain('HSD ≤ 7 ngày');
  });
});

describe('AI Copilot — Công thức & SOP Thiết bị & Lẩu chả cá', () => {
  it('Công thức mì tương đen GS25', () => {
    const r = askAICopilot('Công thức mì tương đen', ctx);
    expect(r).toContain('Koreno');
    expect(r).toContain('tương đen');
  });

  it('Nấu lẩu chả cá bao nhiêu nước: 2000ml (2 lít)', () => {
    const r = askAICopilot('Nấu lẩu chả cá bao nhiêu nước?', ctx);
    expect(r).toContain('2000ml');
    expect(r).toContain('120g');
  });

  it('Lò vi sóng ly chả cá: bấm số 3', () => {
    const r = askAICopilot('Lò vi sóng ly chả cá bấm số mấy?', ctx);
    expect(r).toContain('SỐ 3');
  });

  it('Lò vi sóng tô mì chả cá: bấm số 5', () => {
    const r = askAICopilot('Lò vi sóng tô mì chả cá bấm số mấy?', ctx);
    expect(r).toContain('SỐ 5');
  });

  it('Công thức nấu súp lẩu', () => {
    const r = askAICopilot('Công thức nấu súp', ctx);
    expect(r).toContain('2000ml');
    expect(r).toContain('bột súp cay');
  });
});

describe('AI Copilot — Bẫy từ khóa & Anti-collision chuyên sâu', () => {
  const loggedInCtx = {
    ...ctx,
    user: ctx.employees[0]
  };

  it('"tổng cộng" trong câu hỏi giờ không kích hoạt audit lỗi lịch', () => {
    const r = askAICopilot('Tuần này em làm tổng cộng mấy tiếng?', loggedInCtx);
    expect(r).toContain('48h');
    expect(r).not.toContain('vấn đề:');
  });

  it('"ổn định" trong trò chuyện không kích hoạt audit quét lỗi', () => {
    const r = askAICopilot('Công việc dạo này ổn định không Tú?', loggedInCtx);
    expect(r).not.toContain('vấn đề:');
    expect(r).not.toContain('0 lỗi');
  });

  it('"lịch tuần này có ổn không" kích hoạt audit kiểm tra lỗi', () => {
    const r = askAICopilot('Kiểm tra xem lịch tuần này có ổn không?', loggedInCtx);
    expect(r).toContain('vấn đề:');
  });

  it('Làm thêm ngày lễ tết được bao nhiêu phần trăm lương: 300%', () => {
    const r = askAICopilot('Làm thêm ngày lễ tết được bao nhiêu phần trăm lương?', ctx);
    expect(r).toContain('300%');
  });
});

