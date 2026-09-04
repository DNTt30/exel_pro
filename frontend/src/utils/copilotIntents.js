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
export function answerHandbookQuestions(qn) {
  // 1. Giờ hủy & hạn sử dụng
  if (inc(qn, ['gio huy', 'huy hang', 'khi nao huy', 'gio huy ff', 'gio huy gm', 'huy sandwich', 'huy onigiri', 'huy bento', 'huy gimbap', 'xoa bao bi'])) {
    return [
      '🕒 **Quy định Giờ Hủy Hàng & HSD tại GS25:**',
      '- **11:00 & 22:00 (Trưa & Đêm)**: FF rau & thức ăn nhanh tươi (*Sandwich có rau, Burger, Gimbap, Soup*).',
      '- **19:00 (Tối)**: FF cơm, mì & sushi (*Cơm nắm Onigiri, Bento, Sandwich không rau, Mì hộp, Sushi*).',
      '- **Theo HSD / Tem**: FF Onsite, Salad, Bánh mì que, Dessert tủ OSC, Bánh tươi Patachou.',
      '- **Hàng GM (Bách hóa)**: HSD ≤ 7 ngày hủy trước 2h; 7 ngày-1 tháng hủy trước 1 ngày; 1-6 tháng hủy trước 3 ngày; 6 tháng-1 năm hủy trước 5 ngày.',
      '⚠️ *Quy tắc bắt buộc: Phải xé rách hoặc làm biến dạng bao bì trước khi vứt vào túi rác!*'
    ].join('\n');
  }

  // 2. Nhiệt độ thiết bị
  if (inc(qn, ['nhiet do tu mat', 'nhiet do tu dong', 'nhiet do noi lau', 'nhiet do banh bao', 'nhiet do chuan'])) {
    return [
      '🌡️ **Nhiệt độ chuẩn thiết bị bảo quản & chế biến:**',
      '- **Tủ mát / Kho mát**: `0°C đến 5°C` (sữa, nước, sandwich, BTP)',
      '- **Tủ đông / Kho đông**: `< -18°C` (kem, đá viên, chả cá)',
      '- **Tủ hấp bánh bao**: `90°C` (hấp ít nhất 30 phút, CẤM hâm lò vi sóng!)',
      '- **Nồi súp lẩu**: `70°C` (duy trì công suất 200W; đun sôi 110°C / 2000W)'
    ].join('\n');
  }

  // 3. Lò vi sóng công nghiệp bấm số mấy
  if (inc(qn, ['vi song', 'lo vi song', 'bam so may', 'bam nut', 'so 3', 'so 5', 'ham nong cha ca', 'ham nong to mi'])) {
    return [
      '🔥 **Quy tắc bấm Lò vi sóng Công nghiệp (GS25):**',
      '- **Ly lẩu chả cá**: Lò gia dụng `30 giây` | Lò công nghiệp **BẤM SỐ 3**.',
      '- **Tô mì chả cá**: Lò gia dụng `2 phút` | Lò công nghiệp **BẤM SỐ 5**.',
      '- **Xôi bánh bao**: Bánh bao hấp tủ 90°C (CẤM vi sóng). Xôi cắt bao nilon quay vi sóng 1 phút.',
      '⚠️ *Lưu ý: Luôn tháo xiên chả cá ra trước khi cho vào ly/tô!*'
    ].join('\n');
  }

  // 4. Công thức lẩu chả cá & mì kimchi
  if (inc(qn, ['nau lau', 'sup cha ca', 'bot sup', 'nau cha ca', 'dinh luong sup', 'va sup', 'so va sup'])) {
    return [
      '🍲 **Công thức & SOP Lẩu chả cá cay (GS25 Miền Bắc):**',
      '- **Nước súp**: 2000ml nước lọc + 1 gói bột súp cay (120g). Nấu công suất **2000W** trong **15 phút**.',
      '- **Chả cá xoắn**: 10 xiên, nấu **1200W** trong **10 phút** (sau 5 phút lật mặt 1 lần). Nhiệt độ tâm sau nấu ≥ 75°C.',
      '- **Mì chả cá**: Nước sôi ≥ 95°C, trụng đúng **2 phút 30 giây**.',
      '- **Múc nước súp bán**: Ly lẩu = *Số xiên + 1 vá súp*. Tô mì = *4 vá nước súp* (~30g/vá). Tháo xiên trước khi trao khách.',
      '- **Trưng bày chảo**: Tối đa 2 tiếng ở công suất 200W.'
    ].join('\n');
  }

  // 5. Hóa chất Saraya / Ecolab
  if (inc(qn, ['hoa chat', 'saraya', 'ecolab', 'smart san', 'h-1', 's-4', 'n-12', 'g-2', '211', '311', 'con sat khuan', 'tay dau mo'])) {
    return [
      '🧪 **Hệ 6 Mã Màu Hóa Chất SARAYA Greentek tại GS25:**',
      '- ⚪ **Trắng (H-1 Smart San)**: Xà phòng rửa tay nhân viên, dùng NGUYÊN CHẤT.',
      '- 🔴 **Đỏ đô (S-4 Sanitizer)**: Cồn sát khuẩn tay & dao thớt, dùng NGUYÊN CHẤT (giữ xa lửa!).',
      '- 🟢 **Xanh lá (N-12 Sara Wash)**: Rửa CCDC (pha 6 lần nhấn 180ml + nước đầy bình); Lau bàn ghế (1 lần nhấn 30ml + nước).',
      '- 🟤 **Nâu (G-2 Smart San Degreaser)**: Tẩy dầu mỡ bếp chiên, tủ hút khói, dùng NGUYÊN CHẤT (mang găng cao su!).',
      '- 🔴 **Đỏ tươi (211 Pro WC)**: Tẩy bồn cầu & sàn toilet (4 lần nhấn 120ml + nước).',
      '- 🔵🟡 **Xanh + Vàng (311 Multi Floor & Glass)**: Lau kính và sàn gạch (1 lần nhấn 30ml + nước).'
    ].join('\n');
  }

  // 6. Quy trình rửa tay 12 bước
  if (inc(qn, ['rua tay', '12 buoc', 've sinh tay', '60 giay', 'saraya rua tay'])) {
    return [
      '🧼 **Quy trình Vệ sinh tay 12 bước Saraya (60 giây):**',
      '1. Rửa nước -> 2. Lấy 2 lần nhấn H-1 -> 3. Xoa 2 lòng bàn tay (5 lần)',
      '4. Đan ngón tay cọ lòng bàn tay -> 5. Cọ mu bàn tay -> 6. Cọ đầu ngón tay',
      '7. Vặn ngón tay cái -> 8. Cọ cổ tay đến khuỷu tay -> 9. Chà móng tay bằng bàn chải',
      '10. Xả sạch nước dưới vòi (quá trình ≥ 60s) -> 11. Lau khô khăn giấy -> 12. Xịt cồn S-4 để khô.',
      '⚠️ *4 vùng hay bị sót: Đầu móng tay, ngón cái, kẽ ngón và mu bàn tay.*'
    ].join('\n');
  }

  // 7. Vệ sinh ca / Phân công ca
  if (inc(qn, ['ve sinh ca', 'ca 1 lam gi', 'ca 2 lam gi', 'ca 3 lam gi', 'thay dau bep', 'thay dau'])) {
    return [
      '📋 **Phân công Vệ sinh theo Ca (GS25):**',
      '- ☀️ **Ca 1 (6h - 14h)**: Quạt hút, thanh nẹp, kho bãi WH, tủ mát kho, quét mạng nhện, lau kệ hàng.',
      '- 🌤️ **Ca 2 (14h - 22h)**: Chân bàn ghế, rổ mua sắm, tủ mát/đông counter, kệ snack, sọt rác, xô lau sàn.',
      '- 🌙 **Ca 3 (22h - 6h)**: Chà sàn gạch xám, vệ sinh toilet, hộc quầy counter, và **BẮT BUỘC THAY DẦU BẾP CHIÊN vào đêm Thứ 3**.',
      '💡 *Mẹo: Vào mục "Sổ tay GS25 / Sổ tay SOP" trên thanh menu để tick checklist theo ca và ngày hiện tại!*'
    ].join('\n');
  }

  return null;
}

