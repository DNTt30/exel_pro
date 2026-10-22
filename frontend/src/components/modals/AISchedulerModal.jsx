import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, SCHEDULE_RULES, buildStaffingByDay, normalizeStoreDemand } from '../../data/constants';
import { generateAISchedule } from '../../utils/aiSchedulerEngine';
import { schedulerDemandByDay, demandBreakdown, demandLabel } from '../../utils/registeredScheduler';
import { parseSmInstructions } from '../../utils/smInstructionParser';
import { demandToMatrices } from '../../utils/revenueDemand';
import { normalizeShift } from '../../utils/shiftHelper';
import { getSchedulesByWeeks, getScheduleDraft, saveScheduleDraft } from '../../services/api';
import { reviewScheduleDraft, draftSourceMatches, draftSourceVersions } from '../../utils/scheduleDraft';
import { managedStoreIds, offsetWeek } from '../../utils/employeeSkills';

import Modal from './Modal';
import Button from '../ui/Button';
import StoreDemandFields from '../StoreDemandFields';
import SchedulerResults from '../schedule/SchedulerResults';
import DraftEditor from '../schedule/DraftEditor';
import { storeHoursLimit } from '../../utils/storeHours';
import StoreHoursBudget from '../schedule/StoreHoursBudget';

const EMPTY_SCHED = {};
const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';

const liveDraftRepository = { load: getScheduleDraft, save: saveScheduleDraft };

