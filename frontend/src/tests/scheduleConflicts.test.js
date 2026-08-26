import { describe, it, expect } from 'vitest';
import { analyzeEmployeeWeek, analyzeCrossStore, SEVERITY } from '../utils/scheduleConflicts';

const FT = { empId: 'FT01', type: 'STFT', maxH: 48 };
const PT = { empId: 'PT01', type: 'STPT', maxH: 23 };
const fullWeek = { T2: '6-14', T3: '6-14', T4: '6-14', T5: '6-14', T6: '6-14', T7: '6-14', CN: '6-14' };

describe('scheduleConflicts engine', () => {
  it('BLOCKER: mã ca không tồn tại', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: 'NGU' } });
    expect(f.some(x => x.code === 'UNSUPPORTED_SHIFT' && x.severity === SEVERITY.BLOCKER)).toBe(true);
  });

  it('BLOCKER: khoảng giờ vô lý (start === end)', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: '8-8' } });
    expect(f.some(x => x.code === 'INVALID_TIME_RANGE')).toBe(true);
  });

  it('Ca đêm hợp lệ và không báo lỗi giờ', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: '22-6' } });
    expect(f.filter(x => ['INVALID_TIME_RANGE','UNSUPPORTED_SHIFT'].includes(x.code))).toHaveLength(0);
  });

  it('ERROR: nghỉ không đủ giữa 2 ngày (22-6 rồi 6-14)', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: '22-6', T3: '6-14' } });
    const v = f.find(x => x.code === 'INSUFFICIENT_REST');
    expect(v).toBeTruthy();
    expect(v.date).toBe('T3');
  });

  it('Không báo thiếu nghỉ khi cách nhau đủ 8h (14-22 rồi 6-14)', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: '14-22', T3: '6-14' } });
    expect(f.find(x => x.code === 'INSUFFICIENT_REST')).toBeUndefined();
  });

  it('WARNING: PT thiếu giờ tuần', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: '6-14' } });
    expect(f.find(x => x.code === 'UNDER_MIN_HOURS')).toBeTruthy();
  });

  it('WARNING: STFT thiếu số ca (<6)', () => {
    const f = analyzeEmployeeWeek({ ...FT, shifts: { T2: '6-14', T3: '6-14', T4: '6-14' } });
    expect(f.find(x => x.code === 'UNDER_MIN_SHIFTS')).toBeTruthy();
  });

  it('ERROR: STFT vượt định mức tuần (full week 56h > 48h)', () => {
    const f = analyzeEmployeeWeek({ ...FT, shifts: fullWeek });
    expect(f.find(x => x.code === 'OVER_MAX_HOURS')).toBeTruthy();
  });

  it('INFO: ca chi viện được ghi nhận kèm storeId', () => {
    const f = analyzeEmployeeWeek({ ...PT, shifts: { T2: { shift: '6-14', covering_store: 'VN0497' } } });
    const info = f.find(x => x.code === 'COVERING_SHIFT');
    expect(info?.storeId).toBe('VN0497');
  });

  it('CROSS_STORE_DAY: NV bị xếp ở 2 CH cùng ngày', () => {
    const f = analyzeCrossStore([
      { storeId: 'VN0485', scheduleByEmp: { X1: { T2: '6-14' } } },
      { storeId: 'VN0497', scheduleByEmp: { X1: { T2: '14-22' } } },
    ]);
    expect(f.find(x => x.code === 'CROSS_STORE_DAY' && x.employeeId === 'X1')).toBeTruthy();
  });
});
