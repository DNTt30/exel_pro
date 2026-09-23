import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as api from '../services/api';
import { bootstrapQueryPlan } from '../utils/dataScope';
import { weekRecordKey } from '../utils/scheduleWeek';
import { getCurrentMondayWeek, ADMIN_SESSION_MAX_MS, REALTIME_DEBOUNCE_MS, BOOTSTRAP_BRANCH_TIMEOUT_MS } from '../data/constants';
import { supabase } from '../lib/supabase';

import { createAuthSlice, bindAuthSession, sessionUserFromEmp } from './slices/authSlice';
import { createAdminSlice } from './slices/adminSlice';
import { createEmployeeSlice } from './slices/employeeSlice';
import { createScheduleSlice } from './slices/scheduleSlice';
import { createShelfSlice } from './slices/shelfSlice';
import { toast } from '../utils/toast';
import { sessionPersistence } from '../lib/sessionStorage';

export const useStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createAdminSlice(set, get),
      ...createEmployeeSlice(set, get),
      ...createScheduleSlice(set, get),
      ...createShelfSlice(set, get),
      
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

        // Lưu cleanup function vào store để initRealtime có thể gọi lại an toàn
        set({
          realtimeStatus: 'connecting',
          _cleanupRealtimeTimers: () => {
            clearTimeout(schedTimer);
            clearTimeout(shelfTimer);
            clearTimeout(swapsTimer);
            clearTimeout(feedbacksTimer);
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
        const epoch = get()._sessionEpoch;
        const active = () => epoch === get()._sessionEpoch && Boolean(get().user);
        const week = get().currentWeek;
        const revision = get()._scheduleRevision;
        const previous = get();
        set({ isInitializing: true, _bootstrapping: true, syncStatus: 'loading' });
        try {
          const authWarning = await bindAuthSession(user);
          if (!active()) return;
          if (authWarning) { set({ authWarning }); throw new Error(authWarning); }
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
            if (nextUser.id !== 'admin' || !nextUser.loginAt || Date.now() - nextUser.loginAt > ADMIN_SESSION_MAX_MS) {
              await get().logout(); return;
            }
          } else {
            const fresh = employees.find(e => e.id === nextUser.id);
            if (fresh?.isActive === false) { await get().logout(); return; }
            if (fresh) nextUser = { ...nextUser, ...sessionUserFromEmp(fresh) };
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
      name: 'schedule-storage',
      storage: createJSONStorage(() => sessionPersistence),
      version: 5,
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
            jobTitle: user.jobTitle || 'Quản trị viên',
            name: user.name === 'Cửa hàng trưởng' ? 'Quản trị viên' : (user.name || 'Quản trị viên')
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