import { canPickStore, isOpsManager, getUserDepts, isAreaManagerFromEmp, isBuiltinStoreManager } from '../lib/authSession';

/** Gói truy vấn lúc mở app: NV/SM chỉ lấy dữ liệu cửa hàng mình; nhật ký tải sau. */
export function bootstrapQueryPlan(user) {
  const manager = isOpsManager(user);
  const pick = canPickStore(user);
  const myDepts = getUserDepts(user);
  const scoped = manager && !pick && myDepts.length > 0;
  const nv = !manager;
  
  // Nếu quản lý >1 cửa hàng (multi-store), scoped sẽ fetch theo từng cửa hàng (bằng cách loại bỏ điều kiện hoặc fetch all)
  // Thực tế supabase có policies. Để an toàn, lấy 'dept' là cái đầu tiên nếu có, hoặc để trống (lấy qua policies).
  const primaryDept = myDepts[0] || '';

  return {
    manager,
    pickStore: pick,
    dept: primaryDept,
    // NV nap toan bo danh sach NV (dataset nho) de xem lich cac cua hang
    // khac cung mot SM quan ly (xem visibleDeptIds).
    employees: {},
    feedbacks: nv
      ? { empId: user?.id, limit: 40 }
      : (scoped ? { dept: primaryDept, limit: 120 } : { limit: 200 }),
    swaps: nv
      ? { empId: user?.id, limit: 40 }
      : (scoped ? { store: primaryDept, limit: 80 } : { limit: 150 }),
    shelves: nv
      ? { assigneeId: user?.id }
      : (scoped ? { storeId: primaryDept } : {}),
    shelfItems: scoped || nv ? { storeId: primaryDept || undefined } : {},
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
export function visibleDeptIds(user, stores, employees = []) {
  const list = activeStores(stores);
  if (!user) return list.map(s => s.id);
  
  // OFC / Admin Area -> Xem toàn bộ
  if (isAreaManagerFromEmp(user) || isBuiltinStoreManager(user)) {
    return list.map(s => s.id);
  }

  const myDepts = getUserDepts(user);
  if (myDepts.length === 0) return list.map(s => s.id);
  
  if (isOpsManager(user)) {
    return myDepts; // SM chỉ thấy các cửa hàng họ được gán
  }

  // Nhân viên thường: thấy CH của mình và CH có chung SM
  const ids = new Set(myDepts);
  const primaryDept = myDepts[0];
  const myStore = list.find(s => s.id === primaryDept);
  let mySm = myStore?.sm_id || myStore?.smId || '';

  // Nếu trong store chưa có sm_id, tìm SM quản lý CH từ danh sách employees
  if (!mySm && Array.isArray(employees) && employees.length > 0) {
    const smEmp = employees.find(e => {
      const isSM = isOpsManager(e) || e.role?.includes('Cửa hàng trưởng') || e.role?.includes('SM');
      if (!isSM) return false;
      const depts = (e.dept || '').split(',').map(d => d.trim());
      return depts.includes(primaryDept);
    });
    if (smEmp) {
      mySm = smEmp.id;
      const smDepts = (smEmp.dept || '').split(',').map(d => d.trim()).filter(Boolean);
      smDepts.forEach(d => ids.add(d));
    }
  }

  list.forEach(s => {
    const sSm = s.sm_id || s.smId || '';
    if ((mySm && sSm && sSm === mySm) || (sSm && sSm === user.id)) ids.add(s.id);
  });
  return [...ids];
}

/** Danh sach CUA HANG (object) duoc phep quan ly trong khu vuc admin */
export function visibleStoresForAdmin(user, stores) {
  const act = activeStores(stores);
  const ids = new Set(visibleDeptIds(user, act));
  return act.filter(s => ids.has(s.id));
}
/** Danh sach CH dang hoat dong (is_active khac false) */
export function activeStores(stores) {
  return (Array.isArray(stores) ? stores : []).filter(s => s && s.is_active !== false);
}
