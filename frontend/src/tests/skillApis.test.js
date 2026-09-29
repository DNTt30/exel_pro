import { beforeEach, it, expect, vi } from 'vitest';
import { db } from '../services/api/client';
import { getEmployees, updateEmployeeInfo } from '../services/api/employees';
import { getSchedulesByWeeks } from '../services/api/schedules';
import { scheduleVersion } from '../utils/scheduleVersion';
vi.mock('../services/api/client', () => ({ db: vi.fn() }));
let query;
beforeEach(() => {
  query = Object.assign(Promise.resolve({ data: [{ id: 'a', skills: ['NIGHT_READY'] }] }), {
    select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), range: vi.fn() });
  db.mockReturnValue({ from: vi.fn(() => query) });
});
it('reads and saves skill tags through the API allowlist', async () => {
  expect((await getEmployees())[0].skills).toEqual(['NIGHT_READY']);
  expect(query.select).toHaveBeenCalledWith(expect.stringContaining(',skills'));
  await updateEmployeeInfo('a', { skills: ['NIGHT_READY', 'NIGHT_READY', 'CASHIER'] });
  expect(query.update).toHaveBeenCalledWith({ skills: ['NIGHT_READY', 'CASHIER'] });
});
it('loads beyond the first history page, preserves versions and fails on incomplete reads', async () => {
  const page = Array.from({ length: 500 }, (_, i) => ({ week_date: '2026-09-21', emp_id: String(i), shifts: { T2: '6-14' }, version: 2 }));
  query.range.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: [{ ...page[0], emp_id: 'last', version: 8 }] });
  const history = await getSchedulesByWeeks(['2026-09-21']);
  expect(Object.keys(history['2026-09-21'])).toHaveLength(501);
  expect(scheduleVersion(history['2026-09-21'].last)).toBe(8);
  expect(query.range).toHaveBeenNthCalledWith(2, 500, 999);
  query.range.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ error: new Error('offline') });
  await expect(getSchedulesByWeeks(['2026-09-21'])).rejects.toThrow('offline');
});
