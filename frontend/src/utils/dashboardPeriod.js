import { getPayrollCycleDates, getPayrollCycleFromWeek, getCurrentMondayWeek, listNearbyWeeks } from '../data/constants';

export function payrollMonthKey(dateKey) {
  const { year, month } = getPayrollCycleFromWeek(dateKey);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function dashboardCycleDates(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return getPayrollCycleDates(year, month).map(day => ({
    ...day,
    key: `${Number(day.dayNum) >= 26 ? 'prev' : 'cur'}_${day.dayNum}`,
    display: `${day.shortDisplay}/${day.dateObj.getFullYear()}`,
    monthNum: String(day.dateObj.getMonth() + 1),
  }));
}

// A boundary week may overlap two payroll cycles; preserve the cycle being viewed.
export function switchDashboardPeriod(mode, monthKey, weekKey, today = new Date()) {
  const dates = dashboardCycleDates(monthKey);
  const includesWeek = dates.some(day => day.weekKey === weekKey);
  if (mode === 'month') {
    return { month: includesWeek ? monthKey : payrollMonthKey(weekKey), week: weekKey };
  }
  const todayKey = getCurrentMondayWeek(today);
  const withinCycle = today >= dates[0].dateObj && today < new Date(dates.at(-1).dateObj.getTime() + 86400000);
  return { month: monthKey, week: includesWeek ? weekKey : (withinCycle ? todayKey : dates[0].weekKey) };
}

export function dashboardWeekOptions(monthKey, weekKey) {
  return [...new Set([
    ...dashboardCycleDates(monthKey).map(day => day.weekKey),
    ...listNearbyWeeks(new Date(`${weekKey}T12:00:00`), 4, 4).map(week => week.key),
    weekKey,
  ])].sort().map(key => {
    const start = new Date(`${key}T12:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { key, label: `${start.toLocaleDateString('vi-VN')} → ${end.toLocaleDateString('vi-VN')}` };
  });
}
