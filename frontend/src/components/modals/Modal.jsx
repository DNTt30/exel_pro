import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

// Only the topmost dialog handles Escape/Tab (e.g. Admin override above a preview).
const openDialogs = [];
const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export default function Modal({ title, description, isOpen, onClose, children,
  hideClose = false, maxWidth = 'max-w-md', headerClassName = '',
  bodyClassName = 'p-5 sm:p-6', hideHeader = false, preventBackdropClose = false,
  closeDisabled = false, footer, titleId, ariaLabel,
}) {
  const generatedId = useId();
  const headingId = titleId || generatedId;
  const panelRef = useRef(null);
  const wasOpen = useRef(false);
  const openerRef = useRef(null);
  if (isOpen && !wasOpen.current && typeof document !== 'undefined') openerRef.current = document.activeElement;
  wasOpen.current = isOpen;
  const closeRef = useRef({ onClose, closeDisabled });
  closeRef.current = { onClose, closeDisabled };

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const previousFocus = openerRef.current;
    openDialogs.push(panel);
    if (!panel.contains(document.activeElement)) panel.focus();
    const handleKeyDown = event => {
      if (openDialogs.at(-1) !== panel) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!closeRef.current.closeDisabled) closeRef.current.onClose?.();
      }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(focusableSelector)].filter(el => !el.closest('[hidden], [inert]') && !el.matches(':disabled') && el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      const wasTop = openDialogs.at(-1) === panel;
      const index = openDialogs.indexOf(panel);
      if (index >= 0) openDialogs.splice(index, 1);
      document.removeEventListener('keydown', handleKeyDown);
      if (wasTop && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4" onClick={event => {
    if (event.target === event.currentTarget && openDialogs.at(-1) === panelRef.current && !preventBackdropClose && !closeDisabled) onClose?.();
  }}>
    <section ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}
      aria-labelledby={!hideHeader && title ? headingId : undefined}
      aria-label={hideHeader || !title ? ariaLabel || (typeof title === 'string' && title) || 'Hộp thoại' : undefined}
      aria-describedby={description && !hideHeader ? `${headingId}-description` : undefined}
      className={`flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl outline-none`}>
      {!hideHeader && <header className={`flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 sm:px-5 ${headerClassName}`}>
        <div className="min-w-0"><div id={headingId} role="heading" aria-level={2} className="text-base font-semibold text-slate-900 sm:text-lg">{title}</div>
          {description && <p id={`${headingId}-description`} className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>}
        </div>
        {!hideClose && <button type="button" onClick={onClose} disabled={closeDisabled || !onClose} aria-label="Đóng hộp thoại" title="Đóng (Esc)" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-600 disabled:opacity-40"><X size={20} /></button>}
      </header>}
      <div className={`min-h-0 overflow-y-auto ${bodyClassName}`}>{children}</div>
      {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">{footer}</footer>}
    </section>
  </div>;
}
