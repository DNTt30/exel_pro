import { describe, it, expect } from 'vitest';
import { addDays, mondayOf, requiredDecisionWeeks, employeeScheduleRisk, assessShiftSwap, rankGapCandidates, scheduleQuality } from '../utils/aiDecisionEngine';
import { routePersonalQuery, answerPersonalQuery, triageShelfItem } from '../utils/decisionRouting';
import { buildSwappedSchedules } from '../utils/shiftHelper';
import { questionsFor, validateAnswers, JEV_API_URL } from '../../../supabase/functions/_shared/jevContract';

const week = '2026-09-28';
const staff = [{ id: '100000001', type: 'STFT', dept: 'A', maxH: 48 }, { id: '100000002', type: 'STFT', dept: 'A', maxH: 48 }];
const six = shift => ({ T2: shift, T3: shift, T4: shift, T5: shift, T6: shift, T7: shift, CN: 'off' });
const context = () => ({ ...Object.fromEntries(requiredDecisionWeeks(week).map(w => [w, {}])), [week]: { '100000001': six('6-14'), '100000002': six('8-16') } });
const swap = { id: 'swap-id', week, store: 'A', fromEmpId: staff[0].id, toEmpId: staff[1].id, fromDay: 'T3', toDay: 'T3', fromShift: '6-14', toShift: '8-16', status: 'pending_manager' };
const assess = (schedule = context(), overrides = {}) => assessShiftSwap({ swap, employees: staff, schedule, now: new Date('2026-09-24T00:00:00Z'), ...overrides });

