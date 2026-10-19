import { stripVi } from './textSearch';

export const COPILOT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;

// Read at request time, never at module load or from the selected schedule week.
export function getCopilotClock(now = new Date()) {
  const date = new Date(now);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: COPILOT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]));
  const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: COPILOT_TIME_ZONE, weekday: 'long' }).format(date);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    displayDate: `${parts.day}/${parts.month}/${parts.year}`,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function copilotClockContext(now = new Date()) {
  const current = getCopilotClock(now);
  const previous = getCopilotClock(new Date(new Date(now).getTime() - DAY_MS));
  const next = getCopilotClock(new Date(new Date(now).getTime() + DAY_MS));
  return `THỜI GIAN ỨNG DỤNG: ${current.weekday}, ${current.date}, ${current.time} (${COPILOT_TIME_ZONE}, UTC+7).
Hôm qua: ${previous.date}; ngày mai: ${next.date}. Mốc lấy từ đồng hồ thiết bị lúc gửi câu hỏi, không phải tuần lịch đang xem hay dữ liệu Sổ tay. Dùng mốc này để trả lời ngày/giờ; không yêu cầu Sổ tay cung cấp ngày hiện tại.`;
}

export function answerClockQuery(question, now = new Date()) {
  let q = stripVi(String(question).toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  q = q.replace(/^(?:tu mini|tro ly)(?: oi)?\s+/, '')
    .replace(/^(?:cho (?:anh|chi|em|toi|minh) (?:hoi|biet)|(?:ban|em) (?:co )?biet)\s+/, '')
    .replace(/(?:\s+(?:a|nhe|nha|voi|di|khong|duoc khong))+$/, '');
  const datePart = '(?:ngay (?:may|bao nhieu|nao|gi)(?: thang may(?: nam nao)?)?|thu may|thang may|nam (?:nao|bao nhieu))';
  const relative = q.match(new RegExp(`^(hom nay|ngay mai|mai|ngay mot|ngay kia|hom qua)(?: (?:la|se la))? ${datePart}$`));
  const currentDate = new RegExp(`^(?:(?:bay gio|hien tai)(?: la)? )?${datePart}(?: (?:hom nay|hien tai))?$`).test(q)
    || /^(?:what day is (?:it|today)|what is (?:today s date|the date today))$/.test(q);
  const currentTime = /^(?:(?:bay gio|hien tai|luc nay|gio)(?: la)? )?(?:may gio|bao nhieu gio)(?: (?:roi|bay gio|hien tai))?$/.test(q)
    || q === 'what time is it';
  if (!relative && !currentDate && !currentTime) return null;
  const offset = relative ? ({ 'hom qua': -1, 'hom nay': 0, mai: 1, 'ngay mai': 1, 'ngay mot': 2, 'ngay kia': 2 })[relative[1]] : 0;
  const clock = getCopilotClock(new Date(new Date(now).getTime() + offset * DAY_MS));
  if (currentTime) return `Hiện tại là ${clock.time}, ${clock.weekday}, ngày ${clock.displayDate} (giờ Việt Nam, UTC+7).`;
  const label = { '-1': 'Hôm qua', 0: 'Hôm nay', 1: 'Ngày mai', 2: 'Ngày kia' }[offset];
  return `${label} là ${clock.weekday}, ngày ${clock.displayDate} (giờ Việt Nam).`;
}
