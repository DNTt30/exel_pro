import { create } from 'zustand';

// Store + helper của hệ thống toast (tách khỏi toast.jsx để tương thích fast-refresh).
// Dùng: import { toast } from '<đường dẫn>/ui/toastStore';

let idSeq = 0;

export const useToasts = create((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++idSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, ...t }] }));
    const duration = t.duration ?? (t.type === 'error' ? 6000 : 3500);
    setTimeout(() => useToasts.getState().dismiss(id), duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (message) => useToasts.getState().push({ type: 'success', message }),
  error: (message) => useToasts.getState().push({ type: 'error', message }),
  info: (message) => useToasts.getState().push({ type: 'info', message }),
};
