// =====================================================================
// THONG TIN XAC THUC ADMIN - mat khau that, bam SHA-256 + salt.
// Luu theo thiet bi (localStorage): moi thiet bi dau tien dung mat khau
// mac dinh '1' se bi buoc doi ngay truoc khi vao Dashboard.
// =====================================================================

export const ADMIN_MIN_PASSWORD_LEN = 8;
const STORAGE_KEY = 'ofc-admin-cred-v1';

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digestHex(text) {
  if (globalThis.crypto && globalThis.crypto.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 's1:' + toHex(buf);
  }
  // Fallback moi truong khong co WebCrypto (http LAN) — yeu hon, chi dung tam
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < text.length; i++) {
    h1 = (((h1 ^ text.charCodeAt(i)) * 16777619) >>> 0);
    h2 = ((h2 + text.charCodeAt(i) * (i + 7)) >>> 0);
  }
  return 'f1:' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function randomSalt() {
  return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

export function hashPassword(password, salt) {
  return digestHex(String(salt) + '::' + String(password));
}

export function validateAdminPassword(pw) {
  if (typeof pw !== 'string' || pw.length < ADMIN_MIN_PASSWORD_LEN) return 'Mật khẩu tối thiểu ' + ADMIN_MIN_PASSWORD_LEN + ' ký tự.';
  if (pw === '1') return 'Không được dùng lại mật khẩu mặc định.';
  const first = pw[0];
  let allSame = true;
  for (const ch of pw) if (ch !== first) { allSame = false; break; }
  if (allSame) return 'Mật khẩu không được lặp một ký tự.';
  return '';
}

function readCred() {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function hasCustomAdminPassword() {
  const c = readCred();
  return !!(c && c.hash && c.salt);
}

export async function setAdminPassword(pw) {
  const err = validateAdminPassword(pw);
  if (err) throw new Error(err);
  const salt = randomSalt();
  const hash = await hashPassword(pw, salt);
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ salt, hash, updatedAt: Date.now() }));
  return true;
}

export async function verifyAdminPassword(pw) {
  const c = readCred();
  if (!c || !c.hash || !c.salt) return false;
  return (await hashPassword(pw, c.salt)) === c.hash;
}
