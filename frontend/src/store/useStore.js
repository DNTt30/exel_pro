import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';
import { DEFAULT_PT_OVERTIME } from '../data/initialData';

export const useStore = create(
  persist(
    (set, get) => ({
      user: null, 
      login: (userId, password) => {
        if (userId === 'admin') {
          if (password === '1') {
            set({ user: { id: 'admin', role: 'admin', name: 'Quản trị viên' } });
          } else {
            throw new Error('Mật khẩu không chính xác');
          }
        } else {
          const emp = get().employees.find(e => e.id === userId);
          if (emp) {
            // Chấp nhận mật khẩu là '1' cho tất cả nhân viên (theo yêu cầu)
            if (password === '1') {
              const roleName = emp.role || '';
              const typeName = emp.type || '';
              const isManager = roleName.toLowerCase().includes('quản lý') || roleName.toLowerCase().includes('cửa hàng trưởng') || roleName === 'SM' || typeName === 'SM';
              
              set({ user: { id: emp.id, role: 'employee', ...emp, isManager } });
            } else {
              throw new Error('Mật khẩu không chính xác');
            }
          } else {
            throw new Error('Không tìm thấy mã nhân viên');
          }
        }
      },
      logout: () => set({ user: null }),

      // Data
      isInitializing: false,
      currentWeek: '2026-8-10',
      stores: [],
      employees: [],
      feedbacks: [],
      ptOvertime: DEFAULT_PT_OVERTIME, // Tạm thời giữ nguyên mock data cảnh báo
      schedule: {}, // { '2026-8-10': { 'empId': { T2: '6-14' } } }
      
      // Async Actions
      initializeData: async () => {
        set({ isInitializing: true });
        try {
          const [emps, fbs, scheds, st] = await Promise.all([
            api.getEmployees(),
            api.getFeedbacks(),
            api.getSchedulesByWeek(get().currentWeek),
            api.getStores()
          ]);
          set({ 
            employees: emps, 
            feedbacks: fbs,
            stores: st,
            schedule: {
              ...get().schedule,
              [get().currentWeek]: scheds
            }
          });
        } catch (err) {
          console.error("Lỗi khởi tạo dữ liệu:", err);
        } finally {
          set({ isInitializing: false });
        }
      },
      
      // CRUD Employees
      addEmployee: async (emp) => {
        await api.addEmployee(emp);
        set((state) => ({ employees: [...state.employees, emp] }));
      },
      updateEmployee: async (id, updates) => {
        await api.updateEmployeeInfo(id, updates);
        set((state) => ({
          employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
      },
      deleteEmployee: async (id) => {
        await api.deleteEmployeeData(id);
        set((state) => ({
          employees: state.employees.filter(e => e.id !== id)
        }));
      },

      // CRUD Stores
      addStore: async (store) => {
        await api.addStore(store);
        set((state) => ({ stores: [...state.stores, store] }));
      },
      updateStore: async (id, updates) => {
        await api.updateStore(id, updates);
        set((state) => ({
          stores: state.stores.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
      },
      deleteStore: async (id) => {
        await api.deleteStore(id);
        set((state) => ({
          stores: state.stores.filter(s => s.id !== id)
        }));
      },

      setCurrentWeek: async (week) => {
        set({ currentWeek: week });
        const scheds = await api.getSchedulesByWeek(week);
        set(state => ({
          schedule: {
            ...state.schedule,
            [week]: scheds
          }
        }));
      },

      updateShift: async (weekDate, empId, day, shiftCode) => {
        // Cập nhật UI ngay lập tức (Optimistic Update)
        const weekSched = get().schedule[weekDate] || {};
        const empSched = weekSched[empId] || { T2:'', T3:'', T4:'', T5:'', T6:'', T7:'', CN:'' };
        const updatedShifts = { ...empSched, [day]: shiftCode };
        
        set((state) => ({
          schedule: {
            ...state.schedule,
            [weekDate]: { ...weekSched, [empId]: updatedShifts }
          }
        }));

        // Gửi lên server ở background
        try {
          await api.saveEmployeeSchedule(weekDate, empId, updatedShifts);
        } catch (err) {
          // Rollback nếu cần thiết (hiện tại bỏ qua)
        }
      },

      feedbacks: [],
      addFeedback: (feedback) => {
        set(state => ({
          feedbacks: [{ id: Date.now().toString(), status: 'pending', createdAt: new Date().toISOString(), ...feedback }, ...state.feedbacks]
        }));
      },
      resolveFeedback: (feedbackId, status, resolutionNote, newShiftData = null) => {
        set(state => {
          const updatedFeedbacks = state.feedbacks.map(fb => {
            if (fb.id === feedbackId) {
              return { ...fb, status, resolutionNote, resolvedAt: new Date().toISOString() };
            }
            return fb;
          });
          return { feedbacks: updatedFeedbacks };
        });
        
        // Nếu duyệt và có truyền data cập nhật lịch mới
        if (status === 'approved' && newShiftData) {
          get().updateShift(newShiftData.week, newShiftData.empId, newShiftData.day, newShiftData.shiftCode);
        }
      },

      updateFeedbackStatus: async (id, status) => {
        // Optimistic Update
        set((state) => ({
          feedbacks: state.feedbacks.map(f => f.id === id ? { ...f, status } : f)
        }));
        await api.updateFeedback(id, status);
      }
    }),
    {
      name: 'schedule-storage',
      partialize: (state) => ({ 
        employees: state.employees, 
        stores: state.stores, 
        schedule: state.schedule,
        feedbacks: state.feedbacks // Lưu cả feedback
      }),
    }
  )
);
