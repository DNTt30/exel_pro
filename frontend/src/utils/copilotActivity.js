import { stripVi } from './textSearch';

export function copilotTopic(question = '') {
  const text = stripVi(question);
  if (/\b(date|han su dung|het han|nhiet do|bao quan|huy hang)\b/.test(text) || /\bhuy\b/.test(text) && /\b(mon|banh|sandwich|com nam|sushi|ff|gm)\b/.test(text)) return 'Hạn dùng & bảo quản';
  if (/\b(luong|phu cap|cham cong|bu cong|gio cong|tien thuong)\b/.test(text)) return 'Công & chế độ';
  if (/\b(cong thuc|pha che|mi|lau|sup|nau|xuc xich|hotdog|banh|sandwich|com nam)\b/.test(text.replace(/\bbao lau\b/g, '')) || /\btra (coc|tac|lai|me|dao|sua|chanh)\b/.test(text)) return 'Công thức & chế biến';
  if (/\b(lich|ca|ngay mai|tuan|off|dang ky)\b/.test(text)) return 'Lịch & ca làm';
  return 'Nghiệp vụ khác';
}
export function summarizeCopilotActivity(rows) {
  const counts = new Map();
  rows.forEach(row => { const topic = copilotTopic(row.userMessage); counts.set(topic, (counts.get(topic) || 0) + 1); });
  return [...counts].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)).slice(0, 5);
}
