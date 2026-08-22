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
    employees: nv && dept ? { dept } : {},
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
