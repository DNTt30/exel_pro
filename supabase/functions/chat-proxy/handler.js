import { DEFAULT_GEMINI_MODEL, copilotOutputBudget } from '../_shared/copilotConfig.js';

import { validCopilotScope, copilotAccessInstruction } from './access.js';
import { boundedResponseBody } from './responseStream.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Retry-After',
};
const json = (status, error) => new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const retryableStatuses = new Set([408, 500, 502, 503, 504]);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fetchWithHeaderTimeout(fetchImpl, url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try { return await fetchImpl(url, { ...options, signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal }); }
  finally { clearTimeout(timer); } // Long streamed answers may continue after headers arrive.
}

export function createChatProxyHandler({ authorize, getApiKey, saveApiKey, validateScope, consumeRequest, fetchImpl = fetch, sleep = wait, random = Math.random }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json(405, 'Phương thức không hỗ trợ.');
    try {
      const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
      const identity = token && await authorize(token);
      if (!identity) return json(401, 'Vui lòng đăng nhập lại để dùng trợ lý.');
      const action = new URL(req.url).searchParams.get('action') || 'generateContent';
      if (['config_status', 'configure'].includes(action)) {
        if (identity.isAdmin !== true) return json(403, 'Chỉ admin được cấu hình trợ lý AI.');
        if (action === 'configure') {
          const raw = await req.text();
          if (raw.length > 1024) return json(413, 'Cấu hình quá dài.');
          let config;
          try { config = JSON.parse(raw); } catch { return json(400, 'Cấu hình không hợp lệ.'); }
          const key = typeof config?.apiKey === 'string' ? config.apiKey.trim() : '';
          if ((key.length < 35) || key.length > 256) return json(400, 'Gemini API Key không đúng định dạng.');
          await saveApiKey(key);
        }
        const configured = !!await getApiKey();
        return new Response(JSON.stringify({ configured }), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      if (!['generateContent', 'streamGenerateContent'].includes(action)) return json(400, 'Yêu cầu AI không hợp lệ.');
      const key = await getApiKey();
      if (!key) return json(503, 'Trợ lý AI chưa được cấu hình. Vui lòng liên hệ admin.');
      if ((key.length < 35)) return json(400, 'Gemini API Key không đúng định dạng.');
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > 256000) return json(413, 'Nội dung quá dài. Vui lòng rút gọn lịch sử trò chuyện.');
      let body;
      try { body = JSON.parse(raw); } catch { return json(400, 'Nội dung yêu cầu không hợp lệ.'); }
      if (!body?.copilotScope) return json(400, 'Vui lòng tải lại ứng dụng để cập nhật phân quyền trợ lý.');
      {
        if (!validCopilotScope(body.copilotScope)) return json(400, 'Phạm vi trợ lý không hợp lệ.');
        const permitted = validateScope ? await validateScope(identity, body.copilotScope)
          : body.copilotScope.kind === 'handbook' && !body.copilotScope.employeeIds.length && !body.copilotScope.storeIds.length;
        if (!permitted) return json(403, 'Bạn không có quyền tra dữ liệu này qua trợ lý.');
      }
      const textParts = parts => Array.isArray(parts) && parts.length > 0 && parts.every(p => p && typeof p.text === 'string');
      if (!Array.isArray(body?.contents) || !body.contents.length || body.contents.length > 20 ||
          body.contents.some(c => !c || !['user', 'model'].includes(c.role) || !textParts(c.parts)) ||
          (body.systemInstruction && !textParts(body.systemInstruction.parts))) return json(400, 'Nội dung yêu cầu không hợp lệ.');
      // Fail closed if the shared database budget cannot be verified. In-memory
      // counters cannot protect quota across tabs, devices and Edge workers.
      let budget;
      try { budget = await consumeRequest(identity); }
      catch { return json(503, 'Chưa kiểm tra được hạn mức trợ lý. Vui lòng thử lại sau.'); }
      if (budget?.allowed !== true) {
        if (budget?.allowed !== false || !Number.isInteger(budget.retryAfter) || budget.retryAfter < 1 || budget.retryAfter > 60)
          return json(503, 'Chưa kiểm tra được hạn mức trợ lý. Vui lòng thử lại sau.');
        return new Response(JSON.stringify({ error: `Anh/chị gửi quá nhanh. Vui lòng chờ ${budget.retryAfter} giây rồi thử lại.`, code: 'COPILOT_RATE_LIMITED', retryAfter: budget.retryAfter }), {
          status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(budget.retryAfter) },
        });
      }
      const payload = {
        contents: body.contents.map(c => ({ role: c.role, parts: c.parts.map(p => ({ text: p.text })) })),
        systemInstruction: { parts: [{ text: copilotAccessInstruction(identity) },
          ...(body.systemInstruction?.parts || []).map(p => ({ text: p.text }))] },
        generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: copilotOutputBudget(body.generationConfig?.maxOutputTokens) },
      };
      const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:${action}${action === 'streamGenerateContent' ? '?alt=sse' : ''}`;
      // Retry only before forwarding response headers/body, never replay a partial stream.
      // One retry budget on the server serves both streaming and non-streaming clients.
      let res;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetchWithHeaderTimeout(fetchImpl, googleUrl, {
            signal: req.signal,
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(payload),
          });
        } catch {
          if (req.signal.aborted) return json(499, 'Yêu cầu đã hủy.');
          if (attempt === 2) return json(504, 'Kết nối Google Gemini bị gián đoạn hoặc quá thời gian chờ. Vui lòng thử lại sau.');
          await sleep(1000 * 2 ** attempt + Math.floor(random() * 250));
          continue;
        }
        if (!retryableStatuses.has(res.status) || attempt === 2) break;
        await res.body?.cancel();
        await sleep(1000 * 2 ** attempt + Math.floor(random() * 250));
      }
      if (!res.ok) {
        await res.body?.cancel();
        if (res.status === 429) return json(429, 'Gemini đang giới hạn lượt gọi hoặc hết hạn mức. Vui lòng thử lại sau.');
        if (res.status === 503) return json(503, 'Google Gemini đang quá tải (503). Hệ thống đã thử lại 2 lần nhưng chưa nhận được phản hồi. Vui lòng thử lại sau ít phút.');
        if (res.status === 404) return json(404, 'Model Gemini đang cấu hình không khả dụng với project này. Vui lòng liên hệ admin kiểm tra quyền truy cập model.');
        if ([401, 403].includes(res.status)) return json(403, 'Google từ chối API key hoặc quyền truy cập. Vui lòng liên hệ admin kiểm tra cấu hình Gemini.');
        if (res.status === 402) return json(402, 'Project Gemini cần kiểm tra số dư hoặc cấu hình thanh toán. Vui lòng liên hệ admin.');
        if (res.status === 400) return json(400, 'Google không chấp nhận yêu cầu Gemini. Vui lòng liên hệ admin kiểm tra API key và cấu hình model.');
        if ([408, 504].includes(res.status)) return json(504, 'Google Gemini phản hồi quá chậm. Hệ thống đã thử lại; vui lòng thử lại sau.');
        return json(502, 'Google Gemini đang gặp lỗi dịch vụ. Hệ thống đã thử lại; vui lòng thử lại sau.');
      }
      return new Response(boundedResponseBody(res.body, req.signal), { headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' } });
    } catch {
      return json(502, 'Không kết nối được trợ lý AI. Vui lòng thử lại.');
    }
  };
}
