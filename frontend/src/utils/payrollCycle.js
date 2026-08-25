// =====================================================================
// Chu ky luong: tu ngay 26 thang truoc -> 25 cua mot thang M.
// Hom nay >= 25: chu ky chot la thang hien tai. Truoc 25: thang truoc.
// cycleKey = 'YYYY-MM' cua thang M (thang chua ngay 25).
// =====================================================================

const pad = n => String(n).padStart(2, '0');

export function getPayrollCycle(now = new Date()) {
  const d = now.getDate();
  let endY = now.getFullYear();
  let endM = now.getMonth(); // 0-based, thang chua ngay 25
  if (d < 25) { endM -= 1; if (endM < 0) { endM = 11; endY -= 1; } }
  let startY = endY;
  let startM = endM - 1;
  if (startM < 0) { startM = 11; startY -= 1; }

  const days = [];
  const cursor = new Date(startY, startM, 26);
  const last = new Date(endY, endM, 25);
  while (cursor <= last) {
    days.push({
      dateStr: cursor.getFullYear() + '-' + pad(cursor.getMonth() + 1) + '-' + pad(cursor.getDate()),
      label: pad(cursor.getDate()) + '/' + pad(cursor.getMonth() + 1),
      dow: cursor.getDay()
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return {
    key: endY + '-' + pad(endM + 1),
    label: '26/' + pad(startM + 1) + ' - 25/' + pad(endM + 1) + '/' + endY,
    from: startY + '-' + pad(startM + 1) + '-26',
    to: endY + '-' + pad(endM + 1) + '-25',
    days
  };
}
