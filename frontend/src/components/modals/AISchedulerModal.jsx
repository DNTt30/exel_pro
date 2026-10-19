import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, buildStaffingByDay, normalizeStoreDemand } from '../../data/constants';
import { generateAISchedule } from '../../utils/aiSchedulerEngine';
import { schedulerDemandByDay, demandBreakdown, demandLabel } from '../../utils/registeredScheduler';
import { parseSmInstructions } from '../../utils/smInstructionParser';
import { demandToMatrices } from '../../utils/revenueDemand';
import { normalizeShift } from '../../utils/shiftHelper';
import { getSchedulesByWeeks } from '../../services/api';
import { managedStoreIds, offsetWeek } from '../../utils/employeeSkills';

import Modal from './Modal';
import Button from '../ui/Button';
import StoreDemandFields from '../StoreDemandFields';
import SchedulerResults from '../schedule/SchedulerResults';

const EMPTY_SCHED = {};
const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';

export default function AISchedulerModal({ isOpen, onClose, currentWeek, storeId }) {
  const { employees, schedule, scheduleWeeks, applyAiSchedule, user, stores } = useStore(useShallow(s => ({ employees: s.employees, schedule: s.schedule, scheduleWeeks: s.scheduleWeeks, applyAiSchedule: s.applyAiSchedule, user: s.user, stores: s.stores })));
  const weekSched = schedule[currentWeek] || EMPTY_SCHED;
  const allowedIds = managedStoreIds(user, stores);
  const defaultStoreId = allowedIds.includes(storeId) ? storeId : (allowedIds[0] || '');
  const [selectedStoreId, setSelectedStoreId] = useState(defaultStoreId);
  const activeStore = stores.find(s => s.id === selectedStoreId);
  const [demand, setDemand] = useState(() => normalizeStoreDemand(activeStore?.demand));
  const [smText, setSmText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState('');
  const runRef = useRef(0);
  const storeEmps = useMemo(() => employees.filter(e => e.dept === selectedStoreId && e.isActive !== false), [employees, selectedStoreId]);
  const constraints = useMemo(() => parseSmInstructions(smText, currentWeek, storeEmps), [smText, currentWeek, storeEmps]);
  const demandOptions = useMemo(() => {
    const baseline = buildStaffingByDay(activeStore);
    const baseMatrixByDay = structuredClone(baseline);
    if (Object.values(demand).some(bucket => bucket.sales || bucket.customers)) {
      const predicted = demandToMatrices(demand);
      WEEK_DAYS.forEach(day => {
        const extra = predicted[day === 'T7' || day === 'CN' ? 'weekend' : 'weekday'];
        // Revenue estimates cannot silently remove the store's minimum night staffing.
        Object.entries(extra).forEach(([code, n]) => { baseline[day][code] = Math.max(baseline[day][code] || 0, n); });
      });
    }
    return { baseMatrixByDay, requiredMatrixByDay: baseline, smOverrides: constraints.dayOverrides, demandFactor: constraints.demandFactor ?? 1 };
  }, [activeStore, demand, constraints]);
  const effectiveDemand = useMemo(() => schedulerDemandByDay(demandOptions), [demandOptions]);
  const registrationStats = useMemo(() => {
    let total = 0;
    let people = 0;
    storeEmps.forEach(emp => {
      const count = WEEK_DAYS.filter(day => {
        const c = normalizeShift(weekSched[emp.id]?.[day]);
        return c.registered && !c.confirmed && c.shift && c.shift !== 'off';
      }).length;
      total += count;
      if (count) people++;
    });
    return { total, people };
  }, [storeEmps, weekSched]);
  const dates = useMemo(() => Object.fromEntries(WEEK_DAYS.map((day, index) => {
    const date = new Date(`${currentWeek}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return [day, `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`];
  })), [currentWeek]);
  useEffect(() => {
    if (!isOpen) return;
    setSelectedStoreId(defaultStoreId); setSmText(''); setError(''); setAiResult(null);
  }, [isOpen, defaultStoreId]);
  useEffect(() => { setDemand(normalizeStoreDemand(activeStore?.demand)); setSmText(''); }, [selectedStoreId, activeStore?.demand]);
  useEffect(() => {
    runRef.current++;
    setAiResult(null); setGenerating(false);
    return () => { runRef.current++; };
  }, [isOpen, selectedStoreId, currentWeek, user, employees, weekSched, scheduleWeeks, stores, demand, smText]);
  const run = async () => {
    const version = ++runRef.current;
    setGenerating(true); setAiResult(null); setError('');
    try {
      if (!allowedIds.includes(selectedStoreId)) throw new Error('Không có quyền xếp lịch cửa hàng này.');
      const previousWeek = offsetWeek(currentWeek, -1);
      const nextWeek = offsetWeek(currentWeek, 1);
      const adjacent = await getSchedulesByWeeks([previousWeek, nextWeek]);
      if (version !== runRef.current) return;
      const result = generateAISchedule(employees, selectedStoreId, {
        ...demandOptions, existingSchedule: weekSched, currentWeek, scheduleWeeks, user, stores,
        employeeOverrides: constraints.employeeOverrides, nightShiftVolunteers: constraints.nightVolunteers,
        smNotes: smText.trim(), previousWeekSchedule: adjacent[previousWeek] || {}, nextWeekSchedule: adjacent[nextWeek] || {},
      });
      setAiResult({ ...result, sourceSchedule: weekSched });
    } catch (e) { if (version === runRef.current) setError(e.message || 'Không tạo được đề xuất.'); }
    finally { if (version === runRef.current) setGenerating(false); }
  };
  const apply = async () => {
    if (!aiResult?.newAssignments || applying) return;
    setApplying(true); setError('');
    try {
      await applyAiSchedule(currentWeek, aiResult.schedule, selectedStoreId, aiResult.sourceSchedule);
      onClose();
    } catch (e) { setError(e.message || 'Không lưu được lịch.'); }
    finally { setApplying(false); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Gợi ý xếp lịch" titleId="ai-scheduler-title"
    description={`Tuần ${dates.T2} – ${dates.CN} · Chỉ chọn ca đã đăng ký`} maxWidth="max-w-2xl"
    closeDisabled={applying} bodyClassName="space-y-4 p-4 sm:p-5"
    footer={<>
      <Button disabled={applying} onClick={onClose}>Đóng</Button>
      <Button variant={aiResult ? 'secondary' : 'primary'} disabled={applying || !storeEmps.length} busy={generating} onClick={run}>
        {!generating && <Sparkles size={16} />}{aiResult ? 'Xếp lại' : 'Xếp lịch'}
      </Button>
      {aiResult && <Button variant="primary" disabled={!aiResult.newAssignments} busy={applying} onClick={apply}>
        {!applying && <Check size={16} />}Áp dụng {aiResult.newAssignments} ca
      </Button>}
    </>}>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <fieldset disabled={generating || applying} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium text-slate-700">Cửa hàng<select aria-label="Cửa hàng xếp lịch" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className={inputClass}>{stores.filter(s => allowedIds.includes(s.id)).map(store => <option key={store.id} value={store.id}>{store.id} · {store.name || store.id}</option>)}</select></label>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{registrationStats.total} ca đăng ký · {registrationStats.people}/{storeEmps.length} nhân viên</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{registrationStats.total ? 'Giữ ca đã chốt, ngày OFF và ngày trống. Đăng ký chưa chọn vẫn được giữ lại.' : 'Chưa có ca đăng ký để chọn. Hệ thống chỉ báo phần thiếu; hãy nhắc nhân viên đăng ký.'}</p></div>
          <details className="rounded-xl border border-slate-200">
            <summary className="cursor-pointer p-3.5 text-sm font-medium text-slate-600">Nhu cầu nhân sự & ghi chú</summary>
            <div className="space-y-4 px-3.5 pb-4">
              <p className="text-sm leading-relaxed text-slate-600">Dùng định biên cửa hàng. Doanh số có thể tăng nhu cầu giờ cao điểm. Ghi chú điều chỉnh nhu cầu nhưng không cho phép xếp ngoài đăng ký.</p>
          <StoreDemandFields demand={demand} onChange={setDemand} />
              <label className="block text-sm font-medium text-slate-600">Ghi chú của quản lý<textarea aria-label="Ghi chú xếp lịch" rows={2} value={smText} onChange={e => setSmText(e.target.value)} placeholder="Ví dụ: ca đêm thứ 5 cần 2 người" className={inputClass} /></label>
              <details><summary className="cursor-pointer text-sm font-semibold text-slate-600">Xem nhu cầu từng ngày</summary><div className="mt-2 space-y-2 text-sm text-slate-600">{WEEK_DAYS.map(day => <div key={day}><b>{day}:</b> {Object.entries(effectiveDemand[day]).filter(([, n]) => n > 0).map(([code, n]) => <p key={code}>{code}: {demandLabel(demandBreakdown(demandOptions, day, code, n))}</p>)}</div>)}</div></details>
            </div>
          </details>
        </fieldset>
    {aiResult && <SchedulerResults result={aiResult} dates={dates} employees={storeEmps} source={weekSched} />}
  </Modal>;
}
