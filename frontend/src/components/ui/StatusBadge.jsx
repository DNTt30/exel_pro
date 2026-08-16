import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function StatusBadge({ status }) {
  if (status === 'approved') {
    return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold"><CheckCircle2 size={12}/> ĐÃ DUYỆT</span>;
  }
  if (status === 'rejected') {
    return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold"><XCircle size={12}/> TỪ CHỐI</span>;
  }
  return <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse"><Clock size={12}/> CHỜ DUYỆT</span>;
}
