import { STAFFING_SHIFT_CODES, normalizeStaffingConfig } from '../data/constants';

const SHIFT_LABELS = {
  '6-14': 'Sáng',
  '14-22': 'Chiều',
  '22-6': 'Đêm'
};

export default function StaffingMatrixFields({ staffing, onChange }) {
  const cfg = normalizeStaffingConfig(staffing);

  const setCount = (bucket, code, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    onChange({
      ...cfg,
      [bucket]: { ...cfg[bucket], [code]: n }
    });
  };

  const renderRow = (bucket, label) => (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold uppercase text-slate-500 w-20">{label}</span>
      {STAFFING_SHIFT_CODES.map(code => (
        <label key={code} className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
          <span className="font-mono">{code}</span>
          <span className="text-slate-400 font-normal">({SHIFT_LABELS[code]})</span>
          <input
            type="number"
            min="0"
            className="w-12 p-1 border border-slate-300 rounded text-center font-mono text-xs"
            value={cfg[bucket][code]}
            onChange={e => setCount(bucket, code, e.target.value)}
          />
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-1.5">
      {renderRow('weekday', 'T2–T6')}
      {renderRow('weekend', 'T7–CN')}
    </div>
  );
}
