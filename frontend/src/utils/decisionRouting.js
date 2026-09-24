import { addDays, mondayOf, vietnamToday, scheduleTotals } from './aiDecisionEngine.js';
import { normalizeShift } from './shiftHelper.js';
import { WEEK_DAYS } from '../data/constants.js';

export function routePersonalQuery(query, now = new Date()) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const today = vietnamToday(now);
  // Mixed requests and policy advice remain with the conversational engine.
  if (/^(?:tuan nay (?:em|toi|minh) (?:lam )?bao nhieu (?:tieng|gio)|(?:em|toi|minh) (?:lam )?bao nhieu (?:tieng|gio) tuan nay)$/.test(q)) return { intent: 'FETCH_USER_HOURS', week: mondayOf(today) };
  const match = q.match(/^(hom nay|ngay mai|mai) (?:em|toi|minh) (?:lam )?ca (?:may(?: gio)?|gi)$/);
  if (match) { const date = match[1] === 'hom nay' ? today : addDays(today, 1); return { intent: 'FETCH_USER_SCHEDULE', date, week: mondayOf(date) }; }
  return null;
}
export function answerPersonalQuery(route, { user, schedule }) {
  if (!user?.id || user.id === 'admin') return 'Tài khoản này chưa gắn với mã nhân viên để tra lịch cá nhân.';
  if (!Object.hasOwn(schedule, route.week)) return 'Chưa tải được lịch tuần cần tra. Vui lòng thử lại.';
  const days = schedule[route.week]?.[user.id] || {};
  if (route.intent === 'FETCH_USER_HOURS') {
    const total = scheduleTotals(days);
    return `Tuần ${route.week}, bạn được xếp **${total.hours} giờ** (${total.shifts} ca đã xác nhận). Đây là giờ lịch, chưa phải giờ chấm công.`;
  }
  const index = Math.round((Date.parse(route.date) - Date.parse(route.week)) / 86400000);
  const n = normalizeShift(days[WEEK_DAYS[index]]);
  const label = n.shift === 'off' ? 'nghỉ (OFF)' : !n.shift ? 'chưa được xếp ca' : `${n.confirmed ? 'làm ca' : 'đăng ký ca, chưa xác nhận'} ${n.shift}${n.covering_store ? ` tại ${n.covering_store}` : ''}`;
  return `Ngày ${route.date}, bạn **${label}**.`;
}

export function triageShelfItem(item, now = new Date()) {
  if ([item.expiryDate, item.expiryDate2].some(date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date < vietnamToday(now))) return { action: 'DISCARD', priority: 100, hoursLeft: null, reason: 'Ngày hạn sử dụng đã qua; tách lô quá hạn và xác nhận xử lý' };
  const timestamps = [];
  let missingTime = false;
  for (const [date, time] of [[item.expiryDate, item.expiryTime], [item.expiryDate2, item.expiryTime2]]) {
    if (!date) continue;
    if (!time || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) { missingTime = true; continue; }
    const stamp = Date.parse(`${date}T${time}+07:00`);
    if (Number.isFinite(stamp)) timestamps.push(stamp); else missingTime = true;
  }
  const expiry = timestamps.length ? Math.min(...timestamps) : null;
  const hoursLeft = expiry === null ? null : (expiry - new Date(now).getTime()) / 3600000;
  if (hoursLeft !== null && hoursLeft <= 0) return { action: 'DISCARD', priority: 100, hoursLeft, reason: 'Đã hết hạn theo giờ ghi nhận; tách hàng và xác nhận xử lý' };
  if (missingTime || hoursLeft === null) return { action: 'MONITOR', priority: 70, hoursLeft: null, reason: 'Cần bổ sung giờ hết hạn của từng lô trước khi đề xuất' };
  if (new Set(timestamps).size > 1) return { action: 'MONITOR', priority: 65, hoursLeft, reason: 'Có nhiều lô HSD; cần kiểm tra số lượng riêng của lô gần hạn trước khi dự báo tồn' };
  const policy = item.triagePolicy || {};
  const velocity = Number(item.averageSalesPerHour), qty = Number(item.qty);
  const hasForecast = item.averageSalesPerHour !== '' && item.averageSalesPerHour != null && item.qty !== '' && item.qty != null && Number.isFinite(velocity) && velocity >= 0 && Number.isFinite(qty) && qty >= 0;
  const surplus = hasForecast && qty > velocity * hoursLeft;
  if (surplus && policy.canReturn === true && Number(policy.returnWindowHours) > 0 && hoursLeft <= Number(policy.returnWindowHours)) return { action: 'RETURN_SUPPLIER', priority: 85, hoursLeft, reason: 'Dự kiến dư hàng trong cửa sổ trả NCC đã nhập' };
  if (surplus && policy.canDiscount === true && Number(policy.discountWindowHours) > 0 && hoursLeft <= Number(policy.discountWindowHours)) return { action: 'DISCOUNT_NOW', priority: 80, hoursLeft, reason: 'Dự kiến không bán hết trước hạn; trong cửa sổ giảm giá đã nhập' };
  return { action: 'MONITOR', priority: Math.min(60, Math.round(60 / Math.max(1, hoursLeft))), hoursLeft, reason: hasForecast ? 'Theo dõi theo tốc độ bán và chính sách đã nhập' : 'Chưa có đủ số lượng/tốc độ bán để dự báo tồn' };
}
