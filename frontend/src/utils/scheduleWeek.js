export const WEEK_FLOW = ['draft', 'pending', 'approved', 'rejected'];

export function weekRecordKey(storeId, weekDate) {
  return `${storeId || ''}::${weekDate || ''}`;
}

export function isWeekLocked(status) {
  return status === 'pending' || status === 'approved';
}

export function weekStatusMeta(status) {
  if (status === 'pending') return { label: 'Chờ duyệt', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (status === 'approved') return { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (status === 'rejected') return { label: 'Từ chối — sửa lại', cls: 'bg-red-50 text-red-700 border-red-200' };
  return { label: 'Nháp', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
}
