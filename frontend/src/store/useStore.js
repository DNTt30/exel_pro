import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as api from '../services/api';
import { bootstrapQueryPlan } from '../utils/dataScope';
import { weekRecordKey } from '../utils/scheduleWeek';
import { getCurrentMondayWeek, ADMIN_SESSION_MAX_MS, UNREMEMBERED_SESSION_MAX_MS, REALTIME_DEBOUNCE_MS, BOOTSTRAP_BRANCH_TIMEOUT_MS } from '../data/constants';
import { supabase } from '../lib/supabase';

import { createAuthSlice, bindAuthSession, sessionUserFromEmp } from './slices/authSlice';
import { createAdminSlice } from './slices/adminSlice';
import { createEmployeeSlice } from './slices/employeeSlice';
import { createScheduleSlice } from './slices/scheduleSlice';
import { createShelfSlice } from './slices/shelfSlice';
import { createWorkspaceSlice } from './slices/workspaceSlice';
import { createWorkspaceRolesSlice } from './slices/workspaceRolesSlice';
import { createScheduleOverrideSlice } from './slices/scheduleOverrideSlice';
import { toast } from '../utils/toast';
import { sessionPersistence, remembersSession } from '../lib/sessionStorage';
import { isAgentSandbox } from '../lib/agentSandbox';

function sanitizePersistedUser(rawUser) {
  let user = rawUser || null;
  if (user && !user.loginAt) user = { ...user, loginAt: Date.now() };
  if (user && user.id === 'admin') {
    return {
      ...user,
      role: 'admin',
      isManager: true,
      jobTitle: user.jobTitle || 'Quản trị viên',
      name: user.name === 'Cửa hàng trưởng' ? 'Quản trị viên' : (user.name || 'Quản trị viên')
    };
  }
  if (user) {
    return user.role === 'admin' ? null : { ...user, ...sessionUserFromEmp(user) };
  }
  return null;
}

