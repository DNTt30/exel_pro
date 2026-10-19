import { AlertTriangle, Info, Trash2, Check } from 'lucide-react';
import Modal from './Modal';
import Button from '../ui/Button';

const icons = { danger: Trash2, warning: AlertTriangle, success: Check, info: Info };

export default function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?', confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ', variant = 'danger', loading = false,
}) {
  const Icon = icons[variant] || Info;
  return <Modal isOpen={isOpen} onClose={onClose} title={title} closeDisabled={loading}
    footer={<>
      <Button disabled={loading} onClick={onClose}>{cancelText}</Button>
      <Button variant={variant === 'danger' ? 'danger' : 'primary'} busy={loading} onClick={onConfirm}>{confirmText}</Button>
    </>}>
    <div className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
      <Icon size={22} aria-hidden="true" className={`mt-0.5 shrink-0 ${variant === 'danger' ? 'text-rose-700' : 'text-slate-500'}`} />
      <div className="whitespace-pre-line">{message}</div>
    </div>
  </Modal>;
}
