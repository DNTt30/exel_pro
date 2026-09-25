import { runAgentWorkflow } from './agentArbiter.js';
import { scheduleQuality } from './aiDecisionEngine.js';
import { triageShelfItem, routePersonalQuery, answerPersonalQuery } from './decisionRouting.js';
import { isOpsManager, isAreaManagerFromEmp, isBuiltinStoreManager, getUserDepts } from '../lib/authSession.js';

export const ASSISTANT_AGENT_LABELS = { personal_schedule: 'Tra lịch cá nhân', schedule_review: 'Kiểm tra lịch tuần', shelf_review: 'Kiểm tra hạn sử dụng', synthesis: 'Tổng hợp kết quả' };
const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

// The schedule page supplies ALL or one store; the global drawer can supply
// a comma-separated department list. Selection only narrows authorization.
export function assistantStoreIds(storeId) {
  return !storeId || storeId === 'ALL' ? null : new Set(String(storeId).split(',').map(id => id.trim()).filter(Boolean));
}

export function assistantAgentPlan(query, context, revision) {
  const q = normalize(query), jobs = [];
  if (routePersonalQuery(query)) jobs.push('personal_schedule');
  if (isOpsManager(context.user) && /lich|dinh bien/.test(q) && /quet|kiem tra|vi pham|loi|danh gia|can bang/.test(q)) jobs.push('schedule_review');
  if (/han su dung|kiem date|hang het han|kiem tra date/.test(q) && /quet|kiem|uu tien|sap|tom tat/.test(q) && !/quy dinh|chinh sach|khi nao huy/.test(q)) jobs.push('shelf_review');
  if (/quy dinh|chinh sach|tu van|de xuat|nen lam/.test(q) || /\bva\b/.test(q) && jobs.length < 2) return null;
  if (!jobs.length) return null;
  const make = (id, dependsOn = []) => ({ id, role: id, description: ASSISTANT_AGENT_LABELS[id], access: 'read', resources: ['assistant_snapshot'], dependsOn, status: 'pending', attempts: 0, maxAttempts: 1, required: true });
  return { mode: 'assistant', revision, stepsUsed: 0, maxSteps: jobs.length + 1, maxParallel: 2, tasks: [...jobs.map(id => make(id)), make('synthesis', jobs)] };
}

function scopedContext(context) {
  const { user, storeId } = context;
  if (!user) throw new Error('AUTH_REQUIRED');
  const allStores = isAreaManagerFromEmp(user) || isBuiltinStoreManager(user);
  const selected = assistantStoreIds(storeId);
  const canSeeStore = id => (allStores || getUserDepts(user).includes(id)) && (!selected || selected.has(id));
  const employees = context.employees.filter(e => e.id === user.id || String(e.dept).split(',').some(d => canSeeStore(d.trim())));
  const ids = new Set(employees.map(e => e.id));
  const schedule = Object.fromEntries(Object.entries(context.schedule).map(([w, rows]) => [w, Object.fromEntries(Object.entries(rows).filter(([id]) => ids.has(id)))]));
  const shelves = (context.shelves || []).filter(s => canSeeStore(s.storeId) && (isOpsManager(user) || String(s.assigneeId).split(',').map(s => s.trim()).includes(user.id)));
  const shelfIds = new Set(shelves.map(s => s.id));
  return { ...context, employees, schedule, shelves, shelfItems: (context.shelfItems || []).filter(i => shelfIds.has(i.shelfId)) };
}

export async function runAssistantAgents(query, context, { revision, decide, signal, isCurrent = () => true, onEvent } = {}) {
  const plan = assistantAgentPlan(query, context, revision);
  if (!plan) return null;
  const data = structuredClone(scopedContext(context));
  const result = await runAgentWorkflow(plan, {
    decide, signal, onEvent,
    getRevision: () => isCurrent() ? revision : 'stale-context',
    execute: async (task, { outputs, signal }) => {
      signal.throwIfAborted();
      if (task.id === 'personal_schedule') return answerPersonalQuery(routePersonalQuery(query), data);
      if (task.id === 'schedule_review') {
        const result = scheduleQuality({ employees: data.employees, schedule: data.schedule, week: data.currentWeek });
        const issues = result.issues.filter(i => !['MISSING_CONTEXT', 'MONTH_CONTEXT'].includes(i.code));
        return `**Lịch tuần ${data.currentWeek}: ${result.score == null ? 'chưa đủ dữ liệu' : `${result.score}/100`}**\n${issues.length ? issues.slice(0, 12).map(i => `- ${data.employees.find(e => e.id === i.empId)?.name || 'Nhân viên'}: ${i.message}`).join('\n') : 'Chưa phát hiện cảnh báo theo rule.'}${result.provisional ? '\nĐiểm tạm tính: chưa đủ lịch giáp tuần/tháng.' : ''}`;
      }
      if (task.id === 'shelf_review') {
        const rows = data.shelfItems.map(item => ({ item, ...triageShelfItem(item) })).sort((a, b) => b.priority - a.priority).slice(0, 5);
        return `**Ưu tiên kiểm date**\n${rows.length ? rows.map(r => `- ${r.item.productName}: ${r.reason}`).join('\n') : 'Chưa có mặt hàng trong các kệ bạn được phép xem.'}`;
      }
      if (task.id === 'synthesis') return plan.tasks.filter(t => t.id !== 'synthesis').map(t => outputs[t.id]).filter(Boolean).join('\n\n');
      throw new Error('UNKNOWN_ASSISTANT_AGENT');
    },
  });
  return { ...result, text: result.action === 'DONE' ? result.outputs.synthesis : 'Chưa hoàn tất kiểm tra hoặc dữ liệu đã thay đổi. Vui lòng gửi lại yêu cầu.' };
}
