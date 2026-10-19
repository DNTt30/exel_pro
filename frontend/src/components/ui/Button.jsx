import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'border-slate-800 bg-slate-800 text-white hover:bg-slate-900',
  secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800',
};

export default function Button({ variant = 'secondary', busy = false, disabled = false, className = '', children, type = 'button', ...props }) {
  return <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.secondary} ${className}`}>
    {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}{children}
  </button>;
}
