import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';
import { getCurrentMondayWeek, normalizeStaffingConfig, normalizeStoreDemand } from '../data/constants';
import { buildSwappedSchedules, mergeAiSchedule } from '../utils/shiftHelper';
import { ensureAuthSession, signOutAuth, provisionAuthUser, isManagerFromEmp } from '../lib/authSession';

function assertCanEditShift(state, empId) {
  const user = state.user;
  if (!user) throw new Error('Chưa đăng nhập');
  if (user.role === 'admin') return;
  if (user.isManager) {
    const emp = (state.employees || []).find(e => e.id === empId);
    if (emp && emp.dept && user.dept && emp.dept !== user.dept && empId !== user.id) {
      throw new Error('Không có quyền sửa lịch cửa hàng khác');
    }
    return;
  }
  if (empId !== user.id) {
    throw new Error('Bạn chỉ được đăng ký ca của mình');
  }
}

function assertCanManageStaff(state) {
  const user = state.user;
  if (!user) throw new Error('Chưa đăng nhập');
  if (user.role === 'admin' || user.isManager) return;
  throw new Error('Không có quyền quản lý nhân sự');
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
        let nextUser = null;

        if (userId === 'admin') {
          if (password !== '1') throw new Error('Mật khẩu không chính xác');
          nextUser = { id: 'admin', role: 'admin', name: 'Quản trị viên' };
        } else {
          if (!get().employees.length) {
            const emps = await api.getEmployees();
            set({ employees: emps });
          }

          const emp = get().employees.find(e => e.id === userId);
          if (!emp) throw new Error('Không tìm thấy mã nhân viên');
          if (password !== '1') throw new Error('Mật khẩu không chính xác');

          nextUser = { ...emp, id: emp.id, role: 'employee', isManager: isManagerFromEmp(emp) };
        }

        const authWarning = await bindAuthSession(nextUser);
        set({ user: nextUser, authWarning });
        get().appendAdminLog('Đăng nhập', nextUser.id, nextUser.role === 'admin' ? 'Admin' : (nextUser.isManager ? 'Quản lý' : 'Nhân viên'));
        return nextUser;
      },
      logout: async () => {
        await signOutAuth();
        set({ user: null, authWarning: null });
      },

      // Data State
      authWarning: null,
      adminLogs: [],
      isInitializing: false,
      currentWeek: getCurrentMondayWeek(),
      stores: [],
      employees: [],
      feedbacks: [],
      schedule: {}, // { '2026-08-10': { 'empId': { T2: '6-14', T3: { shift: '14-22', covering_store: 'VN0485' } } } }
      
      // Async Actions
      initializeData: async () => {
        set({ isInitializing: true });
        try {
          const user = get().user;
          if (user) {
            const authWarning = await bindAuthSession(user);
            if (authWarning) set({ authWarning });
            else set({ authWarning: null });
          }
          const week = get().currentWeek;
          const canReadLogs = user?.role === 'admin' || user?.isManager;
          const [emps, fbs, scheds, st, swaps, logs] = await Promise.all([
            api.getEmployees(),
            api.getFeedbacks(),
            api.getSchedulesByWeek(week),
            api.getStores(),
            api.getShiftSwaps(),
            canReadLogs ? api.getAdminLogs() : Promise.resolve([])
          ]);
          const prev = get();
          set({ 
            employees: emps.length ? emps : prev.employees, 
            feedbacks: fbs,
            stores: st.length ? st : prev.stores,
            shiftSwaps: swaps,
            adminLogs: logs,
            schedule: {
              ...prev.schedule,
              [week]: scheds
            }
          });
        } catch (err) {
          console.error("Lỗi khởi tạo dữ liệu:", err);
        } finally {
          set({ isInitializing: false });
        }
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

      appendAdminLog: async (action, target = '', detail = '') => {
        const user = get().user;
        const entry = {
          actorId: user?.id || '',
          actorName: user?.name || user?.id || '',
          action,
          target: String(target || ''),
          detail: String(detail || '')
        };
        try {
          const saved = await api.addAdminLog(entry);
          set(state => ({ adminLogs: [saved, ...(state.adminLogs || [])].slice(0, 300) }));
        } catch {
          set(state => ({
            adminLogs: [{
              ...entry,
              id: 'local_' + Date.now(),
              createdAt: new Date().toISOString()
            }, ...(state.adminLogs || [])].slice(0, 300)
          }));
        }
      },

      applyBulkSchedule: async (weekDate, scheduleMap) => {
        assertCanManageStaff(get());
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
        get().appendAdminLog('Lưu lịch hàng loạt', weekDate, `${Object.keys(scheduleMap).length} nhân sự`);
      },

      applyAiSchedule: async (weekDate, aiSchedule, storeId) => {
        assertCanManageStaff(get());
        const existing = get().schedule[weekDate] || {};
        const merged = mergeAiSchedule(existing, aiSchedule, storeId);
        await api.saveBulkEmployeeSchedules(weekDate, merged);
        set(state => ({
          schedule: {
            ...state.schedule,
            [weekDate]: merged
          }
        }));
        get().appendAdminLog('Áp lịch AI', storeId || weekDate, `Tuần ${weekDate}`);
      },

      // CRUD Employees
      addEmployee: async (emp) => {
        assertCanManageStaff(get());
        await api.addEmployee(emp);
        const provisioned = await provisionAuthUser(emp);
        set((state) => ({ employees: [...state.employees, emp] }));
        get().appendAdminLog('Thêm nhân viên', emp.id, `${emp.name} · ${emp.dept} · ${emp.role || emp.type}`);
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
        await api.updateEmployeeInfo(id, updates);
        set((state) => ({
          employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
        get().appendAdminLog('Sửa nhân viên', id, JSON.stringify(updates));
      },
      deleteEmployee: async (id) => {
        assertCanManageStaff(get());
        await api.deleteEmployeeData(id);
        set((state) => ({
          employees: state.employees.filter(e => e.id !== id)
        }));
        get().appendAdminLog('Xóa nhân viên', id);
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
        get().appendAdminLog('Thêm cửa hàng', payload.id, payload.name);
      },
      updateStore: async (id, updates) => {
        assertCanManageStaff(get());
        const payload = { ...updates };
        if (payload.staffing) payload.staffing = normalizeStaffingConfig(payload.staffing);
        if (payload.demand) payload.demand = normalizeStoreDemand(payload.demand);
        await api.updateStore(id, payload);
        set((state) => ({
          stores: state.stores.map(s => s.id === id ? { ...s, ...payload } : s)
        }));
        get().appendAdminLog('Sửa cửa hàng', id, payload.staffing ? 'Cập nhật định biên / thông tin' : (payload.name || ''));
      },
      deleteStore: async (id) => {
        assertCanManageStaff(get());
        await api.deleteStore(id);
        set((state) => ({
          stores: state.stores.filter(s => s.id !== id)
        }));
        get().appendAdminLog('Xóa cửa hàng', id);
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

      // Optimistic update với cơ chế rollback an toàn khi lưu lỗi
      updateShift: async (weekDate, empId, day, shiftCode) => {
        assertCanEditShift(get(), empId);
        const weekSched = get().schedule[weekDate] || {};
        const empSched = weekSched[empId] || { T2:'', T3:'', T4:'', T5:'', T6:'', T7:'', CN:'' };
        const previousShifts = { ...empSched };
        const updatedShifts = { ...empSched, [day]: shiftCode };
        
        // 1. Cập nhật UI ngay lập tức
        set((state) => ({
          schedule: {
            ...state.schedule,
            [weekDate]: { ...weekSched, [empId]: updatedShifts }
          }
        }));

        // 2. Gửi request lưu lên server
        try {
          await api.saveEmployeeSchedule(weekDate, empId, updatedShifts);
        } catch (err) {
          console.error("Lỗi khi lưu lịch làm việc:", err);
          // 3. Rollback lại state cũ nếu có lỗi
          set((state) => ({
            schedule: {
              ...state.schedule,
              [weekDate]: { ...weekSched, [empId]: previousShifts }
            }
          }));
          alert(`Không thể lưu lịch làm việc của nhân viên (${empId}): ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
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
          return created;
        } catch (err) {
          console.error("Lỗi khi gửi feedback lên Supabase:", err);
          // Rollback nếu lỗi
          set(state => ({
            feedbacks: state.feedbacks.filter(f => f.id !== tempId)
          }));
          alert(`Không thể gửi phản hồi: ${err.message || 'Lỗi kết nối cơ sở dữ liệu'}`);
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
            get().updateShift(newShiftData.week, newShiftData.empId, newShiftData.day, newShiftData.shiftCode);
          }
          get().appendAdminLog('Duyệt feedback', feedbackId, status);
        } catch (err) {
          console.error("Lỗi khi duyệt feedback:", err);
          set({ feedbacks: previousFeedbacks });
          alert(`Lỗi khi cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
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
          get().appendAdminLog('Tạo đơn đổi ca', created.fromEmpId, `${created.fromEmpName} ⇄ ${created.toEmpName}`);
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
          get().appendAdminLog('Xử lý đổi ca', swapId, newStatus);
        } catch (err) {
          console.error('Lỗi khi cập nhật đơn đổi ca:', err);
          set({ shiftSwaps: previousSwaps, schedule: previousSchedule });
          alert(`Không thể cập nhật đơn đổi ca: ${err.message || 'Lỗi kết nối'}`);
        }
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
          alert(`Không thể cập nhật trạng thái phản hồi: ${err.message || 'Lỗi kết nối'}`);
        }
      }
    }),
    {
      name: 'schedule-storage',
      version: 2,
      partialize: (state) => ({
        currentWeek: state.currentWeek,
        user: state.user
      }),
      migrate: (persisted) => ({
        currentWeek: persisted?.currentWeek || getCurrentMondayWeek(),
        user: persisted?.user || null
      }),
    }
  )
);
