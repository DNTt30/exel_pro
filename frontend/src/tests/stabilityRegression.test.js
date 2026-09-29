import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand';
import { createScheduleSlice } from '../store/slices/scheduleSlice';
import { createAuthSlice } from '../store/slices/authSlice';
import { createShelfSlice } from '../store/slices/shelfSlice';
import { useStore } from '../store/useStore';
import * as api from '../services/api';
import { validateEmployeeSchedule, mergeAiSchedule } from '../utils/shiftHelper';
import { scheduleVersion, withScheduleVersion } from '../utils/scheduleVersion';
import { actualAttendanceValue, scheduledAttendanceValue, timesheetHours, movePayrollCycle } from '../utils/timesheetValues';
import { toast } from '../utils/toast';

vi.mock('../lib/supabase', () => ({ supabase: null }));
vi.mock('../lib/authSession', async (original) => ({ ...await original(),
  ensureAuthSession: vi.fn().mockResolvedValue({ ok: false, reason: 'no-user' }), signOutAuth: vi.fn().mockResolvedValue() }));
vi.mock('../utils/telegram', () => ({ notifyTelegram: vi.fn(), telegramConfigured: () => false }));
vi.mock('../utils/toast', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));
vi.mock('../services/api', () => ({
  getEmployees: vi.fn(), getFeedbacks: vi.fn(), getSchedulesByWeek: vi.fn(), getSchedulesByWeeks: vi.fn(),
  getStores: vi.fn(), getShiftSwaps: vi.fn(), getShelves: vi.fn(), getScheduleWeeks: vi.fn(), getShelfItems: vi.fn(),
  saveEmployeeSchedule: vi.fn(), saveBulkEmployeeSchedules: vi.fn(), updateShiftSwap: vi.fn(), approveShiftSwap: vi.fn(),
  upsertAttendanceRows: vi.fn(), deleteAttendanceCell: vi.fn(), getAttendanceRange: vi.fn(), saveShelf: vi.fn(),
  resolveFeedbackAtomic: vi.fn()
}));

