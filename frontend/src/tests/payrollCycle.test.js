import { describe, it, expect } from 'vitest';
import { getPayrollCycle } from '../utils/payrollCycle';

describe('payrollCycle 26->25', () => {
  it('giua thang: tra ve chu ky thang truoc', () => {
    const c = getPayrollCycle(new Date(2026, 5, 10)); // 10/6/2026
    expect(c.key).toBe('2026-05');
    expect(c.from).toBe('2026-04-26');
    expect(c.to).toBe('2026-05-25');
    expect(c.days.length).toBe(30);
  });

  it('tu ngay 25: chot chu ky thang nay', () => {
    const c = getPayrollCycle(new Date(2026, 5, 25));
    expect(c.key).toBe('2026-06');
    expect(c.to).toBe('2026-06-25');
  });

  it('vuot nam: dau thang 1 chay chu ky 26/12 -> 25/1', () => {
    const c = getPayrollCycle(new Date(2027, 0, 8));
    expect(c.key).toBe('2026-12');
    expect(c.from).toBe('2026-11-26');
    expect(c.to).toBe('2026-12-25');
  });

  it('25/1: chot chu ky 26/12/2026 -> 25/1/2027', () => {
    const c = getPayrollCycle(new Date(2027, 0, 25));
    expect(c.key).toBe('2027-01');
    expect(c.from).toBe('2026-12-26');
    expect(c.days.length).toBe(31);
  });
});