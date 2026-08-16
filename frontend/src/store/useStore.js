import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';

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
            // Mật khẩu mặc định là '1' cho toàn bộ nhân viên (Theo quy ước Hướng B)
            if (password === '1') {
              const roleName = emp.role || '';
              const typeName = emp.type || '';
              const isManager = roleName.toLowerCase().includes('quản lý') || 
                                roleName.toLowerCase().includes('cửa hàng trưởng') || 
                                roleName === 'SM' || 
                                typeName === 'SM';
              
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

      // Data State
      isInitializing: false,
      currentWeek: '2026-08-10', // ISO YYYY-MM-DD với số 0 đứng trước
      stores: [],
      employees: [],
      feedbacks: [],
      schedule: {}, // { '2026-08-10': { 'empId': { T2: '6-14', T3: { shift: '14-22', covering_store: 'VN0485' } } } }
      
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
        
        if (status === 'approved' && newShiftData) {
          get().updateShift(newShiftData.week, newShiftData.empId, newShiftData.day, newShiftData.shiftCode);
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
      partialize: (state) => ({ 
        user: state.user,
        employees: state.employees, 
        stores: state.stores, 
        schedule: state.schedule,
        feedbacks: state.feedbacks
      }),
    }
  )
);