const week = '2026-09-21';
const employee = { id: '260512001', dept: 'VN0485', type: 'STFT' };
const makeStore = () => createStore((set, get) => ({
  ...createAuthSlice(set, get), ...createScheduleSlice(set, get), ...createShelfSlice(set, get),
  user: { id: 'admin', role: 'admin', loginAt: Date.now() }, employees: [employee], appendAdminLog: vi.fn().mockResolvedValue()
}));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  api.saveEmployeeSchedule.mockImplementation(async (_week, _id, shifts) => withScheduleVersion(shifts, scheduleVersion(shifts) + 1));
  api.saveBulkEmployeeSchedules.mockResolvedValue([]);
  api.upsertAttendanceRows.mockResolvedValue([]);
  api.getSchedulesByWeek.mockResolvedValue({});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('schedule integrity', () => {
  it('debounces remote schedule notices per store instance', async () => {
    vi.useFakeTimers();
    const store = makeStore();
    const event = { new: { week_date: week, emp_id: employee.id, version: 9, shifts: { T2: '6-14' } } };
    store.getState().receiveScheduleEvent(event);
    await vi.advanceTimersByTimeAsync(1000);
    store.getState().receiveScheduleEvent(event);
    await vi.advanceTimersByTimeAsync(1000);
    expect(toast.info).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(toast.info).toHaveBeenCalledOnce();
  });
  it('does not show a delayed realtime notice after the session changes', async () => {
    vi.useFakeTimers();
    const store = makeStore();
    store.getState().receiveScheduleEvent({ new: { week_date: week, emp_id: employee.id, version: 9, shifts: {} } });
    store.setState({ user: null, _sessionEpoch: (store.getState()._sessionEpoch || 0) + 1 });
    await vi.advanceTimersByTimeAsync(1500);
    expect(toast.info).not.toHaveBeenCalled();
  });
  it('buffers realtime during a write and applies the newer server version afterwards', async () => {
    const store=makeStore(), request=deferred();
    api.saveEmployeeSchedule.mockReturnValueOnce(request.promise);
    const saving=store.getState().updateShift(week,employee.id,'T2','6-14');
    await vi.waitFor(() => expect(api.saveEmployeeSchedule).toHaveBeenCalled());
    store.getState().receiveScheduleEvent({new:{week_date:week,emp_id:employee.id,version:9,shifts:{T2:'22-6'}}});
    expect(store.getState().schedule[week][employee.id].T2).toBe('6-14');
    request.resolve(8); await saving;
    expect(store.getState().schedule[week][employee.id].T2).toBe('22-6');
    expect(scheduleVersion(store.getState().schedule[week][employee.id])).toBe(9);
  });

  it('rejects bulk data prepared before a queued edit commits', async () => {
    const store=makeStore(), request=deferred();
    api.saveEmployeeSchedule.mockImplementationOnce(async (_w,_e,shifts) => { await request.promise; withScheduleVersion(shifts,1); });
    const saving=store.getState().updateShift(week,employee.id,'T2','6-14');
    const bulk=store.getState().applyBulkSchedule(week,{[employee.id]:{T2:'off'}},employee.dept);
    const rejected=expect(bulk).rejects.toThrow('Lịch đã thay đổi');
    await vi.waitFor(() => expect(api.saveEmployeeSchedule).toHaveBeenCalled());
    request.resolve(); await saving; await rejected;
    expect(api.saveBulkEmployeeSchedules).not.toHaveBeenCalled();
    expect(store.getState().schedule[week][employee.id].T2).toBe('6-14');
  });
  it('serializes rapid edits; failed T2 does not erase successful T3', async () => {
    const store = makeStore(); const firstRequest = deferred();
    store.setState({ schedule: { [week]: { [employee.id]: withScheduleVersion({ T2: '', T3: '' }, 4) } } });
    api.saveEmployeeSchedule.mockImplementationOnce(() => firstRequest.promise);
    const first = store.getState().updateShift(week, employee.id, 'T2', '6-14');
    const failed = expect(first).rejects.toThrow('network');
    const second = store.getState().updateShift(week, employee.id, 'T3', '14-22');
    await vi.waitFor(() => expect(api.saveEmployeeSchedule).toHaveBeenCalledOnce());
    expect(store.getState().schedule[week][employee.id].T2).toBe('6-14');
    firstRequest.reject(new Error('network')); await failed; await second;
    expect(store.getState().schedule[week][employee.id]).toEqual({ T2: '', T3: '14-22' });
    expect(scheduleVersion(api.saveEmployeeSchedule.mock.calls[1][2])).toBe(5);
  });

  it('reports failure to the caller rather than marking it saved', async () => {
    api.saveEmployeeSchedule.mockRejectedValueOnce(new Error('network'));
    const store = makeStore();
    await expect(store.getState().updateShift(week, employee.id, 'T2', '6-14')).rejects.toThrow('network');
    expect(store.getState().syncStatus).toBe('error');
  });

  it('does not overwrite newer realtime data when a request fails', async () => {
    const store=makeStore(); const request=deferred();
    api.saveEmployeeSchedule.mockImplementationOnce(() => request.promise);
    const saving=store.getState().updateShift(week, employee.id, 'T2', '6-14');
    const rejected=expect(saving).rejects.toThrow('conflict');
    await vi.waitFor(() => expect(api.saveEmployeeSchedule).toHaveBeenCalled());
    const newer=withScheduleVersion({ T2:'22-6' },9);
    store.setState({ schedule:{[week]:{[employee.id]:newer}} });
    request.reject(new Error('conflict')); await rejected;
    expect(store.getState().schedule[week][employee.id]).toBe(newer);
  });

  it('keeps cached schedules on failed reads', async () => {
    const store = makeStore(); const data = { [employee.id]: { T2: '6-14' } };
    store.setState({ currentWeek: week, schedule: { [week]: data } });
    api.getSchedulesByWeek.mockRejectedValueOnce(new Error('offline'));
    await store.getState().setCurrentWeek(week);
    expect(store.getState().schedule[week]).toBe(data);
  });

  it('AI saves only employees in its result', async () => {
    const store = makeStore();
    store.setState({ schedule: { [week]: { [employee.id]: { T2: '6-14' }, outside: { T2: '22-6' } } } });
    await store.getState().applyAiSchedule(week, { [employee.id]: { T2: '14-22' } }, employee.dept);
    expect(Object.keys(api.saveBulkEmployeeSchedules.mock.calls[0][1])).toEqual([employee.id]);
    expect(store.getState().schedule[week].outside.T2).toBe('22-6');
  });

  it('rejects an AI proposal if a source row changes after generation', () => {
    const store = makeStore();
    const source = { [employee.id]: withScheduleVersion({ T2: 'off' }, 2) };
    store.setState({ schedule: { [week]: { [employee.id]: withScheduleVersion({ T2: '6-14' }, 3) } } });
    expect(() => store.getState().applyAiSchedule(week, { [employee.id]: { T2: '22-6' } }, employee.dept, source)).toThrow('Lịch đã thay đổi');
    expect(api.saveBulkEmployeeSchedules).not.toHaveBeenCalled();
  });

  it('shows a bulk change optimistically and restores only its rows on failure', async () => {
    const store=makeStore(), request=deferred();
    store.setState({schedule:{[week]:{[employee.id]:{T2:'6-14'},outside:{T2:'off'}}}});
    api.saveBulkEmployeeSchedules.mockReturnValueOnce(request.promise);
    const saving=store.getState().applyBulkSchedule(week,{[employee.id]:{T2:'14-22'}},employee.dept);
    const rejected=expect(saving).rejects.toThrow('offline');
    await vi.waitFor(()=>expect(api.saveBulkEmployeeSchedules).toHaveBeenCalled());
    expect(store.getState().schedule[week][employee.id].T2).toBe('14-22');
    request.reject(new Error('offline')); await rejected;
    expect(store.getState().schedule[week][employee.id].T2).toBe('6-14');
    expect(store.getState().schedule[week].outside.T2).toBe('off');
  });

  it('retains covering_store when AI updates a support shift', () => {
    const result=mergeAiSchedule({ x:{T2:{shift:'6-14',covering_store:'VN0485'}} },{x:{T2:'14-22'}},'VN0485');
    expect(result.x.T2).toMatchObject({shift:'14-22',covering_store:'VN0485'});
  });

  it('normalizes week selection to Monday', async () => {
    const store = makeStore(); await store.getState().setCurrentWeek('2026-10-21');
    expect(store.getState().currentWeek).toBe('2026-10-19');
    expect(api.getSchedulesByWeek).toHaveBeenCalledWith('2026-10-19');
  });
});

