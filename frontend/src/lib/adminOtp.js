// =====================================================================
// 2FA OTP cho admin qua Telegram Edge Function (admin-otp).
// Xac minh server-side; thiet bi tin tuong duoc ghi nho 30 ngay.
// Neu chua cau hinh VITE_ADMIN_OTP_URL => 2FA tat (graceful off).
// =====================================================================

const FN_URL = import.meta.env?.VITE_ADMIN_OTP_URL || '';
const SECRET = import.meta.env?.VITE_TELEGRAM_PROXY_SECRET || '';
const DEVICE_KEY = 'ofc-admin-device-token';

export function isOtpEnabled() {
  return Boolean(FN_URL);
}

async function callFn(action, extra = {}) {
  if (!FN_URL) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(SECRET ? { 'x-ofc-secret': SECRET } : {}) },
      body: JSON.stringify({ action, ...extra }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
    });
    return await res.json();
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export async function requestAdminOtp() {
  return callFn('request');
}

export async function verifyAdminOtp(code) {
  const r = await callFn('verify', { code });
  if (r && r.ok && r.deviceToken) saveDeviceToken(r.deviceToken);
  return r;
}

export function getDeviceToken() {
  try { return globalThis.localStorage.getItem(DEVICE_KEY) || ''; } catch { return ''; }
}

export function saveDeviceToken(token) {
  try { globalThis.localStorage.setItem(DEVICE_KEY, String(token)); } catch { /* ignore */ }
}

export function hasTrustedDeviceLocal() {
  return Boolean(getDeviceToken());
}

/** true = bo qua OTP (chua bat 2FA, hoac thiet bi da tin tuong server-side). */
export async function checkDeviceTrusted() {
  if (!isOtpEnabled()) return true;
  const token = getDeviceToken();
  if (!token) return false;
  const r = await callFn('check-device', { deviceToken: token });
  return Boolean(r && r.trusted);
}
