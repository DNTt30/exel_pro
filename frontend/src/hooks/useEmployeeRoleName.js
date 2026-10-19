import { useStore } from '../store/useStore';
import { customRoleName } from '../utils/workspaceRoles';

export function useEmployeeRoleName(employee) {
  return useStore(state => customRoleName(
    state.employees.find(e => e.id === employee?.id) || employee, state.workspaceRoles,
  ));
}
