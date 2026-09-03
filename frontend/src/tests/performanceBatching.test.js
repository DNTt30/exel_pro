import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api';
import { createScheduleSlice } from '../store/slices/scheduleSlice';

describe('Performance & Concurrency Optimizations', () => {
  describe('Batch Schedule Loading (Eliminate N+1 Queries)', () => {
    it('returns empty map if weekDates is empty', async () => {
      const res = await api.getSchedulesByWeeks([]);
      expect(res).toEqual({});
    });
  });

  describe('scheduleSlice Concurrency & Batching Actions', () => {
    let state;
    let set;
    let get;
    let slice;

    beforeEach(() => {
      state = {
        schedule: {},
        employees: [{ id: 'emp1', name: 'Nguyễn Văn A', dept: 'VN0485' }],
        user: { id: 'emp1', dept: 'VN0485', role: 'SM' },
        scheduleWeeks: {},
        appendAdminLog: vi.fn().mockResolvedValue(true)
      };

      set = vi.fn((fn) => {
        const next = typeof fn === 'function' ? fn(state) : fn;
        state = { ...state, ...next };
      });
      get = vi.fn(() => state);

      slice = createScheduleSlice(set, get);
    });

    it('ensureWeeksLoaded batches missing weeks into a single API call', async () => {
      const mockWeeksData = {
        '2026-08-10': { emp1: { T2: '6-14' } },
        '2026-08-17': { emp1: { T2: '14-22' } },
        '2026-08-24': { emp1: { T2: 'off' } }
      };

      const spyGetWeeks = vi.spyOn(api, 'getSchedulesByWeeks').mockResolvedValue(mockWeeksData);

      // Gọi nạp 3 tuần thiếu cùng lúc
      await slice.ensureWeeksLoaded(['2026-08-10', '2026-08-17', '2026-08-24']);

      // Khẳng định: chỉ gọi đúng 1 lần thay vì 3 lần (chống N+1 query)
      expect(spyGetWeeks).toHaveBeenCalledTimes(1);
      expect(spyGetWeeks).toHaveBeenCalledWith(['2026-08-10', '2026-08-17', '2026-08-24']);
      expect(state.schedule['2026-08-10']).toEqual({ emp1: { T2: '6-14' } });
      expect(state.schedule['2026-08-17']).toEqual({ emp1: { T2: '14-22' } });

      spyGetWeeks.mockRestore();
    });

    it('updateEmployeeWeeklyShifts saves entire week in 1 atomic API call', async () => {
      const spySave = vi.spyOn(api, 'saveEmployeeSchedule').mockResolvedValue(true);

      const weeklyShifts = {
        T2: '6-14',
        T3: '6-14',
        T4: '6-14',
        T5: '6-14',
        T6: '6-14',
        T7: '6-14',
        CN: 'off'
      };

      await slice.updateEmployeeWeeklyShifts('2026-08-24', 'emp1', weeklyShifts);

      // Khẳng định: chỉ gọi API đúng 1 lần duy nhất thay vì 7 lần loop
      expect(spySave).toHaveBeenCalledTimes(1);
      expect(spySave).toHaveBeenCalledWith('2026-08-24', 'emp1', expect.objectContaining(weeklyShifts));
      expect(state.schedule['2026-08-24']['emp1']).toEqual(expect.objectContaining(weeklyShifts));

      spySave.mockRestore();
    });

    it('rolls back optimistic state if weekly save fails', async () => {
      const spySave = vi.spyOn(api, 'saveEmployeeSchedule').mockRejectedValue(new Error('Network error'));

      state.schedule = {
        '2026-08-24': { emp1: { T2: 'off', T3: 'off' } }
      };

      await expect(
        slice.updateEmployeeWeeklyShifts('2026-08-24', 'emp1', { T2: '6-14', T3: '14-22' })
      ).rejects.toThrow('Network error');

      // Khẳng định: lịch được rollback về trạng thái ban đầu
      expect(state.schedule['2026-08-24']['emp1']).toEqual({ T2: 'off', T3: 'off' });

      spySave.mockRestore();
    });
  });
});
