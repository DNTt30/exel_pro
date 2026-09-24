import { useEffect, useMemo, useState } from 'react';
import { triageShelfItem } from '../../utils/decisionRouting';
const LABELS = { DISCARD: 'Tách hàng quá hạn', RETURN_SUPPLIER: 'Đề xuất trả NCC', DISCOUNT_NOW: 'Đề xuất giảm giá', MONITOR: 'Theo dõi / bổ sung dữ liệu' };
export default function ShelfTriagePanel({ shelves, items }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  const list = useMemo(() => {
    const ids = new Set(shelves.map(s => s.id));
    return items.filter(i => ids.has(i.shelfId)).map(item => ({ item, ...triageShelfItem(item, now) })).sort((a, b) => b.priority - a.priority || (a.hoursLeft ?? Infinity) - (b.hoursLeft ?? Infinity)).slice(0, 5);
  }, [shelves, items, now]);
  if (!list.length) return null;
  return <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm">
    <h3 className="font-bold text-indigo-900">5 mặt hàng cần kiểm tra trước</h3>
    <p className="text-xs text-slate-600 mt-1">Theo giờ Việt Nam. Đề xuất cần nhân viên xác nhận theo chính sách cửa hàng; chưa thực hiện giảm giá, trả hoặc hủy hàng.</p>
    <ul className="mt-2 space-y-2">{list.map(({ item, action, reason, hoursLeft }) => <li key={item.id || item.key} className="rounded-lg bg-white p-2">
      <strong>{item.productName}</strong> · {LABELS[action]}
      <p className="text-xs text-slate-600">{reason}{hoursLeft !== null && hoursLeft > 0 ? ` · Còn ${hoursLeft.toFixed(1)} giờ` : ''}</p>
    </li>)}</ul>
  </section>;
}
