// =====================================================================
// Doanh thu -> dinh bien ca. Bang tuong minh theo muc dong doi (p = so NV
// tai cung luc o gio cao nhat). FT gan ca dai khung xuong, PT lap gio vang
// bang ca ngan. Night shift chi xuat hien tu p>=4.
// =====================================================================

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function peakStaffFromDemand(sales, customers) {
  let p = 1;
  if (Number(sales) > 0) p = 1 + Math.round(Number(sales) / 12000000);
  else if (Number(customers) > 0) p = 1 + Math.round(Number(customers) / 250);
  return clamp(p, 1, 5);
}

const PEAK_TABLE = {
  1: { '6-14': 1, '14-22': 1 },
  2: { '6-14': 1, '14-22': 1, '18-22': 1 },
  3: { '6-14': 1, '14-22': 1, '10-14': 1, '18-22': 1 },
  4: { '6-14': 2, '14-22': 2, '10-14': 1, '18-22': 1, '22-6': 1 },
  5: { '6-14': 2, '14-22': 2, '10-14': 1, '14-18': 1, '18-22': 2, '22-6': 1 }
};

export function matrixFromPeak(p) {
  const row = PEAK_TABLE[clamp(Math.round(p), 1, 5)];
  return { ...row };
}

/** demand state cua modal ({weekday:{sales,customers}, weekend:{...}}) -> 2 ma tran */
export function demandToMatrices(demand) {
  const wd = demand?.weekday || {};
  const we = demand?.weekend || {};
  return {
    weekday: matrixFromPeak(peakStaffFromDemand(wd.sales, wd.customers)),
    weekend: matrixFromPeak(peakStaffFromDemand(we.sales, we.customers))
  };
}
