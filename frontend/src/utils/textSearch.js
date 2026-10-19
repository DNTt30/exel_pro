/** Search normalization only; no business content or recipe catalog. */
export function stripVi(value) {
  return String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
