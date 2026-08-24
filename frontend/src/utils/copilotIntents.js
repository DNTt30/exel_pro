import { WEEK_DAYS } from '../data/constants';
import { normalizeShift, getShiftHours } from './shiftHelper';
import { stripVi } from '../data/ffOnsiteRecipes';

// =====================================================================
// INTENT MO RONG CHO AI COPILOT - module rieng de de mo rong & test.
// tryAnswerWithData() chi don cac intent nay; cau con lai roi xuong
// chuoi xu ly cu cua aiSchedulerEngine nen khong pha hanh vi hien co.
// Khop mau bang substring/token - ho tro cau hoi khong dau.
// =====================================================================

function isPT(emp) {
  const t = String(emp.type || '') + ' ' + String(emp.role || '');
  return emp.type === 'STPT' || emp.type === 'PARTTIME' || t.includes('PT');
}

export function weekStatsOf(emp, weekSchedule) {
  const sched = (weekSchedule || {})[emp.id] || {};
  let totalH = 0, totalShifts = 0, nightH = 0;
  WEEK_DAYS.forEach((d) => {
    const shift = normalizeShift(sched[d]).shift;
    const h = getShiftHours(shift);
    if (!shift || shift === 'off') return;
    totalH += h;
    totalShifts += 1;
    if (shift === '22-6') nightH += h;
  });
  return { totalH, totalShifts, nightH };
}

