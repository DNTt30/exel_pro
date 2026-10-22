import { Link } from 'react-router-dom';
import { storeWeeklyHours, storeHoursLimit } from '../../utils/storeHours';

export default function StoreHoursBudget({ stores, employees, schedule, week, showSettings = true }) {
  return <section aria-label="Hạn mức giờ cửa hàng" className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-xs font-bold text-slate-800">Quỹ giờ tuần {week}</h2>
        <p className="text-[11px] text-slate-500">Chỉ tính ca đã xếp; đăng ký đang chờ chọn chưa trừ quỹ giờ. Giờ hỗ trợ tính tại cửa hàng nhận.</p>
      </div>
      {showSettings && <Link to="/admin/stores" className="text-xs font-semibold text-blue-700 hover:underline">Cấu hình hạn mức tại Cửa hàng</Link>}
    </div>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs" data-testid="store-hours-budget">
      <thead><tr className="text-slate-500 border-b border-slate-100">{['Cửa hàng', 'Hạn mức', 'Đã xếp', 'Còn lại / vượt'].map(label => <th key={label} className="py-1 px-2 font-semibold">{label}</th>)}</tr></thead>
      <tbody>{stores.map(store => {
        const limit = storeHoursLimit(store), used = storeWeeklyHours(employees, schedule, store.id);
        return <tr key={store.id} className={limit != null && used > limit ? 'bg-red-50/80 text-red-700 font-semibold' : 'text-slate-700'}>
          <th scope="row" className="py-1 px-2 font-bold">{store.id}</th><td className="py-1 px-2 font-mono">{limit == null ? 'Chưa đặt' : `${limit}h`}</td><td className="py-1 px-2 font-mono">{used}h</td>
          <td className="py-1 px-2 font-mono">{limit == null ? '—' : used > limit ? `Vượt ${used - limit}h` : `Còn ${limit - used}h`}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}
