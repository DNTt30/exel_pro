import { normalizeStoreDemand, suggestStaffingFromDemand } from '../data/constants';

function formatSalesInput(n) {
  if (!n) return '';
  return String(n);
}

export default function StoreDemandFields({ demand, onChange, onSuggest }) {
  const cfg = normalizeStoreDemand(demand);

  const setField = (bucket, field, value) => {
    const n = Math.max(0, Number(String(value).replace(/[^\d]/g, '')) || 0);
    onChange({
      ...cfg,
      [bucket]: { ...cfg[bucket], [field]: n }
    });
  };

  const handleSuggest = () => {
    onSuggest?.(suggestStaffingFromDemand(cfg));
  };

  const row = (bucket, label) => (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold uppercase text-slate-500 w-20">{label}</span>
      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
        Lượt khách TB
        <input
          type="number"
          min="0"
          className="w-20 p-1 border border-slate-300 rounded text-center font-mono text-xs"
          value={cfg[bucket].customers || ''}
          placeholder="0"
          onChange={e => setField(bucket, 'customers', e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
        Doanh số TB (đ)
        <input
          type="number"
          min="0"
          className="w-28 p-1 border border-slate-300 rounded text-center font-mono text-xs"
          value={formatSalesInput(cfg[bucket].sales)}
          placeholder="0"
          onChange={e => setField(bucket, 'sales', e.target.value)}
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-slate-500">
        Số liệu trung bình ngày từ GS25 Direct (hoặc nhập tay). Bấm gợi ý để ra định biên ca.
      </p>
      {row('weekday', 'T2–T6')}
      {row('weekend', 'T7–CN')}
      {onSuggest && (
        <button
          type="button"
          onClick={handleSuggest}
          className="mt-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Gợi ý định biên từ lưu lượng / doanh số
        </button>
      )}
    </div>
  );
}
