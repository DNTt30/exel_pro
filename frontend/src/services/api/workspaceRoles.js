import { db } from './client';
import { mapWorkspaceRole, workspaceRoleSchema, employeeRoleSnapshot } from '../../utils/workspaceRoles';

function roleError(error) {
  if (error.code === '42501') return new Error('Chỉ Admin đơn vị được quản lý vai trò.');
  if (error.code === '23505') return new Error('Tên vai trò đã tồn tại. Hãy chọn tên khác.');
  if (error.message?.includes('ROLE_CONFLICT')) return new Error('Dữ liệu đã thay đổi. Tải lại trước khi lưu.');
  if (error.message?.includes('ROLE_GROUP_IMMUTABLE')) return new Error('Nhóm quyền cố định. Hãy tạo vai trò khác để thay đổi quyền.');
  if (error.message?.includes('ROLE_CONTRACT_REQUIRED')) return new Error('Hãy cập nhật loại hợp đồng STFT, STPT hoặc CSR_NEW trước khi gán vai trò.');
  if (error.message?.includes('ROLE_UNAVAILABLE') || error.message?.includes('ROLE_EMPLOYEE_UNAVAILABLE')) return new Error('Vai trò hoặc nhân viên không còn hoạt động. Hãy tải lại.');
  return new Error('Không cập nhật được vai trò. Kiểm tra kết nối và migration vai trò.', { cause: error });
}
export async function getWorkspaceRoles() {
  const { data, error } = await db().from('workspace_roles').select('id,name,permission_group,is_active,revision').order('name');
  if (error) throw new Error('Chưa tải được vai trò. Cần chạy migration vai trò hoặc kiểm tra kết nối.', { cause: error });
  return (data || []).map(mapWorkspaceRole);
}
export async function saveWorkspaceRole(draft, existing = null) {
  const value = workspaceRoleSchema.parse(draft);
  const { data, error } = await db().rpc('save_workspace_role', {
    p_name: value.name, p_group: value.permissionGroup, p_active: value.isActive,
    p_id: existing?.id || null, p_revision: existing?.revision ?? null,
  });
  if (error) throw roleError(error);
  return mapWorkspaceRole(data);
}
export async function assignWorkspaceRole(employee, roleId) {
  const { data, error } = await db().rpc('assign_workspace_role', {
    p_emp_id: employee.id, p_role_id: roleId || null, p_expected: employeeRoleSnapshot(employee),
  });
  if (error) throw roleError(error);
  return data;
}
