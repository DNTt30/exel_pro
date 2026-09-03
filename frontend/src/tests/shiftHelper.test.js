import { describe, it, expect } from 'vitest';
import { 
  getShiftHours, 
  getShiftCode,
  isShiftsOverlapping, 
  calculateStaffingGap,
  validateEmployeeSchedule,
  buildSwappedSchedules,
  mergeAiSchedule,
  parseShiftForCell,
  calculateEmployeeWeeklyHours
} from '../utils/shiftHelper';
import { getCurrentMondayWeek, getWeekAndDayKey, getPayrollCycleDates, getStaffingMatrix, normalizeStaffingConfig, suggestStaffingFromDemand } from '../data/constants';

describe('Shift Helper Logic & Business Rules', () => {
  describe('getShiftHours', () => {
    it('should correctly calculate standard 8h shifts', () => {
      expect(getShiftHours('6-14')).toBe(8);
      expect(getShiftHours('14-22')).toBe(8);
      expect(getShiftHours('22-6')).toBe(8);
      expect(getShiftHours('10-18')).toBe(8);
    });

    it('should correctly calculate part-time 4h/6h shifts', () => {
      expect(getShiftHours('6-10')).toBe(4);
      expect(getShiftHours('18-22')).toBe(4);
      expect(getShiftHours('6-12')).toBe(6);
    });

    it('should return 0 for off / empty shifts', () => {
      expect(getShiftHours('off')).toBe(0);
      expect(getShiftHours('')).toBe(0);
      expect(getShiftHours(null)).toBe(0);
    });
  });

  describe('isShiftsOverlapping (Cross-Store Shift Conflict Detection)', () => {
    it('should detect overlap when shifts intersect in time', () => {
      // 06:00-14:00 overlaps with 10:00-18:00
      expect(isShiftsOverlapping('6-14', '10-18')).toBe(true);
      // 08:00-12:00 overlaps with 11:00-15:00
      expect(isShiftsOverlapping('8-12', '11-15')).toBe(true);
      // Same shift code
      expect(isShiftsOverlapping('6-14', '6-14')).toBe(true);
    });

    it('should allow adjacent, non-overlapping shifts', () => {
      // 06:00-14:00 and 14:00-22:00 do not overlap (adjacent)
      expect(isShiftsOverlapping('6-14', '14-22')).toBe(false);
      // 14:00-22:00 and 22:00-06:00 do not overlap
      expect(isShiftsOverlapping('14-22', '22-6')).toBe(false);
      // 06:00-10:00 and 14:00-18:00 have a 4h gap
      expect(isShiftsOverlapping('6-10', '14-18')).toBe(false);
    });

    it('should return false if either shift is off or empty', () => {
      expect(isShiftsOverlapping('6-14', 'off')).toBe(false);
      expect(isShiftsOverlapping('off', '14-22')).toBe(false);
      expect(isShiftsOverlapping('', '')).toBe(false);
    });
  });

  describe('Staffing Gap Analysis', () => {
    const mockEmps = [
      { id: '1', name: 'NV 1', dept: 'VN0485' },
      { id: '2', name: 'NV 2', dept: 'VN0485' },
      { id: '3', name: 'NV 3', dept: 'VN0497' } // Chi viện sang VN0485
    ];

    const mockSched = {
      '1': { T2: '6-14' },
      '2': { T2: '6-14' },
      '3': { T2: { shift: '6-14', covering_store: 'VN0485' } }
    };

    it('should calculate required, actual, support and gap accurately', () => {
      const result = calculateStaffingGap(mockEmps, mockSched, 'T2', 'VN0485', { '6-14': 2 });
      expect(result['6-14'].required).toBe(2);
      expect(result['6-14'].actual).toBe(2);
      expect(result['6-14'].support).toBe(1);
      expect(result['6-14'].total).toBe(3);
      expect(result['6-14'].gap).toBe(1); // 3 - 2 = surplus 1
      expect(result['6-14'].status).toBe('surplus');
    });

    it('should detect deficit when total < required', () => {
      const result = calculateStaffingGap(mockEmps, mockSched, 'T2', 'VN0485', { '14-22': 2 });
      expect(result['14-22'].required).toBe(2);
      expect(result['14-22'].total).toBe(0);
      expect(result['14-22'].gap).toBe(-2);
      expect(result['14-22'].status).toBe('deficit');
    });
  });

  describe('Employee Schedule Compliance Warnings', () => {
    it('should flag PT overtime when hours > 23 in weekly view', () => {
      const ptEmp = { id: 'pt1', type: 'STPT' };
      const validation = validateEmployeeSchedule(ptEmp, 24, 3, false);
      expect(validation.hasErrors).toBe(true);
      expect(validation.warnings.some(w => w.badge.includes('> 23h'))).toBe(true);
    });

    it('should flag PT under hours when hours < 16', () => {
      const ptEmp = { id: 'pt1', type: 'STPT' };
      const validation = validateEmployeeSchedule(ptEmp, 12, 2, false);
      expect(validation.hasWarnings).toBe(true);
      expect(validation.warnings.some(w => w.badge.includes('< 16h'))).toBe(true);
    });

    it('should pass valid PT hours between 16 and 23', () => {
      const ptEmp = { id: 'pt1', type: 'STPT' };
      const validation = validateEmployeeSchedule(ptEmp, 20, 3, false);
      expect(validation.hasErrors).toBe(false);
      expect(validation.hasWarnings).toBe(false);
    });

    it('should flag PT month view when hours > 91', () => {
      const ptEmp = { id: 'pt1', type: 'STPT' };
      const validation = validateEmployeeSchedule(ptEmp, 95, 12, true);
      expect(validation.hasErrors).toBe(true);
      expect(validation.warnings.some(w => w.badge.includes('> 91h'))).toBe(true);
    });

    it('should flag FT when hours < 48 or shifts < 6 in weekly view', () => {
      const ftEmp = { id: 'ft1', type: 'STFT' };
      const underHours = validateEmployeeSchedule(ftEmp, 40, 5, false);
      expect(underHours.hasWarnings).toBe(true);
      expect(underHours.warnings.some(w => w.badge.includes('< 48h'))).toBe(true);
      expect(underHours.warnings.some(w => w.badge.includes('< 6 ca'))).toBe(true);

      const validFT = validateEmployeeSchedule(ftEmp, 48, 6, false);
      expect(validFT.hasWarnings).toBe(false);
      expect(validFT.hasErrors).toBe(false);
    });
  });

  describe('parseShiftForCell (Rendering Logic for Cells & Support Staff)', () => {
    it('returns empty display for falsy values', () => {
      expect(parseShiftForCell({ id: '1' }, '')).toEqual({ display: '', isBorrowedSlot: false, colorClass: '' });
      expect(parseShiftForCell({ id: '1' }, null)).toEqual({ display: '', isBorrowedSlot: false, colorClass: '' });
    });

    it('renders normal shift at home store', () => {
      const cell = parseShiftForCell({ id: '1', dept: 'VN0485' }, '6-14');
      expect(cell.display).toBe('6-14');
      expect(cell.isBorrowedSlot).toBe(false);
      expect(cell.colorClass).toBe('');
    });

    it('renders italic gray shift at home store when employee goes to support another store', () => {
      const cell = parseShiftForCell({ id: '1', dept: 'VN0485' }, { shift: '6-14', covering_store: 'VN0497' });
      expect(cell.display).toBe('6-14 VN0497');
      expect(cell.isBorrowedSlot).toBe(true);
      expect(cell.colorClass).toContain('bg-slate-100');
      expect(cell.colorClass).toContain('italic');
    });

    it('renders orange badge shift at destination store when borrowed', () => {
      const borrowedEmp = { id: '1', dept: 'VN0485', isBorrowedTo: 'VN0497' };
      const cell = parseShiftForCell(borrowedEmp, { shift: '6-14', covering_store: 'VN0497' });
      expect(cell.display).toBe('6-14');
      expect(cell.isBorrowedSlot).toBe(true);
      expect(cell.colorClass).toBe('bg-orange-50 text-orange-700');
    });

    it('renders empty slot at destination store if employee works elsewhere or normal shift', () => {
      const borrowedEmp = { id: '1', dept: 'VN0485', isBorrowedTo: 'VN0497' };
      const normalShift = parseShiftForCell(borrowedEmp, '6-14');
      expect(normalShift.display).toBe('');
      expect(normalShift.colorClass).toBe('bg-slate-100');
    });
  });

  describe('calculateEmployeeWeeklyHours', () => {
    it('calculates hours for home store employee and ignores covering shifts sent out', () => {
      const emp = { id: 'e1', dept: 'VN0485' };
      const sched = {
        T2: '6-14', // 8h
        T3: '14-22', // 8h
        T4: { shift: '6-14', covering_store: 'VN0497' }, // Chi viện VN0497 -> không tính vào VN0485
        T5: 'off'
      };
      const result = calculateEmployeeWeeklyHours(emp, sched);
      expect(result.totalHours).toBe(16);
      expect(result.totalShifts).toBe(2);
    });

    it('calculates hours for borrowed employee only matching isBorrowedTo store', () => {
      const borrowedEmp = { id: 'e1', dept: 'VN0485', isBorrowedTo: 'VN0497' };
      const sched = {
        T2: '6-14', // làm tại CH gốc VN0485 -> không tính cho VN0497
        T3: { shift: '6-14', covering_store: 'VN0497' }, // 8h cho VN0497
        T4: { shift: '14-22', covering_store: 'VN0497' }, // 8h cho VN0497
        T5: { shift: '6-14', covering_store: 'VN0999' } // làm cho CH khác -> không tính
      };
      const result = calculateEmployeeWeeklyHours(borrowedEmp, sched);
      expect(result.totalHours).toBe(16);
      expect(result.totalShifts).toBe(2);
    });
  });

  describe('getShiftCode on covering objects', () => {
    it('reads shift from object and legacy string', () => {
      expect(getShiftCode({ shift: '14-22', covering_store: 'VN0485' })).toBe('14-22');
      expect(getShiftCode('6-14_VN0485')).toBe('6-14');
      expect(getShiftCode('off')).toBe('off');
    });
  });

  describe('buildSwappedSchedules', () => {
    it('swaps the same day cells', () => {
      const result = buildSwappedSchedules(
        { T2: '6-14', T3: 'off' },
        { T2: '14-22', T3: 'off' },
        { fromEmpId: 'A', toEmpId: 'B', fromDay: 'T2', toDay: 'T2' }
      );
      expect(result.A.T2).toBe('14-22');
      expect(result.B.T2).toBe('6-14');
    });

    it('swaps different days and keeps covering_store objects', () => {
      const covering = { shift: '14-22', covering_store: 'VN0485' };
      const result = buildSwappedSchedules(
        { T2: '6-14', T5: 'off' },
        { T2: 'off', T5: covering },
        { fromEmpId: 'A', toEmpId: 'B', fromDay: 'T2', toDay: 'T5' }
      );
      expect(result.A.T2).toBe('off');
      expect(result.A.T5).toEqual(covering);
      expect(result.B.T5).toBe('off');
      expect(result.B.T2).toBe('6-14');
    });
  });

  describe('getCurrentMondayWeek', () => {
    it('returns padded ISO Monday', () => {
      expect(getCurrentMondayWeek(new Date(2026, 7, 19))).toBe('2026-08-17');
      expect(getCurrentMondayWeek(new Date(2026, 7, 17))).toBe('2026-08-17');
      expect(getCurrentMondayWeek(new Date(2026, 7, 16))).toBe('2026-08-10');
    });
  });

  describe('payroll cycle mapping', () => {
    it('maps a calendar date to weekKey + T2-CN', () => {
      expect(getWeekAndDayKey(new Date(2026, 7, 17))).toEqual({ weekKey: '2026-08-17', dayKey: 'T2' });
      expect(getWeekAndDayKey(new Date(2026, 7, 23))).toEqual({ weekKey: '2026-08-17', dayKey: 'CN' });
    });

    it('builds 26->25 cycle with week keys', () => {
      const dates = getPayrollCycleDates(2026, 8);
      expect(dates[0].key).toBe('26');
      expect(dates[0].weekKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dates.find(d => d.key === '25')).toBeTruthy();
    });
  });

  describe('staffing config', () => {
    it('falls back to 2-2-1 and uses weekend override', () => {
      const empty = getStaffingMatrix({}, 'T2');
      expect(empty['6-14']).toBe(2);
      expect(empty['22-6']).toBe(1);

      const store = {
        staffing: normalizeStaffingConfig({
          weekday: { '6-14': 2, '14-22': 2, '22-6': 1 },
          weekend: { '6-14': 3, '14-22': 3, '22-6': 2 }
        })
      };
      expect(getStaffingMatrix(store, 'T4')['6-14']).toBe(2);
      expect(getStaffingMatrix(store, 'CN')['6-14']).toBe(3);
      expect(getStaffingMatrix(store, 'T7')['22-6']).toBe(2);
    });

    it('suggests higher weekend headcount from customers and sales', () => {
      const staffing = suggestStaffingFromDemand({
        weekday: { customers: 250, sales: 12_000_000 },
        weekend: { customers: 700, sales: 40_000_000 }
      });
      expect(staffing.weekend['14-22']).toBeGreaterThan(staffing.weekday['14-22']);
      expect(staffing.weekend['22-6']).toBeGreaterThanOrEqual(1);
      expect(staffing.weekday['6-14']).toBeGreaterThanOrEqual(1);
    });
  });

  describe('mergeAiSchedule', () => {
    it('keeps covering_store assignments to other stores', () => {
      const existing = {
        A: { T2: { shift: '6-14', covering_store: 'VN0497' }, T3: '14-22' }
      };
      const ai = {
        A: { T2: 'off', T3: '6-14' }
      };
      const merged = mergeAiSchedule(existing, ai, 'VN0485');
      expect(merged.A.T2).toEqual({ shift: '6-14', covering_store: 'VN0497' });
      expect(merged.A.T3).toBe('6-14');
    });
  });
});
