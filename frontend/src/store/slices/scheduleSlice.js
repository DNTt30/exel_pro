import * as api from '../../services/api';
import { assertCanManageStaff, assertWeekEditable, assertCanEditShift, userIsManager } from '../guards';
import { canApproveSchedule } from '../../lib/authSession';
import { weekRecordKey } from '../../utils/scheduleWeek';
import { describeDiff } from '../../utils/appLogs';
import { notifyTelegram } from '../../utils/telegram';
import { buildSwappedSchedules, mergeAiSchedule } from '../../utils/shiftHelper';
import { toast } from '../../components/ui/toastStore';
import { getCurrentMondayWeek } from '../../data/constants';

export const createScheduleSlice = (set, get) => ({
  attendance: {},
  currentWeek: getCurrentMondayWeek(),
  feedbacks: [],
  schedule: {},
  scheduleWeeks: {},
  shiftSwaps: [],

  ensureWeeksLoaded: async (weekKeys = []) => {
    const unique = [...new Set(weekKeys.filter(Boolean))];
    const missing = unique.filter(k => get().schedule[k] === undefined);
    if (missing.length === 0) return;
    const entries = await Promise.all(
      missing.map(async (k) => [k, await api.getSchedulesByWeek(k)])
    );
    set(state => {
      const schedule = { ...state.schedule };
      entries.forEach(([k, data]) => {
        schedule[k] = data;
      });
      return { schedule };
    });
  },

  loadAttendanceRange: async (fromDate, toDate) => {
    try {
      const rows = await api.getAttendanceRange(fromDate, toDate);
      const map = {};
      rows.forEach(r => { map[r.empId + '|' + r.workDate] = { actualHours: r.actualHours, note: r.note }; });
      set({ attendance: map });
    } catch (e) { console.error(e); }
  },

  saveAttendanceCell: async (empId, workDate, hours, updatedBy, note) => {
    const key = empId + '|' + workDate;
    const prev = get().attendance[key] || null;
    const code = String(note || '').trim();
    const hasHours = !(hours === null || isNaN(hours));
    const next = (!hasHours && !code) ? null : { actualHours: hasHours ? hours : 0, note: code || prev?.note || '' };
    set(s => ({
      attendance: (() => { const m2 = { ...s.attendance }; if (next) m2[key] = next; else delete m2[key]; return m2; })()
    }));
    try {
      await api.upsertAttendanceRows(next ? [{ ...next, empId, workDate, updatedBy }] : []);
      if (!next) await api.upsertAttendanceRows([{ empId, workDate, actualHours: 0, updatedBy }]);
      const fmt = r => r ? ((r.actualHours || 0) + 'h' + (r.note ? '/' + r.note : '')) : 'trống';
      void get().appendAdminLog('SUA_CONG_THUC_TE', empId + ' · ' + workDate,
        fmt(prev) + ' → ' + fmt(next) + (updatedBy ? ' (bởi ' + updatedBy + ')' : ''),
        { entityType: 'attendance', entityId: empId }).catch(() => {});
    } catch (e) {
      set(s => ({ attendance: (() => { const m2 = { ...s.attendance }; if (prev) m2[key] = prev; else delete m2[key]; return m2; })() }));
      throw e;
    }
  },

  applyBulkSchedule: async (weekDate, scheduleMap, storeId) => {
    assertCanManageStaff(get());
    const effectiveStoreId = storeId
      || get().user?.dept
      || (Object.keys(scheduleMap)[0] && get().employees.find(e => e.id === Object.keys(scheduleMap)[0])?.dept);
    assertWeekEditable(get(), effectiveStoreId, weekDate);
    const prevWeek = get().schedule[weekDate] || {};
    const oldSlice = {};
    Object.keys(scheduleMap).forEach(id => { oldSlice[id] = prevWeek[id] || {}; });
    try {
      await api.saveBulkEmployeeSchedules(weekDate, scheduleMap);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        throw Object.assign(new Error('Lịch vừa được người khác cập nhật. Tải lại trang để nhận phiên bản mới nhất.'), { code: 'CONFLICT' });
      }
      throw err;
    }
    set(state => ({
      schedule: {
        ...state.schedule,
        [weekDate]: {
          ...(state.schedule[weekDate] || {}),
          ...scheduleMap
        }
      }
    }));
    get().appendAdminLog('UPDATE_SHIFT_BULK', weekDate, `${Object.keys(scheduleMap).length} nhân sự`, {
      resourceType: 'shift',
      resourceId: weekDate,
      storeId: effectiveStoreId || '',
      oldData: oldSlice,
      newData: scheduleMap,
      description: describeDiff({ count: Object.keys(oldSlice).length }, { count: Object.keys(scheduleMap).length }) || `Cập nhật lịch ${Object.keys(scheduleMap).length} NV tuần ${weekDate}`
    });
  },

  applyAiSchedule: async (weekDate, aiSchedule, storeId) => {
    assertCanManageStaff(get());
    assertWeekEditable(get(), storeId, weekDate);
    const existing = get().schedule[weekDate] || {};
    const merged = mergeAiSchedule(existing, aiSchedule, storeId);
    await api.saveBulkEmployeeSchedules(weekDate, merged);
    set(state => ({
      schedule: {
        ...state.schedule,
        [weekDate]: merged
      }
    }));
    get().appendAdminLog('UPDATE_SHIFT_AI', storeId || weekDate, `Tuần ${weekDate}`, {
      resourceType: 'shift',
      resourceId: weekDate,
      storeId: storeId || get().user?.dept || '',
      oldData: existing,
      newData: merged,
      description: `Áp lịch AI tuần ${weekDate} cửa hàng ${storeId || '—'}`
    });
  },

  setCurrentWeek: async (week) => {
    set({ currentWeek: week });
    try {
      const scheds = await api.getSchedulesByWeek(week);
      set(state => ({
        schedule: {
          ...state.schedule,
          [week]: scheds
        }
      }));
    } catch (err) {
      console.error("Lỗi khi tải lịch của tuần:", err);
    }
  },

  saveWeekStatus: async ({ storeId, weekDate, status, reviewNote = '' }) => {
    const user = get().user;
    if (!storeId || !weekDate) throw new Error('Thiếu cửa hàng hoặc tuần');
    if (status === 'pending' && !userIsManager(user)) throw new Error('Chỉ SM gửi duyệt');
    if ((status === 'approved' || status === 'rejected') && !canApproveSchedule(user)) {
      throw new Error('Chỉ AM / Admin duyệt lịch');
    }
    const prev = get().scheduleWeeks[weekRecordKey(storeId, weekDate)] || { storeId, weekDate, status: 'draft' };
    const now = new Date().toISOString();
    const saved = await api.upsertScheduleWeek({
      storeId,
      weekDate,
      status,
      submittedBy: status === 'pending' ? user.id : prev.submittedBy,
      submittedAt: status === 'pending' ? now : prev.submittedAt,
      reviewedBy: (status === 'approved' || status === 'rejected') ? user.id : prev.reviewedBy,
      reviewedAt: (status === 'approved' || status === 'rejected') ? now : prev.reviewedAt,
      reviewNote: reviewNote || prev.reviewNote || ''
    });
    set(state => ({
      scheduleWeeks: { ...state.scheduleWeeks, [weekRecordKey(storeId, weekDate)]: saved }
    }));
    get().appendAdminLog(
      status === 'pending' ? 'SUBMIT_SCHEDULE' : (status === 'approved' ? 'APPROVE_SCHEDULE' : (status === 'rejected' ? 'REJECT_SCHEDULE' : 'UPDATE_SCHEDULE_STATUS')),
      `${storeId}:${weekDate}`,
      status,
      {
        resourceType: 'schedule_week',
        resourceId: `${storeId}:${weekDate}`,
        storeId,
        oldData: { status: prev.status },
        newData: { status, reviewNote: reviewNote || '' },
        description: `${storeId} tuần ${weekDate}: ${prev.status || 'draft'} → ${status}`
      }
    );
    const label = status === 'pending' ? 'chờ duyệt' : (status === 'approved' ? 'đã duyệt' : 'từ chối');
    notifyTelegram(`OFC ${storeId}\nLịch tuần ${weekDate}: ${label}\nNgười: ${user?.name || user?.id}${reviewNote ? `\nGhi chú: ${reviewNote}` : ''}`);
    return saved;
  },

  updateShift: async (weekDate, empId, day, shiftCode) => {
    assertCanEditShift(get(), empId, weekDate);
    const weekSched = get().schedule[weekDate] || {};
    const empSched = weekSched[empId] || { T2:'', T3:'', T4:'', T5:'', T6:'', T7:'', CN:'' };
    const previousShifts = { ...empSched };
    const updatedShifts = { ...empSched, [day]: shiftCode };
    
    set((state) => {
      const latestWeekSched = state.schedule[weekDate] || {};
      const latestEmpSched = latestWeekSched[empId] || { T2:'', T3:'', T4:'', T5:'', T6:'', T7:'', CN:'' };
      const latestUpdated = { ...latestEmpSched, [day]: shiftCode };
      return {
        schedule: {
          ...state.schedule,
          [weekDate]: { ...latestWeekSched, [empId]: latestUpdated }
        }
      };
    });

    try {
      const freshShiftsToSave = get().schedule[weekDate]?.[empId] || updatedShifts;
      await api.saveEmployeeSchedule(weekDate, empId, freshShiftsToSave);
      const emp = get().employees.find(e => e.id === empId);
      get().appendAdminLog('UPDATE_SHIFT', empId, describeDiff({ [day]: previousShifts[day] }, { [day]: shiftCode }), {
        resourceType: 'shift',
        resourceId: `${weekDate}:${empId}:${day}`,
        storeId: emp?.dept || get().user?.dept || '',
        oldData: { weekDate, empId, day, shift: previousShifts[day] || '' },
        newData: { weekDate, empId, day, shift: shiftCode },
        description: `${emp?.name || empId} ${day}: ${previousShifts[day] || '—'} → ${shiftCode || '—'}`
      });
    } catch (err) {
      console.error("Lỗi khi lưu lịch làm việc:", err);
      set((state) => {
        const currentWeekSched = state.schedule[weekDate] || {};
        const currentEmpSched = currentWeekSched[empId] || {};
        return {
          schedule: {
            ...state.schedule,
            [weekDate]: {
              ...currentWeekSched,
              [empId]: { ...currentEmpSched, [day]: previousShifts[day] }
            }
          }
        };
      });
      toast.error(`Không thể lưu lịch làm việc của nhân viên (${empId}): ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
    }
  },

  addFeedback: async (feedback) => {
    const tempId = Date.now().toString();
    const optimisticFb = { id: tempId, status: 'pending', createdAt: new Date().toISOString(), ...feedback };
    
    set(state => ({
      feedbacks: [optimisticFb, ...state.feedbacks]
    }));

    try {
      const created = await api.addFeedback(feedback);
      set(state => ({
        feedbacks: state.feedbacks.map(f => f.id === tempId ? created : f)
      }));
      get().appendAdminLog('CREATE_FEEDBACK', created.id, created.reason || created.date, {
        resourceType: 'feedback',
        resourceId: created.id,
        storeId: created.dept || get().user?.dept || '',
        oldData: null,
        newData: { empId: created.empId, date: created.date, shift: created.shift, reason: created.reason, status: created.status },
        description: `Tạo bù công ${created.empName || created.empId} ngày ${created.date} ca ${created.shift || '—'}`
      });
      return created;
    } catch (err) {
      console.error("Lỗi khi gửi feedback lên Supabase:", err);
      set(state => ({
        feedbacks: state.feedbacks.filter(f => f.id !== tempId)
      }));
      toast.error(`Không thể gửi phản hồi: ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
      throw err;
    }
  },

  resolveFeedback: async (feedbackId, status, resolutionNote, newShiftData = null) => {
    const previousFeedbacks = get().feedbacks;
    const prevFb = previousFeedbacks.find(f => f.id === feedbackId) || {};

    try {
      if (status === 'approved' && newShiftData) {
        await get().updateShift(newShiftData.week, newShiftData.empId, newShiftData.day, newShiftData.shiftCode);
      }
      await api.updateFeedback(feedbackId, status, resolutionNote);

      set(state => ({
        feedbacks: state.feedbacks.map(fb =>
          fb.id === feedbackId
            ? { ...fb, status, resolutionNote, resolvedAt: new Date().toISOString() }
            : fb
        )
      }));

      get().appendAdminLog('UPDATE_FEEDBACK', feedbackId, status, {
        resourceType: 'feedback',
        resourceId: feedbackId,
        storeId: prevFb.dept || get().user?.dept || '',
        oldData: { status: prevFb.status, resolutionNote: prevFb.resolutionNote || '' },
        newData: { status, resolutionNote: resolutionNote || '' },
        description: `Bù công ${prevFb.empName || prevFb.empId || feedbackId}: ${prevFb.status || 'pending'} → ${status}`
      });
    } catch (err) {
      console.error('Lỗi khi duyệt feedback:', err);
      toast.error(`Lỗi khi cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
    }
  },

  updateFeedbackStatus: async (id, status) => {
    const previousFeedbacks = get().feedbacks;
    set((state) => ({
      feedbacks: state.feedbacks.map(f => f.id === id ? { ...f, status } : f)
    }));
    try {
      await api.updateFeedback(id, status);
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái phản hồi:", err);
      set({ feedbacks: previousFeedbacks });
      toast.error(`Không thể cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
    }
  },

  addShiftSwap: async (swapData) => {
    const optimistic = {
      id: 'swap_' + Date.now().toString(),
      status: 'pending_partner',
      createdAt: new Date().toISOString(),
      ...swapData
    };
    set(state => ({
      shiftSwaps: [optimistic, ...(state.shiftSwaps || [])]
    }));

    try {
      const created = await api.addShiftSwap(optimistic);
      set(state => ({
        shiftSwaps: (state.shiftSwaps || []).map(s => s.id === optimistic.id ? created : s)
      }));
      get().appendAdminLog('CREATE_SHIFT_SWAP', created.id, `${created.fromEmpName} ⇄ ${created.toEmpName}`, {
        resourceType: 'shift_swap',
        resourceId: created.id,
        storeId: created.store || get().user?.dept || '',
        oldData: null,
        newData: { fromEmpId: created.fromEmpId, toEmpId: created.toEmpId, fromDay: created.fromDay, toDay: created.toDay, fromShift: created.fromShift, toShift: created.toShift, status: created.status },
        description: `Tạo đổi ca ${created.fromEmpName} ${created.fromDay} ${created.fromShift} ⇄ ${created.toEmpName} ${created.toDay} ${created.toShift}`
      });
      return created;
    } catch (err) {
      set(state => ({
        shiftSwaps: (state.shiftSwaps || []).filter(s => s.id !== optimistic.id)
      }));
      throw err;
    }
  },

  respondShiftSwap: async (swapId, newStatus, note = '') => {
    const currentSwaps = get().shiftSwaps || [];
    const targetSwap = currentSwaps.find(s => s.id === swapId);
    if (!targetSwap) return;

    const previousSwaps = currentSwaps;
    const previousSchedule = get().schedule;
    const resolvedAt = (newStatus === 'approved' || newStatus === 'rejected')
      ? new Date().toISOString()
      : targetSwap.resolvedAt;

    const updated = currentSwaps.map(s => {
      if (s.id === swapId) {
        return {
          ...s,
          status: newStatus,
          managerNote: note || s.managerNote,
          resolvedAt
        };
      }
      return s;
    });

    set({ shiftSwaps: updated });

    try {
      if (!String(swapId).startsWith('swap_')) {
        await api.updateShiftSwap(swapId, {
          status: newStatus,
          managerNote: note || targetSwap.managerNote || '',
          resolvedAt: resolvedAt || null
        });
      }

      if (newStatus === 'approved') {
        const week = targetSwap.week;
        const freshSched = await api.getSchedulesByWeek(week, { 
          empIds: [targetSwap.fromEmpId, targetSwap.toEmpId] 
        });
        const fromShifts = freshSched[targetSwap.fromEmpId] || get().schedule[week]?.[targetSwap.fromEmpId] || {};
        const toShifts = freshSched[targetSwap.toEmpId] || get().schedule[week]?.[targetSwap.toEmpId] || {};

        const swapped = buildSwappedSchedules(fromShifts, toShifts, targetSwap);
        await api.saveBulkEmployeeSchedules(week, swapped);
        
        set(state => ({
          schedule: {
            ...state.schedule,
            [week]: {
              ...(state.schedule[week] || {}),
              ...swapped
            }
          }
        }));
      }

      get().appendAdminLog('UPDATE_SHIFT_SWAP', swapId, newStatus, {
        resourceType: 'shift_swap',
        resourceId: swapId,
        storeId: targetSwap.store || get().user?.dept || '',
        oldData: { status: targetSwap.status, managerNote: targetSwap.managerNote || '' },
        newData: { status: newStatus, managerNote: note || targetSwap.managerNote || '' },
        description: `Đổi ca ${targetSwap.fromEmpName} ⇄ ${targetSwap.toEmpName}: ${targetSwap.status} → ${newStatus}`
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật đơn đổi ca:', err);
      set({ shiftSwaps: previousSwaps, schedule: previousSchedule });
      toast.error(`Không thể cập nhật đơn đổi ca: ${err.message || 'Lỗi kết nối'}`);
    }
  }
});
