// =====================================================================
// Chuan hoa o ca lam tu file Excel thuc te cua SM (ezHR / Google Sheet).
// Chap nhan: '18-22', '6h-18h', '18-22h', '22-6', 'Off', '22-6 VN0497',
//            '10-14VN0485', '14-22/22-6' (ca kep -> lay ca dau)...
// Tra ve: ma ca chuan ('6-14'), hoac {shift, covering_store}, hoac 'off',
//         hoac chuoi goc neu khong nhan dang duoc.
// =====================================================================

const OFF_RE = /^(off|nghi|nghỉ|-)$/i;
const TIME_RE = /(\d{1,2})\s*h?\s*[-\u2013]\s*(\d{1,2})/i;
const STORE_RE = /vn\s?(\d{3,4})/i;

export function normalizeShiftCell(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (OFF_RE.test(s)) return 'off';

  // Ca kep '14-22/22-6' -> lay ca dau tien
  const firstSeg = s.split('/')[0].trim();
  const storeM = firstSeg.match(STORE_RE);
  const covering = storeM ? ('VN' + storeM[1]) : '';
  const timeM = firstSeg.match(TIME_RE);

  if (timeM) {
    const h1 = String(parseInt(timeM[1], 10));
    const h2 = String(parseInt(timeM[2], 10));
    const code = h1 + '-' + h2;
    if (covering && covering.toUpperCase() !== s.match(/VN\s?\d{3,4}/i)?.[0]?.toUpperCase()) {
      // van dung covering da chuan hoa
    }
    return covering ? { shift: code, covering_store: covering } : code;
  }

  // Khong co gio: giu nguyen (AL, 1, CSR NEW...) de nguoi dung tu xem
  return s;
}
