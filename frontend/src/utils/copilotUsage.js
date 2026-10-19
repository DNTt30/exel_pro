import { getCopilotUsage } from '../services/api/logs';
import { isOpsManager } from '../lib/authSession';
import { scopeCopilotContext } from './copilotScope';
import { stripVi } from './textSearch';
import { summarizeCopilotActivity } from './copilotActivity';
import { getCopilotClock } from './copilotClock';

function explicitUsage(question) {
  const q = stripVi(question);
  const audience = /\b(moi nguoi|nhan vien|nguoi dung|khach|nguoi khac)\b/.test(q);
  const assistant = /\b(tu mini|tro ly|chatbot|copilot)\b/.test(q);
  const operational = /\b(luong|nhan su|doi ca|bu cong|cong thuc|pha che|lich lam|xep ca)\b/.test(q.replace(/\bso luong\b/g, ''));
  return /\b(luot hoi|lich su (?:cau hoi|hoi dap|tro chuyen)|cau hoi pho bien)\b/.test(q)
    || /\bcau hoi\b/.test(q) && /\b(thong ke|so luong|nhieu nhat|thuong gap)\b/.test(q)
    || audience && /\b(hay hoi|thuong hoi|hoi nhieu|hoi gi|hoi ve|hoi nhung|hoi ban)\b/.test(q)
    || assistant && !operational && /\b(thong ke|chu de|lich su|pho bien|hay hoi|thuong hoi|hoi nhieu|hoi gi)\b/.test(q);
}

export function routeUsageQuery(question, history = []) {
  let source = question;
  if (!explicitUsage(question)) {
    const q = stripVi(question);
    if (!/\b(so lieu|so luong|du lieu thuc te|dan chung|vi du|chi tiet|con so|bao nhieu|thong ke)\b/.test(q)
      || /\b(nhan su|nhan vien|doi ca|bu cong|luong|cong thuc)\b/.test(q.replace(/\bso luong\b/g, ''))) return null;
    const lastQuestions = history.filter(row => row.sender === 'user').slice(-4).reverse();
    source = '';
    for (const row of lastQuestions) {
      if (explicitUsage(row.text)) { source = row.text; break; }
      if (!/\b(so lieu|so luong|du lieu thuc te|dan chung|vi du|chi tiet|con so|bao nhieu|thong ke)\b/.test(stripVi(row.text))) return null;
    }
    if (!source) return null;
  }
  const q = stripVi(`${source} ${question}`);
  const own = /\b(cua toi|cua minh|cua em|toi da hoi|minh da hoi|em da hoi)\b/.test(q)
    && !/\b(moi nguoi|nhan vien|nguoi dung|nguoi khac)\b/.test(q);
  const timeWords = /\b(hom nay|tuan nay|thang nay|toan bo|tat ca|hom qua|tuan truoc|thang truoc|nam nay|nam truoc|\d+ ngay|tu ngay|den ngay|20\d{2})\b/;
  const timeQuery = timeWords.test(stripVi(question)) ? stripVi(question) : stripVi(source);
  const period = /\bhom nay\b/.test(timeQuery) ? 'today' : /\btuan nay\b/.test(timeQuery) ? 'week' : /\bthang nay\b/.test(timeQuery) ? 'month' : 'all';
  const unsupportedPeriod = /\b(hom qua|tuan truoc|thang truoc|nam nay|nam truoc|\d+ ngay|tu ngay|den ngay|20\d{2})\b/.test(timeQuery);
  return { own, period, unsupportedPeriod };
}

function periodRange(period, now) {
  if (period === 'all') return { label: 'toàn bộ thời gian đã ghi nhận' };
  const today = getCopilotClock(now).date;
  const calendar = new Date(`${today}T00:00:00Z`);
  if (period === 'week') calendar.setUTCDate(calendar.getUTCDate() - (calendar.getUTCDay() + 6) % 7);
  if (period === 'month') calendar.setUTCDate(1);
  const start = calendar.toISOString().slice(0, 10);
  const from = new Date(`${start}T00:00:00+07:00`).toISOString();
  return { from, to: now.toISOString(), label: `${start} đến ${today}, giờ Việt Nam` };
}

export async function answerUsageQuery(route, context, now = new Date()) {
  const scoped = scopeCopilotContext(context);
  if (!context.user || !isOpsManager(context.user) && !route.own) {
    return 'Em không có quyền cung cấp thống kê câu hỏi của người khác cho tài khoản này. Anh/chị có thể hỏi “Thống kê lượt hỏi của tôi”.';
  }
  if (route.unsupportedPeriod) return 'Em hiện hỗ trợ thống kê lượt hỏi hôm nay, tuần này, tháng này hoặc toàn bộ thời gian đã ghi nhận. Anh/chị chọn một khoảng trên để em lấy đúng số liệu.';
  if (scoped.storeId === '__NO_STORES__') return 'Cửa hàng được chọn nằm ngoài phạm vi truy cập của tài khoản. Em chưa có số liệu được phép đọc cho phạm vi này.';
  const storeId = !context.storeId || context.storeId === 'ALL' ? 'ALL' : scoped.storeId || '__NO_STORES__';
  const range = periodRange(route.period, now);
  let result;
  try {
    result = await getCopilotUsage({ storeId, userId: route.own ? context.user.id : undefined, from: range.from, to: range.to });
  } catch {
    return 'Chưa tải được thống kê lượt hỏi từ lịch sử TÚ mini. Em chưa có số liệu để kết luận; không dùng số nhân viên, đơn đổi ca hoặc bù công thay cho lượt hỏi. Anh/chị thử lại sau nhé.';
  }
  const scope = route.own ? `các câu hỏi của tài khoản anh/chị${storeId === 'ALL' ? '' : `, bản ghi gắn cửa hàng ${storeId}`}` : storeId === 'ALL' ? 'lịch sử tài khoản anh/chị được phép đọc' : `bản ghi gắn cửa hàng ${storeId}`;
  const header = `Phạm vi: ${scope}; ${range.label}.`;
  if (!result.total) return `${header}\nChưa có lượt hỏi được ghi nhận trong phạm vi này; chưa đủ dữ liệu để nói mọi người thường hỏi gì. Không đồng nghĩa chưa ai từng hỏi.`;
  const topics = summarizeCopilotActivity(result.rows);
  const lines = [header, `**${result.total} lượt hỏi đã được ghi nhận**. Phân tích ${result.rows.length} lượt gần nhất (tối đa ${result.limit}), gồm ${result.rows.filter(row => row.error).length} lượt có lỗi xử lý.`];
  lines.push('Nhóm chủ đề tham khảo trong mẫu này, không suy ra thứ hạng toàn bộ lịch sử:', ...topics.map(item => `- ${item.topic}: ${item.count} lượt.`));
  const examples = result.rows.slice(0, 3).map(row => {
    const raw = String(row.userMessage).replace(/[\r\n]+/g, ' ').replace(/[<>*_`[\]#]/g, '').trim();
    const text = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
    const date = row.createdAt && Number.isFinite(Date.parse(row.createdAt)) ? getCopilotClock(new Date(row.createdAt)).displayDate : 'Chưa ghi ngày';
    return `- ${date}: “${text}”`;
  });
  lines.push('Một số câu hỏi ghi nhận thực tế:', ...examples, 'Nguồn: lịch sử TÚ mini đã lưu; mỗi lượt là một bản ghi, không phải số người dùng riêng biệt.');
  return lines.join('\n');
}
