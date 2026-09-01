import * as api from '../../services/api';
import { assertCanManageEmpInDept } from '../guards';
import { provisionAuthUser } from '../../lib/authSession';
import { describeDiff } from '../../utils/appLogs';
import { sessionUserFromEmp } from './authSlice';

export const createEmployeeSlice = (set, get) => ({
  employees: [],
  addEmployee: async (emp) => {
    assertCanManageEmpInDept(get(), emp.dept);
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
    const prev = get().employees.find(e => e.id === id) || {};
    assertCanManageEmpInDept(get(), updates.dept || prev.dept);
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
    const prev = get().employees.find(e => e.id === id) || { id };
    assertCanManageEmpInDept(get(), prev.dept);
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
  }
});
