import { normalizeShift } from './shiftHelper';

export const ACTIVE_SWAP_STATUSES = ['approved', 'pending_partner', 'pending_manager'];

export function getStoreLabel(stores, id) {
  if (!id) return '';
  const st = (stores || []).find(s => s.id === id);
  return st?.name ? `${id} · ${st.name}` : String(id);
}

export function isSupportAssignment(rawVal, homeDept) {
  const { covering_store } = normalizeShift(rawVal);
  return Boolean(covering_store && covering_store !== homeDept);
}

export function getSwapsForWeek(swaps, userId, week) {
  return (swaps || []).filter(s =>
    s.week === week &&
    (s.fromEmpId === userId || s.toEmpId === userId) &&
    ACTIVE_SWAP_STATUSES.includes(s.status)
  );
}

/**
 * Badge đổi ca cho 1 ngày trên lịch cá nhân.
 * same-day swap: "Đổi ca với X" / "Chờ đổi với X"
 * khác ngày: swap-out (đổi đi) vs swap-in (nhận ca)
 */
export function getSwapBadgeForDay(swapsForWeek, userId, dayKey) {
  const hits = (swapsForWeek || []).filter(s => s.fromDay === dayKey || s.toDay === dayKey);
  if (!hits.length) return null;

  const swap = hits[0];
  const pending = swap.status !== 'approved';
  const isFrom = swap.fromEmpId === userId;
  const partner = isFrom ? (swap.toEmpName || swap.toEmpId) : (swap.fromEmpName || swap.fromEmpId);
  const sameDay = swap.fromDay === swap.toDay;

  if (sameDay) {
    return {
      label: pending ? `Chờ đổi với ${partner}` : `Đổi ca với ${partner}`,
      pending,
      kind: 'swap',
      partner
    };
  }

  const iGaveThisDay = (isFrom && swap.fromDay === dayKey) || (!isFrom && swap.toDay === dayKey);
  return {
    label: pending
      ? (iGaveThisDay ? `Chờ đổi đi · ${partner}` : `Chờ nhận ca · ${partner}`)
      : (iGaveThisDay ? `Đổi đi · ${partner}` : `Nhận ca · ${partner}`),
    pending,
    kind: iGaveThisDay ? 'swap-out' : 'swap-in',
    partner
  };
}
