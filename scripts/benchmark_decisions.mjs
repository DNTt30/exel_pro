// Local rule latency only. This does NOT measure Jev/network or justify cost claims.
import { performance } from 'node:perf_hooks';
import { rankGapCandidates, scheduleQuality, requiredDecisionWeeks } from '../frontend/src/utils/aiDecisionEngine.js';
const week = '2026-09-28';
const employees = Array.from({ length: 30 }, (_, i) => ({ id: String(100000000 + i), type: i % 3 ? 'STFT' : 'STPT', dept: 'A', maxH: i % 3 ? 48 : 23 }));
const schedule = Object.fromEntries(requiredDecisionWeeks(week).map(w => [w, Object.fromEntries(employees.map(e => [e.id, { T2: 'off', T3: '6-14', T4: '6-14' }]))]));
for (const [name, run] of [
  ['gap-30-employees', () => rankGapCandidates({ employees, schedule, week, day: 'T2', shift: '6-14', storeId: 'A' })],
  ['quality-30-employees', () => scheduleQuality({ employees, schedule, week })],
]) {
  for (let i = 0; i < 30; i++) run();
  const samples = Array.from({ length: 300 }, () => { const start = performance.now(); run(); return performance.now() - start; }).sort((a, b) => a - b);
  console.log(JSON.stringify({ name, samples: samples.length, p50Ms: +samples[149].toFixed(3), p95Ms: +samples[284].toFixed(3), maxMs: +samples.at(-1).toFixed(3) }));
}
