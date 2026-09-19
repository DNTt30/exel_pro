import { describe, it, expect } from 'vitest';
import { generateEmployeeSuggestedSchedule, rankSwapPartners } from '../utils/shiftSuggestionHelper';

describe('Smart Shift Suggestions for Employees', () => {
  describe('generateEmployeeSuggestedSchedule', () => {
    it('generates compliant schedule for Part-time (STPT) between 16h and 23h', () => {
      const ptEmp = { id: 'pt1', type: 'STPT', role: 'Nhân viên Part-time' };
      const suggestion = generateEmployeeSuggestedSchedule({
        emp: ptEmp,
        preferredShift: '6-14',
        busyDays: ['T3', 'T5']
      });

      expect(suggestion.totalHours).toBeGreaterThanOrEqual(16);
      expect(suggestion.totalHours).toBeLessThanOrEqual(23);
      expect(suggestion.suggestedShifts['T3']).toBe('off');
      expect(suggestion.suggestedShifts['T5']).toBe('off');
    });

    it('generates compliant schedule for Full-time (STFT) with exactly 48h and 1 day OFF', () => {
      const ftEmp = { id: 'ft1', type: 'STFT', role: 'Nhân viên Full-time' };
      const suggestion = generateEmployeeSuggestedSchedule({
        emp: ftEmp,
        preferredShift: 'any',
        busyDays: ['T4']
      });

      expect(suggestion.totalHours).toBe(48);
      expect(suggestion.totalShifts).toBe(6);
      expect(suggestion.suggestedShifts['T4']).toBe('off');
    });

    it('honors shift preference when requested', () => {
      const ptEmp = { id: 'pt1', type: 'STPT' };
      const suggestion = generateEmployeeSuggestedSchedule({
        emp: ptEmp,
        preferredShift: '14-22',
        busyDays: []
      });

      const assigned = Object.values(suggestion.suggestedShifts).filter(s => s !== 'off');
      assigned.forEach(shift => {
        expect(shift).toBe('14-22');
      });
    });
  });

  describe('rankSwapPartners', () => {
    it('ranks colleague who is OFF and will not exceed 23h at the top', () => {
      const colleagues = [
        { id: 'c1', name: 'Đồng nghiệp bận', type: 'STPT' },
        { id: 'c2', name: 'Đồng nghiệp rảnh lý tưởng', type: 'STPT' },
        { id: 'c3', name: 'Đồng nghiệp rảnh nhưng sắp vượt giờ', type: 'STPT' }
      ];

      const weekSched = {
        c1: { T3: '6-14' }, // Bận T3
        c2: { T2: '6-14', T3: 'off' }, // Rảnh T3, đang có 8h, nhận thêm 8h = 16h (an toàn <= 23h)
        c3: { T2: '6-14', T4: '14-22', T5: '6-14', T3: 'off' } // Rảnh T3, đang có 24h > 23h
      };

      const ranked = rankSwapPartners({
        myDayKey: 'T3',
        myShiftHours: 8,
        colleagues,
        weekSched
      });

      expect(ranked[0].id).toBe('c2');
      expect(ranked[0].swapScore).toBe(100);
      expect(ranked[0].badgeType).toBe('recommended');
      expect(ranked[0].swapBadge).toContain('Gợi ý số 1');

      expect(ranked[1].id).toBe('c3');
      expect(ranked[1].badgeType).toBe('warning');

      expect(ranked[2].id).toBe('c1');
      expect(ranked[2].badgeType).toBe('busy');
    });
  });

  describe('findAvailableStaffForDeficit', () => {
    it('ranks staff who registered this exact shift at top and filters out busy/overtime staff', async () => {
      const { findAvailableStaffForDeficit } = await import('../utils/shiftSuggestionHelper');
      const employees = [
        { id: 'e1', name: 'Nguyễn Văn Bận', dept: 'VN0485', type: 'STPT' },
        { id: 'e2', name: 'Trần Văn Rảnh ĐK', dept: 'VN0485', type: 'STPT' },
        { id: 'e3', name: 'Lê Văn Vượt Giờ', dept: 'VN0485', type: 'STPT' },
        { id: 'e4', name: 'Phạm Chi Viện', dept: 'VN0002', type: 'STPT' }
      ];

      const weekSched = {
        e1: { T2: '14-22' }, // Đã có ca 14-22 T2
        e2: { T2: { shift: '6-14', confirmed: false, registered: true } }, // ĐK rảnh 6-14 T2, 0h
        e3: { T3: '6-14', T4: '6-14', T5: '6-14', T2: 'off' }, // 24h > 23h
        e4: { T3: '6-14' } // Chưa xếp T2 (rảnh), 8h, chi viện từ VN0002
      };

      const candidates = findAvailableStaffForDeficit({
        dayKey: 'T2',
        shiftCode: '6-14',
        storeId: 'VN0485',
        employees,
        weekSched
      });

      expect(candidates.length).toBe(2);
      expect(candidates[0].emp.id).toBe('e2');
      expect(candidates[0].hasRegisteredThisShift).toBe(true);
      expect(candidates[0].badge).toContain('Đã đăng ký rảnh');
      expect(candidates[1].emp.id).toBe('e4');
      expect(candidates[1].isLocal).toBe(false);
      expect(candidates[1].badge).toContain('Chi viện');
    });
  });
});
