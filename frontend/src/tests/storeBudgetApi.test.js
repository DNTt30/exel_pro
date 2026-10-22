import { beforeEach, expect, it, vi } from 'vitest';
import { db } from '../services/api/client';
import { updateStore, addStore, getStores } from '../services/api/stores';
vi.mock('../services/api/client', () => ({ db: vi.fn() }));
let query, response;
beforeEach(() => {
  response = { data: [{ id: 'A', staffing: { weeklyHoursLimit: 224 } }], error: null };
  query = Promise.resolve(response);
  for (const method of ['select', 'update', 'insert', 'eq', 'order']) query[method] = vi.fn().mockReturnValue(query);
  db.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
});
it('writes the budget through stores and reads it back without losing staffing', async () => {
  await updateStore('A', { staffing: { weeklyHoursLimit: 224 } });
  expect(query.update.mock.calls[0][0].staffing).toMatchObject({ weeklyHoursLimit: 224, weekday: expect.any(Object) });
  expect((await getStores())[0].staffing.weeklyHoursLimit).toBe(224);
});
it('does not report success when row permissions prevent the update', async () => {
  response.data = [];
  await expect(updateStore('A', { staffing: { weeklyHoursLimit: 224 } })).rejects.toThrow('Không lưu');
});
it('does not fall back to local-only configuration when the staffing column is absent', async () => {
  response.error = new Error('staffing column missing');
  await expect(updateStore('A', { staffing: { weeklyHoursLimit: 224 } })).rejects.toThrow('staffing');
  expect(query.update).toHaveBeenCalledTimes(1);
  await expect(addStore({ id: 'A', staffing: { weeklyHoursLimit: 224 } })).rejects.toThrow('staffing');
  expect(query.insert).toHaveBeenCalledTimes(1);
});
it('clears the budget explicitly while retaining staffing configuration', async () => {
  await updateStore('A', { staffing: { weeklyHoursLimit: undefined } });
  expect(query.update.mock.calls[0][0].staffing).not.toHaveProperty('weeklyHoursLimit');
  expect(query.update.mock.calls[0][0].staffing).toHaveProperty('weekday');
});
