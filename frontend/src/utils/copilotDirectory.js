import { stripVi } from './textSearch';
import { stripParens } from './copilotIntents';
import { scopeCopilotContext } from './copilotScope';
import { isOpsManager } from '../lib/authSession';

export function routeDirectoryQuery(question) {
  const normalized = stripVi(String(question).toLowerCase()).replace(/[?!.;,]/g, ' ').trim();
  const storeMatches = [...normalized.matchAll(/\bvn\s*(\d{4})\b/g)];
  if (storeMatches.length > 1 || !/\b(bao nhieu|may)\b/.test(normalized)) return null;
  const storeId = storeMatches[0] ? `VN${storeMatches[0][1]}` : null;
  let rest = normalized.replace(/\bvn\s*\d{4}\b/g, '').replace(/\s+/g, ' ').trim();
  const match = rest.match(/(?:^|\s)(?:bao nhieu|may)\s+(?:(?:nhan vien|nguoi|ban)\s*)?(?:ten\s+)?(.*?)\s*$/);
  if (!match) return null;
  const name = match[1].replace(/\s+(?:o|tai|trong)(?: cua hang)?\s*$/, '').replace(/\s+(?:nhi|nhe|a)$/, '').trim();
  if (!name && !/\b(nhan vien|nguoi)\b/.test(rest)) return null;
  if (name && (!/^[a-z]+(?: [a-z]+){0,4}$/.test(name) || /\b(gio|ngay|ca|tuan|thang|luong|tien|ml|gam|nguoi|cong|phep|lan|cau|hoi|nam|nu|tuoi)\b/.test(name))) return null;
  if (!storeId && !/\b(nhan vien|nguoi|ten|cua hang)\b/.test(rest)) return null;
  return { storeId, name };
}

export async function answerDirectoryQuery(route, context, readEmployees) {
  if (!isOpsManager(context.user)) return 'Quyền trợ lý của tài khoản này hiện chỉ cho tra dữ liệu cá nhân, chưa cho thống kê nhân sự cửa hàng. Bạn có thể xem đồng nghiệp trong Lịch ca → Toàn cửa hàng hoặc nhờ quản lý tra cứu.';
  const access = scopeCopilotContext({ ...context, storeId: 'ALL' }).copilotAccess.storeIds;
  const selected = String(context.storeId || '').split(',').filter(id => access.includes(id));
  const storeId = route.storeId || (selected.length === 1 ? selected[0] : access.length === 1 ? access[0] : null);
  if (!storeId) return 'Bạn muốn đếm nhân viên ở cửa hàng nào? Ví dụ: VN0485 có bao nhiêu người tên Đức?';
  if (!access.includes(storeId)) return `Bạn chưa có quyền tra cứu nhân sự ${storeId} trong trợ lý. Hãy chọn cửa hàng thuộc phạm vi được cấp.`;
  let rows;
  try { rows = await readEmployees({ dept: storeId }); }
  catch { return `Chưa tải được danh sách nhân sự ${storeId}. Hãy thử lại; em chưa thể kết luận số lượng.`; }
  if (!Array.isArray(rows)) return `Chưa tải được danh sách nhân sự ${storeId}. Em chưa thể kết luận số lượng.`;
  if (rows.length >= 1000) return `Danh sách ${storeId} có thể đã chạm giới hạn tải. Em chưa thể kết luận chính xác số lượng; hãy mở mục Nhân viên để kiểm tra.`;
  const seen = new Set();
  const matches = rows.filter(e => {
    if (!e.id || seen.has(e.id) || e.isActive === false || e.is_active === false || !String(e.dept || '').split(',').map(s => s.trim()).includes(storeId)) return false;
    seen.add(e.id);
    const name = stripVi(stripParens(e.name || '').toLowerCase()).replace(/\s+/g, ' ').trim();
    return !route.name || name === route.name || name.endsWith(` ${route.name}`);
  });
  const displayName = matches.length && route.name ? stripParens(matches[0].name).trim().split(/\s+/).slice(-route.name.split(' ').length).join(' ') : route.name;
  const qualifier = route.name ? ` có tên kết thúc bằng “${displayName}” (không phân biệt dấu)` : '';
  return `${storeId} có ${matches.length} nhân viên đang hoạt động${qualifier}.${matches.length ? '\n' + matches.slice(0, 20).map(e => `• ${e.name}`).join('\n') : ''}${matches.length > 20 ? `\nHiển thị 20/${matches.length} người.` : ''}\nNguồn: danh sách nhân viên vừa tải của ${storeId}.`;
}
