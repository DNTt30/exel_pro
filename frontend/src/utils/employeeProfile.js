export const PROFILE_RULES = { maxTextLength: 160, reminderMonths: 1 };
export function validateEmployeeProfile(profile, today = new Date()) {
  for (const key of ['university', 'major', 'workPlanUntil']) {
    if (typeof profile[key] !== 'string' || profile[key].length > PROFILE_RULES.maxTextLength) return 'Thông tin không được quá 160 ký tự.';
  }
  if (profile.dob) {
    const date = new Date(`${profile.dob}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.dob) || Number.isNaN(date.getTime())
      || date.getFullYear() < 1900 || date > today
      || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== profile.dob) return 'Ngày sinh không hợp lệ hoặc nằm trong tương lai.';
  }
  return null;
}
export function workPlanReminder(value, now = new Date()) {
  const text = String(value || '').trim();
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(text);
  const local = /^(?:tháng\s+)?(\d{1,2})\s*\/\s*(\d{4})$/i.exec(text);
  if (!iso && !local) return null;
  const year = Number(iso ? iso[1] : local[2]), month = Number(iso ? iso[2] : local[1]);
  if (month < 1 || month > 12) return null;
  const distance = (year - now.getFullYear()) * 12 + month - 1 - now.getMonth();
  if (distance < 0 || distance > PROFILE_RULES.reminderMonths) return null;
  return `Dự định nghỉ ${distance === 0 ? 'tháng này' : 'tháng tới'} (${String(month).padStart(2, '0')}/${year})`;
}
