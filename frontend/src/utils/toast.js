import { create } from 'zustand';

// Store + helper của hệ thống toast.
// Là Zustand store thuần túy (không phụ thuộc DOM/JSX) — nằm ở utils/
// để store/slices có thể import mà không tạo circular dependency với components/.
//
// Dùng: import { toast } from '@/utils/toast';
// Component Toast.jsx import từ đây để render.

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
