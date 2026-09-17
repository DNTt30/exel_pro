// Re-export từ utils/toast — backward-compatible cho các component đang dùng path cũ.
// Nguồn thật: src/utils/toast.js (Zustand store thuần, không phụ thuộc DOM/JSX).
export { useToasts, toast } from '../../utils/toast';
