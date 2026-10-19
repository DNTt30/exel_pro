import { z } from 'zod';

export const ROLE_GROUPS = [
  { id: 'staff', label: 'Nhân viên', description: 'Xem lịch cá nhân, đăng ký lịch rảnh, đổi ca và gửi yêu cầu công.' },
  { id: 'sm', label: 'Quản lý cửa hàng', description: 'Quản lý lịch, công và nhân viên trong cửa hàng được phân công.' },
  { id: 'am', label: 'Quản lý khu vực', description: 'Theo quyền OFC hiện tại: quản lý toàn bộ cửa hàng, nhân sự và điều phối liên cửa hàng trong đơn vị.' },
];
export const workspaceRoleSchema = z.object({
  name: z.string().trim().min(2, 'Tên vai trò cần ít nhất 2 ký tự.').max(60, 'Tên vai trò tối đa 60 ký tự.')
    .refine(value => [...value].every(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127 && c !== '<' && c !== '>'), 'Tên vai trò chứa ký tự không hợp lệ.'),
  permissionGroup: z.enum(['staff', 'sm', 'am']),
  isActive: z.boolean(),
}).strict();
export const mapWorkspaceRole = row => ({ id: row.id, name: row.name, permissionGroup: row.permission_group, isActive: row.is_active, revision: row.revision });
export const employeeRoleSnapshot = emp => ({ workspaceRoleId: emp.workspaceRoleId || null, role: emp.role, jobTitle: emp.jobTitle || '', type: emp.type, dept: emp.dept });
export function customRoleName(employee, roles = []) {
  return roles.find(role => role.id === employee?.workspaceRoleId)?.name || '';
}
