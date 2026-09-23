import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSchedulesByWeek, saveEmployeeSchedule, saveBulkEmployeeSchedules } from '../services/api/schedules';
import { approveShiftSwap } from '../services/api/shiftSwaps';
import { deleteAttendanceCell } from '../services/api/attendance';
import { resolveFeedbackAtomic } from '../services/api/feedbacks';
import { scheduleVersion, withScheduleVersion } from '../utils/scheduleVersion';
import { db } from '../services/api/client';

vi.mock('../services/api/client', () => ({db:vi.fn()}));
let client, query, response;
beforeEach(() => {
  response={data:[{emp_id:'123456789',shifts:{T2:'6-14'},version:7}],error:null};
  query=Object.assign(Promise.resolve(response), {
    select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),delete:vi.fn().mockReturnThis()
  });
  client={from:vi.fn(()=>query),rpc:vi.fn().mockResolvedValue({data:8,error:null})};
  db.mockReturnValue(client);
});
describe('schedule persistence API contract', () => {
  it('passes the exact read version, updates metadata, and leaves the shift shape intact', async () => {
    const schedules=await getSchedulesByWeek('2026-09-21');
    const shifts=schedules['123456789'];
    expect(scheduleVersion(shifts)).toBe(7);
    await saveEmployeeSchedule('2026-09-21','123456789',shifts);
    expect(client.rpc).toHaveBeenCalledWith('save_employee_schedule',{
      p_week_date:'2026-09-21',p_emp_id:'123456789',p_shifts:{T2:'6-14'},p_expect_version:7
    });
    expect(scheduleVersion(shifts)).toBe(8);
    expect(JSON.stringify(shifts)).toBe('{"T2":"6-14"}');
  });
  it('uses version zero only for a missing row and surfaces conflicts', async () => {
    client.rpc.mockResolvedValueOnce({error:{code:'40001',message:'changed'}});
    await expect(saveEmployeeSchedule('2026-09-21','123456789',{})).rejects.toMatchObject({code:'CONFLICT'});
    expect(client.rpc.mock.calls[0][1].p_expect_version).toBe(0);
  });
  it('uses one bulk RPC with individual expected versions', async () => {
    client.rpc.mockResolvedValueOnce({data:[{o_emp_id:'a',o_version:3},{o_emp_id:'b',o_version:6}]});
    const shifts={a:withScheduleVersion({T2:'off'},2),b:withScheduleVersion({T2:''},5)};
    await saveBulkEmployeeSchedules('2026-09-21',shifts);
    expect(client.rpc).toHaveBeenCalledOnce();
    expect(client.rpc.mock.calls[0][1].p_rows.map(row=>row.expect_version)).toEqual([2,5]);
    expect(scheduleVersion(shifts.b)).toBe(6);
  });
  it('does not convert read failures into an empty week', async () => {
    response.data=null;
    response.error=new Error('offline');
    await expect(getSchedulesByWeek('2026-09-21')).rejects.toThrow('offline');
  });
  it('approves through the atomic v2 RPC only', async () => {
    await approveShiftSwap('swap-id','agreed');
    expect(client.rpc).toHaveBeenCalledWith('approve_shift_swap_atomic_v2',{p_swap_id:'swap-id',p_manager_note:'agreed'});
    expect(client.from).not.toHaveBeenCalled();
  });
  it('deletes a cleared attendance override rather than writing zero', async () => {
    await deleteAttendanceCell('123456789','2026-09-21');
    expect(client.from).toHaveBeenCalledWith('attendance');
    expect(query.delete).toHaveBeenCalledOnce();
    expect(query.eq.mock.calls).toEqual([['emp_id','123456789'],['work_date','2026-09-21']]);
  });
  it('sends feedback resolution and its schedule correction in one RPC', async () => {
    const change={week:'2026-09-21',empId:'123456789',day:'T2',shiftCode:'6-14',expect_version:7};
    await resolveFeedbackAtomic('feedback-id','approved','agreed',change);
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith('resolve_feedback_atomic_v2',{
      p_feedback_id:'feedback-id',p_status:'approved',p_resolution_note:'agreed',p_schedule:change
    });
    expect(client.from).not.toHaveBeenCalled();
  });
});
