import { db } from './client';

export async function getScheduleDraft(storeId, weekDate) {
  const { data, error } = await db().from('schedule_drafts').select('payload,revision').eq('store_id', storeId).eq('week_date', weekDate).maybeSingle();
  if (error) throw new Error('Không tải được bản nháp. Hãy thử lại; nếu lỗi tiếp tục, liên hệ quản trị viên để kiểm tra quyền truy cập và bật chức năng nháp.');
  return data;
}

export async function saveScheduleDraft(storeId, weekDate, payload, revision) {
  const { data, error } = await db().rpc('save_schedule_draft', { p_store: storeId, p_week: weekDate, p_payload: payload, p_revision: revision });
  if (error) throw new Error(error.code === '40001'
    ? 'Bản nháp đã thay đổi. Mở nháp đã lưu trước khi sửa và lưu tiếp.'
    : 'Không lưu được bản nháp. Hãy thử lại; nếu lỗi tiếp tục, liên hệ quản trị viên để kiểm tra quyền truy cập và bật chức năng nháp.');
  return data;
}
