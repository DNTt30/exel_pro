import { describe, it, expect } from 'vitest';
import {
  assertWeekEditable,
  assertCanEditShift,
  assertCanManageStaff,
  userIsManager,
  assertCanResolveFeedback,
  assertCanRespondShiftSwap
} from '../store/guards';

// ─── Fixtures ────────────────────────────────────────────────────────────────
const ADMIN = { id: 'admin', role: 'admin' };
const SM = { id: 'sm1', role: 'employee', isManager: true, dept: 'VN0485' }; // Cửa hàng trưởng VN0485
const NV = { id: 'nv1', role: 'employee', dept: 'VN0485' };                  // Nhân viên thường

const EMPLOYEES = [
  { id: 'nv1', dept: 'VN0485' },
  { id: 'nv2', dept: 'VN0500' },
  { id: 'sm1', dept: 'VN0485' }
];

const WEEK = '2026-08-10';
const key = (storeId) => storeId + '::' + WEEK;

const stateWith = ({ user = NV, weeks = {}, employees = EMPLOYEES } = {}) => ({
  user,
  employees,
  scheduleWeeks: weeks
});

// ─── assertWeekEditable ──────────────────────────────────────────────────────
describe('assertWeekEditable', () => {
  it('bỏ qua khi thiếu storeId hoặc weekDate', () => {
    const s = stateWith({ weeks: { [key('VN0485')]: { status: 'pending' } } });
    expect(() => assertWeekEditable(s, '', WEEK)).not.toThrow();
    expect(() => assertWeekEditable(s, 'VN0485', '')).not.toThrow();
    expect(() => assertWeekEditable(s, undefined, undefined)).not.toThrow();
  });

  it('cho phép sửa khi tuần chưa có bản ghi trạng thái', () => {
    const s = stateWith({});
    expect(() => assertWeekEditable(s, 'VN0485', WEEK)).not.toThrow();
  });

  it('cho phép sửa với status draft và rejected', () => {
    const s = stateWith({ weeks: {
      [key('VN0485')]: { status: 'draft' },
      ['VN0500::' + WEEK]: { status: 'rejected' }
    } });
    expect(() => assertWeekEditable(s, 'VN0485', WEEK)).not.toThrow();
    expect(() => assertWeekEditable(s, 'VN0500', WEEK)).not.toThrow();
  });

  it('chặn sửa khi tuần đang chờ duyệt (pending)', () => {
    const s = stateWith({ weeks: { [key('VN0485')]: { status: 'pending' } } });
    expect(() => assertWeekEditable(s, 'VN0485', WEEK))
      .toThrow('Tuần đang chờ duyệt, không sửa ô ca.');
  });

  it('chặn sửa khi tuần đã duyệt (approved)', () => {
    const s = stateWith({ weeks: { [key('VN0485')]: { status: 'approved' } } });
    expect(() => assertWeekEditable(s, 'VN0485', WEEK))
      .toThrow('Tuần đã duyệt. AM/Admin bấm Từ chối nếu cần sửa.');
  });

  it('không ảnh hưởng tuần của cửa hàng khác', () => {
    const s = stateWith({ weeks: { [key('VN0485')]: { status: 'approved' } } });
    expect(() => assertWeekEditable(s, 'VN0500', WEEK)).not.toThrow();
  });
});

// ─── assertCanEditShift ──────────────────────────────────────────────────────
describe('assertCanEditShift', () => {
  it('từ chối khi chưa đăng nhập', () => {
    const s = stateWith({ user: null });
    expect(() => assertCanEditShift(s, 'nv1', WEEK)).toThrow('Chưa đăng nhập');
  });

  it('admin được sửa lịch bất kỳ ai', () => {
    const s = stateWith({ user: ADMIN });
    expect(() => assertCanEditShift(s, 'nv1', WEEK)).not.toThrow();
    expect(() => assertCanEditShift(s, 'nv2', WEEK)).not.toThrow(); // khác cửa hàng
  });

  it('khoá tuần chặn cả admin — kiểm tra tuần trước khi kiểm tra vai trò', () => {
    const s = stateWith({
      user: ADMIN,
      weeks: { [key('VN0485')]: { status: 'approved' } }
    });
    expect(() => assertCanEditShift(s, 'nv1', WEEK)).toThrow(/Tuần đã duyệt/);
  });

  it('SM được sửa lịch nhân viên cùng cửa hàng', () => {
    const s = stateWith({ user: SM });
    expect(() => assertCanEditShift(s, 'nv1', WEEK)).not.toThrow();
  });

  it('SM bị chặn sửa lịch nhân viên cửa hàng khác', () => {
    const s = stateWith({ user: SM });
    expect(() => assertCanEditShift(s, 'nv2', WEEK))
      .toThrow('Không có quyền sửa lịch cửa hàng khác');
  });

  it('SM luôn được sửa ca của chính mình dù lookup không thấy', () => {
    const s = stateWith({ user: SM, employees: EMPLOYEES.filter(e => e.id !== 'sm1') });
    expect(() => assertCanEditShift(s, 'sm1', WEEK)).not.toThrow();
  });

  it('nhân viên được sửa ca của chính mình', () => {
    const s = stateWith({ user: NV });
    expect(() => assertCanEditShift(s, 'nv1', WEEK)).not.toThrow();
  });

  it('nhân viên bị chặn sửa ca người khác', () => {
    const s = stateWith({ user: NV });
    expect(() => assertCanEditShift(s, 'nv2', WEEK))
      .toThrow('Bạn chỉ được đăng ký ca của mình');
    expect(() => assertCanEditShift(s, 'khong-ton-tai', WEEK))
      .toThrow('Bạn chỉ được đăng ký ca của mình');
  });

  it('tuần pending chặn luôn việc nhân viên tự đăng ký ca', () => {
    const s = stateWith({ weeks: { [key('VN0485')]: { status: 'pending' } } });
    expect(() => assertCanEditShift(s, 'nv1', WEEK))
      .toThrow('Tuần đang chờ duyệt, không sửa ô ca.');
  });
});