function trimCachedSchedule(schedule, currentWeek) {
  if (!schedule || typeof schedule !== 'object') return {};
  const keys = Object.keys(schedule).sort().reverse();
  const keep = new Set(keys.slice(0, 12));
  if (currentWeek && schedule[currentWeek]) keep.add(currentWeek);
  const out = {};
  for (const k of keep) {
    if (schedule[k]) out[k] = schedule[k];
  }
  return out;
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createAdminSlice(set, get),
      ...createEmployeeSlice(set, get),
      ...createScheduleSlice(set, get),
      ...createShelfSlice(set, get),
      ...createWorkspaceSlice(set, get),
      ...createWorkspaceRolesSlice(set, get),
      ...createScheduleOverrideSlice(set, get),
      
      isInitializing: false,
      syncStatus: 'idle',
      realtimeStatus: 'connecting', // 'connecting' | 'connected' | 'disconnected' | 'error'
      lastSyncedAt: null,
      _bootstrapping: false,
      _realtimeChannel: null,
      _cleanupRealtimeTimers: null,

      initRealtime: () => {
        if (!supabase || !get().user) return;
        const epoch = get()._sessionEpoch;
        const active = () => epoch === get()._sessionEpoch && Boolean(get().user);
        const currentChannel = get()._realtimeChannel;
        if (currentChannel) {
          supabase.removeChannel(currentChannel);
        }
        // Dọn dẹp timer từ lần gọi trước để tránh zombie timers
        get()._cleanupRealtimeTimers?.();

        let schedTimer = null;
        let shelfTimer = null;
        let swapsTimer = null;
        let feedbacksTimer = null;
        let weeksTimer = null;
        let shelvesListTimer = null;

        // Lưu cleanup function vào store để initRealtime có thể gọi lại an toàn
        set({
          realtimeStatus: 'connecting',
          _cleanupRealtimeTimers: () => {
            clearTimeout(schedTimer);
            clearTimeout(shelfTimer);
            clearTimeout(swapsTimer);
            clearTimeout(feedbacksTimer);
            clearTimeout(weeksTimer);
            clearTimeout(shelvesListTimer);
          }
        });

        const channel = supabase.channel('store-sync')
          // 1. Bảng lịch làm việc (schedules): Patch trực tiếp từ row mới, tránh re-fetch cả tuần gây nghẽn DB
          .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
            if (!active()) return;
            console.log('[Realtime] schedules changed:', payload);
            if (payload.new?.week_date && payload.new?.emp_id) {
              get().receiveScheduleEvent(payload);
              return;
            }
            clearTimeout(schedTimer);
            schedTimer = setTimeout(() => {
              if (active()) get().receiveScheduleEvent(payload);
            }, REALTIME_DEBOUNCE_MS);
          })
          // 2. Bảng kệ hàng & date (shelf_items)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shelf_items' }, (payload) => {
            if (!active()) return;
            console.log('[Realtime] shelf_items changed:', payload);
            if (shelfTimer) clearTimeout(shelfTimer);
            shelfTimer = setTimeout(() => {
              if (!active()) return;
              const plan = bootstrapQueryPlan(get().user);
              const shelves = get().shelves;
              const itemOpts = plan.shelfItems.storeId
                ? { storeId: plan.shelfItems.storeId }
                : (shelves.length ? { shelfIds: shelves.map(s => s.id) } : {});
              api.getShelfItems(itemOpts).then(items => {
                if (!active()) return;
                set({ shelfItems: items, lastSyncedAt: Date.now() });
              }).catch(console.error);
            }, REALTIME_DEBOUNCE_MS);
          })
          // 3. Bảng đơn đổi ca (shift_swaps)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_swaps' }, (payload) => {
            if (!active()) return;
            console.log('[Realtime] shift_swaps changed:', payload);
            if (swapsTimer) clearTimeout(swapsTimer);
            swapsTimer = setTimeout(() => {
              if (!active()) return;
              const plan = bootstrapQueryPlan(get().user);
              api.getShiftSwaps(plan.swaps).then(swaps => {
                if (!active()) return;
                set({ shiftSwaps: swaps || [], lastSyncedAt: Date.now() });
                if (payload.eventType === 'INSERT') {
                  toast.info('Có đơn đổi ca mới vừa gửi!');
                } else if (payload.eventType === 'UPDATE') {
                  toast.info('Trạng thái đơn đổi ca vừa được cập nhật');
                }
              }).catch(console.error);
            }, REALTIME_DEBOUNCE_MS);
          })
          // 4. Bảng phản hồi / đơn bù công (feedbacks)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, (payload) => {
            if (!active()) return;
            console.log('[Realtime] feedbacks changed:', payload);
            if (feedbacksTimer) clearTimeout(feedbacksTimer);
            feedbacksTimer = setTimeout(() => {
              if (!active()) return;
              const plan = bootstrapQueryPlan(get().user);
              api.getFeedbacks(plan.feedbacks).then(fbs => {
                if (!active()) return;
                set({ feedbacks: fbs || [], lastSyncedAt: Date.now() });
                if (payload.eventType === 'INSERT') {
                  toast.info('Có đơn bù công / phản hồi mới!');
                }
              }).catch(console.error);
            }, REALTIME_DEBOUNCE_MS);
          })
          // 5. Bảng phê duyệt tuần lịch (schedule_weeks): Đồng bộ tức thì khi AM/Admin duyệt hoặc mở khóa lịch
          .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_weeks' }, (payload) => {
            if (!active()) return;
            console.log('[Realtime] schedule_weeks changed:', payload);
            if (weeksTimer) clearTimeout(weeksTimer);
            weeksTimer = setTimeout(() => {
              if (!active()) return;
              api.getScheduleWeeks().then(weeks => {
                if (!active()) return;
                set({
                  scheduleWeeks: Object.fromEntries((weeks || []).map(w => [weekRecordKey(w.storeId, w.weekDate), w])),
                  lastSyncedAt: Date.now()
                });
              }).catch(console.error);
            }, REALTIME_DEBOUNCE_MS);
          })
          // 6. Bảng phân công kệ hàng (shelves)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shelves' }, (payload) => {
            if (!active()) return;
            console.log('[Realtime] shelves changed:', payload);
            if (shelvesListTimer) clearTimeout(shelvesListTimer);
            shelvesListTimer = setTimeout(() => {
              if (!active()) return;
              const plan = bootstrapQueryPlan(get().user);
              api.getShelves(plan.shelves).then(shelves => {
                if (!active()) return;
                set({ shelves: shelves || [], lastSyncedAt: Date.now() });
              }).catch(console.error);
            }, REALTIME_DEBOUNCE_MS);
          })
          .subscribe((status) => {
            if (!active()) return;
            console.log('[Supabase Realtime Status]:', status);
            if (status === 'SUBSCRIBED') {
              set({ realtimeStatus: 'connected' });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              set({ realtimeStatus: 'error' });
            } else if (status === 'CLOSED') {
              set({ realtimeStatus: 'disconnected' });
            }
          });
          
        set({ _realtimeChannel: channel });
      },

      initializeData: async () => {
        const user = get().user;
        if (!user || get()._bootstrapping) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          set({ isInitializing: false, _bootstrapping: false, syncStatus: 'offline', realtimeStatus: 'disconnected', authWarning: null });
          return;
        }
        const epoch = get()._sessionEpoch;
        const active = () => epoch === get()._sessionEpoch && Boolean(get().user);
        const week = get().currentWeek;
        const revision = get()._scheduleRevision;
        const previous = get();
        set({ isInitializing: true, _bootstrapping: true, syncStatus: 'loading' });
        try {
          const authWarning = await bindAuthSession(user);
          if (!active()) return;
          if (authWarning === 'SESSION_MISMATCH') { await get().logout(); return; }
          if (authWarning) { set({ authWarning }); throw new Error(authWarning); }
          set({ authWarning: null });
          void get().loadWorkspaceRoles();
          const plan = bootstrapQueryPlan(user);
          let failed = false;
          const load = async (promise, fallback) => {
            let timer;
            try {
              return await Promise.race([promise, new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Tải dữ liệu quá thời gian chờ')), BOOTSTRAP_BRANCH_TIMEOUT_MS);
              })]);
            } catch (error) { failed = true; console.warn('[bootstrap]', error?.message); return fallback; }
            finally { clearTimeout(timer); }
          };
          const [employees, feedbacks, scheds, stores, shiftSwaps, shelves, weeks] = await Promise.all([
            load(api.getEmployees(plan.employees), previous.employees),
            load(api.getFeedbacks(plan.feedbacks), previous.feedbacks),
            load(api.getSchedulesByWeek(week), previous.schedule[week] || {}),
            load(api.getStores(), previous.stores),
            load(api.getShiftSwaps(plan.swaps), previous.shiftSwaps),
            load(api.getShelves(plan.shelves), previous.shelves),
            load(api.getScheduleWeeks(), Object.values(previous.scheduleWeeks))
          ]);
          if (!active()) return;
          const itemOpts = plan.shelfItems.storeId ? { storeId: plan.shelfItems.storeId } : { shelfIds: shelves.map(s => s.id) };
          const shelfItems = await load(api.getShelfItems(itemOpts), previous.shelfItems);
          if (!active()) return;
          let nextUser = get().user;
          if (nextUser.id === 'admin' || nextUser.role === 'admin') {
            const maxSessionMs = remembersSession() ? ADMIN_SESSION_MAX_MS : UNREMEMBERED_SESSION_MAX_MS;
            if (nextUser.id !== 'admin' || (nextUser.loginAt && Date.now() - nextUser.loginAt > maxSessionMs)) {
              await get().logout(); return;
            }
            if (nextUser.id === 'admin') {
              nextUser = { ...nextUser, loginAt: Date.now() };
            }
          } else {
            const fresh = employees.find(e => e.id === nextUser.id);
            if (fresh?.isActive === false) { await get().logout(); return; }
            if (fresh) nextUser = { ...nextUser, ...sessionUserFromEmp(fresh), passwordChangedAt: fresh.passwordChangedAt || nextUser.passwordChangedAt, loginAt: Date.now() };
            else nextUser = { ...nextUser, loginAt: Date.now() };
          }
          set(state => ({
            user: nextUser, employees, feedbacks, stores, shiftSwaps, shelves, shelfItems,
            schedule: revision === state._scheduleRevision && !state._pendingScheduleWrites
              ? { ...state.schedule, [week]: scheds } : state.schedule,
            scheduleWeeks: Object.fromEntries(weeks.map(w => [weekRecordKey(w.storeId, w.weekDate), w])),
            syncStatus: failed ? 'error' : 'ok', lastSyncedAt: failed ? state.lastSyncedAt : Date.now()
          }));
          if (active()) get().initRealtime();
        } catch (err) {
          if (active()) { console.error('Lỗi khởi tạo dữ liệu:', err); set({ syncStatus: 'error' }); }
        } finally {
          if (active()) set({ isInitializing: false, _bootstrapping: false });
        }
      }
    }),
    {
      name: isAgentSandbox ? 'agent-sandbox-session-v1' : 'schedule-storage',
      storage: createJSONStorage(() => sessionPersistence),
      version: 6,
      partialize: (state) => {
        if (!state.user) {
          return {
            currentWeek: state.currentWeek,
            user: null
          };
        }
        return {
          currentWeek: state.currentWeek,
          user: state.user,
          schedule: trimCachedSchedule(state.schedule, state.currentWeek),
          attendance: state.attendance || {},
          employees: state.employees || [],
          stores: state.stores || [],
          scheduleWeeks: state.scheduleWeeks || {},
          lastSyncedAt: state.lastSyncedAt || null
        };
      },
      migrate: (persisted) => {
        const user = sanitizePersistedUser(persisted?.user);
        if (!user) {
          return {
            currentWeek: persisted?.currentWeek || getCurrentMondayWeek(),
            user: null,
            schedule: {},
            attendance: {},
            employees: [],
            stores: [],
            scheduleWeeks: {},
            lastSyncedAt: null
          };
        }
        return {
          currentWeek: persisted?.currentWeek || getCurrentMondayWeek(),
          user,
          schedule: persisted?.schedule || {},
          attendance: persisted?.attendance || {},
          employees: persisted?.employees || [],
          stores: persisted?.stores || [],
          scheduleWeeks: persisted?.scheduleWeeks || {},
          lastSyncedAt: persisted?.lastSyncedAt || null
        };
      },
      merge: (persisted, current) => {
        const user = sanitizePersistedUser(persisted?.user);
        if (!user) {
          return {
            ...current,
            currentWeek: persisted?.currentWeek || current.currentWeek,
            user: null,
            schedule: {},
            attendance: {},
            employees: [],
            stores: [],
            scheduleWeeks: {},
            lastSyncedAt: null
          };
        }
        return {
          ...current,
          ...(persisted || {}),
          currentWeek: persisted?.currentWeek || current.currentWeek,
          user,
          schedule: persisted?.schedule || current.schedule || {},
          attendance: persisted?.attendance || current.attendance || {},
          employees: persisted?.employees || current.employees || [],
          stores: persisted?.stores || current.stores || [],
          scheduleWeeks: persisted?.scheduleWeeks || current.scheduleWeeks || {},
          lastSyncedAt: persisted?.lastSyncedAt || current.lastSyncedAt || null
        };
      },
    }
  )
);
