import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToasts } from './toastStore';

// Toaster hiển thị danh sách toast. Mount một lần trong AppLayout.
// Gửi toast từ bất kỳ đâu: import { toast } from '<đường dẫn>/ui/toastStore';

const STYLES = {
  success: { wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" /> },
  error: { wrap: 'bg-red-50 border-red-200 text-red-700', icon: <AlertTriangle size={16} className="text-red-500 flex-shrink-0" /> },
  info: { wrap: 'bg-blue-50 border-blue-200 text-blue-800', icon: <Info size={16} className="text-blue-500 flex-shrink-0" /> }
};

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,420px)] print:hidden">
      {toasts.map((t) => {
        const st = STYLES[t.type] || STYLES.info;
        return (
          <div key={t.id} role="status" className={'flex items-start gap-2 px-3.5 py-2.5 rounded-xl border shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 ' + st.wrap}>
            {st.icon}
            <span className="flex-1 whitespace-pre-line leading-relaxed">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" aria-label="Đóng">
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
