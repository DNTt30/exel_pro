import { useState } from 'react';
import { Building2, CalendarDays, Check, ChevronDown, ChevronRight, Eye, Mail, PanelLeft, Sparkles } from 'lucide-react';

export default function BrandingPreview({ draft, dirty }) {
  const [mode, setMode] = useState('app');
  const [mobileOpen, setMobileOpen] = useState(false);
  const logo = draft.logoDataUrl ? (
    <img src={draft.logoDataUrl} alt="Logo xem trước" className="h-full w-full object-contain rounded-lg" />
  ) : (
    <Building2 size={24} />
  );

  return (
    <aside aria-label="Xem trước nhận diện" className="order-first space-y-3 xl:sticky xl:top-5 xl:order-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <button
          type="button"
          aria-label="Xem trước nhận diện"
          aria-expanded={mobileOpen}
          aria-controls="branding-preview-content"
          onClick={() => setMobileOpen(value => !value)}
          className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-bold text-slate-800 xl:hidden cursor-pointer"
        >
          <Eye size={16} className="text-indigo-600" />
          <span>Xem trước nhận diện trực tiếp</span>
          <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
            {dirty ? 'Bản nháp' : 'Đang áp dụng'}
          </span>
          <ChevronDown size={16} className={`transition ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="hidden items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 xl:flex">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <Eye size={16} className="text-indigo-600" />
            <span>Xem trước trực tiếp</span>
          </h2>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${dirty ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {dirty ? 'Bản chưa lưu' : 'Đang áp dụng'}
          </span>
        </div>

        <div id="branding-preview-content" className={`${mobileOpen ? 'block' : 'hidden'} p-4 xl:block`}>
          <div className="mb-3.5 flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Kiểu xem trước">
            {[
              { id: 'app', label: 'Trong ứng dụng' },
              { id: 'login', label: 'Trang đăng nhập' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
                className={`min-h-8 flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition cursor-pointer ${
                  mode === item.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === 'app' ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
              {/* Mô phỏng Header với Logo cỡ lớn */}
              <div className="flex items-center gap-2.5 px-3 py-3 text-white" style={{ backgroundColor: draft.primaryColor }}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 text-slate-700 shadow-sm ring-1 ring-white/30">
                  {logo}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black leading-tight">{draft.appName || 'Tên ứng dụng'}</div>
                  <div className="truncate text-[10px] text-white/80 mt-0.5">{draft.organizationName || 'Đơn vị của bạn'}</div>
                </div>
                <PanelLeft size={15} className="shrink-0 opacity-75" />
              </div>

              <div className="space-y-3 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CalendarDays size={14} style={{ color: draft.primaryColor }} />
                    <span>Lịch làm việc tuần</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Live</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <div className="mb-2 flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>Nhân viên</span>
                    <span>T2</span>
                    <span>T3</span>
                    <span>T4</span>
                  </div>
                  {[0, 1].map(i => (
                    <div key={i} className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="h-2 w-12 rounded bg-slate-200" />
                      <span className="rounded bg-[#059669] px-1.5 py-0.5 text-[9px] font-bold text-white">6-14</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">OFF</span>
                      <span className="rounded bg-[#2563eb] px-1.5 py-0.5 text-[9px] font-bold text-white">14-22</span>
                    </div>
                  ))}
                </div>

                <div
                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: draft.primaryColor }}
                >
                  <span>Xem lịch tuần</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>
          ) : (
            /* Mô phỏng Trang Đăng Nhập Twilight Horizon với Logo cỡ lớn */
            <div
              className="rounded-2xl border border-purple-300/20 px-4 py-5 text-center text-white shadow-inner"
              style={{
                background: 'linear-gradient(180deg, #161130 0%, #2c1b4d 55%, #18122B 100%)'
              }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md ring-2 ring-purple-200/30" style={{ color: draft.primaryColor }}>
                {logo}
              </div>
              <p className="mt-2.5 break-words text-base font-extrabold text-white">{draft.appName || 'Tên ứng dụng'}</p>
              <p className="mt-0.5 break-words text-[11px] text-purple-200/80">
                {draft.organizationName || 'Không gian điều phối ca làm'}
              </p>
              <div className="mt-4 space-y-2 text-left">
                <div className="rounded-xl border border-purple-300/20 bg-[#120e22]/90 px-3 py-2 text-[11px] text-purple-200/50">
                  Mã nhân viên 9 chữ số
                </div>
                <div className="rounded-xl border border-purple-300/20 bg-[#120e22]/90 px-3 py-2 text-[11px] text-purple-200/50">
                  ••••••••
                </div>
                <div
                  className="rounded-xl px-3 py-2 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 52%, #db2777 100%)'
                  }}
                >
                  <Sparkles size={11} />
                  <span>ĐĂNG NHẬP</span>
                </div>
              </div>
              {draft.contactEmail && (
                <p className="mt-3.5 break-all text-[10px] text-purple-200/75">
                  <Mail size={11} className="mr-1 inline" />
                  {draft.contactEmail}
                </p>
              )}
            </div>
          )}

          <p className="mt-2.5 text-center text-[11px] text-slate-400">Minh họa hiển thị trực tiếp khi lưu</p>
        </div>
      </div>

      <div className={`${mobileOpen ? 'flex' : 'hidden'} items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3 text-xs leading-relaxed text-slate-600 xl:flex`}>
        <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />
        <p>Logo và màu chủ đạo được đồng bộ tức thì cho toàn bộ Quản lý và Nhân viên trong đơn vị.</p>
      </div>
    </aside>
  );
}
