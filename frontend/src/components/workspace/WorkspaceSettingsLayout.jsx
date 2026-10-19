import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, ChevronDown, Palette, ShieldCheck, X } from 'lucide-react';

export const settingsInput = 'mt-2 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50';
export const settingsButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--workspace-primary,#4338ca)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40';

export function SettingsHelp({ title, children }) {
  return <details className="group rounded-xl border border-slate-200 bg-slate-50/70 px-4">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
      <BookOpen size={15} className="shrink-0 text-slate-400" />{title}<ChevronDown size={15} className="ml-auto shrink-0 transition group-open:rotate-180" />
    </summary>
    <div className="space-y-2 pb-4 text-sm leading-relaxed text-slate-600">{children}</div>
  </details>;
}

export function SettingsSection({ number, title, description, children, className = '' }) {
  return <section className={`min-w-0 rounded-xl border border-slate-200 bg-white ${className}`}>
    <div className="flex items-start gap-3 border-b border-slate-100 p-4 sm:px-5">
      <span className="pt-0.5 text-xs font-semibold tabular-nums text-slate-400">{number}</span>
      <div className="min-w-0"><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p></div>
    </div>
    <div className="space-y-4 p-4 sm:p-5">{children}</div>
  </section>;
}

export default function WorkspaceSettingsLayout({ title, description, steps, children }) {
  const [showGuide, setShowGuide] = useState(false);
  return <div data-workspace-settings className="w-full min-w-0 p-3 pb-28 sm:p-5 sm:pb-28">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      <button type="button" aria-expanded={showGuide} aria-controls="workspace-guide" onClick={() => setShowGuide(v => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {showGuide ? <X size={16} /> : <BookOpen size={16} />}{showGuide ? 'Đóng hướng dẫn' : 'Cách sử dụng'}
      </button>
    </header>
    {showGuide && <section id="workspace-guide" aria-label="Hướng dẫn thiết lập" className="mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Thiết lập theo 3 bước</h2>
      <ol className="grid gap-5 md:grid-cols-3">{steps.map((step, i) => <li key={step.title} className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</span>
        <div><h3 className="text-sm font-semibold text-slate-800">{step.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{step.text}</p></div>
      </li>)}</ol>
    </section>}
    <nav aria-label="Cài đặt đơn vị" className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
      {[{ to: '/admin/settings', icon: Palette, label: 'Nhận diện đơn vị', hint: 'Tên, logo, màu và liên hệ hỗ trợ' }, { to: '/admin/roles', icon: ShieldCheck, label: 'Vai trò & quyền', hint: 'Tạo chức danh và gán quyền cho nhân viên' }].map(({ to, icon: Icon, label, hint }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-0 min-h-12 items-center gap-2 rounded-lg border px-3 py-3 text-sm transition sm:gap-3 ${isActive ? 'border-slate-200 bg-white text-slate-900 shadow-xs' : 'border-transparent text-slate-600 hover:bg-white/60'}`}><Icon size={18} className="shrink-0" /><span className="min-w-0"><span className="block font-semibold">{label}</span><span className="mt-0.5 hidden text-xs font-normal text-slate-500 sm:block">{hint}</span></span></NavLink>)}
    </nav>
    {children}
  </div>;
}