describe('decision rules and swap gates', () => {
  it('covers both calendar months and adjacent weeks', () => {
    expect(requiredDecisionWeeks(week)).toContain('2026-08-31');
    expect(requiredDecisionWeeks(week)).toContain('2026-10-26');
    expect(mondayOf('2026-10-04')).toBe(week);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('can recommend eligibility but the browser never auto-approves', () => {
    expect(assess()).toMatchObject({ eligible: true, auto_approved: false, risk_level: 0 });
  });
  it('requires partner consent and unchanged requested shifts', () => {
    expect(assess(undefined, { swap: { ...swap, status: 'pending_partner' } }).eligible).toBe(false);
    const schedule = context(); schedule[week][staff[0].id].T3 = 'off';
    expect(assess(schedule).issues[0].code).toBe('INVALID_SWAP');
  });
  it('blocks short notice and missing context', () => {
    expect(assess(undefined, { now: new Date('2026-09-29T00:00:00Z') }).issues.some(i => i.code === 'SHORT_NOTICE')).toBe(true);
    const schedule = context(); delete schedule['2026-09-21'];
    expect(assess(schedule).eligible).toBe(false);
  });
  it('detects night to morning rest across Sunday/Monday', () => {
    const schedule = context(); schedule['2026-09-21'] = { [staff[0].id]: { CN: '22-6' } };
    expect(assess(schedule).issues.some(i => i.code === 'REST')).toBe(true);
  });
  it('does not hide negative rest with modulo arithmetic', () => {
    const schedule = context(); schedule[week][staff[0].id] = { T2: '22-8', T3: '6-14' };
    expect(employeeScheduleRisk(staff[0], schedule, week).issues.find(i => i.code === 'REST').message).toContain('-2h');
  });
  it('checks PT monthly hours including another week', () => {
    const schedule = context(); const pt = { ...staff[0], type: 'STPT', maxH: 23 };
    schedule[week][pt.id] = { T2: '6-14', T3: '6-14' };
    for (const w of ['2026-09-07', '2026-09-14', '2026-09-21']) schedule[w] = { [pt.id]: { T2: '6-14', T3: '6-14', T4: '6-14', T5: '6-14' } };
    expect(employeeScheduleRisk(pt, schedule, week).issues.some(i => i.code === 'PT_MONTH')).toBe(true);
  });
  it('checks full-time minimum hours and shifts after exchange', () => {
    const schedule = context(); schedule[week][staff[0].id].T7 = 'off';
    expect(assess(schedule).issues.some(i => i.code === 'UNDER_TARGET')).toBe(true);
  });
  it('defers covering shifts and preserves empty versus OFF', () => {
    const schedule = context(); schedule[week][staff[0].id].T3 = { shift: '6-14', covering_store: 'B' };
    expect(assess(schedule).eligible).toBe(false);
    const result = buildSwappedSchedules({ T2: '6-14' }, { T3: '8-16' }, { ...swap, fromDay: 'T2', toDay: 'T3' });
    expect(result[staff[0].id].T2).toBe('');
    expect(result[staff[1].id].T3).toBe('');
  });
});

describe('gap ranking and quality', () => {
  it('includes OFF invitations but excludes busy and unsafe staff', () => {
    const schedule = context();
    schedule[week][staff[0].id] = { T2: 'off' };
    const result = rankGapCandidates({ employees: staff, schedule, week, day: 'T2', shift: '6-14', storeId: 'A' });
    expect(result.map(c => c.emp.id)).toEqual([staff[0].id]);
    expect(result[0].availability).toBe('off');
    expect(rankGapCandidates({ employees: staff.map(e => ({ ...e, isActive: false })), schedule, week, day: 'T2', shift: '6-14', storeId: 'A' })).toEqual([]);
    schedule['2026-09-21'] = { [staff[0].id]: { CN: '22-6' } };
    expect(rankGapCandidates({ employees: staff, schedule, week, day: 'T2', shift: '6-14', storeId: 'A' })).toEqual([]);
  });
  it('keeps employee home store and distinguishes blank availability', () => {
    const employees = [{ ...staff[0], dept: 'B' }];
    const schedule = context(); schedule[week] = {};
    const [result] = rankGapCandidates({ employees, schedule, week, day: 'T3', shift: '6-14', storeId: 'A' });
    expect(result).toMatchObject({ isLocal: false, availability: 'unassigned' });
    expect(employees[0].dept).toBe('B');
  });
  it('does not award a high score to an empty board', () => {
    expect(scheduleQuality({ employees: staff, schedule: { [week]: {} }, week }).score).toBeNull();
  });
  it('reports consecutive nights and marks incomplete context', () => {
    const schedule = context(); schedule[week][staff[0].id] = { T2: '22-6', T3: '22-6', T4: '22-6' };
    expect(scheduleQuality({ employees: staff, schedule, week }).issues.some(i => i.code === 'NIGHTS')).toBe(true);
    expect(scheduleQuality({ employees: staff, schedule: { [week]: schedule[week] }, week }).provisional).toBe(true);
  });
});

describe('personal intent router', () => {
  const now = new Date('2026-10-04T10:00:00Z');
  it('routes tomorrow across week boundary in Vietnam', () => {
    expect(routePersonalQuery('Mai em làm ca mấy?', now)).toEqual({ intent: 'FETCH_USER_SCHEDULE', date: '2026-10-05', week: '2026-10-05' });
    expect(routePersonalQuery('Tuần này em làm bao nhiêu tiếng?', now)?.intent).toBe('FETCH_USER_HOURS');
  });
  it.each(['Mai em làm ca mấy và nên đổi ca với ai?', 'Tôi được làm tối đa bao nhiêu giờ?', 'Tuần sau em làm bao nhiêu giờ?', 'Mai Lan làm ca mấy?'])('keeps unsupported request with conversation engine: %s', query => expect(routePersonalQuery(query, now)).toBeNull());
  it('only reads current employee and reports unassigned distinctly', () => {
    const route = routePersonalQuery('Hôm nay tôi làm ca mấy giờ?', now);
    expect(answerPersonalQuery(route, { user: staff[0], schedule: context() })).toContain('OFF');
    expect(answerPersonalQuery(route, { user: staff[0], schedule: { [week]: { [staff[1].id]: { CN: '6-14' } } } })).toContain('chưa được xếp');
    expect(answerPersonalQuery(route, { user: staff[0], schedule: {} })).toContain('Chưa tải');
  });
});

describe('shelf triage', () => {
  const now = new Date('2026-09-24T02:00:00Z'); // 09:00 VN
  const item = { expiryDate: '2026-09-24', expiryTime: '10:00', qty: 8, averageSalesPerHour: 1, triagePolicy: { canDiscount: true, discountWindowHours: 2 } };
  it('discounts only within explicit policy and expected surplus', () => {
    expect(triageShelfItem(item, now).action).toBe('DISCOUNT_NOW');
    expect(triageShelfItem({ ...item, triagePolicy: {} }, now).action).toBe('MONITOR');
    expect(triageShelfItem({ ...item, qty: 1 }, now).action).toBe('MONITOR');
  });
  it('requires hours for both lots, never infers expiry from the product', () => {
    expect(triageShelfItem({ ...item, expiryTime: '' }, now).action).toBe('MONITOR');
    expect(triageShelfItem({ ...item, expiryDate2: '2026-09-24' }, now).action).toBe('MONITOR');
  });
  it('expires at exact hour and never discounts expired stock', () => {
    expect(triageShelfItem(item, new Date('2026-09-24T03:00:00Z')).action).toBe('DISCARD');
    expect(triageShelfItem({ ...item, expiryDate2: '2026-09-24', expiryTime2: '08:00' }, now).action).toBe('DISCARD');
  });
  it('handles approved returns and missing sales differently from zero sales', () => {
    expect(triageShelfItem({ ...item, triagePolicy: { canReturn: true, returnWindowHours: 2 } }, now).action).toBe('RETURN_SUPPLIER');
    expect(triageShelfItem({ ...item, averageSalesPerHour: '' }, now).action).toBe('MONITOR');
    expect(triageShelfItem({ ...item, averageSalesPerHour: 0 }, now).action).toBe('DISCOUNT_NOW');
    expect(triageShelfItem({ ...item, expiryDate2: '2026-09-25', expiryTime2: '10:00' }, now).action).toBe('MONITOR');
  });
});

describe('provider contract', () => {
  it('uses the official endpoint and server-authored questions', () => {
    expect(JEV_API_URL).toBe('https://api.typesafe.ai/v1/systemone');
    expect(() => questionsFor('unknown', {})).toThrow();
    expect(() => questionsFor('candidate_ranking', { candidates: [{ alias: 'employee secret' }] })).toThrow();
  });
  it('validates Noul independently from confidence and bounds raw score levels', () => {
    const questions = questionsFor('shift_swap_assessment');
    const answers = { auto_approved: { type: 'noul', noul: 0.99 }, risk_level: { type: 'score', score: 1.5, confidence: 0.97 } };
    expect(validateAnswers(answers, questions)).not.toBeNull();
    for (const score of [NaN, Infinity, -1, 60]) expect(validateAnswers({ ...answers, risk_level: { ...answers.risk_level, score } }, questions)).toBeNull();
    expect(validateAnswers({ ...answers, auto_approved: { type: 'noul', noul: 1.2 } }, questions)).toBeNull();
  });
  it('rejects choices outside the candidate aliases', () => {
    const questions = questionsFor('candidate_ranking', { candidates: [{ alias: 'candidate_0' }] });
    expect(validateAnswers({ best_candidate: { type: 'choice', choice: 'candidate_1', confidence: 1 } }, questions)).toBeNull();
    expect(validateAnswers({ best_candidate: { type: 'choice', choice: 'candidate_0', confidence: 0.95 } }, questions)).not.toBeNull();
  });
});