function lev1(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    diff += 1;
    if (diff > 1) return false;
    if (a.length > b.length) i += 1;
    else if (a.length < b.length) j += 1;
    else { i += 1; j += 1; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

// Bo phan ghi chu trong ngoac cua ten (vd 'Lê Văn C (PT Cứng)' -> 'le van c')
export function stripParens(s) {
  let out = String(s);
  let i = out.indexOf('(');
  while (i >= 0) {
    const j = out.indexOf(')', i);
    if (j < 0) break;
    out = out.slice(0, i) + ' ' + out.slice(j + 1);
    i = out.indexOf('(');
  }
  return out;
}

function tokenize(s) {
  const PUNCT = '?!,.;:()' + String.fromCharCode(34, 39);
  const out = [];
  let cur = '';
  for (const ch of String(s)) {
    if (ch === ' ' || PUNCT.includes(ch)) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function findPeople(qn, employees) {
  const words = tokenize(qn);
  return employees.filter((e) => {
    const idStr = String(e.id || '').toLowerCase();
    if (idStr && idStr.length >= 3 && words.includes(idStr)) return true;
    const clean = stripVi(stripParens(String(e.name || '')).toLowerCase());
    const toks = tokenize(clean);
    const joined = words.join(' ');
    if (toks.length && joined.includes(toks.join(' '))) return true;
    // Cụm 2 từ cuối (vd "van a") — bắt tên gọi có chữ lót
    if (toks.length >= 2 && joined.includes(toks.slice(-2).join(' '))) return true;
    const fn = toks[toks.length - 1];
    if (!fn || fn.length < 2) return false;
    return words.some((w) => w === fn || (fn.length >= 3 && lev1(w, fn)));
  });
}

const inc = (qn, arr) => arr.some((w) => String(qn).includes(w));

// ── 1) UOC TIN LUONG CA NHAN ──
function answerSalaryPersonal(m, weekSchedule) {
  const s = weekStatsOf(m, weekSchedule);
  const lines = ['💰 Lương tuần này của ' + m.name + ':'];
  lines.push('- Giờ ngày/tối: ' + (s.totalH - s.nightH) + 'h');
  if (s.nightH > 0) lines.push('- Giờ ca đêm: ' + s.nightH + 'h (hệ số +30%)');
  lines.push('- Tổng: ' + s.totalH + 'h / ' + s.totalShifts + ' ca');
  lines.push('Nhân đơn giá giờ theo hợp đồng để ra tiền; ca đêm và OT tính hệ số riêng.');
  return lines.join('\n');
}

// ── 2) SO SÁNH HAI NGƯỜI ──
function answerCompare(a, b, weekSchedule) {
  const sa = weekStatsOf(a, weekSchedule);
  const sb = weekStatsOf(b, weekSchedule);
  const diff = sa.totalH - sb.totalH;
  const lines = [
    '⚖️ So sánh tuần này:',
    '- ' + a.name + ': ' + sa.totalH + 'h / ' + sa.totalShifts + ' ca',
    '- ' + b.name + ': ' + sb.totalH + 'h / ' + sb.totalShifts + ' ca',
  ];
  if (diff === 0) lines.push('Hai bạn ngang giờ.');
  else lines.push('⇒ ' + (diff > 0 ? a.name : b.name) + ' nhiều hơn ' + Math.abs(diff) + 'h.');
  return lines.join('\n');
}

// ── 3) AI CHƯA ĐỦ 48h/6 CA (FT) ──
function answerFTUnder(storeEmps, weekSchedule) {
  const fts = storeEmps.filter((e) => !isPT(e));
  if (!fts.length) return 'Cửa hàng hiện không có nhân viên Full-time.';
  const under = fts.map((e) => ({ e, s: weekStatsOf(e, weekSchedule) }))
    .filter((x) => x.s.totalH < 48 || x.s.totalShifts < 6);
  if (!under.length) return '✅ Toàn bộ Full-time đã đủ 48h/tuần và ≥ 6 ca.';
  const rows = under.map((x) => '- ' + x.e.name + ': ' + x.s.totalH + 'h / ' + x.s.totalShifts + ' ca');
  return '⚠️ Chưa đủ chuẩn FT (≥ 48h và ≥ 6 ca):\n' + rows.join('\n');
}

// ── 4) PT VƯỢT/GẦN GIỚI HẠN (23h/tuần ~ 91h/tháng) ──
function answerPTLimit(storeEmps, weekSchedule) {
  const pts = storeEmps.filter(isPT);
  if (!pts.length) return 'Cửa hàng hiện không có nhân viên Part-time.';
  const stats = pts.map((e) => ({ e, s: weekStatsOf(e, weekSchedule) }));
  const overW = stats.filter((x) => x.s.totalH > 23);
  if (overW.length) {
    const rows = overW.map((x) => '- ' + x.e.name + ': ' + x.s.totalH + 'h/tuần (vượt 23h!)');
    return '🔴 PT vượt định mức tuần:\n' + rows.join('\n');
  }
  const nearM = stats.filter((x) => Math.round(x.s.totalH * 4.33) >= 85);
  if (nearM.length) {
    const rows = nearM.map((x) => '- ' + x.e.name + ': ~' + Math.round(x.s.totalH * 4.33) + 'h/tháng (sắp chạm 91h)');
    return '🟠 PT sắp vượt 91h/tháng:\n' + rows.join('\n');
  }
  return '✅ Không PT nào vượt 23h/tuần hay sắp vượt 91h/tháng.';
}

// ── 5) HƯỚNG DẪN ĐỔI CA ──
const SWAP_GUIDE = [
  '🔄 Quy trình đổi ca:',
  '1. Mục Lịch ca → tạo đơn đổi ca, chọn ngày & đồng nghiệp đổi cùng',
  '2. Đồng nghiệp xác nhận đơn trên app của họ',
  '3. SM duyệt — lịch hai bên tự hoán đổi',
  'Mẹo: hỏi thứ mấy ai off để tìm người rảnh cùng khung giờ.',
].join('\n');

// ── 6) ÍT GIỜ NHẤT TUẦN ──
function answerLeastHours(storeEmps, weekSchedule) {
  let best = null;
  storeEmps.forEach((e) => {
    const s = weekStatsOf(e, weekSchedule);
    if (s.totalH > 0 && (!best || s.totalH < best.s.totalH)) best = { e, s };
  });
  if (!best) return 'Chưa có dữ liệu xếp ca.';
  return '⏳ Ít giờ nhất tuần: ' + best.e.name + ' — ' + best.s.totalH + 'h / ' + best.s.totalShifts + ' ca';
}

// =====================================================================
// ROUTER: thử các intent dữ liệu mới trước khi rơi xuống chuỗi cũ.
// Trả về chuỗi nếu đã trả lời được, null nếu nhường engine cũ xử lý.
// =====================================================================
export function tryAnswerWithData(ctx) {
  const {
    qn = '',
    employees = [],
    weekSchedule = {},
    storeId = '',
    user = null,
  } = ctx || {};
  const storeEmps = employees.filter((e) => e.dept === storeId);
  const people = findPeople(qn, employees);
  const words = tokenize(qn);
  const selfAsk = words.some((w) => w === 'toi' || w === 'minh' || w === 'tui') || inc(qn, ['cua toi', 'cua minh']);

  // 1) Hướng dẫn đổi ca (đón TRƯỚC intent liệt kê đơn của engine)
  if (inc(qn, ['muon doi ca', 'doi ca lam sao', 'cach doi ca', 'doi ca the nao', 'huong dan doi ca'])) return SWAP_GUIDE;

  // 2) So sánh hai người
  if (people.length >= 2 && inc(qn, ['so sanh', 'so voi'])) return answerCompare(people[0], people[1], weekSchedule);

  // 3) Lương cá nhân (có người cụ thể / bản thân) — đón TRƯỚC FAQ lương chung
  const selfEmp = user ? employees.find((e) => e.id === user.id) : null;
  if (inc(qn, ['luong', 'tien luong', 'thu nhap'])) {
    if ((selfAsk && selfEmp) || (!selfAsk && people.length === 1)) {
      const m = selfAsk && selfEmp ? selfEmp : people[0];
      return answerSalaryPersonal(m, weekSchedule);
    }
  }

  // 4) FT chưa đủ chuẩn 48h/6 ca
  const personWord = inc(qn, ['ai', 'nguoi nao', 'danh sach', 'kiem tra', 'check', 'co ai', 'nao']);
  if (inc(qn, ['48h', '48 gio', 'du chuan ft', 'ft chua', 'chuan ft']) && personWord) return answerFTUnder(storeEmps, weekSchedule);

  // 5) PT vượt/gần giới hạn 23h/91h
  const ptWord = words.includes('pt') || inc(qn, ['part time', 'parttime', 'ban thoi gian', 'stpt']);
  if (personWord && ptWord && inc(qn, ['91', '23', 'vuot', 'gan', 'dinh muc'])) return answerPTLimit(storeEmps, weekSchedule);

  // 6) Ít giờ nhất tuần
  if (inc(qn, ['it gio nhat', 'vang nhat', 'it ca nhat', 'thap nhat', 'it nhat'])) return answerLeastHours(storeEmps, weekSchedule);

  // 7) Hỏi về người không tồn tại → gợi ý danh sách thay vì fallback mù
  const askingPerson = inc(qn, ['lam gi', 'lam ca gi', 'ca gi', 'lich cua']);
  if (!people.length && !selfAsk && askingPerson && words.length >= 3) {
    const names = storeEmps.slice(0, 10)
      .map((e) => tokenize(stripVi(stripParens(String(e.name || '')).toLowerCase())).pop())
      .filter(Boolean).join(', ');
    return 'Không thấy bạn này trong ' + storeId + '. Các NV đang quản lý: ' + names + '. Gõ mã NV 9 số hoặc tên gọi để hỏi chính xác hơn.';
  }

  return null;
}
