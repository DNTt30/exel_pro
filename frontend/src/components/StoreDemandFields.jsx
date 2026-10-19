import { normalizeStoreDemand, suggestStaffingFromDemand } from '../data/constants';
import Button from './ui/Button';

const buckets = [['weekday', 'Thứ 2 – Thứ 6'], ['weekend', 'Thứ 7 – Chủ nhật']];
const fields = [['sales', 'Doanh số (đ)'], ['customers', 'Lượt khách']];

export default function StoreDemandFields({ demand, onChange, onSuggest }) {
  const cfg = normalizeStoreDemand(demand);
  const setField = (bucket, field, value) => {
    const parsed = Number(value);
    const n = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    onChange({ ...cfg, [bucket]: { ...cfg[bucket], [field]: n } });
  };
  return <div className="space-y-4">
    <p className="text-sm leading-relaxed text-slate-600">Số liệu trung bình mỗi ngày. Để trống nếu chưa có số liệu.</p>
    {buckets.map(([bucket, label]) => <fieldset key={bucket} className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-slate-700">{label}</legend>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">{fields.map(([field, fieldLabel]) => <label key={field} className="min-w-0 text-sm text-slate-600">{fieldLabel}
        <input type="number" min="0" step="1" inputMode="numeric" aria-label={`${fieldLabel} ${bucket}`} value={cfg[bucket][field] || ''}
          onChange={event => setField(bucket, field, event.target.value)} placeholder="Chưa có"
          className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" />
      </label>)}</div>
    </fieldset>)}
    {onSuggest && <Button onClick={() => onSuggest(suggestStaffingFromDemand(cfg))}>Gợi ý định biên từ số liệu</Button>}
  </div>;
}