describe('atomic swaps', () => {
  const swap={ id:'persisted-id', week, store:'VN0485', fromEmpId:employee.id, toEmpId:'260512002', fromDay:'T2', toDay:'T2', status:'pending_manager' };
  it('rolls back the displayed approval when the atomic operation fails', async () => {
    const store=makeStore(); store.setState({shiftSwaps:[swap]});
    api.approveShiftSwap.mockRejectedValueOnce(new Error('transaction failed'));
    await expect(store.getState().respondShiftSwap(swap.id,'approved')).rejects.toThrow('transaction failed');
    expect(store.getState().shiftSwaps[0].status).toBe('pending_manager');
    expect(api.updateShiftSwap).not.toHaveBeenCalled();
    expect(api.saveBulkEmployeeSchedules).not.toHaveBeenCalled();
  });
  it('keeps a committed approval when only the subsequent refresh fails', async () => {
    const store=makeStore(); store.setState({shiftSwaps:[swap]});
    api.approveShiftSwap.mockResolvedValueOnce(true);
    api.getSchedulesByWeek.mockRejectedValueOnce(new Error('offline'));
    await store.getState().respondShiftSwap(swap.id,'approved');
    expect(store.getState().shiftSwaps[0].status).toBe('approved');
  });
});

describe('atomic feedback resolution', () => {
  it('keeps both schedule and feedback pending on transaction failure', async () => {
    const store=makeStore();
    const shifts=withScheduleVersion({T2:'off'},4);
    store.setState({schedule:{[week]:{[employee.id]:shifts}},feedbacks:[{id:'feedback',empId:employee.id,dept:employee.dept,status:'pending'}]});
    api.resolveFeedbackAtomic.mockRejectedValueOnce(new Error('transaction failed'));
    await expect(store.getState().resolveFeedback('feedback','approved','',{week,empId:employee.id,day:'T2',shiftCode:'6-14'})).rejects.toThrow('transaction failed');
    expect(api.resolveFeedbackAtomic.mock.calls[0][3].expect_version).toBe(4);
    expect(store.getState().schedule[week][employee.id]).toBe(shifts);
    expect(store.getState().feedbacks[0].status).toBe('pending');
    expect(api.saveEmployeeSchedule).not.toHaveBeenCalled();
  });
  it('uses the committed schedule and its version returned by the transaction', async () => {
    const store=makeStore();
    store.setState({feedbacks:[{id:'feedback',empId:employee.id,dept:employee.dept,status:'pending'}]});
    api.resolveFeedbackAtomic.mockResolvedValueOnce({week_date:week,emp_id:employee.id,shifts:{T2:'6-14'},version:5});
    await store.getState().resolveFeedback('feedback','approved','agreed',{week,empId:employee.id,day:'T2',shiftCode:'6-14'});
    expect(store.getState().feedbacks[0].status).toBe('approved');
    expect(scheduleVersion(store.getState().schedule[week][employee.id])).toBe(5);
  });
});

