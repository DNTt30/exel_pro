import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';
import { getCurrentMondayWeek, normalizeStaffingConfig, normalizeStoreDemand } from '../data/constants';
import { buildSwappedSchedules, mergeAiSchedule } from '../utils/shiftHelper';
import { ensureAuthSession, signOutAuth, provisionAuthUser, isManagerFromEmp, isAreaManagerFromEmp, isOpsManager, canPickStore, canApproveSchedule } from '../lib/authSession';
import { bootstrapQueryPlan } from '../utils/dataScope';
import { hasCustomAdminPassword, verifyAdminPassword } from '../lib/adminCredential';
import { checkLocked, recordFailure, resetFailures, THROTTLE_MAX_FAILS } from '../lib/loginThrottle';
import { redact, describeDiff, clientMeta, rememberClientIp, capJson } from '../utils/appLogs';
import { weekRecordKey } from '../utils/scheduleWeek';
import { assertWeekEditable, assertCanEditShift, assertCanManageStaff, userIsManager } from './guards';
import { notifyTelegram } from '../utils/telegram';
import { toast } from '../components/ui/toastStore';

function sessionUserFromEmp(emp) {
  return {
    ...emp,
    id: emp.id,
    role: 'employee',
    jobTitle: emp.role,
    isManager: isManagerFromEmp(emp),
    isAreaManager: isAreaManagerFromEmp(emp)
  };
}

async function bindAuthSession(user) {
  const result = await ensureAuthSession(user, { allowSignUp: user?.id === 'admin' });
  if (result.ok) return null;
  if (result.reason === 'no-client' || result.reason === 'no-user') return null;
  console.warn('Supabase Auth chưa sẵn sàng:', result.reason);
  return result.reason;
}

