import * as api from '../../services/api';
import { canConfigureWorkspace } from '../../utils/workspaceBranding';

export const createWorkspaceRolesSlice = (set, get) => {
  let generation = 0;
  return {
    workspaceRoles: [], rolesStatus: 'idle', rolesError: '',
    loadWorkspaceRoles: async () => {
      if (!get().user) return;
      const epoch = get()._sessionEpoch;
      const current = ++generation;
      set({ rolesStatus: 'loading', rolesError: '' });
      try {
        const workspaceRoles = await api.getWorkspaceRoles();
        if (get().user && epoch === get()._sessionEpoch && current === generation) set({ workspaceRoles, rolesStatus: 'ready' });
      } catch (error) {
        if (get().user && epoch === get()._sessionEpoch && current === generation) set({ rolesStatus: 'error', rolesError: error.message });
      }
    },
    saveWorkspaceRole: async (draft, existing) => {
      if (!canConfigureWorkspace(get().user)) throw new Error('Chỉ Admin đơn vị được quản lý vai trò.');
      const epoch = get()._sessionEpoch;
      const saved = await api.saveWorkspaceRole(draft, existing);
      if (get().user && epoch === get()._sessionEpoch) {
        generation++;
        set(state => ({ rolesStatus: 'ready', rolesError: '', workspaceRoles: [...state.workspaceRoles.filter(r => r.id !== saved.id), saved] }));
      }
      return saved;
    },
    assignWorkspaceRole: async (employee, roleId) => {
      if (!canConfigureWorkspace(get().user)) throw new Error('Chỉ Admin đơn vị được quản lý vai trò.');
      const epoch = get()._sessionEpoch;
      const updated = await api.assignWorkspaceRole(employee, roleId);
      if (get().user && epoch === get()._sessionEpoch) set(state => ({ employees: state.employees.map(e => e.id === updated.id ? { ...e, ...updated } : e) }));
    },
  };
};
