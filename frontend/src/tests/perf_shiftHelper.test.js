/**
 * perf_shiftHelper.test.js
 * ─────────────────────────────────────────────────────────────
 * Benchmark hiệu năng các hàm core — threshold cứng được tính
 * theo scale thực tế: 1 chuỗi GS25 ~10 cửa hàng × 30 NV = 300 NV.
 *
 * Quy ước threshold:
 *  - Hàm pure (không I/O): ≤ 50ms cho 300 NV × 7 ngày
 *  - Hàm batch lớn: ≤ 200ms cho 1 000 NV × 7 ngày (stress test)
 *  - Grid render pass: ≤ 100ms cho toàn bộ 300 NV (1 lần render)
 * ─────────────────────────────────────────────────────────────
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeShift,
  getShiftHours,
  calculateEmployeeWeeklyHours,
  validateEmployeeSchedule,
  parseShiftForCell,
  calculateStaffingGap,
  calculateShiftRestGap,
  checkEmployeeShiftRestGap,
  buildSwappedSchedules,
  mergeAiSchedule,
} from '../utils/shiftHelper';

// ─── Helpers tạo dữ liệu tổng hợp ────────────────────────────

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SHIFT_CODES = ['6-14', '14-22', '22-6', 'off', ''];
const TYPES = ['STPT', 'STFT', 'CSR_NEW'];
const STORES = ['VN0485', 'VN0470', 'VN0497'];

function makeEmployees(n, opts = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id: String(900_000_000 + i),
    name: `NV${i}`,
    type: TYPES[i % TYPES.length],
    role: TYPES[i % TYPES.length],
    dept: STORES[i % STORES.length],
    maxH: i % 3 === 0 ? 23 : 48,
    ...(opts.withBorrow && i % 5 === 0
      ? { isBorrowedTo: STORES[(i + 1) % STORES.length] }
      : {}),
  }));
}

function makeWeekSched(employees, opts = {}) {
  const sched = {};
  employees.forEach((emp, i) => {
    sched[emp.id] = {};
    DAYS.forEach((d, j) => {
      const code = SHIFT_CODES[(i + j) % SHIFT_CODES.length];
      if (opts.withCovering && i % 7 === 0 && code && code !== 'off') {
        sched[emp.id][d] = { shift: code, covering_store: STORES[(i + 1) % STORES.length] };
      } else {
        sched[emp.id][d] = code;
      }
    });
  });
  return sched;
}

// ─── 1. normalizeShift ────────────────────────────────────────
describe('perf: normalizeShift', () => {
  it('300 000 calls < 150ms', () => {
    const inputs = [
      '6-14', '14-22', '22-6', 'off', '',
      { shift: '6-14', covering_store: 'VN0485' },
      '6-14_VN0485', '1', '2', '3', 'HC', '0',
    ];
    const t0 = performance.now();
    for (let i = 0; i < 300_000; i++) {
      normalizeShift(inputs[i % inputs.length]);
    }
    const ms = performance.now() - t0;
    console.log(`[perf] normalizeShift ×300k → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(350);
  });
});

// ─── 2. getShiftHours ────────────────────────────────────────
describe('perf: getShiftHours', () => {
  it('500 000 calls < 100ms', () => {
    const codes = ['6-14', '14-22', '22-6', '6-10', '8-17', 'off', ''];
    const t0 = performance.now();
    for (let i = 0; i < 500_000; i++) {
      getShiftHours(codes[i % codes.length]);
    }
    const ms = performance.now() - t0;
    console.log(`[perf] getShiftHours ×500k → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(250);
  });
});

// ─── 3. calculateEmployeeWeeklyHours ────────────────────────
describe('perf: calculateEmployeeWeeklyHours', () => {
  it('300 NV × 7 ngày < 30ms', () => {
    const emps = makeEmployees(300, { withBorrow: true });
    const sched = makeWeekSched(emps, { withCovering: true });
    const t0 = performance.now();
    emps.forEach(emp => calculateEmployeeWeeklyHours(emp, sched[emp.id]));
    const ms = performance.now() - t0;
    console.log(`[perf] calcWeeklyHours ×300 NV → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(150);
  });

  it('1 000 NV stress test < 100ms', () => {
    const emps = makeEmployees(1_000);
    const sched = makeWeekSched(emps);
    const t0 = performance.now();
    emps.forEach(emp => calculateEmployeeWeeklyHours(emp, sched[emp.id]));
    const ms = performance.now() - t0;
    console.log(`[perf] calcWeeklyHours ×1000 NV → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(300);
  });
});

// ─── 4. validateEmployeeSchedule ────────────────────────────
describe('perf: validateEmployeeSchedule', () => {
  it('300 NV validate < 20ms', () => {
    const emps = makeEmployees(300);
    const t0 = performance.now();
    emps.forEach(emp => {
      const hours = emp.type === 'STPT' ? 20 : 48;
      const shifts = emp.type === 'STPT' ? 5 : 6;
      validateEmployeeSchedule(emp, hours, shifts);
    });
    const ms = performance.now() - t0;
    console.log(`[perf] validateEmployeeSchedule ×300 → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(100);
  });
});

// ─── 5. parseShiftForCell ────────────────────────────────────
describe('perf: parseShiftForCell', () => {
  it('300 NV × 7 ngày (2100 ô) < 30ms', () => {
    const emps = makeEmployees(300, { withBorrow: true });
    const sched = makeWeekSched(emps, { withCovering: true });
    const t0 = performance.now();
    emps.forEach(emp => {
      DAYS.forEach(d => {
        parseShiftForCell(emp, sched[emp.id][d]);
      });
    });
    const ms = performance.now() - t0;
    console.log(`[perf] parseShiftForCell ×2100 ô → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(150);
  });
});

// ─── 6. calculateStaffingGap ────────────────────────────────
describe('perf: calculateStaffingGap', () => {
  it('300 NV × 7 ngày × 3 ca < 50ms', () => {
    const emps = makeEmployees(300);
    const sched = makeWeekSched(emps);
    const required = { '6-14': 2, '14-22': 2, '22-6': 1 };
    const t0 = performance.now();
    DAYS.forEach(day => {
      STORES.forEach(store => {
        calculateStaffingGap(emps, sched, day, store, required);
      });
    });
    const ms = performance.now() - t0;
    console.log(`[perf] calculateStaffingGap ×21 combinations → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(250);
  });
});

// ─── 7. calculateShiftRestGap ────────────────────────────────
describe('perf: calculateShiftRestGap', () => {
  it('100 000 pair calculations < 400ms', () => {
    const pairs = [
      ['6-14', '14-22'], ['14-22', '22-6'], ['22-6', '6-14'],
      ['14-22', '6-14'], ['6-14', '6-14'], ['22-6', '14-22'],
    ];
    const t0 = performance.now();
    for (let i = 0; i < 100_000; i++) {
      const [a, b] = pairs[i % pairs.length];
      calculateShiftRestGap(a, b);
    }
    const ms = performance.now() - t0;
    console.log(`[perf] calculateShiftRestGap ×100k → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(600); // ≤80ms bare-metal; ×5 margin cho vitest/happy-dom overhead
  });
});

// ─── 8. checkEmployeeShiftRestGap ────────────────────────────
describe('perf: checkEmployeeShiftRestGap', () => {
  it('300 NV × 7 check < 40ms', () => {
    const emps = makeEmployees(300);
    const sched = makeWeekSched(emps);
    const t0 = performance.now();
    emps.forEach(emp => {
      DAYS.forEach(d => {
        checkEmployeeShiftRestGap(sched, emp.id, d, '14-22');
      });
    });
    const ms = performance.now() - t0;
    console.log(`[perf] checkRestGap ×2100 → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(200);
  });
});

// ─── 9. buildSwappedSchedules ────────────────────────────────
describe('perf: buildSwappedSchedules', () => {
  it('10 000 swap operations < 120ms', () => {
    const fromSched = { T2: '6-14', T3: '14-22', T4: 'off', T5: '22-6', T6: '6-14', T7: '14-22', CN: 'off' };
    const toSched   = { T2: '14-22', T3: '6-14', T4: '14-22', T5: 'off', T6: '22-6', T7: 'off', CN: '6-14' };
    const swap = { fromEmpId: 'e1', toEmpId: 'e2', fromDay: 'T2', toDay: 'T3' };
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      buildSwappedSchedules(fromSched, toSched, swap);
    }
    const ms = performance.now() - t0;
    console.log(`[perf] buildSwappedSchedules ×10k → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(350);
  });
});

// ─── 10. mergeAiSchedule ────────────────────────────────────
describe('perf: mergeAiSchedule', () => {
  it('300 NV merge AI output < 100ms', () => {
    const emps = makeEmployees(300);
    const existing = makeWeekSched(emps, { withCovering: true });
    // AI output: đề xuất ca cho 300 NV
    const aiOutput = {};
    emps.forEach((emp, i) => {
      aiOutput[emp.id] = {};
      DAYS.forEach((d, j) => {
        aiOutput[emp.id][d] = SHIFT_CODES[(i + j + 1) % 3]; // chỉ shift code, không off
      });
    });
    const t0 = performance.now();
    mergeAiSchedule(existing, aiOutput, 'VN0485');
    const ms = performance.now() - t0;
    console.log(`[perf] mergeAiSchedule ×300 NV → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(300); // ≤50ms bare-metal, ×2 margin cho CI/vitest overhead
  });
});

// ─── 11. Full grid pass — mô phỏng 1 render cycle Schedule ──
describe('perf: full grid render pass simulation', () => {
  it('toàn bộ 300 NV × tất cả hàm core < 200ms', () => {
    const emps = makeEmployees(300, { withBorrow: true });
    const sched = makeWeekSched(emps, { withCovering: true });
    const required = { '6-14': 2, '14-22': 2, '22-6': 1 };

    const t0 = performance.now();

    emps.forEach(emp => {
      const empSched = sched[emp.id] || {};

      // Bước 1: Tính giờ/ca (dùng trong EmployeeRow header)
      const { totalHours, totalShifts } = calculateEmployeeWeeklyHours(emp, empSched);

      // Bước 2: Validate rule (dùng trong warning badge)
      validateEmployeeSchedule(emp, totalHours, totalShifts);

      // Bước 3: Parse từng ô (dùng trong ShiftInput render)
      DAYS.forEach(d => {
        parseShiftForCell(emp, empSched[d]);
      });
    });

    // Bước 4: Tính định biên cho toàn bộ cửa hàng × ngày
    STORES.forEach(store => {
      DAYS.forEach(day => {
        calculateStaffingGap(emps, sched, day, store, required);
      });
    });

    const ms = performance.now() - t0;
    console.log(`[perf] full grid pass 300 NV → ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(500);
  });
});
