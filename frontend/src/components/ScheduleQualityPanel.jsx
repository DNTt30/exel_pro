import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { scheduleQuality } from '../utils/aiDecisionEngine';

export default function ScheduleQualityPanel({ employees, week, storeId }) {
  const schedule = useStore(s => s.schedule);
  const scoped = useMemo(() => employees.filter(e => e.isActive !== false && e.is_active !== false && (!storeId || storeId === 'ALL' || String(e.dept).split(',').map(d => d.trim()).includes(storeId))), [employees, storeId]);
  const result = useMemo(() => scheduleQuality({ employees: scoped, schedule, week }), [scoped, schedule, week]);
  const warnings = result.issues.filter(i => !['MISSING_CONTEXT', 'MONTH_CONTEXT'].includes(i.code));
  return <details className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs print:hidden">
    <summary className="cursor-pointer font-semibold text-indigo-900 flex flex-wrap gap-2">
      <span>Sức khỏe lịch: {result.score === null ? 'chưa đủ dữ liệu' : `${result.score}/100`}</span>
      <span>· Cân bằng cuối tuần: {result.fairness_score}/100</span>
      <span>· Rủi ro lịch dày: {result.burnout_risk}/100</span>
      <span>· Đã xếp: {result.coverage}%</span>
    </summary>
    <p className="mt-2 text-slate-600">Điểm tham khảo theo rule, không phải dự đoán sức khỏe hoặc nghỉ việc. So sánh nhân viên cùng loại hợp đồng. Chưa có dữ liệu ngày lễ.{result.provisional ? ' Chưa đủ lịch giáp tuần/tháng; điểm đang tạm tính.' : ''}</p>
    <ul className="mt-2 space-y-1 text-amber-900">
      {warnings.slice(0, 12).map((issue, i) => <li key={`${issue.empId}-${issue.code}-${i}`}>{scoped.find(e => e.id === issue.empId)?.name || issue.empId}: {issue.message}</li>)}
    </ul>
    {warnings.length > 12 && <p className="mt-1">Còn {warnings.length - 12} cảnh báo khác.</p>}
  </details>;
}
