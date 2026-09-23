// Keep concurrency metadata outside schedule[week][employee][day].
const versions = new WeakMap();

export function withScheduleVersion(shifts, version) {
  if (shifts && typeof shifts === 'object' && Number.isInteger(version)) versions.set(shifts, version);
  return shifts;
}

export function scheduleVersion(shifts) {
  return shifts && typeof shifts === 'object' ? (versions.get(shifts) ?? 0) : 0;
}

export function copyScheduleVersion(previous, next) {
  return withScheduleVersion(next, scheduleVersion(previous));
}
