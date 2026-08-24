import { describe, it, expect } from 'vitest';
import { generateAISchedule } from '../utils/aiSchedulerEngine';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function mkEmp(id, type, extra = {}) {
  return { id, name: 'NV' + id, dept: 'VN0485', type, ...extra };
}

function hoursOf(schedule, empId) {
  const H = { '6-10': 4, '6-12': 6, '6-14': 8, '14-22': 8, '18-22': 4, '22-6': 8, '10-18': 8 };
  return WEEK_DAYS.reduce((s, d) => {
    const v = schedule[empId]?.[d];
    if (!v || v === 'off') return s;
    const code = typeof v === 'string' ? v : v.shift;
    return s + (H[code] || 0);
  }, 0);
}

describe('AI scheduler improvements', () => {
  it('CSR_NEW duoc tinh nhu full-time (48h, >=6 ca, con 1 ngay off)', () => {
    const emps = [mkEmp('1', 'CSR_NEW')];
    const r = generateAISchedule(emps, 'VN0485');
    expect(hoursOf(r.schedule, '1')).toBe(48);
    const shifts = WEEK_DAYS.filter(d => r.schedule['1'][d] !== 'off').length;
    expect(shifts).toBe(6);
  });

  it('PT voi maxH rieng khong bao gio vuot nguc do', () => {
    const emps = [mkEmp('2', 'STPT', { maxH: 16 })];
    const matrix = { '6-14': 3, '14-22': 3, '22-6': 3 };
    const r = generateAISchedule(emps, 'VN0485', { requiredMatrix: matrix });
    expect(hoursOf(r.schedule, '2')).toBeLessThanOrEqual(16);
  });

  it('FT luon giu it nhat 1 ngay off du backfill manh', () => {
    const emps = [mkEmp('3', 'STFT'), mkEmp('4', 'STPT', { maxH: 8 })];
    const matrix = { '6-14': 2, '14-22': 2, '22-6': 2 };
    const r = generateAISchedule(emps, 'VN0485', { requiredMatrix: matrix });
    const ftOffs = WEEK_DAYS.filter(d => r.schedule['3'][d] === 'off').length;
    expect(ftOffs).toBeGreaterThanOrEqual(1);
  });

  it('bao warnings khi thieu nhan luc', () => {
    const emps = [mkEmp('5', 'STPT', { maxH: 8 })];
    const matrix = { '6-14': 3, '14-22': 3, '22-6': 3 };
    const r = generateAISchedule(emps, 'VN0485', { requiredMatrix: matrix });
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