// =====================================================================
export function tryAnswerWithData(ctx) {
  const {
    qn = '',
    employees = [],
    weekSchedule = {},
    storeId = '',
    user = null,
  } = ctx || {};

  // Handbook intent check
  const handbookAnswer = answerHandbookQuestions(qn);
  if (handbookAnswer) return handbookAnswer;

  const storeEmps = employees.filter((e) => e.dept === storeId);
  const people = findPeople(qn, employees);
  const words = tokenize(qn);
  const selfAsk = words.some((w) => w === 'toi' || w === 'minh' || w === 'tui') || inc(qn, ['cua toi', 'cua minh']);

  // 0) HỎI THÔNG TIN BẢN THÂN / MÃ NHÂN VIÊN / PROFILE
  if (user && (selfAsk || inc(qn, ['ma nhan vien', 'ma nv', 'ma cua toi', 'ten cua toi', 'thong tin cua toi', 'toi la ai', 'chuc vu cua toi', 'cua hang cua toi', 'tai khoan cua toi']))) {
    // 0.1) Hỏi mã nhân viên
    if (inc(qn, ['ma nhan vien', 'ma nv', 'ma so', 'id cua toi', 'ma cua toi', 'so the'])) {
      const deptStr = user.dept ? ` (Cửa hàng: ${user.dept})` : '';
      return `🪪 Mã nhân viên của bạn là: **${user.id}** (${user.name || 'Nhân viên'}${deptStr}).`;
    }

    // 0.2) Hỏi cửa hàng trực thuộc
    if (inc(qn, ['cua hang cua toi', 'toi lam o dau', 'truc cua hang nao', 'chi nhanh nao', 'store nao', 'dept'])) {
      return `🏪 Bạn đang làm việc tại cửa hàng: **${user.dept || 'Chưa gán cửa hàng cụ thể'}** (${user.name || user.id}).`;
    }

    // 0.3) Hỏi chức vụ / loại nhân viên
    if (inc(qn, ['chuc vu', 'chuc danh', 'vi tri', 'loai hop dong', 'part time hay full time', 'ft hay pt'])) {
      const typeStr = user.type === 'STPT' || String(user.role).includes('PT') ? 'Part-Time (STPT)' : 'Full-Time (STFT)';
      return `💼 Chức vụ của bạn: **${user.jobTitle || user.role || 'Nhân sự cửa hàng'}** · Loại: **${typeStr}**.`;
    }

    // 0.4) Hỏi thông tin tổng quát / tôi là ai
    if (inc(qn, ['thong tin', 'toi la ai', 'ten toi', 'ten cua toi', 'ho so', 'profile', 'tai khoan'])) {
      const typeStr = user.type === 'STPT' || String(user.role).includes('PT') ? 'Part-Time (STPT)' : 'Full-Time (STFT)';
      return [
        `👤 **Thông tin tài khoản:**`,
        `- Họ tên: **${user.name || user.id}**`,
        `- Mã NV: **${user.id}**`,
        `- Cửa hàng: **${user.dept || 'Toàn hệ thống'}**`,
        `- Chức danh: **${user.jobTitle || user.role || 'Nhân viên'}** (${typeStr})`,
        `- Trạng thái: Đang hoạt động ✓`
      ].join('\n');
    }
  }

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
