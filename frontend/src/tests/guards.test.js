import { describe, it, expect } from 'vitest';
import {
  assertWeekEditable,
  assertCanEditShift,
  assertCanManageStaff,
  userIsManager
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
