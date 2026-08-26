// Guards phân quyền & khóa tuần — hàm thuần nhận `state`, tách khỏi store để kiểm thử trực tiếp.
import { weekRecordKey, isWeekLocked } from '../utils/scheduleWeek';
import { isOpsManager, isBuiltinStoreManager, getUserDepts } from '../lib/authSession';

export function userIsManager(user) {
  return isOpsManager(user);
}

/** Chặn sửa ô ca khi tuần ở trạng thái pending/approved. */
export function assertWeekEditable(state, storeId, weekDate) {
  if (!storeId || !weekDate) return;
  const rec = state.scheduleWeeks?.[weekRecordKey(storeId, weekDate)];
  if (isWeekLocked(rec?.status)) {
    throw new Error(rec.status === 'approved'
      ? 'Tuần đã duyệt. AM/Admin bấm Từ chối nếu cần sửa.'
      : 'Tuần đang chờ duyệt, không sửa ô ca.');
  }
}

/** Quyền ghi 1 ô ca: admin toàn quyền; SM giới hạn cửa hàng mình (trừ chính mình); NV chỉ được sửa ca của mình. */
export function assertCanEditShift(state, empId, weekDate) {
  const user = state.user;
  if (!user) throw new Error('Chưa đăng nhập');
  const emp = (state.employees || []).find(e => e.id === empId);
  assertWeekEditable(state, emp?.dept || user.dept, weekDate);
  if (user.role === 'admin') return;
  if (userIsManager(user)) {
    if (emp && emp.dept && user.dept && emp.dept !== user.dept && empId !== user.id) {
      throw new Error('Không có quyền sửa lịch cửa hàng khác');
    }
    return;
  }
  if (empId !== user.id) {
    throw new Error('Bạn chỉ được đăng ký ca của mình');
  }
}

/** Chỉ admin/SM mới được quản lý nhân sự. */
export function assertCanManageStaff(state) {
  const user = state.user;
  if (!user) throw new Error('Chưa đăng nhập');
  if (user.role === 'admin' || userIsManager(user)) return;
  throw new Error('Không có quyền quản lý nhân sự');
}

/**
 * Chỉ Admin (tài khoản `admin` / isBuiltinStoreManager) mới được tạo/xóa cửa hàng.
 * SM cửa hàng chỉ được cập nhật thông tin CH của mình (updateStore), không được tạo/xóa.
 */
export function assertCanManageStore(state) {
  const user = state.user;
  if (!user) throw new Error('Chưa đăng nhập');
  if (isBuiltinStoreManager(user)) return;
  throw new Error('Chỉ Admin mới được thêm hoặc xóa cửa hàng');
}

/**
 * SM chỉ được thao tác trên NV thuộc cửa hàng của mình.
 * Admin không bị giới hạn.
 * @param {string} empDept - dept của nhân viên cần kiểm tra
 */
export function assertCanManageEmpInDept(state, empDept) {
  assertCanManageStaff(state);
  const user = state.user;
  if (isBuiltinStoreManager(user)) return; // admin toàn quyền
  if (!empDept) return; // dept trống → để Supabase RLS quyết định
  const userDepts = getUserDepts(user);
  if (userDepts.length > 0 && !userDepts.includes(empDept)) {
    throw new Error(`Không có quyền quản lý nhân viên cửa hàng ${empDept}`);
  }
}
