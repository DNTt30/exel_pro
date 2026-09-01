import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { AlertTriangle, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { WEEK_DAYS } from '../data/constants';
import { normalizeShift, getShiftHours } from '../utils/shiftHelper';
import { canPickStore } from '../lib/authSession';
import { visibleDeptIds } from '../utils/dataScope';
import { useShallow } from 'zustand/react/shallow';

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

export default function ManagerActionList({ storeId = 'ALL' }) {
  const { user, feedbacks, shiftSwaps, employees, schedule, currentWeek, stores } = useStore(useShallow((s) => ({ user: s.user, feedbacks: s.feedbacks, shiftSwaps: s.shiftSwaps, employees: s.employees, schedule: s.schedule, currentWeek: s.currentWeek, stores: s.stores })));
  const pickStore = canPickStore(user);
  const effectiveStore = (!pickStore && user?.dept) ? user.dept : storeId;
  const weekSched = schedule[currentWeek] || EMPTY_SCHED;

  const items = useMemo(() => {
    const list = [];
    const allowedDepts = new Set(visibleDeptIds(user, stores));

    const pendingFb = (feedbacks || []).filter(f => 
      f.status === 'pending' && 
      (effectiveStore === 'ALL' ? allowedDepts.has(f.dept) : f.dept === effectiveStore)
    );
    if (pendingFb.length) {
      list.push({
        key: 'fb',
        to: '/admin/feedback',
        icon: <FileText size={14} />,
        title: `${pendingFb.length} báo bù công chờ duyệt`,
        tone: 'amber'
      });
    }

    const pendingSwaps = (shiftSwaps || []).filter(s => 
      s.status === 'pending_manager' && 
      (effectiveStore === 'ALL' ? allowedDepts.has(s.store) : s.store === effectiveStore)
    );
    if (pendingSwaps.length) {
      list.push({
        key: 'swap',
        to: '/admin/schedule?openSwaps=true',
        icon: <RefreshCw size={14} />,
        title: `${pendingSwaps.length} đơn đổi ca chờ SM duyệt`,
        tone: 'indigo'
      });
    }

    let ptOver = 0;
    employees.forEach(emp => {
      const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME' || (emp.role && emp.role.includes('PT'));
      if (!isPT) return;
      if (effectiveStore === 'ALL' ? !allowedDepts.has(emp.dept) : emp.dept !== effectiveStore) return;
      let h = 0;
      WEEK_DAYS.forEach(d => {
        const { shift } = normalizeShift(weekSched[emp.id]?.[d]);
        if (shift && shift !== 'off') h += getShiftHours(shift);
      });
      if (h > 23) ptOver++;
    });
    if (ptOver) {
      list.push({
        key: 'pt',
        to: '/admin/dashboard',
        icon: <AlertTriangle size={14} />,
        title: `${ptOver} Part-time vượt 23h tuần này`,
        tone: 'rose'
      });
    }

    return list;
  }, [feedbacks, shiftSwaps, employees, weekSched, effectiveStore]);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
        <CheckCircle2 size={16} />
        Không có việc chờ xử lý: đổi ca, bù công, PT vượt giờ đều ổn.
      </div>
    );
  }

  const toneCls = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <h2 className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">Việc cần xử lý</h2>
      <div className="grid sm:grid-cols-3 gap-2">
        {items.map(item => (
          <Link
            key={item.key}
            to={item.to}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold hover:brightness-95 ${toneCls[item.tone]}`}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
