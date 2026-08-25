import { canPickStore, isOpsManager } from '../lib/authSession';

/** Gói truy vấn lúc mở app: NV/SM chỉ lấy dữ liệu cửa hàng mình; nhật ký tải sau. */
export function bootstrapQueryPlan(user) {
  const manager = isOpsManager(user);
  const pick = canPickStore(user);
  const dept = user?.dept || '';
  const scoped = manager && !pick && !!dept;
  const nv = !manager;

  return {
    manager,
    pickStore: pick,
    dept,
    // NV nap toan bo danh sach NV (dataset nho) de xem lich cac cua hang
    // khac cung mot SM quan ly (xem visibleDeptIds).
    employees: {},
    feedbacks: nv
      ? { empId: user?.id, limit: 40 }
      : (scoped ? { dept, limit: 120 } : { limit: 200 }),
    swaps: nv
      ? { empId: user?.id, limit: 40 }
      : (scoped ? { store: dept, limit: 80 } : { limit: 150 }),
    shelves: nv
      ? { assigneeId: user?.id }
      : (scoped ? { storeId: dept } : {}),
    shelfItems: scoped || nv ? { storeId: dept || undefined } : {},
    schedules: nv && user?.id ? { empId: user.id } : {},
    loadLogs: false
  };
}

/**
 * Danh sach ma cua hang ma user duoc XEM LICH:
 * - OFC/admin: toan bo
 * - manager: CH cua minh (hoac cac CH co sm_id = user.id)
 * - Nhan vien: CH cua minh + cac CH cung SM (theo sm_id cua CH minh)
 */
export function visibleDeptIds(user, stores) {
  const list = Array.isArray(stores) ? stores : [];
  if (!user) return list.map(s => s.id);
  if (canPickStore(user)) return list.map(s => s.id);
  const myDept = user.dept || '';
  if (!myDept) return list.map(s => s.id);
  if (isOpsManager(user)) return [myDept];
  const ids = new Set([myDept]);
  const myStore = list.find(s => s.id === myDept);
  const mySm = myStore?.sm_id || myStore?.smId || '';
  list.forEach(s => {
    const sSm = s.sm_id || s.smId || '';
    if ((mySm && sSm && sSm === mySm) || (sSm && sSm === user.id)) ids.add(s.id);
  });
  return [...ids];
}
/** Danh sach CUA HANG (object) duoc phep quan ly trong khu vuc admin */
export function visibleStoresForAdmin(user, stores) {
  const ids = new Set(visibleDeptIds(user, stores));
  return (Array.isArray(stores) ? stores : []).filter(s => ids.has(s.id));
}
