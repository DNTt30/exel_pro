import { describe, it, expect } from 'vitest';
import { analyzeWeek } from '../utils/scheduleConflicts';

// PHASE 6 — benchmark grid engine trên dữ liệu tổng hợp lớn.
// Không assert cứng thời gian (máy khác nhau); chỉ log + trần an toàn 5s.
function makeLoad(nEmp) {
  const employees = Array.from({ length: nEmp }, (_, i) => ({
    id: String(900000000 + i), name: 'NV' + i,
    type: i % 3 === 0 ? 'STPT' : 'STFT', maxH: i % 3 === 0 ? 23 : 48,
  }));
  const scheduleByEmp = {};
  const codes = ['6-14', '14-22', '22-6', 'off', ''];
  for (const e of employees) {
    const i = Number(e.id) - 900000000;
    scheduleByEmp[e.id] = {};
    for (const d of ['T2','T3','T4','T5','T6','T7','CN']) {
      scheduleByEmp[e.id][d] = codes[(i + d.length) % codes.length];
    }
  }
  return { employees, scheduleByEmp };
}

describe('perf: conflict engine scale', () => {
  it.each([100, 500, 1000])('analyzeWeek với %i nhân viên × 7 ngày', (n) => {
    const { employees, scheduleByEmp } = makeLoad(n);
    const t0 = performance.now();
    analyzeWeek(employees, scheduleByEmp);
    const ms = performance.now() - t0;
    console.log(`[bench] n=${n} → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(5000);
  });
});
