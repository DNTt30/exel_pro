import { db } from './client';
import { handbookDraftSchema } from '../../utils/handbookKnowledge';

function failure(error) {
  const message = String(error?.message || '');
  if (error?.code === '23505' || message.includes('HANDBOOK_CONFLICT')) return new Error('Tài liệu đã thay đổi hoặc đang chờ duyệt. Hãy tải lại.');
  if (error?.code === '42501') return new Error('Bạn không có quyền thực hiện thao tác này.');
  if (message.includes('CONFIRM_REQUIRED')) return new Error('Hãy xác nhận nội dung và định lượng trước khi tiếp tục.');
  if (message.includes('REASON_REQUIRED')) return new Error('Hãy nhập lý do ít nhất 5 ký tự.');
  if (message.includes('INVALID_RECIPE')) return new Error('Định lượng công thức không hợp lệ. Kiểm tra nguyên liệu, lượng gốc, thành phần và đơn vị.');
  return new Error('Không tải/lưu được Sổ tay. Kiểm tra kết nối và migration Sổ tay đã được áp dụng.', { cause: error });
}
async function rows(table, published = false) {
  const result = [];
  for (let start = 0; ; start += 500) {
    let query = db().from(table).select('*').order('id').range(start, start + 499);
    if (published) query = query.eq('is_active', true).not('published_at', 'is', null);
    const { data, error } = await query;
    if (error) throw failure(error);
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}
export const handbookApi = {
  getAll: () => rows('handbook_entries'),
  getPublished: () => rows('handbook_entries', true),
  async getKnowledge({ signal } = {}) {
    let query = db().rpc('get_handbook_knowledge');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw failure(error);
    return data || [];
  },
  getChanges: () => rows('handbook_changes'),
  async submit(draft, existing = null, { confirmed = false, operation = 'upsert', reason = '' } = {}) {
    if (!confirmed) throw new Error('Hãy xác nhận nội dung và định lượng trước khi tiếp tục.');
    const payload = operation === 'archive' ? { reason } : handbookDraftSchema.parse(draft);
    const { data, error } = await db().rpc('submit_handbook_change', {
      p_payload: payload, p_entry_id: existing?.id || null, p_revision: existing?.revision ?? null,
      p_operation: operation, p_confirmed: confirmed,
    });
    if (error) throw failure(error);
    return data;
  },
  async review(id, approve, { confirmed = false, note = '' } = {}) {
    if (!confirmed) throw new Error('Hãy xác nhận nội dung và định lượng trước khi tiếp tục.');
    const { data, error } = await db().rpc('review_handbook_change', {
      p_id: id, p_approve: approve, p_confirmed: confirmed, p_note: note,
    });
    if (error) throw failure(error);
    return data;
  },
  async uploadImage(file) {
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!extensions[file?.type] || file.size > 5 * 1024 * 1024) throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
    const { data, error } = await db().auth.getUser();
    if (error || !data?.user) throw new Error('Vui lòng đăng nhập lại.');
    const path = `${data.user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
    const uploaded = await db().storage.from('handbook-images').upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) throw failure(uploaded.error);
    return path;
  },
  async imageUrl(path) {
    const { data, error } = await db().storage.from('handbook-images').createSignedUrl(path, 60);
    if (error) throw failure(error);
    return data.signedUrl;
  },
};