export default function AISchedulerModal({ isOpen, onClose, currentWeek, storeId, draftRepository = liveDraftRepository, loadAdjacent = getSchedulesByWeeks, draftOnly = false }) {
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
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [maxShifts, setMaxShifts] = useState(SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK);
  const [manualDemand, setManualDemand] = useState(null);
  const [resultOptions, setResultOptions] = useState(null);
  const runRef = useRef(0);
  const storeEmps = useMemo(() => employees.filter(e => e.dept === selectedStoreId && e.isActive !== false), [employees, selectedStoreId]);
  const constraints = useMemo(() => parseSmInstructions(smText, currentWeek, storeEmps), [smText, currentWeek, storeEmps]);
  const demandOptions = useMemo(() => {
    const baseline = structuredClone(manualDemand || buildStaffingByDay(activeStore));
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
  }, [activeStore, demand, constraints, manualDemand]);
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
    setSelectedStoreId(defaultStoreId); setSmText(''); setError(''); setMessage(''); setAiResult(null); setRevision(0);
  }, [isOpen, defaultStoreId]);
  useEffect(() => { setDemand(normalizeStoreDemand(activeStore?.demand)); setSmText(''); setManualDemand(null); setRevision(0); }, [selectedStoreId, activeStore?.demand, currentWeek]);
  useEffect(() => {
    runRef.current++;
    setAiResult(null); setGenerating(false);
    return () => { runRef.current++; };
  }, [isOpen, selectedStoreId, currentWeek, user, employees, weekSched, scheduleWeeks, stores, demand, smText, manualDemand, maxShifts]);
  const optionsWithAdjacent = async () => {
    const previousWeek = offsetWeek(currentWeek, -1), nextWeek = offsetWeek(currentWeek, 1);
    const adjacent = await loadAdjacent([previousWeek, nextWeek]);
    return { ...demandOptions, weeklyHoursLimit: storeHoursLimit(activeStore), maxShiftsPerEmployee: maxShifts, existingSchedule: weekSched, currentWeek, scheduleWeeks, user, stores,
      employeeOverrides: constraints.employeeOverrides, nightShiftVolunteers: constraints.nightVolunteers,
      previousWeekSchedule: adjacent[previousWeek] || {}, nextWeekSchedule: adjacent[nextWeek] || {} };
  };
  const run = async () => {
    const version = ++runRef.current;
    setGenerating(true); setAiResult(null); setError(''); setMessage('Đang tạo bản nháp…');
    try {
      if (!allowedIds.includes(selectedStoreId)) throw new Error('Không có quyền xếp lịch cửa hàng này.');
      const options = await optionsWithAdjacent();
      if (version !== runRef.current) return;
      const result = generateAISchedule(employees, selectedStoreId, options);
      setResultOptions(options);
      setAiResult(reviewScheduleDraft(employees, selectedStoreId, { ...result, sourceSchedule: weekSched }, options));
      setMessage('Đã tạo bản nháp. Chưa lưu và chưa áp dụng vào lịch.');
    } catch (e) { if (version === runRef.current) { setError(e.message || 'Không tạo được đề xuất.'); setMessage(''); } }
    finally { if (version === runRef.current) setGenerating(false); }
  };
  const edit = (id, day, value) => {
    try {
      setAiResult(reviewScheduleDraft(employees, selectedStoreId, { ...aiResult, schedule: { ...aiResult.schedule, [id]: { ...aiResult.schedule[id], [day]: value } } }, resultOptions));
      setMessage('Đã sửa bản nháp. Cần lưu lại.'); setError('');
    } catch (e) { setError(e.message); }
  };
  const loadDraft = async () => {
    const version = ++runRef.current;
    setApplying(true); setAiResult(null); setError(''); setMessage('Đang tải bản nháp…');
    try {
      const saved = await draftRepository.load(selectedStoreId, currentWeek);
      const adjacentOptions = await optionsWithAdjacent();
      if (version !== runRef.current) return;
      if (!saved) { setMessage('Chưa có bản nháp đã lưu cho tuần này.'); return; }
      const { payload } = saved;
      setRevision(saved.revision);
      const sourceToCheck = payload.scope === 'home-store' ? Object.fromEntries(storeEmps.map(emp => [emp.id,weekSched[emp.id] || {}])) : weekSched;
      if (!draftSourceMatches(payload, sourceToCheck)) throw new Error('Lịch nguồn đã thay đổi. Hãy tạo lại bản nháp từ lịch mới.');
      const options = { ...adjacentOptions, ...payload.constraints };
      setResultOptions(options);
      setAiResult(reviewScheduleDraft(employees, selectedStoreId, { ...payload, sourceSchedule: weekSched }, options));
      setMessage(`Đã mở bản nháp đã lưu · phiên bản ${saved.revision}. Cấu hình đã lưu được dùng để kiểm tra bản nháp.`);
    } catch (e) { if (version === runRef.current) { setError(e.message); setMessage(''); } }
    finally { setApplying(false); }
  };
  const saveDraft = async () => {
    setApplying(true); setError(''); setMessage('Đang lưu bản nháp…');
    try {
      const fresh = await optionsWithAdjacent();
      const options = { ...resultOptions, previousWeekSchedule: fresh.previousWeekSchedule, nextWeekSchedule: fresh.nextWeekSchedule };
      const reviewed = reviewScheduleDraft(employees, selectedStoreId, aiResult, options);
      if (reviewed.blockers.length) throw new Error(reviewed.blockers.map(f => f.message).join(' '));
      const scopedSource = Object.fromEntries(storeEmps.map(emp => [emp.id, aiResult.sourceSchedule[emp.id] || {}]));
      const payload = { scope: 'home-store', schedule: aiResult.schedule, sourceSchedule: scopedSource, sourceVersions: draftSourceVersions(scopedSource), constraints: {
        weeklyHoursLimit: options.weeklyHoursLimit, requiredMatrixByDay: options.requiredMatrixByDay, maxShiftsPerEmployee: options.maxShiftsPerEmployee,
        smOverrides: options.smOverrides, demandFactor: options.demandFactor,
      } };
      const saved = await draftRepository.save(selectedStoreId, currentWeek, payload, revision);
      setRevision(saved.revision); setMessage(`Đã lưu bản nháp · phiên bản ${saved.revision}. Chưa áp dụng vào lịch.`);
    } catch (e) { setError(e.message); setMessage(''); }
    finally { setApplying(false); }
  };
  const apply = async () => {
    if (!aiResult?.newAssignments || applying) return;
    setApplying(true); setError('');
    try {
      const fresh = await optionsWithAdjacent();
      const checked = reviewScheduleDraft(employees, selectedStoreId, aiResult, { ...resultOptions, previousWeekSchedule: fresh.previousWeekSchedule, nextWeekSchedule: fresh.nextWeekSchedule });
      if (checked.blockers.length) throw new Error(checked.blockers.map(f => f.message).join(' '));
      await applyAiSchedule(currentWeek, aiResult.schedule, selectedStoreId, aiResult.sourceSchedule);
      onClose();
    } catch (e) { setError(e.message || 'Không lưu được lịch.'); }
    finally { setApplying(false); }
  };
  return <Modal isOpen={isOpen} onClose={onClose} title="Gợi ý xếp lịch" titleId="ai-scheduler-title"
    description={`Tuần ${dates.T2} – ${dates.CN} · Chỉ chọn ca đã đăng ký`} maxWidth="max-w-2xl"
    closeDisabled={applying || generating} bodyClassName="space-y-4 p-4 sm:p-5"
    footer={<>
      <Button disabled={applying || generating} onClick={onClose}>Đóng</Button>
      <Button data-testid="load-draft" disabled={applying || generating} onClick={loadDraft}>Mở nháp đã lưu</Button>
      <Button data-testid="generate-draft" variant={aiResult ? 'secondary' : 'primary'} disabled={applying || !storeEmps.length} busy={generating} onClick={run}>
        {!generating && <Sparkles size={16} />}{aiResult ? 'Tạo lại bản nháp' : 'Tạo lịch nháp'}
      </Button>
      {aiResult && <Button data-testid="save-draft" disabled={generating || !!aiResult.blockers?.length} busy={applying} onClick={saveDraft}>Lưu bản nháp</Button>}
      {aiResult && !draftOnly && <Button data-testid="apply-draft" variant="primary" disabled={!aiResult.newAssignments || !!aiResult.blockers?.length || generating} busy={applying} onClick={apply}>
        {!applying && <Check size={16} />}Áp dụng {aiResult.newAssignments} ca
      </Button>}
    </>}>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <p role="status" data-testid="draft-status" aria-live="polite" className="text-sm text-slate-700">{message}</p>
        <fieldset disabled={generating || applying} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium text-slate-700">Cửa hàng<select aria-label="Cửa hàng xếp lịch" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className={inputClass}>{stores.filter(s => allowedIds.includes(s.id)).map(store => <option key={store.id} value={store.id}>{store.id} · {store.name || store.id}</option>)}</select></label>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{registrationStats.total} ca đăng ký · {registrationStats.people}/{storeEmps.length} nhân viên</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{registrationStats.total ? 'Giữ ca đã chốt, ngày OFF và ngày trống. Đăng ký chưa chọn vẫn được giữ lại.' : 'Chưa có ca đăng ký để chọn. Hệ thống chỉ báo phần thiếu; hãy nhắc nhân viên đăng ký.'}</p></div>
          <details className="rounded-xl border border-slate-200">
            <summary className="cursor-pointer p-3.5 text-sm font-medium text-slate-600">Nhu cầu nhân sự & ghi chú</summary>
            <div className="space-y-4 px-3.5 pb-4">
              <label className="block text-sm">Số ca tối đa mỗi nhân viên / tuần<input data-testid="max-shifts" type="number" min="0" max={SCHEDULE_RULES.MAX_CONFIGURABLE_SHIFTS_PER_WEEK} step="1" value={maxShifts} onChange={e => setMaxShifts(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass} /></label>
              <fieldset><legend className="text-sm font-medium">Số người cần mỗi ca</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{WEEK_DAYS.flatMap(day => Object.entries(manualDemand?.[day] || buildStaffingByDay(activeStore)[day]).map(([code, count]) => <label key={`${day}-${code}`} className="text-sm">{day} · {code}<input aria-label={`Số người ${day} ${code}`} data-testid={`demand-${day}-${code}`} type="number" min="0" step="1" value={count} className={inputClass} onChange={e => setManualDemand(previous => { const next = structuredClone(previous || buildStaffingByDay(activeStore)); next[day][code] = e.target.value === '' ? NaN : Number(e.target.value); return next; })} /></label>))}</div></fieldset>
              <p className="text-sm leading-relaxed text-slate-600">Dùng định biên cửa hàng. Doanh số có thể tăng nhu cầu giờ cao điểm. Ghi chú điều chỉnh nhu cầu nhưng không cho phép xếp ngoài đăng ký.</p>
          <StoreDemandFields demand={demand} onChange={setDemand} />
              <label className="block text-sm font-medium text-slate-600">Ghi chú của quản lý<textarea aria-label="Ghi chú xếp lịch" rows={2} value={smText} onChange={e => setSmText(e.target.value)} placeholder="Ví dụ: ca đêm thứ 5 cần 2 người" className={inputClass} /></label>
              <details><summary className="cursor-pointer text-sm font-semibold text-slate-600">Xem nhu cầu từng ngày</summary><div className="mt-2 space-y-2 text-sm text-slate-600">{WEEK_DAYS.map(day => <div key={day}><b>{day}:</b> {Object.entries(effectiveDemand[day]).filter(([, n]) => n > 0).map(([code, n]) => <p key={code}>{code}: {demandLabel(demandBreakdown(demandOptions, day, code, n))}</p>)}</div>)}</div></details>
            </div>
          </details>
        </fieldset>
    {activeStore && <StoreHoursBudget showSettings={!draftOnly} stores={[activeStore]} employees={employees} schedule={{ ...weekSched, ...(aiResult?.schedule || {}) }} week={currentWeek} />}
    {aiResult && <><p className="text-sm">Giới hạn đang kiểm tra: {resultOptions.maxShiftsPerEmployee} ca/nhân viên/tuần. Thay đổi cấu hình phía trên rồi tạo lại nếu cần điều chỉnh nhu cầu.</p><DraftEditor result={aiResult} employees={storeEmps} onChange={edit} disabled={applying || generating} /><SchedulerResults result={aiResult} dates={dates} employees={storeEmps} source={weekSched} /></>}
  </Modal>;
}
