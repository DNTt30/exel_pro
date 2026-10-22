import { db } from './client';

async function rpc(name, args) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  return data;
}
// Fetch every page in a stable order; do not silently present the first 200/1000 as a total.
export async function readAllPages(query) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query().range(offset, offset + 499);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Dữ liệu trả về không hợp lệ.');
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export const getEmployeeStartRoster = () => rpc('employee_start_roster');
export const saveMyOnboarding = (step, value) => rpc('save_my_onboarding', { p_step: step, p_value: value });
export const assignEmployeeMentor = (employee, mentor) => rpc('assign_employee_mentor', { p_employee: employee, p_mentor: mentor || null });
export const createEmployeeHelp = ({ key, store, topic, question, context = '' }) => rpc('create_employee_help', {
  p_key: key, p_store: store, p_topic: topic, p_question: question, p_context: context,
});
export const actEmployeeHelp = (row, action, reply = '') => rpc('act_employee_help', { p_id: row.id, p_revision: row.revision, p_action: action, p_reply: reply });
export const saveEmployeeAnswerFeedback = (key, store, rating) => rpc('save_employee_answer_feedback', { p_key: String(key), p_store: store, p_rating: rating });
export function getEmployeeHelpRequests({ from, to, store } = {}) {
  return readAllPages(() => {
    let query = db().from('employee_help_requests').select('*').order('created_at', { ascending: false }).order('id');
    if (from) query = query.gte('created_at', `${from}T00:00:00+07:00`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999999+07:00`);
    if (store && store !== 'ALL') query = query.eq('store_id', store);
    return query;
  });
}
export const getEmployeeHelpEvents = id => readAllPages(() => db().from('employee_help_events').select('*').eq('request_id', id).order('id'));
export function getEmployeeAnswerFeedback({ from, to, store } = {}) {
  return readAllPages(() => {
    let query = db().from('employee_answer_feedback').select('*').order('emp_id').order('message_key');
    if (from) query = query.gte('updated_at', `${from}T00:00:00+07:00`);
    if (to) query = query.lte('updated_at', `${to}T23:59:59.999999+07:00`);
    if (store && store !== 'ALL') query = query.eq('store_id', store);
    return query;
  });
}
export function getMonthConfirmations(cycle, empId) {
  return readAllPages(() => {
    let query = db().from('feedbacks').select('id,emp_id,date,status,created_at').eq('shift', 'XAC_NHAN_CONG').eq('date', cycle)
      .order('created_at', { ascending: false }).order('id', { ascending: false });
    if (empId) query = query.eq('emp_id', empId);
    return query;
  });
}
