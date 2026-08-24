import { describe, it, expect } from 'vitest';
import { buildPayrollAOA } from '../utils/exportPayroll';

const cycleDates = Array.from({ length: 31 }, (_, i) => ({
  key: 'd' + i,
  shortDisplay: String(i + 1),
  dayKey: 'T2',
  fullDateStr: '2026-03-' + String(i + 1).padStart(2, '0')
}));

describe('exportPayroll', () => {
  it('dung bo cot + tong hop cong PT/FT', () => {
    const groupedEmps = { VN0485: [
      { id: '1', name: 'A', type: 'STPT', attendanceCode: 'ATT1' },
      { id: '2', name: 'B', type: 'STFT' }
    ] };
    const getDayValue = (empId, day) => {
      if (empId === '1') return day === 'd0' ? '8' : (day === 'd1' ? 'OFF' : 'OFF');
      return 'OFF';
    };
    const getActualValue = (empId, day) => {
      if (empId === '1' && day === 'd2') return '7.5';
      if (empId === '1' && day === 'd3') return 'AL';
      if (empId === '2' && day === 'd4') return '1';
      return '';
    };
    const aoa = buildPayrollAOA({ cycleDates, groupedEmps, getDayValue, getActualValue });
    expect(aoa[0].slice(0, 7)).toEqual(['STT', 'Mã chấm công', 'Mã nhân viên', 'Họ và Tên', 'Phòng ban', 'Chức vụ', 'Loại NV']);
    expect(aoa.length).toBe(3);
    const pt = aoa[1];
    const ft = aoa[2];
    // Cot ngay bat dau tu index 7; tong hop bat dau tu index 7+31=38
    expect(pt[7 + 0]).toBe(8);       // theo lich xep 8h
    expect(pt[7 + 1]).toBe('OFF');
    expect(pt[7 + 2]).toBe(7.5);     // cong thuc te ghi de
    expect(pt[7 + 3]).toBe('AL');
    expect(pt[38]).toBe(2);          // Working day: d0 + d2
    expect(pt[39]).toBe(15.5);       // Cong cho PT: 8 + 7.5
    expect(pt[42]).toBe(1);          // Annual Leave count
    expect(ft[7 + 4]).toBe(1);       // FT di lam 1 ngay
  });
});