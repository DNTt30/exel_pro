import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import * as api from '../../services/api';
import { getPayrollCycle } from '../../utils/payrollCycle';

/** O thong ke xac nhan cong chu ky 26->25 cho Dashboard admin */
export default function MonthConfirmWidget() {
  const employees = useStore(s => s.employees);
  const [rows, setRows] = useState([]);
  const cycle = useMemo(() => getPayrollCycle(new Date()), []);

  useEffect(() => {
    let alive = true;
    api.getFeedbacks({ limit: 400 }).then(rs => { if (alive) setRows(rs || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const confirmedIds = useMemo(
    () => new Set(rows.filter(r => r.shift === 'XAC_NHAN_CONG' && r.date === cycle.key).map(r => r.empId)),
    [rows, cycle.key]
  );
  const total = employees.length;
  const done = employees.filter(e => confirmedIds.has(e.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 100;
  const missing = employees.filter(e => !confirmedIds.has(e.id)).slice(0, 5);

  return (
    <div className="rounded-2xl border p-4 bg-white border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
          <BadgeCheck size={13} className="text-emerald-600" /> Xác nhận công {cycle.label}
        </div>
        <span className={`text-xs font-black ${pct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: pct + '%' }} />
      </div>
      <div className="text-xs text-slate-600 mt-1.5">{done}/{total} nhân viên đã xác nhận</div>
      {missing.length > 0 && (
        <div className="text-[11px] text-slate-400 mt-1 truncate">Chưa xác nhận: {missing.map(m => m.name).join(', ')}{employees.length - done > 5 ? ` +${employees.length - done - 5} người khác` : ''}</div>
      )}
    </div>
  );
}
