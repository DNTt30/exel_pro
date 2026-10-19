import { db } from './client';
import { brandingSchema, mapBranding } from '../../utils/workspaceBranding';

export async function getWorkspaceBranding() {
  const { data, error } = await db().from('workspace_branding')
    .select('app_name,organization_name,primary_color,contact_email,logo_data_url,revision').eq('id', 1).single();
  if (error) throw new Error('Chưa tải được cài đặt đơn vị. Kiểm tra kết nối và việc cập nhật cơ sở dữ liệu.', { cause: error });
  return mapBranding(data);
}

export async function saveWorkspaceBranding(draft, revision) {
  const value = brandingSchema.parse(draft);
  if (!Number.isInteger(revision) || revision < 1) throw new Error('Hãy tải cài đặt hiện tại trước khi lưu.');
  const { data, error } = await db().rpc('save_workspace_branding', {
    p_app_name: value.appName, p_organization_name: value.organizationName,
    p_primary_color: value.primaryColor, p_contact_email: value.contactEmail,
    p_logo_data_url: value.logoDataUrl, p_revision: revision,
  });
  if (error) {
    if (error.message?.includes('BRANDING_CONFLICT')) throw new Error('Cài đặt đã được thay đổi ở nơi khác. Tải lại cài đặt trước khi lưu.');
    if (error.code === '42501') throw new Error('Chỉ Admin đơn vị được thay đổi cài đặt.');
    throw new Error('Không lưu được cài đặt. Vui lòng thử lại.', { cause: error });
  }
  return mapBranding(data);
}
