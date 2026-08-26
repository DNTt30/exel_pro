import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Info, ChevronDown } from 'lucide-react';
import { SEVERITY } from '../../utils/scheduleConflicts';

// Panel cảnh báo xung đột lịch — advisory (không chặn lưu tự động),
// BLOCKER hiển thị đỏ nổi bật để quản lý xử lý trước khi gửi duyệt.
const META = {
  [SEVERITY.BLOCKER]: { icon: ShieldAlert, label: 'Chặn', cls: 'bg-red-50 border-red-200 text-red-700', row: 'text-red-700' },
  [SEVERITY.ERROR]:   { icon: AlertTriangle, label: 'Lỗi', cls: 'bg-orange-50 border-orange-200 text-orange-700', row: 'text-orange-700' },
  [SEVERITY.WARNING]: { icon: AlertTriangle, label: 'Cảnh báo', cls: 'bg-amber-50 border-amber-200 text-amber-800', row: 'text-amber-800' },
  [SEVERITY.INFO]:    { icon: Info, label: 'Ghi chú', cls: 'bg-sky-50 border-sky-200 text-sky-700', row: 'text-sky-700' },
};

export default function ConflictPanel({ findings = [] }) {
  const [open, setOpen] = useState(false);
  if (!findings.length) return null;

  const counts = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const blockers = counts[SEVERITY.BLOCKER] || 0;
  const errors = counts[SEVERITY.ERROR] || 0;
  const worst = blockers ? META[SEVERITY.BLOCKER] : errors ? META[SEVERITY.ERROR] : META[SEVERITY.WARNING];

  return (
    <div className={`border rounded-xl px-3 py-2 text-xs ${worst.cls}`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 font-bold">
        {blockers ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
        <span>
          Kiểm tra lịch: {findings.length} mục cần ý
          {blockers > 0 && ` · ${blockers} CHẶN`}
          {errors > 0 && ` · ${errors} lỗi`}
        </span>
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-1 max-h-48 overflow-auto">
          {[SEVERITY.BLOCKER, SEVERITY.ERROR, SEVERITY.WARNING, SEVERITY.INFO].flatMap(sev =>
            findings.filter(f => f.severity === sev).map((f, i) => {
              const m = META[f.severity];
              return (
                <div key={sev + i} className={`flex gap-2 ${m.row}`}>
                  <span className="font-mono opacity-70">[{f.code}]</span>
                  <span className="opacity-90">{f.employeeId}{f.date ? ' · ' + f.date : ''}:</span>
                  <span>{f.message}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
