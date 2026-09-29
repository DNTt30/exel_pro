import { isOpsManager, isBuiltinStoreManager, isAreaManagerFromEmp, getUserDepts } from '../lib/authSession';
import { isWeekLocked, weekRecordKey } from './scheduleWeek';
import { normalizeShift } from './shiftHelper';

export const NIGHT_READY = 'NIGHT_READY';
export const normalizeSkills = skills => Array.isArray(skills) ? [...new Set(skills.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()))] : [];
export const isNightReady = employee => normalizeSkills(employee?.skills).includes(NIGHT_READY);
export const toggleNightReady = (skills, checked) => checked
  ? [...new Set([...normalizeSkills(skills), NIGHT_READY])]
  : normalizeSkills(skills).filter(skill => skill !== NIGHT_READY);

// Visibility can be broader than write access. Pooling must use management scope.
export function managedStoreIds(user, stores = []) {
  if (!isOpsManager(user) || user.isActive === false) return [];
  const all = isBuiltinStoreManager(user) || isAreaManagerFromEmp(user);
  const depts = getUserDepts(user);
  return stores.filter(s => s.is_active !== false && s.isActive !== false && (all || depts.includes(s.id))).map(s => s.id);
}

export function isEmployeeWeekLocked(employee, shifts, scheduleWeeks, week) {
  const depts = new Set(getUserDepts(employee));
  Object.values(shifts || {}).forEach(raw => {
    const { covering_store } = normalizeShift(raw);
    if (covering_store) depts.add(covering_store);
  });
  return [...depts].some(dept => isWeekLocked(scheduleWeeks?.[weekRecordKey(dept, week)]?.status));
}

export function offsetWeek(week, offset) {
  const date = new Date(`${week}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset * 7);
  return date.toISOString().slice(0, 10);
}