describe('attendance and payroll consistency', () => {
  it('serializes edits to a cell and ignores a read started before those edits', async () => {
    const store=makeStore(), read=deferred(), first=deferred();
    api.getAttendanceRange.mockReturnValueOnce(read.promise);
    const loading=store.getState().loadAttendanceRange(week,week);
    api.upsertAttendanceRows.mockReturnValueOnce(first.promise);
    const saving=store.getState().saveAttendanceCell(employee.id,week,4,'admin','');
    const second=store.getState().saveAttendanceCell(employee.id,week,8,'admin','');
    await vi.waitFor(() => expect(api.upsertAttendanceRows).toHaveBeenCalledOnce());
    read.resolve([{empId:employee.id,workDate:week,actualHours:0}]); await loading;
    expect(store.getState().attendance[`${employee.id}|${week}`].actualHours).toBe(4);
    first.resolve(); await saving; await second;
    expect(store.getState().attendance[`${employee.id}|${week}`].actualHours).toBe(8);
  });
  it('clears the persisted override and stays empty after reloading', async () => {
    const store=makeStore(); let rows=[{empId:employee.id,workDate:week,actualHours:8,note:''}];
    api.deleteAttendanceCell.mockImplementationOnce(async () => { rows=[]; });
    api.getAttendanceRange.mockImplementationOnce(async () => rows);
    await store.getState().saveAttendanceCell(employee.id,week,null,'admin','');
    await store.getState().loadAttendanceRange(week,week);
    expect(store.getState().attendance[`${employee.id}|${week}`]).toBeUndefined();
    expect(api.upsertAttendanceRows).not.toHaveBeenCalled();
  });
  it('replaces OFF with 8h without retaining the previous leave code', async () => {
    const store=makeStore();
    await store.getState().saveAttendanceCell(employee.id,week,0,'admin','OFF');
    await store.getState().saveAttendanceCell(employee.id,week,8,'admin','');
    expect(actualAttendanceValue(store.getState().attendance[`${employee.id}|${week}`])).toBe('8');
  });
  it('keeps explicit zero hours separate from absence of an override', () => {
    expect(actualAttendanceValue({actualHours:0,note:''})).toBe('0');
    expect(actualAttendanceValue()).toBe('');
  });
  it('keeps unassigned, OFF and unconfirmed registration distinct', () => {
    expect(scheduledAttendanceValue('')).toBe('');
    expect(scheduledAttendanceValue('off')).toBe('OFF');
    expect(scheduledAttendanceValue({shift:'6-14',confirmed:false})).toBe('');
    expect(scheduledAttendanceValue({shift:'6-14',covering_store:'VN0485'})).toBe('8');
  });
  it('uses the same totals for actual hours and leave codes', () => {
    expect(['4','0','AL','UL','AL_H'].reduce((sum,value)=>sum+timesheetHours(value),0)).toBe(16);
  });
  it('moves payroll months without rollover from day 29/30/31', () => {
    expect(movePayrollCycle({year:2026,month:12},1)).toEqual({year:2027,month:1});
    expect(movePayrollCycle({year:2026,month:3},-1)).toEqual({year:2026,month:2});
  });
  it.each(['STPT','STFT','CSR_NEW'])('warns for zero scheduled hours: %s', type => {
    expect(validateEmployeeSchedule({type},0,0).hasWarnings).toBe(true);
  });
});

