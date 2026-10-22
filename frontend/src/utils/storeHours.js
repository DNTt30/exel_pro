import { normalizeStaffingConfig } from '../data/constants';
export { storeWeeklyHours } from './shiftHelper';


export function storeHoursLimit(store) {
  return normalizeStaffingConfig(store?.staffing).weeklyHoursLimit ?? null;
}

export function resolveStoreHoursLimit(storeId, options) {
  const store = options.stores?.find(s => s.id === storeId);
  const configured = storeHoursLimit(store);
  const requested = options.weeklyHoursLimit;
  if (requested != null && (!Number.isFinite(requested) || requested < 0)) throw new Error('Hạn mức giờ cửa hàng không hợp lệ.');
  return configured == null ? requested ?? null : requested == null ? configured : Math.min(configured, requested);
}
