import { AlertTriangle } from 'lucide-react';
import { expiryToneClass, itemExpiryStatus } from '../../utils/shelfExpiry';

export const FIELD_CLS = 'w-full mt-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500';

export function Field({ label, children }) {
  return (
    <label className="text-sm font-semibold text-slate-600 block">
      {label}
      {children}
    </label>
  );
}

export function StoreSelect({ stores, value, onChange, className = FIELD_CLS, disabled = false }) {
  return (
    <select className={className} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
      {(stores || []).map(s => (
        <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
      ))}
    </select>
  );
}

export function ExpiryBadge({ status }) {
  return (
    <span className={`inline-block px-2 py-1 rounded-lg border text-xs font-bold ${expiryToneClass(status?.key)}`}>
      {status?.label || '—'}
    </span>
  );
}

export function ExpiryAlertBanner({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="font-bold text-amber-900 flex items-center gap-2 mb-2">
        <AlertTriangle size={16} /> {alerts.length} món gần / quá hạn
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 text-sm text-amber-800">
        {alerts.slice(0, 9).map(({ shelf, item, st }) => (
          <div key={item.id || item.key}>{shelf.name || shelf.code} · {item.productName} · {st.label}</div>
        ))}
      </div>
    </div>
  );
}

export function ShelfItemTable({ rows, onChange, notifyDays }) {
  const patch = (idx, field, value) => onChange(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  return (
    <>
      <p className="text-xs text-slate-500 mb-2">Cùng SP 2 hạn khác nhau → điền cả HSD 1 và HSD 2 trên cùng dòng. Cảnh báo lấy hạn sớm hơn.</p>
      <div className="overflow-auto border border-slate-300 rounded-lg">
        <table className="w-full text-sm min-w-[820px] border-collapse bg-white">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700 border-b border-slate-300">
              <th className="py-2 px-2 w-10 text-center border-r border-slate-300">STT</th>
              <th className="py-2 px-2 border-r border-slate-300">Tên SP</th>
              <th className="py-2 px-2 w-32 border-r border-slate-300">Mã SP</th>
              <th className="py-2 px-2 w-16 border-r border-slate-300 text-center">SL</th>
              <th className="py-2 px-2 w-36 border-r border-slate-300">Hạn sử dụng 1</th>
              <th className="py-2 px-2 w-36 border-r border-slate-300">Hạn sử dụng 2</th>
              <th className="py-2 px-2 w-36 border-r border-slate-300">Cảnh báo</th>
              <th className="py-2 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.key} className="border-b border-slate-300 hover:bg-slate-50 focus-within:bg-blue-50/40">
                <td className="py-1 px-2 text-slate-500 text-center bg-slate-50 border-r border-slate-300">{idx + 1}</td>
                <td className="p-0 border-r border-slate-300">
                  <input className="w-full h-full px-2 py-2 outline-none bg-transparent focus:ring-inset focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800" value={row.productName} onChange={e => patch(idx, 'productName', e.target.value)} placeholder="Nhập tên..." />
                </td>
                <td className="p-0 border-r border-slate-300">
                  <input className="w-full h-full px-2 py-2 outline-none bg-transparent focus:ring-inset focus:ring-2 focus:ring-blue-500 font-mono text-xs text-slate-600 uppercase" value={row.sku} onChange={e => patch(idx, 'sku', e.target.value)} placeholder="Mã..." />
                </td>
                <td className="p-0 border-r border-slate-300">
                  <input type="number" min="0" className="w-full h-full px-2 py-2 outline-none bg-transparent focus:ring-inset focus:ring-2 focus:ring-blue-500 text-center font-bold" value={row.qty} onChange={e => patch(idx, 'qty', e.target.value)} />
                </td>
                <td className="p-0 border-r border-slate-300">
                  <input type="date" className="w-full h-full px-2 py-2 outline-none bg-transparent focus:ring-inset focus:ring-2 focus:ring-blue-500" value={row.expiryDate} onChange={e => patch(idx, 'expiryDate', e.target.value)} />
                </td>
                <td className="p-0 border-r border-slate-300">
                  <input type="date" className="w-full h-full px-2 py-2 outline-none bg-transparent focus:ring-inset focus:ring-2 focus:ring-blue-500" value={row.expiryDate2} onChange={e => patch(idx, 'expiryDate2', e.target.value)} />
                </td>
                <td className="p-1 px-2 border-r border-slate-300 bg-white"><ExpiryBadge status={itemExpiryStatus(row, notifyDays)} /></td>
                <td className="p-0 text-center bg-white">
                  <button type="button" className="w-full h-full py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center font-black" onClick={() => onChange(rows.filter((_, i) => i !== idx))}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
