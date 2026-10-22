import { WEEK_DAYS } from '../data/constants';

export const SAMPLE_WEEK = '2026-10-19';
export const NEXT_WEEK = '2026-10-26';
export function createAgentFixture() {
  const employees = ['An', 'Bình', 'Chi', 'Dung', 'Em'].map((name, i) => ({
    id: String(990000001 + i), name: `Nhân viên mẫu ${name}`, dept: 'TEST01', type: 'STFT', role: 'STFT', maxH: 48, isActive: true,
  }));
  const current = Object.fromEntries(employees.map((emp, index) => [emp.id, Object.fromEntries(WEEK_DAYS.map((day, i) => [day, i === index ? 'off' : '6-14']))]));
  const registrations = Object.fromEntries(employees.map(emp => [emp.id, Object.fromEntries(WEEK_DAYS.map(day => [day, { shift: '6-14', registered: true, confirmed: false }]))]));
  return {
    employees,
    stores: [{ id: 'TEST01', name: 'Cửa hàng thử nghiệm', staffing: { weekday: { '6-14': 4, '14-22': 0, '22-6': 0 }, weekend: { '6-14': 5, '14-22': 0, '22-6': 0 } } }],
    schedule: { [SAMPLE_WEEK]: current, [NEXT_WEEK]: registrations }, scheduleWeeks: {}, currentWeek: SAMPLE_WEEK,
    // Fixture actor is never an authenticated production account.
    user: { id: 'sandbox-reviewer', name: 'Người xem bản nháp mẫu', role: 'employee', isManager: true, dept: 'TEST01', jobTitle: 'SM' },
  };
}

export const SANDBOX_DRAFT_KEY = 'agent-sandbox-drafts-v1';
export function createSandboxDraftRepository(storage) {
  return {
    async load(storeId, weekDate) { return JSON.parse(storage.getItem(SANDBOX_DRAFT_KEY) || '{}')[`${storeId}:${weekDate}`] || null; },
    async save(storeId, weekDate, payload, revision) {
      const all = JSON.parse(storage.getItem(SANDBOX_DRAFT_KEY) || '{}');
      const key = `${storeId}:${weekDate}`;
      if ((all[key]?.revision || 0) !== revision) throw new Error('Bản nháp đã thay đổi. Mở nháp đã lưu trước khi lưu tiếp.');
      const saved = { payload, revision: revision + 1 };
      storage.setItem(SANDBOX_DRAFT_KEY, JSON.stringify({ ...all, [key]: saved }));
      return saved;
    },
  };
}
