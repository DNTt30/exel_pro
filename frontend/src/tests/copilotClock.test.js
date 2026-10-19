import { afterEach, expect, it, vi } from 'vitest';
import { answerClockQuery, getCopilotClock } from '../utils/copilotClock';
import { buildCopilotRequest } from '../utils/copilotContext';
import { tryAnswerWithData } from '../utils/copilotIntents';

afterEach(() => vi.useRealTimers());
const midnight = new Date('2026-10-18T17:00:00Z'); // Monday 00:00 in Vietnam.
it.each(['hôm nay là ngày mấy?', 'hôm nay ngày bao nhiêu', 'hôm nay thứ mấy', 'TÚ mini ơi cho anh biết hôm nay là ngày bao nhiêu nhé',
  'hom nay la ngay nao', 'hiện tại là tháng mấy', 'năm nào', 'Bạn có biết hôm nay là ngày mấy không?', 'ngày mấy hôm nay', 'what day is today'])('answers a standalone clock question: %s', question => {
  expect(answerClockQuery(question, midnight)).toContain('19/10/2026');
  expect(answerClockQuery(question, midnight)).toContain('Thứ Hai');
});
it('uses Vietnam calendar boundaries regardless of the browser timezone', () => {
  expect(getCopilotClock(new Date('2026-10-18T16:59:59Z'))).toMatchObject({ date: '2026-10-18', time: '23:59', weekday: 'Chủ Nhật' });
  expect(getCopilotClock(midnight)).toMatchObject({ date: '2026-10-19', time: '00:00', weekday: 'Thứ Hai' });
});
it.each(['Bây giờ là mấy giờ?', 'mấy giờ rồi', 'hiện tại bao nhiêu giờ', 'what time is it'])('answers the current Vietnam time: %s', question => {
  expect(answerClockQuery(question, midnight)).toContain('00:00');
  expect(answerClockQuery(question, midnight)).toContain('UTC+7');
});
it('handles relative dates across year and leap-day boundaries', () => {
  expect(answerClockQuery('mai thứ mấy', new Date('2026-12-31T05:00Z'))).toContain('01/01/2027');
  expect(answerClockQuery('hôm qua ngày mấy', new Date('2024-03-01T05:00Z'))).toContain('29/02/2024');
  expect(answerClockQuery('ngày kia là thứ mấy', new Date('2026-12-31T05:00Z'))).toContain('02/01/2027');
});
it.each(['hôm nay em làm ca mấy', 'mai tôi làm ca gì', 'hôm nay mấy giờ hủy bánh mì', 'mai có lễ gì không',
  'hôm nay là ngày mấy và ai làm cùng tôi', 'giờ hủy sandwich là mấy giờ', 'trà cóc xí muội', 'ngày công của tôi bao nhiêu', 'hôm nay là ngày bao nhiêu âm lịch'])('does not swallow schedule, policy or unsupported calendar questions: %s', question => {
  expect(answerClockQuery(question, midnight)).toBeNull();
});
it('refreshes every request and keeps actual date separate from the selected schedule week', () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-12-31T16:59:00Z'));
  const ctx = { user: { id: 'staff', role: 'employee', dept: 'A' }, currentWeek: '2020-01-06', employees: [], handbookEntries: [] };
  const first = buildCopilotRequest('Xin cho biết thời gian hiện tại nhé', ctx);
  expect(first.systemPrompt).toContain('2026-12-31, 23:59');
  expect(first.systemPrompt).toContain('Asia/Ho_Chi_Minh');
  expect(first.options.copilotScope.employeeIds).toEqual([]);
  vi.setSystemTime(new Date('2026-12-31T17:01:00Z'));
  expect(buildCopilotRequest('quy trình sáng mai', ctx).systemPrompt).toContain('2027-01-01, 00:01');
  expect(tryAnswerWithData({ q: 'hôm nay ngày mấy' })).toContain('01/01/2027');
});
