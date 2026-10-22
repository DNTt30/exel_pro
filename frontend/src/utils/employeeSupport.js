import { EMPLOYEE_START_STEPS, HELP_TOPICS } from '../data/employeeStart';
export const understoodStepCount = steps => EMPLOYEE_START_STEPS.filter(step => steps?.[`${step.id}_understood`] === true).length;
export const belongsToStore = (dept, store) => !store || store === 'ALL' || String(dept || '').split(',').some(value => value.trim() === store);
export function supportTopicSummary(rows) {
  return Object.entries(HELP_TOPICS).map(([id, label]) => {
    const selected = rows.filter(row => row.topic === id);
    return { id, label, requests: selected.length, people: new Set(selected.map(row => row.emp_id)).size, pending: selected.filter(row => row.status !== 'resolved').length };
  });
}
// API orders newest first: a later dispute must not be hidden by an older confirmation.
export function monthConfirmationState(rows, employees) {
  const latest = new Map();
  rows.forEach(row => { if (!latest.has(row.emp_id)) latest.set(row.emp_id, row); });
  return employees.filter(employee => employee.isActive !== false && employee.is_active !== false).map(employee => ({
    ...employee, confirmation: latest.get(employee.id)?.status === 'confirmed' ? 'confirmed' : latest.has(employee.id) ? 'disputed' : 'missing',
  }));
}
