import { generateAISchedule } from './aiSchedulerEngine';
import { buildStaffingByDay, SCHEDULE_RULES } from '../data/constants';
import { offsetWeek } from './employeeSkills';
import { withScheduleVersion } from './scheduleVersion';
import { reviewScheduleDraft, draftSourceVersions } from './scheduleDraft';
import { weekRecordKey } from './scheduleWeek';

export function createBotDraft(context, week) {
  const schedule = {};
  for (const row of context.schedules) {
    (schedule[row.week_date] ||= {})[row.emp_id] = withScheduleVersion(row.shifts, row.version);
  }
  const source = Object.fromEntries(context.employees.map(e => [e.id,schedule[week]?.[e.id] || {}]));
  const options = { currentWeek: week, existingSchedule: source, requiredMatrixByDay: buildStaffingByDay(context.store),
    stores: [context.store],
    maxShiftsPerEmployee: SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK,
    previousWeekSchedule: schedule[offsetWeek(week,-1)] || {}, nextWeekSchedule: schedule[offsetWeek(week,1)] || {},
    scheduleWeeks: Object.fromEntries(context.weeks.map(w => [weekRecordKey(w.storeId,w.weekDate),w])) };
  const generated = generateAISchedule(context.employees, context.store.id, options);
  const reviewed = reviewScheduleDraft(context.employees,context.store.id,{ ...generated,sourceSchedule: source },options);
  if (reviewed.blockers.length) throw new Error(reviewed.blockers.map(f => f.message).join(' '));
  return { payload: { scope: 'home-store', schedule: reviewed.schedule,sourceSchedule: source,sourceVersions: draftSourceVersions(source),
    constraints: { requiredMatrixByDay: options.requiredMatrixByDay,maxShiftsPerEmployee: options.maxShiftsPerEmployee } },
    summary: { employees: context.employees.length, newAssignments: reviewed.newAssignments, shortages: reviewed.shortages, findings: reviewed.findings } };
}

// Repeated unattended runs preserve a proposal already being reviewed by a manager.
export async function saveBotDraftOnce(client, store, week) {
  const { data: context, error } = await client.rpc('get_schedule_bot_context', { p_store: store, p_week: week });
  if (error) throw new Error(`Không đọc được dữ liệu theo quyền bot (${error.code}).`);
  if (context?.store?.id !== store || context.employees.some(e => e.dept !== store)) throw new Error('Dữ liệu ngoài phạm vi cửa hàng.');
  const query = () => client.from('schedule_drafts').select('revision,payload').eq('store_id', store).eq('week_date', week).maybeSingle();
  const previous = await query();
  if (previous.error) throw new Error('Không đọc được phiên bản nháp.');
  if (previous.data) return { store, week, status: 'existing-draft', revision: previous.data.revision, message: 'Đã có bản nháp; giữ nguyên để người quản lý xem và sửa.' };
  const { payload, summary } = createBotDraft(context, week);
  const saved = await client.rpc('save_schedule_draft', { p_store: store, p_week: week, p_payload: payload, p_revision: 0 });
  if (saved.error) throw new Error(`Không lưu được nháp (${saved.error.code}); chạy lại để đọc bản nháp mới nhất.`);
  const persisted = await query();
  if (persisted.error || !persisted.data || persisted.data.revision < saved.data.revision) throw new Error('Chưa xác minh được bản nháp sau khi lưu.');
  return { store, week, status: 'draft', revision: saved.data.revision, employees: summary.employees,
    newAssignments: summary.newAssignments, shortages: summary.shortages.map(s => ({ day: s.day, shift: s.shift, required: s.required, actual: s.actual, reason: s.reason })), warningCount: summary.findings.length };
}
