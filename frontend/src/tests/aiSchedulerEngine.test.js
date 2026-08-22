import { describe, it, expect } from 'vitest';
import { 
  generateAISchedule, 
  auditSchedule, 
  checkRestPeriodViolation, 
  isSeniorStaff,
  isNewStaff,
  askAICopilot 
} from '../utils/aiSchedulerEngine';

describe('AI Scheduler & Auditing Engine (FT Backfill & Labor Rest Laws)', () => {
  const mockEmployees = [
    { id: '101', name: 'Nguyễn Văn A (SM)', dept: 'VN0485', type: 'SM', role: 'Cửa hàng trưởng', maxH: 48 },
    { id: '102', name: 'Trần Thị B (FT)', dept: 'VN0485', type: 'STFT', role: 'STFT', maxH: 48, experienceMonths: 6 },
    { id: '201', name: 'Lê Văn C (PT Cứng)', dept: 'VN0485', type: 'STPT', role: 'STPT', maxH: 23, experienceMonths: 3 },
    { id: '202', name: 'Phạm Thị D (PT Cứng)', dept: 'VN0485', type: 'STPT', role: 'STPT', maxH: 23, experienceMonths: 2 },
    { id: '301', name: 'Đỗ Văn Mới (CSR Mới)', dept: 'VN0485', type: 'CSR_NEW', role: 'CSR_NEW', maxH: 48, experienceMonths: 0 }
  ];

  describe('Daily Rest Law (>= 11h between consecutive shifts)', () => {
    it('should flag violation when evening shift (14-22) is followed by early morning shift (6-14)', () => {
      // 22:00 -> 06:00 is only 8h rest (violation of >= 11h)
      expect(checkRestPeriodViolation('14-22', '6-14')).toBe(true);
      expect(checkRestPeriodViolation('14-22', '6-10')).toBe(true);
    });

    it('should pass when evening shift (14-22) is followed by midday shift (10-18) or afternoon shift (14-22)', () => {
      // 22:00 -> 10:00 is 12h rest (>= 11h -> OK)
      expect(checkRestPeriodViolation('14-22', '10-18')).toBe(false);
      // 22:00 -> 14:00 is 16h rest -> OK
      expect(checkRestPeriodViolation('14-22', '14-22')).toBe(false);
    });

    it('should flag violation when night shift (22-6) is followed by shifts starting before 18:00', () => {
      expect(checkRestPeriodViolation('22-6', '6-14')).toBe(true);
      expect(checkRestPeriodViolation('22-6', '14-22')).toBe(true);
    });

    it('should pass when night shift (22-6) is followed by day OFF or late evening shift', () => {
      expect(checkRestPeriodViolation('22-6', 'off')).toBe(false);
      expect(checkRestPeriodViolation('22-6', '18-22')).toBe(false);
    });
  });

  describe('Full-Time Weekly Rest Law & Backfill', () => {
    it('should ensure 100% of FT employees have at least 1 mandatory day OFF', () => {
      const result = generateAISchedule(mockEmployees, 'VN0485', {
        requiredMatrix: { '6-14': 2, '14-22': 2, '22-6': 1 }
      });

      // FT staff (101 & 102) must have exactly 1 day OFF (6 working shifts)
      ['101', '102'].forEach(ftId => {
        expect(result.employeeShiftsCount[ftId]).toBeLessThanOrEqual(6);
        expect(result.employeeHours[ftId]).toBe(48);

        // Count number of 'off' days in the week
        const offDays = Object.values(result.schedule[ftId]).filter(s => s === 'off');
        expect(offDays.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should backfill FT into all missing shifts while maintaining rest rules', () => {
      const result = generateAISchedule(mockEmployees, 'VN0485', {
        requiredMatrix: { '6-14': 2, '14-22': 2, '22-6': 1 }
      });

      const audit = auditSchedule(mockEmployees, result.schedule, 'VN0485');
      // Zero rest violations, zero FT weekly rest violations
      const restViolations = audit.issues.filter(i => i.id.startsWith('rest_violation'));
      const ftNoOffViolations = audit.issues.filter(i => i.id.startsWith('ft_no_off'));
      expect(restViolations.length).toBe(0);
      expect(ftNoOffViolations.length).toBe(0);
    });
  });

  describe('auditSchedule for Labor Law Violations', () => {
    it('should flag an error if FT is scheduled 7 days without a day OFF', () => {
      const badSched = {
        '101': { T2: '6-14', T3: '6-14', T4: '6-14', T5: '6-14', T6: '6-14', T7: '6-14', CN: '6-14' } // 7 shifts
      };

      const audit = auditSchedule(mockEmployees, badSched, 'VN0485');
      expect(audit.hasErrors).toBe(true);
      expect(audit.issues.some(i => i.id.startsWith('ft_no_off'))).toBe(true);
    });

    it('should flag daily rest violation when 14-22 is followed by 6-14', () => {
      const badSched = {
        '101': { T2: '14-22', T3: '6-14', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
      };

      const audit = auditSchedule(mockEmployees, badSched, 'VN0485');
      expect(audit.hasErrors).toBe(true);
      expect(audit.issues.some(i => i.id.startsWith('rest_violation'))).toBe(true);
    });
  });

  describe('askAICopilot on Labor Laws & Backfill', () => {
    const mockContext = {
      employees: mockEmployees,
      weekSchedule: {},
      storeId: 'VN0485',
      currentWeek: '2026-08-17'
    };

    it('should explain FT backfill and rest laws', () => {
      const reply = askAICopilot('Full-time bù ca và luật nghỉ thế nào?', mockContext);
      expect(reply).toContain('Full-Time');
      expect(reply).toContain('48h/tuần');
      expect(reply).toContain('11 tiếng');
    });

    it('should answer break time inquiry with exact minutes and law reference', () => {
      const reply1 = askAICopilot('full time có thể được nghỉ bao nhiêu phút', mockContext);
      expect(reply1).toContain('30 phút');
      expect(reply1).toContain('45 phút');

      const reply2 = askAICopilot('full time nghỉ mấy phút', mockContext);
      expect(reply2).toContain('30 phút');
      expect(reply2).toContain('45 phút');
    });

    it('should lookup specific employee schedule and profile by name or ID', () => {
      const contextWithData = {
        ...mockContext,
        weekSchedule: {
          '101': { T2: '6-14', T3: '14-22', T4: 'off', T5: '6-14', T6: '6-14', T7: '6-14', CN: '6-14' }
        }
      };
      const reply = askAICopilot('Lịch của Nguyễn Văn A tuần này thế nào?', contextWithData);
      expect(reply).toContain('Nguyễn Văn A');
      expect(reply).toContain('101');
      expect(reply).toContain('6-14');
    });

    it('should lookup employees working on a specific day', () => {
      const contextWithData = {
        ...mockContext,
        weekSchedule: {
          '101': { T2: '6-14' },
          '201': { T2: '14-22' }
        }
      };
      const reply = askAICopilot('Thứ 2 có ai làm việc?', contextWithData);
      expect(reply).toContain('T2');
      expect(reply).toContain('Nguyễn Văn A');
      expect(reply).toContain('Lê Văn C');
    });

    it('should report pending shift swaps and feedback tickets', () => {
      const contextWithSwaps = {
        ...mockContext,
        shiftSwaps: [
          { id: 's1', requester_id: '101', target_id: '201', requester_shift: '6-14', target_shift: '14-22', date: '2026-08-18', status: 'approved_by_partner' }
        ],
        feedbacks: [
          { id: 'f1', emp_id: '201', shift_type: '8h', date: '2026-08-15', reason: 'Quên vân tay', status: 'pending' }
        ]
      };
      const replySwap = askAICopilot('Có đơn đổi ca nào cần duyệt không?', contextWithSwaps);
      expect(replySwap).toContain('đơn đổi ca');
      expect(replySwap).toContain('Nguyễn Văn A');

      const replyFb = askAICopilot('Kiểm tra đơn bù công', contextWithSwaps);
      expect(replyFb).toContain('bù công');
      expect(replyFb).toContain('Quên vân tay');
    });

    it('answers my shift, PT cap, FT weekly OFF without hijacks', () => {
      const meCtx = {
        ...mockContext,
        user: { id: '201', name: 'Lê Văn C (PT Cứng)', dept: 'VN0485', type: 'STPT' },
        weekSchedule: {
          '201': { T2: '6-14', T3: { shift: '14-22', covering_store: 'VN0497' }, T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
        }
      };
      const mine = askAICopilot('Hôm nay tôi làm ca mấy giờ?', meCtx);
      expect(mine).toMatch(/Lê Văn C|6-14|14-22|OFF/);
      expect(mine).not.toContain('Hỏi ca, giờ, lương');

      expect(askAICopilot('Part time một tuần làm tối đa bao nhiêu tiếng?', mockContext)).toContain('23h');
      expect(askAICopilot('Fulltime một tuần được nghỉ mấy ngày?', mockContext)).toContain('1 ngày OFF');

      const cover = askAICopilot('Lịch của Lê Văn C', meCtx);
      expect(cover).toContain('VN0497');
    });

    it('answers hôm nay Tú làm ca without asking which Tú when logged in as Tú', () => {
      const twoTu = [
        { id: '260716009', name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485', type: 'STFT' },
        { id: '260415020', name: 'MÔNG ANH TÚ', dept: 'VN0485', type: 'STFT' }
      ];
      const weekSchedule = {
        '260716009': { T2: '6-14', T3: '6-14', T4: 'off', T5: '6-14', T6: '6-14', T7: '6-14', CN: '6-14' },
        '260415020': { T2: '14-22', T3: '14-22', T4: '14-22', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
      };
      const asTu = askAICopilot('hôm nay tú làm ca mấy', {
        employees: twoTu, weekSchedule, storeId: 'VN0485', currentWeek: '2026-08-17',
        user: twoTu[0]
      });
      expect(asTu).toContain('DƯƠNG NGỌC TÚ');
      expect(asTu).toMatch(/Hôm nay|Ngày mai/);
      expect(asTu).not.toContain('MÔNG ANH TÚ');
      expect(asTu).not.toContain('cùng tên');

      const asAdmin = askAICopilot('hôm nay tú làm ca mấy', {
        employees: twoTu, weekSchedule, storeId: 'VN0485', currentWeek: '2026-08-17',
        user: { id: 'admin', name: 'Quản trị viên', role: 'admin' }
      });
      expect(asAdmin).toContain('DƯƠNG NGỌC TÚ');
      expect(asAdmin).toContain('MÔNG ANH TÚ');
      expect(asAdmin).toContain('260716009');

      const follow = askAICopilot('260716009', {
        employees: twoTu, weekSchedule, storeId: 'VN0485', currentWeek: '2026-08-17',
        user: { id: 'admin', name: 'Quản trị viên', role: 'admin' }
      }, [{ sender: 'user', text: 'hôm nay tú làm ca mấy' }]);
      expect(follow).toContain('DƯƠNG NGỌC TÚ');
      expect(follow).toMatch(/Hôm nay|Ngày mai/);
      expect(follow).not.toContain('MÔNG ANH TÚ');
    });

    it('reads live shift-swap field names', () => {
      const reply = askAICopilot('Có đơn đổi ca nào cần duyệt không?', {
        ...mockContext,
        shiftSwaps: [{
          fromEmpId: '101', toEmpId: '201', fromEmpName: 'Nguyễn Văn A (SM)', toEmpName: 'Lê Văn C (PT Cứng)',
          fromDay: 'T3', fromShift: '6-14', toShift: '14-22', status: 'pending_partner'
        }]
      });
      expect(reply).toContain('đơn đổi ca');
      expect(reply).toContain('Nguyễn Văn A');
    });
  });
});
