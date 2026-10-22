// Browser-only test double, served by Playwright interception. Never imported by production.
// Avoid importing a second HMR-versioned Zustand module through an intercepted URL.
const employees = ['An', 'Bình', 'Chi', 'Dung', 'Em'].map((name, index) => ({ id: String(990000001 + index), name: `Nhân viên mẫu ${name}`, dept: 'TEST01' }));
const useStore = { getState: () => ({ employees, user: location.search.includes('support-admin') ? { ...employees[4], isManager: true } : employees[0] }) };
const KEY = 'employee-support-playwright';
const read = () => JSON.parse(localStorage.getItem(KEY) || '{"progress":{},"requests":[],"events":[],"feedback":[]}');
const write = value => localStorage.setItem(KEY, JSON.stringify(value));
const clone = value => JSON.parse(JSON.stringify(value));
export async function getEmployeeStartRoster() {
  if (location.search.includes('failSupport')) throw new Error('Simulated read failure');
  const { user, employees } = useStore.getState(); const data = read();
  return employees.filter(e => user.isManager || e.id === user.id).map(e => ({ ...e, steps: {}, ...data.progress[e.id], mentorName: employees.find(m => m.id === data.progress[e.id]?.mentorId)?.name }));
}
export async function saveMyOnboarding(step, value) {
  const id = useStore.getState().user.id; const data = read();
  const row = data.progress[id] ||= { steps: {} };
  if (step === 'dismissed') row.dismissed = value; else row.steps[step] = value;
  write(data); return clone(row);
}
export async function assignEmployeeMentor(id, mentor) {
  const data = read(); const row = data.progress[id] ||= { steps: {} }; row.mentorId = mentor; write(data);
}
export async function getEmployeeHelpRequests() {
  const user = useStore.getState().user;
  return read().requests.filter(r => user.isManager || r.emp_id === user.id);
}
export async function createEmployeeHelp({ key, store, topic, question, context }) {
  const data = read(), who = useStore.getState().user.id;
  const old = data.requests.find(r => r.request_key === key && r.emp_id === who); if (old) return old;
  const row = { id: crypto.randomUUID(), request_key: key, emp_id: who, store_id: store, topic, question, context_excerpt: context, status: 'new', reply: '', revision: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  data.requests.push(row); data.events.push({ id: data.events.length + 1, request_id: row.id, actor_id: who, action: 'created', created_at: row.created_at }); write(data); return clone(row);
}
export async function actEmployeeHelp(request, action, reply) {
  const data = read(), row = data.requests.find(r => r.id === request.id);
  if (row.revision !== request.revision) throw new Error('HELP_CONFLICT');
  row.status = { start: 'in_progress', answer: 'answered', resolve: 'resolved', reopen: 'new' }[action]; row.revision++;
  if (action === 'answer') row.reply = reply;
  if (['start', 'answer'].includes(action)) row.assigned_to = useStore.getState().user.id;
  if (action === 'reopen') row.assigned_to = null;
  row.updated_at = new Date().toISOString();
  data.events.push({ id: data.events.length + 1, request_id: row.id, actor_id: useStore.getState().user.id, action, body: reply, created_at: row.updated_at }); write(data); return clone(row);
}
export async function getEmployeeHelpEvents(id) { return read().events.filter(e => e.request_id === id); }
export async function getEmployeeAnswerFeedback() { return read().feedback; }
export async function saveEmployeeAnswerFeedback() {}
export async function getMonthConfirmations() { return []; }
export async function getEmployeeRegistrationWeek() { return { '990000001': { T2: { shift: '6-14', registered: true } }, '990000002': { T2: '6-14' }, '990000003': { T2: 'off' } }; }
export async function readAllPages() { return []; }
