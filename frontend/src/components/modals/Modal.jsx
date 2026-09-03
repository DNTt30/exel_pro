import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export default function Modal({ 
  title, 
  isOpen, 
  onClose, 
  children, 
  hideClose = false,
  maxWidth = 'max-w-md',
  headerClassName = '',
  bodyClassName = 'p-5 sm:p-6',
  hideHeader = false,
  preventBackdropClose = false
}) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (!preventBackdropClose && e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} mx-auto max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150`}>
        {!hideHeader && (
          <div className={`flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/80 flex-shrink-0 ${headerClassName}`}>
            {typeof title === 'string' ? (
              <h3 className="font-bold text-slate-800 text-base sm:text-lg">{title}</h3>
            ) : (
              title
            )}
            {!hideClose && (
              <button 
                type="button"
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={`overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
