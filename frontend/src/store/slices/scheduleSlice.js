import * as api from '../../services/api';
import {
  assertCanManageStaff,
  assertWeekEditable,
  assertCanEditShift,
  userIsManager,
  assertCanResolveFeedback,
  assertCanRespondShiftSwap
} from '../guards';
import { canApproveSchedule } from '../../lib/authSession';
import { weekRecordKey } from '../../utils/scheduleWeek';
import { describeDiff } from '../../utils/appLogs';
import { notifyTelegram } from '../../utils/telegram';
import { mergeAiSchedule } from '../../utils/shiftHelper';
import { toast } from '../../utils/toast'; // utils layer — tránh store → components/ui dependency
import { getCurrentMondayWeek } from '../../data/constants';
import { copyScheduleVersion, scheduleVersion, withScheduleVersion } from '../../utils/scheduleVersion';

// --- Constants ---

/** Default ca trống cho 1 tuần — dùng làm fallback thay vì lặp object literal nhiều lần. */
const EMPTY_WEEK_SHIFTS = Object.freeze({ T2: '', T3: '', T4: '', T5: '', T6: '', T7: '', CN: '' });

// --- Helper functions ---

/** Cập nhật attendance map: set hoặc xóa một key tùy theo giá trị next. */
function updateAttendanceMap(map, key, next) {
  const updated = { ...map };
  if (next) updated[key] = next;
  else delete updated[key];
  return updated;
}


