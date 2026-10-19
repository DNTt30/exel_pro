import { appRoleOf, getUserDepts, isOpsManager } from '../lib/authSession';

const ids = value => String(value || '').split(',').map(id => id.trim()).filter(Boolean);

export function copilotScopeKey(user) {
  return `${user?.id || 'anonymous'}:${appRoleOf(user)}:${getUserDepts(user).sort().join(',')}`;
}

/** Minimize data before both local agent readers and the conversational model. */
export function scopeCopilotContext(context = {}) {
  const user = context.user;
  const role = appRoleOf(user);
  const manager = !!user && isOpsManager(user);
  const global = !!user && (user.id === 'admin' || role === 'am');
  const assigned = new Set(getUserDepts(user));
  const selected = !context.storeId || context.storeId === 'ALL' ? null : new Set(ids(context.storeId));
  const activeStores = (context.stores || []).filter(s => s.is_active !== false && s.isActive !== false);
  const storeIds = global
    ? activeStores.map(s => s.id).filter(id => !selected || selected.has(id))
    : [...assigned].filter(id => !selected || selected.has(id));
  const allowed = new Set(storeIds);
  const employees = (context.employees || []).filter(e => user && (manager
    ? ids(e.dept).some(id => allowed.has(id))
    : e.id === user.id));
  const employeeIds = new Set(employees.map(e => e.id));
  const scopeRows = rows => Object.fromEntries(Object.entries(rows || {}).filter(([id]) => employeeIds.has(id)));
  const inStore = value => ids(value).some(id => allowed.has(id));
  const feedbacks = (context.feedbacks || []).filter(f => user && (manager
    ? employeeIds.has(f.empId || f.emp_id) && (!f.dept || inStore(f.dept))
    : (f.empId || f.emp_id) === user.id));
  const shiftSwaps = (context.shiftSwaps || []).filter(s => user && (manager
    ? inStore(s.store || s.storeId) && employeeIds.has(s.fromEmpId) && employeeIds.has(s.toEmpId)
    : s.fromEmpId === user.id || s.toEmpId === user.id));
  const shelves = (context.shelves || []).filter(s => allowed.has(s.storeId) && (manager || ids(s.assigneeId).includes(user?.id)));
  const shelfIds = new Set(shelves.map(s => s.id));
  return {
    ...context, employees, feedbacks, shiftSwaps, shelves,
    storeId: storeIds.length ? storeIds.join(',') : (selected ? '__NO_STORES__' : ''),
    stores: activeStores.filter(s => allowed.has(s.id)),
    weekSchedule: scopeRows(context.weekSchedule),
    schedule: Object.fromEntries(Object.entries(context.schedule || {}).map(([week, rows]) => [week, scopeRows(rows)])),
    shelfItems: (context.shelfItems || []).filter(i => shelfIds.has(i.shelfId)),
    copilotAccess: { role, storeIds, employeeIds: [...employeeIds] },
  };
}