export const useStore = create(
  persist(
    (set, get) => ({
      user: null, 
      login: async (userId, password) => {
        rememberClientIp();
        try {
          let nextUser = null;

          if (userId === 'admin') {
            // Bảo mật: khóa tạm khi thử sai quá nhiều lần
            const lock = checkLocked('admin');
            if (!lock.allowed) {
              const mins = Math.max(1, Math.ceil(lock.retryAfterSec / 60));
              throw new Error('Đã thử sai quá ' + THROTTLE_MAX_FAILS + ' lần. Thử lại sau khoảng ' + mins + ' phút.');
            }
            // Ưu tiên mật khẩu thật (SHA-256+salt); '1' chỉ chấp nhận khi chưa thiết lập
            const customOk = await verifyAdminPassword(password);
            const usingDefault = password === '1' && !hasCustomAdminPassword();
            if (!customOk && !usingDefault) {
              const fail = recordFailure('admin');
              throw new Error(fail.locked ? 'Sai mật khẩu. Tài khoản tạm khóa 5 phút.' : 'Mật khẩu không chính xác');
            }
            nextUser = {
              id: 'admin',
              role: 'admin',
              name: 'Cửa hàng trưởng',
              jobTitle: 'Cửa hàng trưởng',
              isManager: true,
              mustSetupPassword: usingDefault,
              loginAt: Date.now()
            };
          } else {
            let emp = await api.getEmployeeById(userId);
            if (!emp) {
              const emps = await api.getEmployees();
              if (emps.length) set({ employees: emps });
              emp = (emps.length ? emps : get().employees).find(e => e.id === userId);
            }
            if (!emp) throw new Error('Không tìm thấy mã nhân viên');
            const empLock = checkLocked(userId);
            if (!empLock.allowed) {
              const mins = Math.max(1, Math.ceil(empLock.retryAfterSec / 60));
              throw new Error('Đã thử sai quá nhiều lần. Thử lại sau khoảng ' + mins + ' phút.');
            }
            if (password !== '1') {
              recordFailure(userId);
              throw new Error('Mật khẩu không chính xác');
            }
            nextUser = { ...sessionUserFromEmp(emp), loginAt: Date.now() };
          }

          resetFailures(userId);

          set({ user: nextUser, syncStatus: 'loading' });
          get().appendAdminLog('LOGIN_SUCCESS', nextUser.id, isOpsManager(nextUser) ? (nextUser.isAreaManager ? 'OFC' : 'SM') : 'Nhân viên', {
            category: 'security',
            entityType: 'session',
            entityId: nextUser.id,
            storeId: nextUser.dept || '',
            description: `Đăng nhập thành công · ${nextUser.name || nextUser.id}`
          });
          bindAuthSession(nextUser).then((authWarning) => {
            if (get().user?.id === nextUser.id && authWarning !== get().authWarning) {
              set({ authWarning });
            }
          }).catch(() => {});
          return nextUser;
        } catch (err) {
          const meta = clientMeta();
          api.addActivityLog({
            userId: String(userId || ''),
            action: 'LOGIN_FAILED',
            category: 'security',
            entityType: 'session',
            entityId: String(userId || ''),
            description: err.message || 'Đăng nhập thất bại',
            ...meta
          });
          throw err;
        }
      },
      logout: async () => {
        const user = get().user;
        if (user) {
          get().appendAdminLog('LOGOUT', user.id, 'Đăng xuất', {
            category: 'security',
            entityType: 'session',
            entityId: user.id,
            storeId: user.dept || ''
          });
        }
        await signOutAuth();
        set({ user: null, authWarning: null });
      },

      // Data State
      authWarning: null,
      adminLogs: [],
      activityLogs: [],
      auditLogs: [],
      aiConversations: [],
      isInitializing: false,
      syncStatus: 'idle',
      lastSyncedAt: null,
      currentWeek: getCurrentMondayWeek(),
      stores: [],
      employees: [],
      feedbacks: [],
      shelves: [],
      shelfItems: [],
      schedule: {}, // { '2026-08-10': { 'empId': { T2: '6-14', T3: { shift: '14-22', covering_store: 'VN0485' } } } }
      scheduleWeeks: {},
      
      // Async Actions
      initializeData: async () => {
        if (get()._bootstrapping) return;
        set({ isInitializing: true, _bootstrapping: true, syncStatus: 'loading' });
        try {
          const user = get().user;
          const week = get().currentWeek;
          const plan = bootstrapQueryPlan(user);
          const settle = (p, fallback) => {
            const run = Promise.resolve(p).catch((err) => {
              console.error(err);
              return fallback;
            });
            return Promise.race([
              run,
              new Promise((resolve) => setTimeout(() => resolve(fallback), 10000))
            ]);
          };
          const [emps, fbs, scheds, st, swaps, shelves, weekStatuses] = await Promise.all([
            settle(api.getEmployees(plan.employees), []),
            settle(api.getFeedbacks(plan.feedbacks), []),
            settle(api.getSchedulesByWeek(week), {}),
            settle(api.getStores(), []),
            settle(api.getShiftSwaps(plan.swaps), []),
            settle(api.getShelves(plan.shelves), []),
            settle(api.getScheduleWeeks(), [])
          ]);
          const prev = get();
          const employees = emps.length ? emps : prev.employees;
          const itemOpts = plan.shelfItems.storeId
            ? { storeId: plan.shelfItems.storeId }
            : (shelves.length ? { shelfIds: shelves.map(s => s.id) } : {});
          const shelfItems = await settle(api.getShelfItems(itemOpts), prev.shelfItems || []);
          let nextUser = prev.user;
          if (nextUser && nextUser.role !== 'admin') {
            const fresh = employees.find(e => e.id === nextUser.id);
            if (fresh) {
              const synced = sessionUserFromEmp(fresh);
              const changed = nextUser.jobTitle !== synced.jobTitle
                || nextUser.isManager !== synced.isManager
                || nextUser.isAreaManager !== synced.isAreaManager
                || nextUser.dept !== synced.dept
                || nextUser.name !== synced.name;
              nextUser = changed ? synced : nextUser;
            }
          }
          set({
            user: nextUser,
            employees,
            feedbacks: fbs,
            stores: st.length ? st : prev.stores,
            shiftSwaps: swaps,
            shelves,
            shelfItems,
            schedule: {
              ...prev.schedule,
              [week]: scheds
            },
            scheduleWeeks: Object.fromEntries((weekStatuses || []).map(w => [weekRecordKey(w.storeId, w.weekDate), w])),
            syncStatus: 'ok',
            lastSyncedAt: Date.now()
          });
          if (user) {
            bindAuthSession(nextUser || user).then((authWarning) => {
              const cur = get().authWarning;
              if (authWarning !== cur) set({ authWarning });
            }).catch(() => {});
          }
        } catch (err) {
          console.error("Lỗi khởi tạo dữ liệu:", err);
          set({ syncStatus: 'error' });
        } finally {
          set({ isInitializing: false, _bootstrapping: false });
        }
      },

      loadAdminLogs: async () => {
        if (!userIsManager(get().user)) return [];
        const user = get().user;
        const opts = canPickStore(user) || !user?.dept ? {} : { storeId: user.dept };
        const [activity, audit, ai, legacy] = await Promise.all([
          api.getActivityLogs(opts),
          api.getAuditLogs(opts),
          api.getAiConversations(opts),
          api.getAdminLogs()
        ]);
        set({
          activityLogs: activity,
          auditLogs: audit,
          aiConversations: ai,
          adminLogs: activity.length ? activity.map(a => ({
            id: a.id,
            actorId: a.userId,
            actorName: a.metadata?.actorName || a.userId,
            action: a.action,
            target: a.entityId,
            detail: a.description,
            createdAt: a.createdAt
          })) : legacy
        });
        return activity;
      },
      
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

      appendAdminLog: async (action, target = '', detail = '', extra = {}) => {
        const user = get().user;
        const meta = clientMeta();
        const storeId = extra.storeId || user?.dept || '';
        const description = extra.description || String(detail || '');
        const entityId = extra.entityId || extra.resourceId || String(target || '');
        const entityType = extra.entityType || extra.resourceType || '';
        const activity = {
          storeId,
          userId: extra.userId || user?.id || '',
          action,
          category: extra.category || 'activity',
          entityType,
          entityId,
          description,
          metadata: { actorName: user?.name || extra.userId || '', ...(extra.metadata || {}) },
          ...meta
        };
        const shouldAudit = extra.oldData !== undefined || extra.newData !== undefined;
        const [savedActivity, savedAudit] = await Promise.all([
          api.addActivityLog(activity),
          shouldAudit
            ? api.addAuditLog({
              storeId,
              actorId: extra.userId || user?.id || '',
              action,
              resourceType: extra.resourceType || entityType || 'unknown',
              resourceId: entityId,
              oldData: capJson(redact(extra.oldData ?? null)),
              newData: capJson(redact(extra.newData ?? null)),
              metadata: { description, actorName: user?.name || '' },
              ...meta
            })
            : Promise.resolve(null),
          api.addAdminLog({
            actorId: user?.id || extra.userId || '',
            actorName: user?.name || extra.userId || '',
            action,
            target: entityId,
            detail: description
          }).catch(() => null)
        ]);
        set(state => ({
          activityLogs: savedActivity ? [savedActivity, ...(state.activityLogs || [])].slice(0, 300) : state.activityLogs,
          auditLogs: savedAudit ? [savedAudit, ...(state.auditLogs || [])].slice(0, 300) : state.auditLogs,
          adminLogs: [{
            id: savedActivity?.id || 'local_' + Date.now(),
            actorId: activity.userId,
            actorName: user?.name || activity.userId,
            action,
            target: entityId,
            detail: description,
            createdAt: savedActivity?.createdAt || new Date().toISOString()
          }, ...(state.adminLogs || [])].slice(0, 300)
        }));
      },

      logAiTurn: async (payload) => {
        const user = get().user;
        const saved = await api.addAiConversation({
          conversationId: payload.conversationId || `ai_${user?.id || 'anon'}`,
          storeId: payload.storeId || user?.dept || '',
          userId: user?.id || '',
          userMessage: payload.userMessage,
          assistantResponse: payload.assistantResponse,
          intent: payload.intent,
          model: payload.model,
          latencyMs: payload.latencyMs,
          contextUsed: capJson(payload.contextUsed),
          error: payload.error || null
        });
        if (saved) set(state => ({ aiConversations: [saved, ...(state.aiConversations || [])].slice(0, 200) }));
        return saved;
      },

      applyBulkSchedule: async (weekDate, scheduleMap) => {
        assertCanManageStaff(get());
        const storeId = get().user?.dept || Object.keys(scheduleMap)[0] && get().employees.find(e => e.id === Object.keys(scheduleMap)[0])?.dept;
        assertWeekEditable(get(), storeId, weekDate);
        const prevWeek = get().schedule[weekDate] || {};
        const oldSlice = {};
        Object.keys(scheduleMap).forEach(id => { oldSlice[id] = prevWeek[id] || {}; });
        await api.saveBulkEmployeeSchedules(weekDate, scheduleMap);
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
          storeId: get().user?.dept || '',
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

      // CRUD Employees
      addEmployee: async (emp) => {
        assertCanManageStaff(get());
        await api.addEmployee(emp);
        const provisioned = await provisionAuthUser(emp);
        set((state) => ({ employees: [...state.employees, emp] }));
        get().appendAdminLog('CREATE_EMPLOYEE', emp.id, `${emp.name} · ${emp.dept} · ${emp.role || emp.type}`, {
          resourceType: 'employee',
          resourceId: emp.id,
          storeId: emp.dept || '',
          oldData: null,
          newData: { id: emp.id, name: emp.name, dept: emp.dept, role: emp.role, type: emp.type, maxH: emp.maxH },
          description: `Thêm NV ${emp.name} (${emp.id}) · CH ${emp.dept} · ${emp.role || emp.type}`
        });
        if (!provisioned.ok) {
          return {
            ok: true,
            provisionWarning: `Đã lưu nhân viên ${emp.id} nhưng chưa tạo user đăng nhập: ${provisioned.reason}`
          };
        }
        return { ok: true };
      },
      updateEmployee: async (id, updates) => {
        assertCanManageStaff(get());
        const prev = get().employees.find(e => e.id === id) || {};
        await api.updateEmployeeInfo(id, updates);
        set((state) => {
          const employees = state.employees.map(e => e.id === id ? { ...e, ...updates } : e);
          let user = state.user;
          if (user && user.id === id && user.role !== 'admin') {
            const emp = employees.find(e => e.id === id);
            if (emp) user = sessionUserFromEmp(emp);
          }
          return { employees, user };
        });
        get().appendAdminLog('UPDATE_EMPLOYEE', id, describeDiff(prev, { ...prev, ...updates }), {
          resourceType: 'employee',
          resourceId: id,
          storeId: updates.dept || prev.dept || get().user?.dept || '',
          oldData: { name: prev.name, dept: prev.dept, role: prev.role, type: prev.type, maxH: prev.maxH },
          newData: { name: updates.name ?? prev.name, dept: updates.dept ?? prev.dept, role: updates.role ?? prev.role, type: updates.type ?? prev.type, maxH: updates.maxH ?? prev.maxH },
          description: describeDiff(
            { name: prev.name, dept: prev.dept, role: prev.role, type: prev.type, maxH: prev.maxH },
            { name: updates.name ?? prev.name, dept: updates.dept ?? prev.dept, role: updates.role ?? prev.role, type: updates.type ?? prev.type, maxH: updates.maxH ?? prev.maxH }
          ) || `Sửa NV ${id}`
        });
      },
      deleteEmployee: async (id) => {
        assertCanManageStaff(get());
        const prev = get().employees.find(e => e.id === id) || { id };
        await api.deleteEmployeeData(id);
        set((state) => ({
          employees: state.employees.filter(e => e.id !== id)
        }));
        get().appendAdminLog('DELETE_EMPLOYEE', id, `Xóa NV ${prev.name || id}`, {
          resourceType: 'employee',
          resourceId: id,
          storeId: prev.dept || get().user?.dept || '',
          oldData: { id: prev.id, name: prev.name, dept: prev.dept, role: prev.role, type: prev.type },
          newData: null,
          description: `Xóa NV ${prev.name || id} (${id}) khỏi ${prev.dept || '—'}`
        });
      },

      // CRUD Stores
      addStore: async (store) => {
        assertCanManageStaff(get());
        const payload = {
          ...store,
          staffing: normalizeStaffingConfig(store.staffing),
          demand: normalizeStoreDemand(store.demand)
        };
        await api.addStore(payload);
        set((state) => ({ stores: [...state.stores, payload] }));
        get().appendAdminLog('CREATE_STORE', payload.id, payload.name, {
          resourceType: 'store',
          resourceId: payload.id,
          storeId: payload.id,
          oldData: null,
          newData: { id: payload.id, name: payload.name, region: payload.region },
          description: `Thêm cửa hàng ${payload.id} · ${payload.name}`
        });
      },
      updateStore: async (id, updates) => {
        assertCanManageStaff(get());
        const prev = get().stores.find(s => s.id === id) || { id };
        const payload = { ...updates };
        if (payload.staffing) payload.staffing = normalizeStaffingConfig(payload.staffing);
        if (payload.demand) payload.demand = normalizeStoreDemand(payload.demand);
        await api.updateStore(id, payload);
        set((state) => ({
          stores: state.stores.map(s => s.id === id ? { ...s, ...payload } : s)
        }));
        const next = { ...prev, ...payload };
        get().appendAdminLog('UPDATE_STORE', id, describeDiff(prev, next) || payload.name || id, {
          resourceType: 'store',
          resourceId: id,
          storeId: id,
          oldData: { name: prev.name, region: prev.region, staffing: prev.staffing, demand: prev.demand },
          newData: { name: next.name, region: next.region, staffing: next.staffing, demand: next.demand },
          description: describeDiff(
            { name: prev.name, region: prev.region, staffing: prev.staffing, demand: prev.demand },
            { name: next.name, region: next.region, staffing: next.staffing, demand: next.demand }
          ) || `Sửa cửa hàng ${id}`
        });
      },
      deleteStore: async (id) => {
        assertCanManageStaff(get());
        const prev = get().stores.find(s => s.id === id) || { id };
        await api.deleteStore(id);
        set((state) => ({
          stores: state.stores.filter(s => s.id !== id)
        }));
        get().appendAdminLog('DELETE_STORE', id, `Xóa cửa hàng ${prev.name || id}`, {
          resourceType: 'store',
          resourceId: id,
          storeId: id,
          oldData: { id: prev.id, name: prev.name, region: prev.region },
          newData: null,
          description: `Xóa cửa hàng ${id} · ${prev.name || ''}`
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

      // Optimistic update với cơ chế rollback an toàn khi lưu lỗi
      updateShift: async (weekDate, empId, day, shiftCode) => {
        assertCanEditShift(get(), empId, weekDate);
        const weekSched = get().schedule[weekDate] || {};
        const empSched = weekSched[empId] || { T2:'', T3:'', T4:'', T5:'', T6:'', T7:'', CN:'' };
        const previousShifts = { ...empSched };
        const updatedShifts = { ...empSched, [day]: shiftCode };
        
        // 1. Cập nhật UI ngay lập tức (dùng state tươi để tránh lost update khi click nhanh)
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

        // 2. Gửi request lưu lên server
        try {
          await api.saveEmployeeSchedule(weekDate, empId, updatedShifts);
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
          // 3. Rollback lại state cũ nếu có lỗi
          set((state) => ({
            schedule: {
              ...state.schedule,
              [weekDate]: { ...weekSched, [empId]: previousShifts }
            }
          }));
          toast.error(`Không thể lưu lịch làm việc của nhân viên (${empId}): ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
        }
      },

      addFeedback: async (feedback) => {
        const tempId = Date.now().toString();
        const optimisticFb = { id: tempId, status: 'pending', createdAt: new Date().toISOString(), ...feedback };
        
        // Optimistic UI update
        set(state => ({
          feedbacks: [optimisticFb, ...state.feedbacks]
        }));

        try {
          const created = await api.addFeedback(feedback);
          // Thay id tạm bằng id thực từ DB
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
          // Rollback nếu lỗi
          set(state => ({
            feedbacks: state.feedbacks.filter(f => f.id !== tempId)
          }));
          toast.error(`Không thể gửi phản hồi: ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
          throw err;
        }
      },
      resolveFeedback: async (feedbackId, status, resolutionNote, newShiftData = null) => {
        const previousFeedbacks = get().feedbacks;
        
        // Optimistic UI Update
        set(state => {
          const updatedFeedbacks = state.feedbacks.map(fb => {
            if (fb.id === feedbackId) {
              return { ...fb, status, resolutionNote, resolvedAt: new Date().toISOString() };
            }
            return fb;
          });
          return { feedbacks: updatedFeedbacks };
        });
        
        try {
          await api.updateFeedback(feedbackId, status, resolutionNote);
          if (status === 'approved' && newShiftData) {
            // BUG-06 fix: phải await để đảm bảo ca được lưu trước khi tiếp tục
            await get().updateShift(newShiftData.week, newShiftData.empId, newShiftData.day, newShiftData.shiftCode);
          }
          const prevFb = previousFeedbacks.find(f => f.id === feedbackId) || {};
          get().appendAdminLog('UPDATE_FEEDBACK', feedbackId, status, {
            resourceType: 'feedback',
            resourceId: feedbackId,
            storeId: prevFb.dept || get().user?.dept || '',
            oldData: { status: prevFb.status, resolutionNote: prevFb.resolutionNote || '' },
            newData: { status, resolutionNote: resolutionNote || '' },
            description: `Bù công ${prevFb.empName || prevFb.empId || feedbackId}: ${prevFb.status || 'pending'} → ${status}`
          });
        } catch (err) {
          console.error("Lỗi khi duyệt feedback:", err);
          set({ feedbacks: previousFeedbacks });
          toast.error(`Lỗi khi cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
        }
      },

      shiftSwaps: [],
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
          if (newStatus === 'approved') {
            const week = targetSwap.week;
            const weekSched = get().schedule[week] || {};
            const swapped = buildSwappedSchedules(
              weekSched[targetSwap.fromEmpId] || {},
              weekSched[targetSwap.toEmpId] || {},
              targetSwap
            );
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

          if (!String(swapId).startsWith('swap_')) {
            await api.updateShiftSwap(swapId, {
              status: newStatus,
              managerNote: note || targetSwap.managerNote || '',
              resolvedAt: resolvedAt || null
            });
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
      },

      saveShelf: async (shelf) => {
        const user = get().user;
        if (!userIsManager(user) && user?.role !== 'admin') {
          throw new Error('Chỉ SM/admin được tạo hoặc giao kệ');
        }
        if (user?.role !== 'admin' && user?.dept && shelf.storeId && shelf.storeId !== user.dept) {
          throw new Error('Chỉ giao kệ cửa hàng mình');
        }
        const saved = await api.saveShelf(shelf);
        set((state) => {
          const exists = state.shelves.some(s => s.id === saved.id);
          return {
            shelves: exists
              ? state.shelves.map(s => s.id === saved.id ? saved : s)
              : [...state.shelves, saved]
          };
        });
        get().appendAdminLog(shelf.id ? 'UPDATE_SHELF' : 'CREATE_SHELF', saved.id, saved.code, {
          resourceType: 'shelf',
          resourceId: saved.id,
          storeId: saved.storeId || shelf.storeId || '',
          oldData: shelf.id ? { name: shelf.name, assigneeId: shelf.assigneeId, dueDate: shelf.dueDate } : null,
          newData: { name: saved.name, code: saved.code, assigneeId: saved.assigneeId, dueDate: saved.dueDate },
          description: shelf.id
            ? describeDiff({ name: shelf.name, assigneeId: shelf.assigneeId, dueDate: shelf.dueDate }, { name: saved.name, assigneeId: saved.assigneeId, dueDate: saved.dueDate })
            : `Giao kệ ${saved.name || saved.code} cho ${saved.assigneeId || '—'}`
        });
        return saved;
      },
      deleteShelf: async (id) => {
        if (!userIsManager(get().user) && get().user?.role !== 'admin') {
          throw new Error('Chỉ SM/admin được xóa kệ');
        }
        const prev = get().shelves.find(s => s.id === id);
        await api.deleteShelf(id);
        set((state) => ({
          shelves: state.shelves.filter(s => s.id !== id),
          shelfItems: state.shelfItems.filter(i => i.shelfId !== id)
        }));
        get().appendAdminLog('DELETE_SHELF', id, prev?.code || id, {
          resourceType: 'shelf',
          resourceId: id,
          storeId: prev?.storeId || get().user?.dept || '',
          oldData: prev ? { name: prev.name, code: prev.code, assigneeId: prev.assigneeId } : { id },
          newData: null,
          description: `Xóa kệ ${prev?.name || prev?.code || id}`
        });
      },
      saveShelfItems: async (shelfId, rows) => {
        const user = get().user;
        const shelf = get().shelves.find(s => s.id === shelfId);
        if (!shelf) throw new Error('Không tìm thấy kệ');
        // BUG-01 fix: assigneeId có thể là comma-separated (nhiều NV cùng kệ)
        const assigneeIds = (shelf.assigneeId || '').split(',').map(s => s.trim()).filter(Boolean);
        if (user?.role !== 'admin' && !userIsManager(user) && !assigneeIds.includes(user?.id)) {
          throw new Error('Bạn chỉ ghi date kệ được giao');
        }
        if (user?.role !== 'admin' && user?.dept && shelf.storeId !== user.dept) {
          throw new Error('Sai cửa hàng');
        }
        const prevItems = get().shelfItems.filter(i => i.shelfId === shelfId).map(i => ({
          productName: i.productName, sku: i.sku, qty: i.qty, expiryDate: i.expiryDate, expiryDate2: i.expiryDate2
        }));
        const saved = await api.replaceShelfItems(shelfId, shelf.storeId, rows, user?.id);
        set((state) => ({
          shelfItems: [
            ...state.shelfItems.filter(i => i.shelfId !== shelfId),
            ...saved
          ]
        }));
        const nextItems = saved.map(i => ({
          productName: i.productName, sku: i.sku, qty: i.qty, expiryDate: i.expiryDate, expiryDate2: i.expiryDate2
        }));
        get().appendAdminLog('UPDATE_SHELF_ITEMS', shelfId, `${saved.length} dòng`, {
          resourceType: 'inventory',
          resourceId: shelfId,
          storeId: shelf.storeId || '',
          oldData: { items: prevItems },
          newData: { items: nextItems },
          description: `Kệ ${shelf.name || shelf.code}: ${prevItems.length} dòng → ${nextItems.length} dòng`
        });
        return saved;
      },

      updateFeedbackStatus: async (id, status) => {
        const previousFeedbacks = get().feedbacks;
        // Optimistic Update
        set((state) => ({
          feedbacks: state.feedbacks.map(f => f.id === id ? { ...f, status } : f)
        }));
        try {
          await api.updateFeedback(id, status);
        } catch (err) {
          console.error("Lỗi khi cập nhật trạng thái phản hồi:", err);
          // Rollback
          set({ feedbacks: previousFeedbacks });
          toast.error(`Không thể cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
        }
      }
    }),
    {
      name: 'schedule-storage',
      version: 4,
      partialize: (state) => ({
        currentWeek: state.currentWeek,
        user: state.user
      }),
      migrate: (persisted) => {
        let user = persisted?.user || null;
        if (user && (user.id === 'admin' || user.role === 'admin')) {
          user = {
            ...user,
            isManager: true,
            jobTitle: user.jobTitle || 'Cửa hàng trưởng',
            name: user.name === 'Quản trị viên' ? 'Cửa hàng trưởng' : (user.name || 'Cửa hàng trưởng')
          };
        }
        return {
          currentWeek: persisted?.currentWeek || getCurrentMondayWeek(),
          user
        };
      },
    }
  )
);
