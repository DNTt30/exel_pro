import { describe, it, expect } from 'vitest';
import { scoreSchedule, DEFAULT_SCORE_WEIGHTS } from '../utils/scheduleScore';
import { assertAiActionAllowed } from '../utils/aiGuard';

describe('phase 7 - scoring & AI guard', () => {
  it('lich sach diem cao hon lich nhieu loi', () => {
    const clean = scoreSchedule([], { employeeCount: 10 });
    const dirty = scoreSchedule([
      { code: 'X', severity: 'BLOCKER', employeeId: 'a', date: 'T2', message: '' },
      { code: 'Y', severity: 'ERROR', employeeId: 'b', date: 'T3', message: '' },
      { code: 'Z', severity: 'WARNING', employeeId: 'c', date: 'T4', message: '' },
    ]);
    expect(clean.score).toBeGreaterThan(dirty.score);
    expect(dirty.breakdown.countsBySeverity.BLOCKER).toBe(1);
  });

  it('trong so configurable lam doi ket qua', () => {
    const base = scoreSchedule([], {});
    const custom = scoreSchedule([], { weights: Object.assign({}, DEFAULT_SCORE_WEIGHTS, { coverage: 5 }) });
    expect(custom.score).toBeLessThan(base.score);
    expect(Object.keys(DEFAULT_SCORE_WEIGHTS)).toContain('understaffPenalty');
  });

  it('AI guard: doc/goi y duoc phep - ghi/duyet bi chan', () => {
    expect(assertAiActionAllowed('read')).toBe(true);
    expect(assertAiActionAllowed('recommend')).toBe(true);
    expect(() => assertAiActionAllowed('delete')).toThrow(/AI_ACTION_FORBIDDEN/);
    expect(() => assertAiActionAllowed('approve')).toThrow(/AI_ACTION_FORBIDDEN/);
  });
});