// ─── assertCanManageStaff ────────────────────────────────────────────────────
describe('assertCanManageStaff', () => {
  it('từ chối khi chưa đăng nhập', () => {
    expect(() => assertCanManageStaff(stateWith({ user: null }))).toThrow('Chưa đăng nhập');
  });

  it('admin và SM được quản lý nhân sự', () => {
    expect(() => assertCanManageStaff(stateWith({ user: ADMIN }))).not.toThrow();
    expect(() => assertCanManageStaff(stateWith({ user: SM }))).not.toThrow();
  });

  it('nhân viên thường bị từ chối', () => {
    expect(() => assertCanManageStaff(stateWith({ user: NV })))
      .toThrow('Không có quyền quản lý nhân sự');
  });
});

// ─── userIsManager ───────────────────────────────────────────────────────────
describe('userIsManager', () => {
  it('nhận diện admin, cờ isManager và chức danh tiếng Việt', () => {
    expect(userIsManager(ADMIN)).toBe(true);
    expect(userIsManager(SM)).toBe(true);
    expect(userIsManager({ id: 'x', role: 'Cửa hàng trưởng' })).toBe(true);
    expect(userIsManager(null)).toBe(false);
    expect(userIsManager(NV)).toBe(false);
  });
});

// ─── SEC-08: assertCanResolveFeedback & assertCanRespondShiftSwap ────────────
describe('SEC-08: Feedback and Swap Authorization Guards', () => {
  it('chặn nhân viên thường tự duyệt feedback khiếu nại công', () => {
    expect(() => assertCanResolveFeedback(stateWith({ user: NV }), 'VN0485'))
      .toThrow('Không có quyền quản lý nhân sự');
  });

  it('cho phép SM duyệt feedback của cửa hàng mình', () => {
    expect(() => assertCanResolveFeedback(stateWith({ user: SM }), 'VN0485')).not.toThrow();
  });

  it('chặn SM duyệt feedback của cửa hàng khác', () => {
    expect(() => assertCanResolveFeedback(stateWith({ user: SM }), 'VN0500'))
      .toThrow('Không có quyền duyệt phản hồi của cửa hàng khác');
  });

  it('admin toàn quyền duyệt feedback mọi cửa hàng', () => {
    expect(() => assertCanResolveFeedback(stateWith({ user: ADMIN }), 'VN0500')).not.toThrow();
  });

  it('chặn nhân viên thường tự duyệt swap sang approved/rejected', () => {
    const swap = { id: 's1', store: 'VN0485', fromEmpId: 'nv1', toEmpId: 'nv2' };
    expect(() => assertCanRespondShiftSwap(stateWith({ user: NV }), swap, 'approved'))
      .toThrow('Không có quyền quản lý nhân sự');
  });

  it('chặn người ngoài xác nhận pending_manager nếu không phải toEmpId', () => {
    const swap = { id: 's1', store: 'VN0485', fromEmpId: 'nv1', toEmpId: 'nv2' };
    // user nv3 cố tình xác nhận đơn đổi ca của nv2
    const thirdParty = { id: 'nv3', role: 'employee', dept: 'VN0485' };
    expect(() => assertCanRespondShiftSwap(stateWith({ user: thirdParty }), swap, 'pending_manager'))
      .toThrow('Chỉ nhân viên được đề nghị đổi ca mới có quyền xác nhận');
  });

  it('cho phép partner toEmpId xác nhận pending_manager', () => {
    const swap = { id: 's1', store: 'VN0485', fromEmpId: 'nv1', toEmpId: 'nv2' };
    const partner = { id: 'nv2', role: 'employee', dept: 'VN0485' };
    expect(() => assertCanRespondShiftSwap(stateWith({ user: partner }), swap, 'pending_manager'))
      .not.toThrow();
  });

  it('cho phép SM duyệt swap của cửa hàng mình', () => {
    const swap = { id: 's1', store: 'VN0485', fromEmpId: 'nv1', toEmpId: 'nv2' };
    expect(() => assertCanRespondShiftSwap(stateWith({ user: SM }), swap, 'approved')).not.toThrow();
  });

  it('chặn SM duyệt swap của cửa hàng khác', () => {
    const swap = { id: 's1', store: 'VN0500', fromEmpId: 'nv1', toEmpId: 'nv2' };
    expect(() => assertCanRespondShiftSwap(stateWith({ user: SM }), swap, 'approved'))
      .toThrow('Không có quyền duyệt đổi ca của cửa hàng khác');
  });
});
