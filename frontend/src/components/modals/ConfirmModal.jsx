import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Info, Trash2, Check } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  loading = false
}) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
            <Trash2 size={24} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
            <AlertTriangle size={24} />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <Check size={24} />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
            <Info size={24} />
          </div>
        );
    }
  };

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      maxWidth="max-w-md"
      hideHeader
      bodyClassName="p-5 sm:p-6"
    >
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
            {title}
          </h3>
          <div className="mt-2 text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            {message}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${getConfirmBtnClass()}`}
        >
          {loading && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          <span>{confirmText}</span>
        </button>
      </div>
    </Modal>
  );
}
