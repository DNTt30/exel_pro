import { db } from './client';

function deadlineError(error) {
  if (error?.code === '42501') return new Error('Bạn không có quyền chỉnh hạn đăng ký cửa hàng này.');
  if (error?.message?.includes('DEADLINE_CONFLICT')) return new Error('Hạn đăng ký đã được người khác thay đổi. Tải lại trước khi lưu.');
  if (error?.message?.includes('INVALID_DEADLINE')) return new Error('Cấu hình hạn không hợp lệ. Gia hạn theo ngày cụ thể chỉ áp dụng cho một tuần.');
  return new Error('Chưa đồng bộ được hạn đăng ký. Kiểm tra kết nối và cập nhật database.', { cause: error });
}
export async function getRegistrationDeadline(storeId, weekDate) {
  const { data, error } = await db().rpc('get_registration_deadline', { p_store: storeId, p_week: weekDate });
  if (error) throw deadlineError(error);
  if (!data?.config || !data.serverNow) throw new Error('Máy chủ chưa trả về hạn đăng ký hợp lệ.');
  return data;
}
export async function saveRegistrationDeadline({ storeId, weekDate, config, applyToAllWeeks = false, snapshot }) {
  if (!snapshot) throw new Error('Hãy tải cấu hình hiện tại trước khi lưu.');
  const { data, error } = await db().rpc('save_registration_deadline', {
    p_store: storeId, p_week: weekDate, p_config: config, p_all: applyToAllWeeks,
    p_default_revision: snapshot.defaultRevision, p_week_revision: snapshot.weekRevision,
  });
  if (error) throw deadlineError(error);
  return data;
}
