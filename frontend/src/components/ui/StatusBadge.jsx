import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function StatusBadge({ status, customText = '', className = '' }) {
  switch (status) {
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
          <CheckCircle2 size={11} /> {customText || 'ĐÃ DUYỆT'}
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
          <XCircle size={11} /> {customText || 'TỪ CHỐI'}
        </span>
      );
    case 'pending_partner':
      return (
        <span className={`inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
          <Clock size={11} /> {customText || 'Chờ đồng nghiệp đồng ý'}
        </span>
      );
    case 'pending_manager':
      return (
        <span className={`inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
          <Clock size={11} /> {customText || 'Chờ Quản lý duyệt'}
        </span>
      );
    case 'cancelled':
      return (
        <span className={`inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
          {customText || 'Đã hủy'}
        </span>
      );
    case 'pending':
    default:
      return (
        <span className={`inline-flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse ${className}`}>
          <Clock size={11} /> {customText || 'CHỜ DUYỆT'}
        </span>
      );
  }
}
