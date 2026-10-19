import { beforeEach, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import { readFileSync } from 'node:fs';
import { weekDateSchema, weekShiftsSchema, attendanceRowSchema } from '../schemas/operationalSchemas';
import { DECISION_RULES, SCHEDULE_RULES } from '../data/constants';
import { analyzeEmployeeWeek } from '../utils/scheduleConflicts';
import { scheduleWriteError } from '../utils/scheduleWriteError';
import { createScheduleOverrideSlice } from '../store/slices/scheduleOverrideSlice';
import { saveEmployeeSchedule, saveBulkEmployeeSchedules } from '../services/api/schedules';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../services/api/client', () => ({ db: () => mocks }));
beforeEach(() => vi.resetAllMocks());

it.each(['2026-02-30','2026-10-13','10/12/2026'])('rejects invalid week %s', value => expect(weekDateSchema.safeParse(value).success).toBe(false));
it.each([{BadDay:'6-14'}, {T2:'25-30'}, {T2:'8-8'}, {T2:['6-14']}, {T2:{shift:'6-14',confirmed:'false'}}, {T2:'0-24'}])('rejects junk shifts %j before API', async shifts => {
  expect(weekShiftsSchema.safeParse(shifts).success).toBe(false);
  await expect(saveEmployeeSchedule('2026-10-12','123456789',shifts)).rejects.toThrow();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('preserves blank, OFF, support, registration and office shift', () => {
  const shifts={T2:'',T3:'off',T4:'6-14_A',T5:{shift:'HC',covering_store:'B',confirmed:false,registered:true}};
  expect(weekShiftsSchema.parse(shifts)).toEqual(shifts);
});
it.each([-1,25,Infinity,NaN])('rejects invalid attendance hours %s', actualHours => {
  expect(attendanceRowSchema.safeParse({empId:'123456789',workDate:'2026-10-12',actualHours}).success).toBe(false);
});
it('detects overnight overlap instead of wrapping negative rest into 24 hours', () => {
  const findings=analyzeEmployeeWeek({empId:'a',type:'STFT',shifts:{T2:'22-8',T3:'6-14'}});
  expect(findings.some(f=>f.code==='OVERLAPPING_SHIFTS')).toBe(true);
});
it('split shifts count as one working day but cannot overlap', () => {
  expect(analyzeEmployeeWeek({empId:'a',type:'STFT',shifts:{T2:'6-10/10-14'}}).some(f=>f.severity==='BLOCKER')).toBe(false);
  expect(analyzeEmployeeWeek({empId:'a',type:'STFT',shifts:{T2:'6-14/10-18'}}).some(f=>f.code==='OVERLAPPING_SHIFTS')).toBe(true);
});
it('availability is excluded from confirmed weekly cap and rest', () => {
  const shifts=Object.fromEntries(['T2','T3','T4','T5','T6','T7','CN'].map(d=>[d,{shift:'22-6',confirmed:false}]));
  expect(analyzeEmployeeWeek({empId:'a',type:'STPT',shifts})).toEqual([]);
});
it('SQL thresholds stay aligned with shared app rules', () => {
  const sql=readFileSync(new URL('../../../supabase/migrations/20261012000002_operational_hardening.sql',import.meta.url),'utf8');
  expect(readFileSync(new URL('../../../supabase/migrations/20261014000001_schedule_rest_and_nights.sql',import.meta.url),'utf8')).toContain(`interval '${DECISION_RULES.MIN_REST_HOURS} hours'`);
  expect(sql).toContain(`THEN ${SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK} ELSE ${SCHEDULE_RULES.STFT_MAX_HOURS_PER_WEEK}`);
});
it('passes override reason only explicitly and retains backend violation details', async () => {
  mocks.rpc.mockResolvedValue({error:{message:'SCHEDULE_RULES',details:'[{"code":"OVER_MAX_HOURS"}]'}});
  await expect(saveBulkEmployeeSchedules('2026-10-12',{a:{T2:'6-14'}},{overrideReason:'Urgent coverage reason'})).rejects.toMatchObject({code:'SCHEDULE_RULES',violations:[{code:'OVER_MAX_HOURS'}]});
  expect(mocks.rpc.mock.calls[0][1].p_override_reason).toBe('Urgent coverage reason');
  expect(scheduleWriteError({message:'SCHEDULE_OVERLAP'}).code).toBe('SCHEDULE_OVERLAP');
});
const store=user=>create((set,get)=>({user,_sessionEpoch:1,...createScheduleOverrideSlice(set,get)}));
it('SM cannot open override; Admin cancellation returns null', async () => {
  expect(await store({id:'sm',role:'employee',isManager:true}).getState().requestScheduleOverride({})).toBe(null);
  const s=store({id:'admin',role:'admin'}), pending=s.getState().requestScheduleOverride({violations:[]});
  s.getState().finishScheduleOverride(null); expect(await pending).toBe(null);
});
it('a role/session change invalidates pending Admin approval', async () => {
  const s=store({id:'admin',role:'admin'}), pending=s.getState().requestScheduleOverride({});
  s.setState({user:{id:'staff',role:'employee'},_sessionEpoch:2});
  s.getState().finishScheduleOverride('A valid lengthy reason'); expect(await pending).toBe(null);
});
