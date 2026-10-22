import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Building2, ChevronDown, Palette, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useWorkspaceBranding } from '../../hooks/useWorkspaceBranding';
import { useStore } from '../../store/useStore';

export const settingsInput = 'mt-1.5 block w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 disabled:bg-slate-50 transition-all';
export const settingsButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--workspace-primary,#4338ca)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';

export function SettingsHelp({ title, children }) {
  return (
    <details className="group rounded-xl border border-slate-200/90 bg-slate-50/80 px-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
        <BookOpen size={15} className="shrink-0 text-indigo-500" />
        <span>{title}</span>
        <ChevronDown size={15} className="ml-auto shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-2 pb-3.5 text-xs sm:text-sm leading-relaxed text-slate-600 border-t border-slate-200/60 pt-2.5">
        {children}
      </div>
    </details>
  );
}

export function SettingsSection({ number, title, description, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden ${className}`}>
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white p-4 sm:px-5">
        <span
          style={{ backgroundColor: 'var(--workspace-primary, #4338ca)' }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold tabular-nums text-white shadow-2xs"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs sm:text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function WorkspaceSettingsLayout({ title, description, steps, children }) {
  const [showGuide, setShowGuide] = useState(false);
  const branding = useWorkspaceBranding();
  const roles = useStore(s => s.workspaceRoles) || [];
  const activeRolesCount = roles.filter(r => r.isActive).length;

  return (
    <div data-workspace-settings className="w-full min-w-0 max-w-6xl mx-auto p-2.5 pb-28 sm:p-5 sm:pb-28 space-y-4">
      {/* ── Banner Quản Trị Đơn Vị (Hiển thị Logo lớn + Trạng thái thương hiệu) ── */}
      <header
        style={{
          background: `linear-gradient(135deg, ${branding.primaryColor || '#4338ca'} 0%, #1e1b4b 60%, #0f172a 100%)`
        }}
        className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white shadow-md border border-white/10"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 text-slate-800 shadow-lg ring-2 ring-white/30">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Logo đơn vị" className="h-full w-full object-contain rounded-xl" />
              ) : (
                <Building2 size={28} className="text-indigo-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 mb-1">
                <Sparkles size={11} className="text-amber-300" />
                <span>{branding.appName || 'Lịch Ca'}{branding.organizationName ? ` · ${branding.organizationName}` : ''}</span>
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-2xl truncate">{title}</h1>
              <p className="mt-0.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-indigo-100/85">{description}</p>
            </div>
          </div>

          <button
            type="button"
            aria-expanded={showGuide}
            aria-controls="workspace-guide"
            onClick={() => setShowGuide(v => !v)}
            className="inline-flex min-h-10 self-start sm:self-center shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2 text-xs sm:text-sm font-bold text-white transition cursor-pointer"
          >
            {showGuide ? <X size={15} /> : <BookOpen size={15} />}
            <span>{showGuide ? 'Đóng hướng dẫn' : 'Cách sử dụng'}</span>
          </button>
        </div>
      </header>

      {showGuide && (
        <section id="workspace-guide" aria-label="Hướng dẫn thiết lập" className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 sm:p-5">
          <h2 className="mb-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-indigo-900">Thiết lập nhanh theo 3 bước</h2>
          <ol className="grid gap-3.5 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex items-start gap-3 rounded-xl bg-white p-3.5 border border-indigo-100 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-extrabold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Thanh Chuyển Tab Nhận Diện / Vai Trò ── */}
      <nav aria-label="Cài đặt đơn vị" className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1.5">
        {[
          {
            to: '/admin/settings',
            icon: Palette,
            label: 'Nhận diện đơn vị',
            hint: 'Tên app, logo cỡ lớn, bảng màu & email hỗ trợ',
            badge: branding.logoDataUrl ? 'Đã có logo' : null
          },
          {
            to: '/admin/roles',
            icon: ShieldCheck,
            label: 'Vai trò & quyền',
            hint: 'Tạo chức danh tùy chỉnh & phân quyền nhân sự',
            badge: activeRolesCount > 0 ? `${activeRolesCount} vai trò` : null
          }
        ].map(({ to, icon: Icon, label, hint, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition sm:gap-3 ${
                isActive
                  ? 'border-indigo-200/80 bg-white text-slate-900 shadow-sm ring-1 ring-indigo-500/10'
                  : 'border-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isActive ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-bold text-xs sm:text-sm">{label}</span>
                    {badge && (
                      <span className="hidden sm:inline-block rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 hidden text-xs font-normal text-slate-500 sm:block truncate">{hint}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  );
}
