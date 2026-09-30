import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api/client', () => ({ db: () => ({ from: mocks.from }) }));
import { deleteEmployeeData } from '../services/api/employees';
import { deleteStore } from '../services/api/stores';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(mocks); mocks.update.mockReturnValue(mocks); mocks.eq.mockReturnValue(mocks);
  mocks.select.mockResolvedValue({ data: [{ id: 'target' }], error: null });
});
it.each([['employees', deleteEmployeeData], ['stores', deleteStore]])('deactivates only the requested %s record, never deletes it', async (table, remove) => {
  await remove('target');
  expect(mocks.from).toHaveBeenCalledExactlyOnceWith(table);
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ is_active: false });
  expect(mocks.eq).toHaveBeenCalledExactlyOnceWith('id', 'target');
  expect(mocks.delete).not.toHaveBeenCalled();
});
it.each([deleteEmployeeData, deleteStore])('reports denied/missing records instead of pretending success', async remove => {
  mocks.select.mockResolvedValueOnce({ data: [], error: null });
  await expect(remove('missing')).rejects.toThrow('không có quyền');
  mocks.select.mockResolvedValueOnce({ data: null, error: new Error('DB unavailable') });
  await expect(remove('target')).rejects.toThrow('DB unavailable');
});
