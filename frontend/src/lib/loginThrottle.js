// =====================================================================
// GIOI HAN TOC DO DANG NHAP - khoa tam khoi sau nhieu lan sai.
// Cua so dem: 5 phut; toi da 5 lan sai; khoa 5 phut. Log LOGIN_FAILED
// van duoi DB de xem trong Nhat ky.
// =====================================================================

const KEY = 'ofc-login-throttle';
const MAX_FAILS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;

export const THROTTLE_MAX_FAILS = MAX_FAILS;
export const THROTTLE_LOCK_MS = LOCK_MS;

export function evaluateAttempt(rec, now) {
  const r = rec || { fails: [], lockedUntil: 0 };
  if (r.lockedUntil && r.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((r.lockedUntil - now) / 1000) };
  }
  const recentFails = (r.fails || []).filter((t) => now - t < WINDOW_MS).length;
  return { allowed: true, recentFails };
}

function readAll() {
  try {
    return JSON.parse(globalThis.localStorage.getItem(KEY)) || {};
  } catch { return {}; }
}

function writeAll(all) {
  try { globalThis.localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export function checkLocked(userId) {
  return evaluateAttempt(readAll()[String(userId)], Date.now());
}

export function recordFailure(userId) {
  const now = Date.now();
  const all = readAll();
  const key = String(userId);
  const r = all[key] || { fails: [], lockedUntil: 0 };
  r.fails = (r.fails || []).filter((t) => now - t < WINDOW_MS);
  r.fails.push(now);
  if (r.fails.length >= MAX_FAILS) {
    r.lockedUntil = now + LOCK_MS;
    r.fails = [];
  }
  all[key] = r;
  writeAll(all);
  return { locked: r.lockedUntil > now, until: r.lockedUntil };
}

export function resetFailures(userId) {
  const all = readAll();
  delete all[String(userId)];
  writeAll(all);
}
