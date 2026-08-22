import { normalizeStoreDemand } from '../data/constants';

const OLLAMA_TAGS = 'http://localhost:11434/api/tags';
const OLLAMA_CHAT = 'http://localhost:11434/api/chat';
const VISION_HINT = /llava|vision|moondream|bakllava|minicpm|qwen2-vl|qwen2\.5-vl|qwen2\.5vl|llama3\.2-vision|gemma3/i;

function toInt(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

/** 12.500.000 | 12,500,000 | 12.5 triệu | 15tr */
export function parseMoneyToken(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/\s/g, '');
  if (!s) return 0;
  const trieu = s.match(/^([\d]+(?:[.,]\d+)?)\s*(triệu|trieu|tr)$/);
  if (trieu) return Math.round(parseFloat(trieu[1].replace(',', '.')) * 1_000_000);
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}

function contextBefore(text, index, span = 40) {
  return text.slice(Math.max(0, index - span), index).toLowerCase();
}

function isWeekendContext(ctx) {
  return /cuối tuần|cuoi tuan|t7|cn|weekend|sat|sun|thứ 7|chu nhat|chủ nhật/.test(ctx);
}

function isWeekdayContext(ctx) {
  return /t2|t3|t4|t5|t6|weekday|ngày thường|ngay thuong|thứ 2/.test(ctx);
}

function bucketOf(ctx) {
  const wend = isWeekendContext(ctx);
  const wday = isWeekdayContext(ctx);
  if (wend && !wday) return 'weekend';
  if (wday && !wend) return 'weekday';
  return '';
}

/**
 * Đọc số liệu Direct / báo cáo doanh số từ text (OCR hoặc vision).
 */
export function parseDemandFromText(text) {
  const raw = String(text || '');
  const demand = normalizeStoreDemand({});
  if (!raw.trim()) return { demand, notes: [], found: false };

  const notes = [];
  const jsonMatch = raw.match(/\{[\s\S]*"weekday"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const d = normalizeStoreDemand(parsed);
      if (d.weekday.sales || d.weekday.customers || d.weekend.sales || d.weekend.customers) {
        return { demand: d, notes: parsed.notes ? [String(parsed.notes)] : ['Đọc JSON từ ảnh.'], found: true };
      }
    } catch { /* fall through */ }
  }

  const moneyRe = /(?:doanh\s*số|doanh so|ds|sales|revenue)?[^\d]{0,12}(\d{1,3}(?:[.,]\d{3}){2,3}|\d+(?:[.,]\d+)?\s*(?:triệu|trieu|tr))\b/gi;
  let m;
  while ((m = moneyRe.exec(raw))) {
    const val = parseMoneyToken(m[1]);
    if (val < 100_000) continue;
    const bucket = bucketOf(contextBefore(raw, m.index)) || (!demand.weekday.sales ? 'weekday' : 'weekend');
    if (!demand[bucket].sales) demand[bucket].sales = val;
  }

  const custRe = /(?:lượt khách|luot khach|khách|khach|bill|bills|customers?)[^\d]{0,12}(\d{2,5})/gi;
  while ((m = custRe.exec(raw))) {
    const val = toInt(m[1]);
    if (val < 20 || val > 20000) continue;
    const bucket = bucketOf(contextBefore(raw, m.index)) || (!demand.weekday.customers ? 'weekday' : 'weekend');
    if (!demand[bucket].customers) demand[bucket].customers = val;
  }

  if (demand.weekday.sales && !demand.weekend.sales) {
    demand.weekend.sales = Math.round(demand.weekday.sales * 1.25);
    notes.push('Chưa thấy DS cuối tuần — ước +25% so với T2–T6.');
  }
  if (demand.weekday.customers && !demand.weekend.customers) {
    demand.weekend.customers = Math.round(demand.weekday.customers * 1.2);
    notes.push('Chưa thấy lượt khách cuối tuần — ước +20% so với T2–T6.');
  }

  const found = !!(demand.weekday.sales || demand.weekday.customers || demand.weekend.sales || demand.weekend.customers);
  if (found && !notes.length) notes.push('Đã đọc số liệu doanh số / lượt khách từ ảnh.');
  return { demand, notes, found };
}

export function mergeDemand(...parts) {
  const out = normalizeStoreDemand({});
  parts.filter(Boolean).forEach(p => {
    const d = normalizeStoreDemand(p);
    ['weekday', 'weekend'].forEach(k => {
      if (d[k].sales) out[k].sales = d[k].sales;
      if (d[k].customers) out[k].customers = d[k].customers;
    });
  });
  return out;
}

export async function fileToVisionPayload(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Ảnh không hợp lệ'));
    el.src = dataUrl;
  });
  const maxW = 1280;
  const scale = img.width > maxW ? maxW / img.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const compact = canvas.toDataURL('image/jpeg', 0.72);
  return {
    previewUrl: compact,
    base64: String(compact).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '')
  };
}

async function pickOllamaVisionModel() {
  const res = await fetch(OLLAMA_TAGS, { signal: AbortSignal.timeout(1500) });
  if (!res.ok) return '';
  const data = await res.json();
  const names = (data.models || []).map(m => m.name || m.model || '');
  return names.find(n => VISION_HINT.test(n)) || '';
}

async function analyzeOneImageWithOllama(base64, model) {
  const prompt = `Ảnh báo cáo doanh số / GS25 Direct cửa hàng tiện lợi.
Trả về DUY NHẤT JSON (không markdown):
{"weekday":{"customers":0,"sales":0},"weekend":{"customers":0,"sales":0},"notes":""}
weekday = T2–T6, weekend = T7+CN. sales là VND cả ngày (vd 12500000). customers là lượt khách/ngày. Nếu chỉ có 1 số thì ghi weekday.`;

  const res = await fetch(OLLAMA_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt, images: [base64] }]
    }),
    signal: AbortSignal.timeout(14000)
  });
  if (!res.ok) throw new Error('Ollama vision lỗi');
  const data = await res.json();
  return parseDemandFromText(data.message?.content || '');
}

/**
 * Đọc 1–n ảnh doanh số → demand T2–T6 / T7–CN.
 * Ưu tiên Ollama vision (nếu máy có model llava/…). Fallback: parse text nếu vision trả chữ.
 */
export async function analyzeSalesImages(files) {
  const list = [...(files || [])].filter(Boolean).slice(0, 4);
  if (!list.length) return { demand: normalizeStoreDemand({}), notes: [], previews: [], source: 'none', found: false };

  const previews = [];
  const payloads = [];
  for (const file of list) {
    const p = await fileToVisionPayload(file);
    previews.push({ name: file.name, url: p.previewUrl });
    payloads.push(p);
  }

  let model = '';
  try { model = await pickOllamaVisionModel(); } catch { model = ''; }

  const parts = [];
  const notes = [];
  if (model) {
    for (const p of payloads) {
      try {
        const one = await analyzeOneImageWithOllama(p.base64, model);
        if (one.found) parts.push(one.demand);
        notes.push(...(one.notes || []));
      } catch (err) {
        notes.push(err.message || 'Không đọc được 1 ảnh.');
      }
    }
  } else {
    notes.push('Máy chưa có model đọc ảnh (llava / llama3.2-vision). Nhập số liệu cạnh ảnh, hoặc cài model vision cho Ollama.');
  }

  const demand = mergeDemand(...parts);
  const found = !!(demand.weekday.sales || demand.weekday.customers || demand.weekend.sales || demand.weekend.customers);
  return {
    demand,
    notes: notes.slice(0, 4),
    previews,
    source: found ? (model ? 'vision' : 'text') : 'none',
    found,
    model
  };
}
