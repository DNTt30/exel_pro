import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';
import { bootstrapQueryPlan } from '../utils/dataScope';
import { weekRecordKey } from '../utils/scheduleWeek';
import { getCurrentMondayWeek } from '../data/constants';
import { supabase } from '../lib/supabase';

import { createAuthSlice, bindAuthSession, sessionUserFromEmp } from './slices/authSlice';
import { createAdminSlice } from './slices/adminSlice';
import { createEmployeeSlice } from './slices/employeeSlice';
import { createScheduleSlice } from './slices/scheduleSlice';
import { createShelfSlice } from './slices/shelfSlice';

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

      initRealtime: () => {
        const currentChannel = get()._realtimeChannel;
        if (currentChannel) {
          supabase.removeChannel(currentChannel);
        }
        
        const channel = supabase.channel('store-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
            console.log('Realtime schedules changed:', payload);
            const week = get().currentWeek;
            if (week) {
               api.getSchedulesByWeek(week).then(scheds => {
                  set(state => ({
                    schedule: { ...state.schedule, [week]: scheds }
                  }));
               }).catch(console.error);
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shelf_items' }, (payload) => {
            console.log('Realtime shelf_items changed:', payload);
            const plan = bootstrapQueryPlan(get().user);
            const shelves = get().shelves;
            const itemOpts = plan.shelfItems.storeId
              ? { storeId: plan.shelfItems.storeId }
              : (shelves.length ? { shelfIds: shelves.map(s => s.id) } : {});
            api.getShelfItems(itemOpts).then(items => {
              set({ shelfItems: items });
            }).catch(console.error);
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