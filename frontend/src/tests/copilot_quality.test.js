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
