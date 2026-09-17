import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
import { hasCustomAdminPassword } from '../lib/adminCredential';

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
      lastSyncedAt: null,
      _bootstrapping: false,
      _realtimeChannel: null,
      _cleanupRealtimeTimers: null,

      initRealtime: () => {
        const currentChannel = get()._realtimeChannel;
        if (currentChannel) {
          supabase.removeChannel(currentChannel);
        }
        // Dọn dẹp timer từ lần gọi trước để tránh zombie timers
        get()._cleanupRealtimeTimers?.();

        let schedTimer = null;
        let shelfTimer = null;

        // Lưu cleanup function vào store để initRealtime có thể gọi lại an toàn
        set({
          _cleanupRealtimeTimers: () => {
            clearTimeout(schedTimer);
            clearTimeout(shelfTimer);
          }
        });

        const channel = supabase.channel('store-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
            console.log('Realtime schedules changed:', payload);
            if (schedTimer) clearTimeout(schedTimer);
            schedTimer = setTimeout(() => {
              const week = get().currentWeek;
              if (week) {
                 api.getSchedulesByWeek(week).then(scheds => {
                    set(state => ({
                      schedule: { ...state.schedule, [week]: scheds }
                    }));
                 }).catch(console.error);
              }
            }, REALTIME_DEBOUNCE_MS);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shelf_items' }, (payload) => {
            console.log('Realtime shelf_items changed:', payload);
            if (shelfTimer) clearTimeout(shelfTimer);
            shelfTimer = setTimeout(() => {
              const plan = bootstrapQueryPlan(get().user);
              const shelves = get().shelves;
              const itemOpts = plan.shelfItems.storeId
                ? { storeId: plan.shelfItems.storeId }
                : (shelves.length ? { shelfIds: shelves.map(s => s.id) } : {});
              api.getShelfItems(itemOpts).then(items => {
                set({ shelfItems: items });
              }).catch(console.error);
            }, REALTIME_DEBOUNCE_MS);
          })
          .subscribe();
          
        set({ _realtimeChannel: channel });
      },

      initializeData: async () => {
        if (get()._bootstrapping) return;
        set({ isInitializing: true, _bootstrapping: true, syncStatus: 'loading' });
        try {
          const user = get().user;
          const week = get().currentWeek;
          if (user) {
            await bindAuthSession(user).catch(() => {});
          }
          const plan = bootstrapQueryPlan(get().user || user);
          // safeLoad: thử promise, fallback về giá trị mặc định nếu lỗi hoặc timeout
          const safeLoad = (p, fallback) => {
            const run = Promise.resolve(p).catch((err) => {
              console.error("Lỗi tải dữ liệu nhánh:", err);
              return fallback;
            });
            return Promise.race([
              run,
              new Promise((resolve) => setTimeout(() => resolve(fallback), BOOTSTRAP_BRANCH_TIMEOUT_MS))
            ]);
          };

          const [emps, fbs, scheds, st, swaps, shelves, weekStatuses] = await Promise.all([
            safeLoad(api.getEmployees(plan.employees), []),
            safeLoad(api.getFeedbacks(plan.feedbacks), []),
            safeLoad(api.getSchedulesByWeek(week), {}),
            safeLoad(api.getStores(), []),
            safeLoad(api.getShiftSwaps(plan.swaps), []),
            safeLoad(api.getShelves(plan.shelves), []),
            safeLoad(api.getScheduleWeeks(), [])
          ]);
          const prev = get();
          const employees = emps.length ? emps : prev.employees;
          const itemOpts = plan.shelfItems.storeId
            ? { storeId: plan.shelfItems.storeId }
            : (shelves.length ? { shelfIds: shelves.map(s => s.id) } : {});
          const shelfItems = await safeLoad(api.getShelfItems(itemOpts), prev.shelfItems || []);
          let nextUser = prev.user;
          if (nextUser) {
            if (nextUser.role === 'admin' || nextUser.id === 'admin') {
              // SEC-01 & SEC-02: Kiểm tra phiên admin hợp lệ, chặn sửa localStorage
              const sessionAge = Date.now() - (nextUser.loginAt || 0);
              if (nextUser.id !== 'admin' || !nextUser.loginAt || sessionAge > ADMIN_SESSION_MAX_MS) {
                console.warn('[Security] Phiên admin trong storage không hợp lệ hoặc đã hết hạn. Reset phiên.');
                nextUser = null;
              } else if (!hasCustomAdminPassword()) {
                nextUser = { ...nextUser, mustSetupPassword: true };
              }
            } else {
              const fresh = employees.find(e => e.id === nextUser.id);
              if (fresh) {
                if (fresh.isActive === false) {
                  console.warn('[Security] Tài khoản đã bị vô hiệu hóa. Reset user.');
                  nextUser = null;
                } else {
                  const synced = sessionUserFromEmp(fresh);
                  const changed = nextUser.jobTitle !== synced.jobTitle
                    || nextUser.isManager !== synced.isManager
                    || nextUser.isAreaManager !== synced.isAreaManager
                    || nextUser.dept !== synced.dept
                    || nextUser.name !== synced.name;
                  nextUser = changed ? { ...synced, loginAt: nextUser.loginAt } : nextUser;
                }
              }
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

          get().initRealtime();

        } catch (err) {
          console.error("Lỗi khởi tạo dữ liệu:", err);
          set({ syncStatus: 'error' });
        } finally {
          set({ isInitializing: false, _bootstrapping: false });
        }
      }
    }),
    {
      name: 'schedule-storage',
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