import { useState } from 'react';
import { Building2, CalendarDays, Check, ChevronDown, ChevronRight, Eye, Mail, PanelLeft } from 'lucide-react';

export default function BrandingPreview({ draft, dirty }) {
  const [mode, setMode] = useState('app');
  const [mobileOpen, setMobileOpen] = useState(false);
  const logo = draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Logo xem trước" className="h-full w-full object-contain" /> : <Building2 size={22} />;
  return <aside aria-label="Xem trước nhận diện" className="order-first space-y-4 xl:sticky xl:top-5 xl:order-none">
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button type="button" aria-label="Xem trước nhận diện" aria-expanded={mobileOpen} aria-controls="branding-preview-content" onClick={() => setMobileOpen(value => !value)} className="flex w-full items-center gap-2 px-4 py-4 text-sm font-semibold text-slate-700 xl:hidden"><Eye size={16} className="text-slate-400" />Xem trước nhận diện<ChevronDown size={16} className={`ml-auto transition ${mobileOpen ? 'rotate-180' : ''}`} /></button>
      <div className="hidden items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 xl:flex"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Eye size={16} className="text-slate-400" />Xem trước</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">{dirty ? 'Bản chưa lưu' : 'Đang áp dụng'}</span></div>
      <div id="branding-preview-content" className={`${mobileOpen ? 'block' : 'hidden'} p-4 xl:block`}>
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Kiểu xem trước">{[{ id: 'app', label: 'Trong ứng dụng' }, { id: 'login', label: 'Trang đăng nhập' }].map(item => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)} className={`min-h-9 flex-1 rounded-md px-2 py-2 text-xs font-semibold transition ${mode === item.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>{item.label}</button>)}</div>
        {mode === 'app' ? <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center gap-2.5 px-3 py-4 text-white" style={{ backgroundColor: draft.primaryColor }}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 text-slate-700">{logo}</div><span className="min-w-0 flex-1 break-words text-sm font-bold">{draft.appName || 'Tên ứng dụng'}</span><PanelLeft size={15} className="shrink-0 opacity-70" /></div>
          <div className="space-y-4 bg-slate-50 p-4"><p className="break-words text-[11px] font-medium text-slate-500">{draft.organizationName || 'Đơn vị của bạn'}</p><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CalendarDays size={16} />Lịch làm việc</div><div className="rounded-lg border border-slate-200 bg-white p-3"><div className="mb-3 flex justify-between text-[10px] text-slate-400"><span>Nhân viên</span><span>T2</span><span>T3</span><span>T4</span></div>{[0, 1].map(i => <div key={i} className="mt-2 flex items-center justify-between gap-2"><span className="h-2 w-10 rounded bg-slate-200" /><span className="rounded bg-emerald-50 px-1.5 py-1 text-[9px] text-emerald-700">6–14</span><span className="rounded bg-slate-100 px-1.5 py-1 text-[9px] text-slate-400">OFF</span><span className="rounded bg-amber-50 px-1.5 py-1 text-[9px] text-amber-700">14–22</span></div>)}</div><div className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-white" style={{ backgroundColor: draft.primaryColor }}>Xem lịch tuần<ChevronRight size={14} /></div></div>
        </div> : <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-xs" style={{ color: draft.primaryColor }}>{logo}</div>
          <p className="mt-3 break-words text-lg font-bold text-slate-900">{draft.appName || 'Tên ứng dụng'}</p><p className="mt-1 break-words text-xs text-slate-500">{draft.organizationName || 'Chào mừng bạn quay lại'}</p>
          <div className="mt-6 space-y-2 text-left"><div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-400">Mã nhân viên</div><div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-400">Mật khẩu</div><div className="rounded-lg px-3 py-2.5 text-center text-xs font-semibold text-white" style={{ backgroundColor: draft.primaryColor }}>Đăng nhập</div></div>
          {draft.contactEmail && <p className="mt-5 break-all text-[11px] text-slate-500"><Mail size={12} className="mr-1 inline" />{draft.contactEmail}</p>}
        </div>}
        <p className="mt-3 text-center text-[11px] text-slate-400">Minh họa nhận diện sau khi lưu</p>
      </div>
    </div>
    <div className={`${mobileOpen ? 'flex' : 'hidden'} items-start gap-2.5 px-1 text-xs leading-relaxed text-slate-500 xl:flex`}><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /><p>Thay đổi áp dụng chung cho quản lý và nhân viên. Màu trạng thái ca và cảnh báo vẫn giữ nguyên để dễ theo dõi.</p></div>
  </aside>;
}