describe('session isolation', () => {
  it('logout clears all user data', async () => {
    const store=makeStore(); store.setState({schedule:{[week]:{private:{T2:'6-14'}}}, attendance:{private:{actualHours:8}}});
    await store.getState().logout();
    expect(store.getState()).toMatchObject({user:null,schedule:{},attendance:{},employees:[],_sessionEpoch:1});
  });
  it('ignores bootstrap results and never restarts realtime after logout', async () => {
    const employees=deferred(); api.getEmployees.mockReturnValueOnce(employees.promise);
    for (const name of ['getFeedbacks','getStores','getShiftSwaps','getShelves','getScheduleWeeks','getShelfItems']) api[name].mockResolvedValue([]);
    api.getSchedulesByWeek.mockResolvedValue({private:{T2:'6-14'}});
    const initRealtime=vi.fn();
    useStore.setState({user:{id:'admin',role:'admin',loginAt:Date.now()},_sessionEpoch:10,currentWeek:week,_bootstrapping:false,initRealtime,appendAdminLog:vi.fn().mockResolvedValue()});
    const initializing=useStore.getState().initializeData();
    await vi.waitFor(()=>expect(api.getEmployees).toHaveBeenCalled());
    await useStore.getState().logout(); employees.resolve([employee]); await initializing;
    expect(useStore.getState().schedule).toEqual({});
    expect(initRealtime).not.toHaveBeenCalled();
  });
  it('does not restore an old schedule on a failed save after logout', async () => {
    const store=makeStore(), request=deferred();
    api.saveEmployeeSchedule.mockReturnValueOnce(request.promise);
    const saving=store.getState().updateShift(week,employee.id,'T2','6-14');
    const failed=expect(saving).rejects.toThrow('offline');
    await vi.waitFor(()=>expect(api.saveEmployeeSchedule).toHaveBeenCalled());
    await store.getState().logout(); request.reject(new Error('offline')); await failed;
    expect(store.getState().schedule).toEqual({});
  });
  it('permits multi-store managers to save shelves within their own scope', async () => {
    const store=makeStore(); store.setState({user:{id:employee.id,role:'employee',isManager:true,dept:'VN0485,VN0470'}});
    api.saveShelf.mockResolvedValueOnce({id:'shelf',storeId:'VN0485'});
    await expect(store.getState().saveShelf({storeId:'VN0485',code:'A'})).resolves.toMatchObject({id:'shelf'});
    await expect(store.getState().saveShelf({storeId:'VN9999',code:'A'})).rejects.toThrow();
  });
});
