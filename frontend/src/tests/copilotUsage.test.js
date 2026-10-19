import { beforeEach, expect, it, vi } from 'vitest';
import { answerUsageQuery, routeUsageQuery } from '../utils/copilotUsage';
import { getCopilotUsage } from '../services/api/logs';
import { copilotTopic } from '../utils/copilotActivity';
vi.mock('../services/api/logs', () => ({ getCopilotUsage: vi.fn() }));
const context = { user: { id: 'admin', role: 'admin' }, stores: [{ id: 'A' }, { id: 'B' }], storeId: 'ALL' };
const now = new Date('2026-10-18T18:00:00Z'); // Monday in Vietnam, Sunday UTC.
beforeEach(() => { vi.clearAllMocks(); getCopilotUsage.mockResolvedValue({ total: 0, limit: 200, rows: [] }); });
it.each(['Mọi người thường hỏi TÚ mini những gì?', 'Nhân viên hay hỏi về chủ đề nào?', 'Thống kê câu hỏi của tôi', 'Tổng số lượt hỏi tuần này'])('routes recorded usage: %s', q => {
  expect(routeUsageQuery(q)).not.toBeNull();
});
it.each(['Tú mini ơi tháng này lương tôi bao nhiêu?', 'Tú mini số lượng nhân sự đang làm?', 'Tú mini ơi trà cóc bao nhiêu ml?', 'Tú mini thống kê lương tuần này'])('does not mistake addressing the assistant for usage statistics: %s', q => {
  expect(routeUsageQuery(q)).toBeNull();
});
it('keeps a numerical follow-up on usage, never uses previous AI text as evidence', () => {
  const question = 'cho tôi số lượng và dữ liệu thực tế';
  const history = [{ sender: 'user', text: 'Mọi người thường hỏi gì?' }, { sender: 'ai', text: '61 nhân viên, 49 phản hồi' }];
  expect(routeUsageQuery(question, history)).toMatchObject({ own: false, period: 'all' });
  expect(routeUsageQuery(question, [history[1]])).toBeNull();
  expect(routeUsageQuery(question, [...history, { sender: 'user', text: 'trà cóc xí muội' }])).toBeNull();
  expect(routeUsageQuery('Có bao nhiêu nhân viên?', history)).toBeNull();
});
it('uses the latest requested period and refuses unsupported dates', () => {
  const history = [{ sender: 'user', text: 'Thống kê lượt hỏi hôm nay' }];
  expect(routeUsageQuery('cho tôi số liệu tháng này', history)).toMatchObject({ period: 'month' });
  expect(routeUsageQuery('cho tôi số liệu hôm qua', history).unsupportedPeriod).toBe(true);
});
it.each(['today', 'week', 'month'])('filters %s using Vietnam dates', async period => {
  await answerUsageQuery({ own: false, period }, context, now);
  expect(getCopilotUsage).toHaveBeenCalledWith(expect.objectContaining({ storeId: 'ALL', to: now.toISOString(),
    from: period === 'month' ? '2026-09-30T17:00:00.000Z' : '2026-10-18T17:00:00.000Z' }));
});
it('denies other people’s analytics for staff, but allows their own recorded questions', async () => {
  const staff = { ...context, user: { id: 'staff', role: 'employee', dept: 'A' }, storeId: 'A' };
  expect(await answerUsageQuery({ own: false }, staff, now)).toContain('không có quyền');
  expect(getCopilotUsage).not.toHaveBeenCalled();
  await answerUsageQuery(routeUsageQuery('Thống kê câu hỏi của tôi'), staff, now);
  expect(getCopilotUsage).toHaveBeenCalledWith(expect.objectContaining({ userId: 'staff', storeId: 'A' }));
});
it('rejects a selected store outside the manager’s assignment without fetching', async () => {
  const sm = { ...context, user: { id: 'sm', role: 'SM', dept: 'A' }, storeId: 'B' };
  expect(await answerUsageQuery({ own: false }, sm, now)).toContain('ngoài phạm vi');
  expect(getCopilotUsage).not.toHaveBeenCalled();
});
it('distinguishes exact totals, sample topic counts and actual quoted questions', async () => {
  getCopilotUsage.mockResolvedValue({ total: 350, limit: 200, rows: [
    { userMessage: 'Trà cóc xí muội', createdAt: now.toISOString() },
    { userMessage: 'Hủy cơm nắm giờ nào?', createdAt: now.toISOString(), error: '503' },
  ] });
  const answer = await answerUsageQuery({ own: false, period: 'all' }, context, now);
  expect(answer).toContain('350 lượt hỏi');
  expect(answer).toContain('Phân tích 2 lượt gần nhất');
  expect(answer).toContain('1 lượt có lỗi');
  expect(answer).toContain('không suy ra thứ hạng toàn bộ');
  expect(answer).toContain('Trà cóc xí muội');
  expect(answer).toContain('không phải số người dùng riêng biệt');
});
it('distinguishes empty records from failed loading and never substitutes operational counts', async () => {
  const answer = await answerUsageQuery({ own: false, period: 'all' }, context, now);
  expect(answer).toContain('Chưa có lượt hỏi được ghi nhận');
  getCopilotUsage.mockRejectedValue(new Error('offline'));
  const failure = await answerUsageQuery({ own: false, period: 'all' }, { ...context, employees: Array(61).fill({}), feedbacks: Array(49).fill({ status: 'pending' }) }, now);
  expect(failure).toContain('Chưa tải được');
  expect(failure).not.toMatch(/61|49|0 lượt|Chưa có lượt/);
});
it.each([
  ['Tra cứu lịch của tôi', 'Lịch & ca làm'], ['Hủy ca cần báo trước bao lâu?', 'Lịch & ca làm'],
  ['Trà cóc xí muội', 'Công thức & chế biến'], ['Công thức chả cá', 'Công thức & chế biến'],
  ['Hủy cơm nắm lúc nào', 'Hạn dùng & bảo quản'], ['Mọi người thường hỏi gì', 'Nghiệp vụ khác'],
])('classifies sample topics without overlapping common words: %s', (q, topic) => expect(copilotTopic(q)).toBe(topic));
