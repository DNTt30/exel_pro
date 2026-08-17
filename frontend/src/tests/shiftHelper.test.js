import { describe, it, expect } from 'vitest';
import { 
  getShiftHours, 
  normalizeShift, 
  parseShiftTimeRange, 
  isShiftsOverlapping, 
  calculateStaffingGap,
  validateEmployeeSchedule 
} from '../utils/shiftHelper';

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
  });
});
