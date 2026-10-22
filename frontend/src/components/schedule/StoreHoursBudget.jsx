import { Link } from 'react-router-dom';
import { storeWeeklyHours, storeHoursLimit } from '../../utils/storeHours';

export default function StoreHoursBudget({ stores, employees, schedule, week, showSettings = true }) {
  return <section aria-label="Hạn mức giờ cửa hàng" className="rounded-xl border bg-white p-3">
    <h2 className="font-semibold">Quỹ giờ tuần {week}</h2>
    <p className="text-xs text-slate-500">Chỉ tính ca đã xếp; đăng ký đang chờ chọn chưa trừ quỹ giờ. Giờ hỗ trợ tính tại cửa hàng nhận.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm" data-testid="store-hours-budget">
      <thead><tr>{['Cửa hàng', 'Hạn mức', 'Đã xếp', 'Còn lại / vượt'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
      <tbody>{stores.map(store => {
        const limit = storeHoursLimit(store), used = storeWeeklyHours(employees, schedule, store.id);
        return <tr key={store.id} className={limit != null && used > limit ? 'bg-red-50 text-red-700' : ''}>
          <th scope="row" className="p-2">{store.id}</th><td className="p-2">{limit == null ? 'Chưa đặt' : `${limit}h`}</td><td className="p-2">{used}h</td>
          <td className="p-2">{limit == null ? '—' : used > limit ? `Vượt ${used - limit}h` : `Còn ${limit - used}h`}</td>
        </tr>;
      })}</tbody>
    </table></div>
    {showSettings && <Link to="/admin/stores" className="text-sm text-blue-700 underline">Cấu hình hạn mức tại Cửa hàng</Link>}
  </section>;
}
