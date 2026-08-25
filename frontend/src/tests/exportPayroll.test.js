import { describe, it, expect } from 'vitest';
import { buildPayrollAOA } from '../utils/exportPayroll';

const cycleDates = Array.from({ length: 31 }, (_, i) => ({
  key: 'd' + i,
  shortDisplay: String(i + 1),
  dayKey: 'T2',
  fullDateStr: '2026-03-' + String(i + 1).padStart(2, '0')
}));

describe('exportPayroll — mau C&B web-baocaotonghopcongthang', () => {
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
    if (empId === '2' && day === 'd4') return '8';
    return '';
  };
  const { aoa, merges } = buildPayrollAOA({ cycleDates, groupedEmps, getDayValue, getActualValue });

  it('co tieu de + dia danh merge toan bang (R1, R2)', () => {
    expect(aoa[0][0]).toBe('BẢNG CÔNG TỔNG');
    expect(aoa[1][0]).toBe('Tp Hồ Chí Minh');
    expect(merges).toContainEqual({ s: { r: 0, c: 0 }, e: { r: 0, c: 61 } });
    expect(merges).toContainEqual({ s: { r: 1, c: 0 }, e: { r: 1, c: 61 } });
  });

  it('header 2 dong: 7 cot info merge doc, nhom ngay merge ngang, 24 cot tong hop', () => {
    const W = 7 + 31 + 24;
    expect(aoa[2].length).toBe(W);
    expect(aoa[2][7]).toBe('Ngày công tron');
    // merge ngom nhom ngay
    expect(merges).toContainEqual({ s: { r: 2, c: 7 }, e: { r: 2, c: 37 } });
    // nhan ngay dinh dang "26\nCN Sun"
    expect(String(aoa[3][7])).toMatch(/^01\nT2 Mon$/);
    // cot tong hop le
    expect(aoa[2][38]).toBe('Working day');
    expect(aoa[2][48]).toBe('Tổng công hưởng lương');
    expect(aoa[3][49]).toBe('OT-Ngày thường Normal day');
    expect(merges.filter(x => x.s.r === 2 && x.e.r === 2).length).toBeGreaterThanOrEqual(6);
  });

  it('du lieu: gio thuc/ OFF / ma chu + tong hop PT/FT dung kieu mau', () => {
    const pt = aoa[4];
    const ft = aoa[5];
    expect(pt[7 + 0]).toBe(8);      // theo lich xep 8h
    expect(pt[7 + 1]).toBe('OFF');
    expect(pt[7 + 2]).toBe(7.5);    // cong thuc te ghi de
    expect(pt[7 + 3]).toBe('AL');
    expect(pt[38]).toBe(2);         // Working day
    expect(pt[39]).toBe(15.5);      // Cong cho PT: 8 + 7.5
    expect(pt[39 + 9]).toBe(15.5);  // Tong cong huong luong
    expect(pt[42]).toBe(1);         // Annual Leave count
    expect(ft[40]).toBe(1);         // Cong FT (ngay) = 8h/8
    expect(ft[48]).toBe(8);         // Tong cong FT = so gio
    // bo ban chi-vien khong xuat
  });
});