export const createScheduleSlice = (set, get) => {
  let writeQueue = Promise.resolve();
  let attendanceRequest = 0;
  let attendanceQueue = Promise.resolve();
  let attendancePending = 0;
  const scheduleEvents = [];
  const enqueueAttendance = (task) => {
    const epoch = get()._sessionEpoch;
    attendanceRequest++;
    attendancePending++;
    const current = () => get()._sessionEpoch === epoch;
    const result = attendanceQueue.catch(() => {}).then(async () => {
      if (!current()) throw new Error('Phiên đăng nhập đã thay đổi.');
      return task(current);
    }).finally(() => { attendancePending--; });
    attendanceQueue = result;
    return result;
  };
  const enqueueWrite = (task) => {
    const epoch = get()._sessionEpoch;
    const isCurrent = () => get()._sessionEpoch === epoch;
    const result = writeQueue.catch(() => {}).then(async () => {
      if (!isCurrent()) throw new Error('Phiên đăng nhập đã thay đổi.');
      set({ _pendingScheduleWrites: true, _scheduleRevision: (get()._scheduleRevision || 0) + 1 });
      try { return await task(isCurrent); }
      finally {
        if (isCurrent()) {
          set({ _pendingScheduleWrites: false });
          for (const event of scheduleEvents.splice(0)) get().receiveScheduleEvent(event);
        } else scheduleEvents.length = 0;
      }
    });
    writeQueue = result;
    return result;
  };
  const saveShifts = (weekDate, empId, patch) => enqueueWrite(async (isCurrent) => {
    assertCanEditShift(get(), empId, weekDate);
    const previous = get().schedule[weekDate]?.[empId] || EMPTY_WEEK_SHIFTS;
    const next = copyScheduleVersion(previous, { ...previous, ...patch });
    set(state => ({ syncStatus: 'saving', schedule: { ...state.schedule,
      [weekDate]: { ...state.schedule[weekDate], [empId]: next } } }));
    try {
      await api.saveEmployeeSchedule(weekDate, empId, next);
      if (!isCurrent()) return;
      set({ syncStatus: 'saved' });
      void get().appendAdminLog('UPDATE_SHIFT', empId, describeDiff(previous, next), {
        resourceType: 'shift', resourceId: `${weekDate}:${empId}`,
        oldData: previous, newData: next
      });
    } catch (err) {
      if (isCurrent()) {
        set(state => ({ syncStatus: 'error', schedule: { ...state.schedule,
          [weekDate]: { ...state.schedule[weekDate],
            [empId]: state.schedule[weekDate]?.[empId] === next ? previous : state.schedule[weekDate]?.[empId] } } }));
        toast.error(err.code === 'CONFLICT' ? 'Lịch đã được người khác sửa. Tải lại tuần trước khi tiếp tục.' : `Không lưu được lịch: ${err.message}`);
      }
      throw err;
    }
  });
  return ({
  attendance: {},
  currentWeek: getCurrentMondayWeek(),
  feedbacks: [],
  schedule: {},
  scheduleWeeks: {},
  shiftSwaps: [],
  syncStatus: 'idle', // idle, saving, saved, error

  receiveScheduleEvent: (payload) => {
    if (get()._pendingScheduleWrites) { scheduleEvents.push(payload); return; }
    const row = payload.new;
    if (row?.week_date && row?.emp_id) {
      if (scheduleVersion(get().schedule[row.week_date]?.[row.emp_id]) > (row.version || 0)) return;
      set(state => ({ schedule: { ...state.schedule, [row.week_date]: {
        ...state.schedule[row.week_date], [row.emp_id]: withScheduleVersion(row.shifts || {}, row.version)
      } }, lastSyncedAt: Date.now() }));
      // Thông báo khi lịch người khác thay đổi (không phải do mình ghi)
      const me = get().user;
      if (row.emp_id !== me?.id) {
        toast.info('📅 Lịch vừa được cập nhật theo thời gian thực');
      }
      // Emit event để UI highlight ô vừa đổi
      window.dispatchEvent(new CustomEvent('gs25_schedule_realtime', {
        detail: { weekDate: row.week_date, empId: row.emp_id }
      }));
    } else {
      // DELETE may include only the primary key: refresh every cached week.
      void get().refreshScheduleWeeks(Object.keys(get().schedule)).catch(() => {
        toast.error('Chưa đồng bộ được lịch mới. Vui lòng tải lại tuần.');
      });
    }
  },

  refreshScheduleWeeks: (weeks) => enqueueWrite(async (isCurrent) => {
    const data = await api.getSchedulesByWeeks(weeks);
    if (isCurrent()) set(state => ({ schedule: { ...state.schedule, ...data }, lastSyncedAt: Date.now() }));
  }),

  ensureWeeksLoaded: async (weekKeys = []) => {
    const unique = [...new Set(weekKeys.filter(Boolean))];
    const missing = unique.filter(k => get().schedule[k] === undefined);
    if (missing.length === 0) return;
    // Keep one bulk read, ordered after pending writes instead of dropping it.
    await get().refreshScheduleWeeks(missing);
  },

  loadAttendanceRange: async (fromDate, toDate) => {
    const request = ++attendanceRequest;
    const epoch = get()._sessionEpoch;
    try {
      const rows = await api.getAttendanceRange(fromDate, toDate);
      if (epoch !== get()._sessionEpoch || request !== attendanceRequest || attendancePending) return;
      const map = {};
      rows.forEach(r => { map[r.empId + '|' + r.workDate] = { actualHours: r.actualHours, note: r.note }; });
      set({ attendance: map });
    } catch (e) {
      console.error('[loadAttendanceRange] Không tải được dữ liệu chấm công:', e);
      toast.error('Không tải được dữ liệu chấm công. Vui lòng tải lại trang.');
    }
  },

  saveAttendanceCell: (empId, workDate, hours, updatedBy, note) => enqueueAttendance(async () => {
    const key = empId + '|' + workDate;
    const prev = get().attendance[key] || null;
    const code = String(note || '').trim();
    const epoch = get()._sessionEpoch;
    const hasHours = !(hours == null || isNaN(hours));
    const next = (!hasHours && !code) ? null : { actualHours: hasHours ? hours : 0, note: code };
    set(s => ({ attendance: updateAttendanceMap(s.attendance, key, next) }));
    try {
      if (next) await api.upsertAttendanceRows([{ ...next, empId, workDate, updatedBy }]);
      else await api.deleteAttendanceCell(empId, workDate);
      if (epoch !== get()._sessionEpoch) return;
      const fmt = r => r ? ((r.actualHours || 0) + 'h' + (r.note ? '/' + r.note : '')) : 'trống';
      void get().appendAdminLog('SUA_CONG_THUC_TE', empId + ' · ' + workDate,
        fmt(prev) + ' → ' + fmt(next) + (updatedBy ? ' (bởi ' + updatedBy + ')' : ''),
        { entityType: 'attendance', entityId: empId }).catch(() => {});
    } catch (e) {
      if (epoch === get()._sessionEpoch) set(s => ({ attendance: s.attendance[key] === next || (!next && !s.attendance[key]) ? updateAttendanceMap(s.attendance, key, prev) : s.attendance }));
      throw e;
    }
  }),

  applyBulkAttendance: (records, updatedBy) => enqueueAttendance(async (isCurrent) => {
    if (!records || !records.length) return 0;
    const prevMap = { ...get().attendance };
    const nextMap = { ...prevMap };
    const payload = [];

    records.forEach(r => {
      const key = r.empId + '|' + r.workDate;
      const hours = r.actualHours;
      const note = String(r.note || '').trim();
      const hasHours = !(hours === null || hours === undefined || isNaN(hours));
      const entry = {
        actualHours: hasHours ? hours : 0,
        note: note || ''
      };
      nextMap[key] = entry;
      payload.push({
        empId: r.empId,
        workDate: r.workDate,
        actualHours: entry.actualHours,
        note: entry.note,
        updatedBy
      });
    });

    // Optimistic update
    set({ attendance: nextMap });

    try {
      await api.upsertAttendanceRows(payload);
      if (!isCurrent()) return records.length;
      void get().appendAdminLog(
        'NHAP_CONG_EZHR_EXCEL',
        `${records.length} ô công`,
        `Đã nạp ${records.length} ô công thực tế từ Excel ezHR9 (bởi ${updatedBy || 'SM'})`,
        { entityType: 'attendance', count: records.length }
      ).catch(() => {});
      return records.length;
    } catch (e) {
      // Rollback on error
      if (isCurrent()) set(state => {
        const restored = { ...state.attendance };
        for (const row of records) {
          const key = row.empId + '|' + row.workDate;
          if (restored[key] !== nextMap[key]) continue;
          if (prevMap[key]) restored[key] = prevMap[key]; else delete restored[key];
        }
        return { attendance: restored };
      });
      throw e;
    }
  }),

  applyBulkSchedule: (weekDate, scheduleMap, storeId) => {
    const expected = Object.fromEntries(Object.keys(scheduleMap).map(id => [id, scheduleVersion(get().schedule[weekDate]?.[id])]));
    const snapshot = structuredClone(scheduleMap);
    return enqueueWrite(async (isCurrent) => {
    assertCanManageStaff(get());
    const previous = get().schedule[weekDate] || {};
    const payload = {};
    Object.entries(snapshot).forEach(([id, shifts]) => {
      if (scheduleVersion(previous[id]) !== expected[id]) {
        throw new Error('Lịch đã thay đổi trong lúc chờ lưu. Vui lòng thực hiện lại.');
      }
      assertCanEditShift(get(), id, weekDate);
      payload[id] = copyScheduleVersion(previous[id], { ...shifts });
    });
    if (storeId && storeId !== 'ALL') assertWeekEditable(get(), storeId, weekDate);
    set(state => ({ syncStatus: 'saving', schedule: { ...state.schedule, [weekDate]: { ...state.schedule[weekDate], ...payload } } }));
    try {
      await api.saveBulkEmployeeSchedules(weekDate, payload);
    } catch (error) {
      if (isCurrent()) set(state => {
        const restored = { ...state.schedule[weekDate] };
        for (const id of Object.keys(payload)) {
          if (restored[id] !== payload[id]) continue;
          if (previous[id]) restored[id] = previous[id]; else delete restored[id];
        }
        return { syncStatus: 'error', schedule: { ...state.schedule, [weekDate]: restored } };
      });
      throw error;
    }
    if (!isCurrent()) return;
    set({ syncStatus: 'saved' });
    void get().appendAdminLog('UPDATE_SHIFT_BULK', weekDate, `${Object.keys(payload).length} nhân sự`);
    });
  },

  applyAiSchedule: (weekDate, aiSchedule, storeId) => {
    const existing = get().schedule[weekDate] || {};
    const merged = mergeAiSchedule(existing, aiSchedule, storeId);
    const changes = Object.fromEntries(Object.keys(aiSchedule).map(id => [id, merged[id]]));
    return get().applyBulkSchedule(weekDate, changes, storeId);
  },

  setCurrentWeek: async (week) => {
    week = getCurrentMondayWeek(new Date(`${week}T12:00:00`));
    const prevWeek = get().currentWeek;
    const epoch = get()._sessionEpoch;
    const revision = get()._scheduleRevision;
    set({ currentWeek: week });
    try {
      const scheds = await api.getSchedulesByWeek(week);
      if (epoch !== get()._sessionEpoch || revision !== get()._scheduleRevision || get()._pendingScheduleWrites) return;
      set(state => ({
        schedule: {
          ...state.schedule,
          [week]: scheds
        }
      }));
    } catch (err) {
      console.error('[setCurrentWeek] Lỗi khi tải lịch của tuần:', err);
      if (epoch === get()._sessionEpoch && get().currentWeek === week) set({ currentWeek: prevWeek });
      toast.error(`Không thể tải lịch tuần ${week}. Vui lòng thử lại.`);
    }
  },

  saveWeekStatus: async ({ storeId, weekDate, status, reviewNote = '' }) => {
    const epoch = get()._sessionEpoch;
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
    if (epoch !== get()._sessionEpoch) return saved;
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

  updateShift: (weekDate, empId, day, shiftCode) => saveShifts(weekDate, empId, { [day]: shiftCode }),

  updateEmployeeWeeklyShifts: (weekDate, empId, newShiftsMap) => saveShifts(weekDate, empId, newShiftsMap),

  addFeedback: async (feedback) => {
    const epoch = get()._sessionEpoch;
    const tempId = Date.now().toString();
    const optimisticFb = { id: tempId, status: 'pending', createdAt: new Date().toISOString(), ...feedback };
    
    set(state => ({
      feedbacks: [optimisticFb, ...state.feedbacks]
    }));

    try {
      const created = await api.addFeedback(feedback);
      if (epoch !== get()._sessionEpoch) return created;
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
      if (epoch !== get()._sessionEpoch) throw err;
      console.error("Lỗi khi gửi feedback lên Supabase:", err);
      set(state => ({
        feedbacks: state.feedbacks.filter(f => f.id !== tempId)
      }));
      toast.error(`Không thể gửi phản hồi: ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
      throw err;
    }
  },

  resolveFeedback: (feedbackId, status, resolutionNote, newShiftData = null) => enqueueWrite(async () => {
    const epoch = get()._sessionEpoch;
    const previousFeedbacks = get().feedbacks;
    const prevFb = previousFeedbacks.find(f => f.id === feedbackId) || {};
    assertCanResolveFeedback(get(), prevFb.dept);
    if (prevFb.empId === get().user?.id) throw new Error('Không thể tự duyệt đơn bù công của mình.');

    try {
      let change = null;
      if (status === 'approved' && newShiftData) {
        assertCanEditShift(get(), newShiftData.empId, newShiftData.week);
        change = { ...newShiftData, expect_version: scheduleVersion(get().schedule[newShiftData.week]?.[newShiftData.empId]) };
      }
      const saved = await api.resolveFeedbackAtomic(feedbackId, status, resolutionNote, change);
      if (epoch !== get()._sessionEpoch) return;

      set(state => ({
        schedule: saved?.week_date && saved?.emp_id ? { ...state.schedule,
          [saved.week_date]: { ...state.schedule[saved.week_date], [saved.emp_id]: withScheduleVersion(saved.shifts, saved.version) }
        } : state.schedule,
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
      if (epoch !== get()._sessionEpoch) throw err;
      console.error('Lỗi khi duyệt feedback:', err);
      toast.error(`Lỗi khi cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
      throw err;
    }
  }),

  updateFeedbackStatus: async (id, status) => {
    const epoch = get()._sessionEpoch;
    const previousFeedbacks = get().feedbacks;
    const prevFb = previousFeedbacks.find(f => f.id === id) || {};
    assertCanResolveFeedback(get(), prevFb.dept);

    set((state) => ({
      feedbacks: state.feedbacks.map(f => f.id === id ? { ...f, status } : f)
    }));
    try {
      await api.updateFeedback(id, status);
    } catch (err) {
      if (epoch !== get()._sessionEpoch) throw err;
      console.error("Lỗi khi cập nhật trạng thái phản hồi:", err);
      set(state => ({ feedbacks: state.feedbacks.map(f => f.id === id && f.status === status ? prevFb : f) }));
      toast.error(`Không thể cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
    }
  },

  deleteFeedback: async (id) => {
    const epoch = get()._sessionEpoch;
    const previousFeedbacks = get().feedbacks;
    const prevFb = previousFeedbacks.find(f => f.id === id) || {};
    assertCanResolveFeedback(get(), prevFb.dept);

    set((state) => ({
      feedbacks: state.feedbacks.filter(f => f.id !== id)
    }));

    try {
      await api.deleteFeedback(id);
      if (epoch !== get()._sessionEpoch) return;
      get().appendAdminLog('DELETE_FEEDBACK', id, `Xóa phản hồi ${prevFb.empName || prevFb.empId || id}`, {
        resourceType: 'feedback',
        resourceId: id,
        storeId: prevFb.dept || get().user?.dept || '',
        oldData: { id: prevFb.id, empId: prevFb.empId, date: prevFb.date, reason: prevFb.reason, status: prevFb.status },
        newData: null,
        description: `Xóa khiếu nại bù công ${prevFb.empName || prevFb.empId} ngày ${prevFb.date || '—'}`
      });
    } catch (err) {
      if (epoch !== get()._sessionEpoch) throw err;
      console.error("Lỗi khi xóa phản hồi:", err);
      set(state => ({ feedbacks: state.feedbacks.some(f => f.id === id) ? state.feedbacks : [prevFb, ...state.feedbacks] }));
      toast.error(`Không thể xóa phản hồi: ${err.message || 'Lỗi kết nối'}`);
      throw err;
    }
  },

  addShiftSwap: async (swapData) => {
    const epoch = get()._sessionEpoch;
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
      if (epoch !== get()._sessionEpoch) return created;
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
      if (epoch !== get()._sessionEpoch) throw err;
      set(state => ({
        shiftSwaps: (state.shiftSwaps || []).filter(s => s.id !== optimistic.id)
      }));
      throw err;
    }
  },

  respondShiftSwap: (swapId, newStatus, note = '') => enqueueWrite(async () => {
    const currentSwaps = get().shiftSwaps || [];
    const targetSwap = currentSwaps.find(s => s.id === swapId);
    if (!targetSwap) return;
    assertCanRespondShiftSwap(get(), targetSwap, newStatus);

    const previousSwaps = currentSwaps;
    const epoch = get()._sessionEpoch;
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
      if (String(swapId).startsWith('swap_')) throw new Error('Đơn đang được lưu. Vui lòng thử lại.');
      if (newStatus === 'approved') {
        await api.approveShiftSwap(swapId, note);
        if (epoch !== get()._sessionEpoch) return;
        try {
          const fresh = await api.getSchedulesByWeek(targetSwap.week);
          if (epoch === get()._sessionEpoch) set(state => ({ schedule: { ...state.schedule, [targetSwap.week]: fresh } }));
        } catch {
          toast.error('Đã duyệt đổi ca, nhưng chưa tải được lịch mới. Vui lòng tải lại tuần.');
        }
      } else {
        await api.updateShiftSwap(swapId, { status: newStatus, managerNote: note || targetSwap.managerNote || '', resolvedAt: resolvedAt || null });
      }
      if (epoch !== get()._sessionEpoch) return;

      let autoApproved = false;
      if (newStatus === 'pending_manager') {
        // Consent has already been persisted. Assessment failure must not roll it back.
        try {
          const decision = await api.assessSwapDecision({ swap: { ...targetSwap, status: newStatus }, employees: get().employees, schedule: get().schedule });
          if (epoch !== get()._sessionEpoch) return;
          autoApproved = decision.auto_approved === true;
          if (autoApproved) {
            set(state => ({ shiftSwaps: state.shiftSwaps.map(s => s.id === swapId ? { ...s, status: 'approved', managerNote: 'Jev đã tự duyệt', resolvedAt: new Date().toISOString() } : s) }));
            const fresh = await api.getSchedulesByWeek(targetSwap.week);
            if (epoch === get()._sessionEpoch) set(state => ({ schedule: { ...state.schedule, [targetSwap.week]: fresh } }));
          }
        } catch {
          if (autoApproved) toast.error('Đã tự duyệt nhưng chưa tải được lịch mới. Vui lòng tải lại tuần.');
        }
      }
      if (epoch !== get()._sessionEpoch) return;
      get().appendAdminLog('UPDATE_SHIFT_SWAP', swapId, newStatus, {
        resourceType: 'shift_swap',
        resourceId: swapId,
        storeId: targetSwap.store || get().user?.dept || '',
        oldData: { status: targetSwap.status, managerNote: targetSwap.managerNote || '' },
        newData: { status: autoApproved ? 'approved' : newStatus, managerNote: autoApproved ? 'Jev đã tự duyệt' : note || targetSwap.managerNote || '' },
        description: `Đổi ca ${targetSwap.fromEmpName} ⇄ ${targetSwap.toEmpName}: ${targetSwap.status} → ${autoApproved ? 'approved' : newStatus}`
      });
      return { autoApproved };
    } catch (err) {
      console.error('Lỗi khi cập nhật đơn đổi ca:', err);
      if (epoch === get()._sessionEpoch) set(state => ({ shiftSwaps: state.shiftSwaps.map(s => s.id === swapId ? previousSwaps.find(old => old.id === swapId) : s) }));
      toast.error(`Không thể cập nhật đơn đổi ca: ${err.message || 'Lỗi kết nối'}`);
      throw err;
    }
  }),

  deleteShiftSwap: async (swapId) => {
    const epoch = get()._sessionEpoch;
    const currentSwaps = get().shiftSwaps || [];
    const targetSwap = currentSwaps.find(s => s.id === swapId);
    if (!targetSwap) return;
    assertCanRespondShiftSwap(get(), targetSwap, 'cancelled');

    set(state => ({
      shiftSwaps: (state.shiftSwaps || []).filter(s => s.id !== swapId)
    }));

    try {
      await api.deleteShiftSwap(swapId);
      if (epoch !== get()._sessionEpoch) return;
      get().appendAdminLog('DELETE_SHIFT_SWAP', swapId, `Xóa đơn đổi ca`, {
        resourceType: 'shift_swap',
        resourceId: swapId,
        storeId: targetSwap.store || get().user?.dept || '',
        oldData: { id: targetSwap.id, fromEmpId: targetSwap.fromEmpId, toEmpId: targetSwap.toEmpId, status: targetSwap.status },
        newData: null,
        description: `Xóa đơn đổi ca ${targetSwap.fromEmpName || targetSwap.fromEmpId} ⇄ ${targetSwap.toEmpName || targetSwap.toEmpId}`
      });
    } catch (err) {
      if (epoch !== get()._sessionEpoch) throw err;
      console.error('Lỗi khi xóa đơn đổi ca:', err);
      set(state => ({ shiftSwaps: state.shiftSwaps.some(s => s.id === swapId) ? state.shiftSwaps : [targetSwap, ...state.shiftSwaps] }));
      toast.error(`Không thể xóa đơn đổi ca: ${err.message || 'Lỗi kết nối'}`);
      throw err;
    }
  }
});
};
