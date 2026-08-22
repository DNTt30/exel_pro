const SECRET_KEY = /password|passwd|token|jwt|otp|api[_-]?key|refresh|authorization|secret|anon_key/i;

export function redactValue(key, value) {
  if (SECRET_KEY.test(String(key || ''))) return '[REDACTED]';
  return value;
}

export function redact(input) {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(redact);
  if (typeof input !== 'object') return input;
  const out = {};
  Object.entries(input).forEach(([k, v]) => {
    out[k] = SECRET_KEY.test(k) ? '[REDACTED]' : redact(v);
  });
  return out;
}

function fmtVal(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 77) + '…' : s;
  }
  return String(v);
}

export function diffFields(oldData = {}, newData = {}) {
  const keys = [...new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])];
  return keys
    .filter(k => !SECRET_KEY.test(k))
    .map(k => ({ field: k, from: oldData?.[k], to: newData?.[k] }))
    .filter(d => JSON.stringify(d.from) !== JSON.stringify(d.to));
}

/** "qty: 10 → 5" — không ghi chung chung "đã sửa sản phẩm". */
export function describeDiff(oldData, newData) {
  const diffs = diffFields(oldData, newData);
  if (!diffs.length) return '';
  return diffs.map(d => `${d.field}: ${fmtVal(d.from)} → ${fmtVal(d.to)}`).join('; ');
}

export function inferAiIntent(message) {
  const q = String(message || '').toLowerCase();
  if (/công thức|pha |xốt|milo|trà tắc|recipe/.test(q)) return 'recipe';
  if (/lịch|ca mấy|làm ca|off|đổi ca/.test(q)) return 'schedule';
  if (/giờ|lương|91h|48h|ot /.test(q)) return 'hours';
  if (/hết hạn|kệ|hsd|date/.test(q)) return 'shelf';
  return 'general';
}

let cachedIp = '';
let ipPromise = null;

export function rememberClientIp() {
  if (cachedIp || typeof fetch !== 'function') return Promise.resolve(cachedIp);
  if (ipPromise) return ipPromise;
  ipPromise = fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) })
    .then(r => r.json())
    .then(d => {
      cachedIp = d?.ip || '';
      return cachedIp;
    })
    .catch(() => '');
  return ipPromise;
}

export function clientMeta() {
  return {
    ipAddress: cachedIp || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };
}

export function capJson(value, max = 12000) {
  try {
    const s = JSON.stringify(value);
    if (s.length <= max) return value;
    return { _truncated: true, preview: s.slice(0, max) };
  } catch {
    return null;
  }
}
