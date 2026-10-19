import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

const statuses = {
  approved: { label: 'ĐÃ DUYỆT', icon: CheckCircle2, tone: 'text-emerald-800 border-emerald-200' },
  rejected: { label: 'TỪ CHỐI', icon: XCircle, tone: 'text-rose-800 border-rose-200' },
  pending: { label: 'CHỜ DUYỆT', icon: Clock, tone: 'text-amber-800 border-amber-200' },
  pending_partner: { label: 'Chờ đồng nghiệp đồng ý', icon: Clock, tone: 'text-amber-800 border-amber-200' },
  pending_manager: { label: 'Chờ Quản lý duyệt', icon: Clock, tone: 'text-amber-800 border-amber-200' },
  cancelled: { label: 'Đã hủy', icon: XCircle, tone: 'text-slate-600 border-slate-200' },
  draft: { label: 'Bản nháp', icon: FileText, tone: 'text-slate-600 border-slate-200' },
};

export default function StatusBadge({ status, customText = '', className = '' }) {
  const { label, icon: Icon, tone } = statuses[status] || { label: 'Chưa xác định', icon: FileText, tone: 'text-slate-600 border-slate-200' };
  return <span className={`inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-xs font-semibold ${tone} ${className}`}><Icon size={13} aria-hidden="true" />{customText || label}</span>;
}
