import { describe, it, expect } from 'vitest';
import { peakStaffFromDemand, matrixFromPeak, demandToMatrices } from '../utils/revenueDemand';
import { generateAISchedule } from '../utils/aiSchedulerEngine';

const mkEmp = (id, type) => ({ id, name: 'NV' + id, dept: 'VN0485', type });

describe('revenueDemand', () => {
  it('doanh thu cao -> nhieu nhan vien hon', () => {
    expect(peakStaffFromDemand(8000000)).toBeLessThan(peakStaffFromDemand(30000000));
    expect(peakStaffFromDemand(5000000)).toBe(1);
    expect(peakStaffFromDemand(0, 600)).toBe(3);
  });

  it('ma tran co ca ngan khi dong, dem thi khong', () => {
    const lowM = matrixFromPeak(1);
    expect(lowM['10-14']).toBeUndefined();
    const hiM = matrixFromPeak(4);
    expect(hiM['22-6']).toBe(1);
    expect(Object.keys(hiM).some(c => ['10-14', '14-18', '18-22'].includes(c))).toBe(true);
  });

  it('cuoi tuan >= ngay thuong', () => {
    const { weekday, weekend } = demandToMatrices({ weekday: { sales: 15000000 }, weekend: { sales: 30000000 } });
    const sum = m => Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(weekend)).toBeGreaterThanOrEqual(sum(weekday));
  });
});

describe('engine theo doanh thu - phan vai PT/FT', () => {
  it('PT lam ca ngan, FT giu ca dai 8h', () => {
    const emps = [mkEmp('f1', 'STFT'), mkEmp('p1', 'STPT'), mkEmp('p2', 'STPT')];
    const byDay = {};
    ['T2','T3','T4','T5','T6','T7','CN'].forEach(d => { byDay[d] = matrixFromPeak(4); });
    const r = generateAISchedule(emps, 'VN0485', { requiredMatrixByDay: byDay });
    const SHORT = ['6-10', '10-14', '14-18', '18-22'];
    let ptShort = 0;
    ['p1', 'p2'].forEach(id => Object.values(r.schedule[id]).forEach(v => {
      if (v && v !== 'off' && SHORT.includes(v)) ptShort++;
    }));
    expect(ptShort).toBeGreaterThanOrEqual(2);
    Object.values(r.schedule.f1).forEach(s => {
      if (s && s !== 'off') expect(['6-14','14-22','22-6','10-18']).toContain(s);
    });
  });
});
