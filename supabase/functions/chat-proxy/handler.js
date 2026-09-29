import { DEFAULT_GEMINI_MODEL, COPILOT_MAX_OUTPUT_TOKENS } from '../_shared/copilotConfig.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status, error) => new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export function createChatProxyHandler({ authorize, apiKey = '', fetchImpl = fetch }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json(405, 'Phương thức không hỗ trợ.');
    try {
      const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if (!token || !await authorize(token)) return json(401, 'Vui lòng đăng nhập lại để dùng trợ lý.');
      const action = new URL(req.url).searchParams.get('action') || 'generateContent';
      if (!['generateContent', 'streamGenerateContent'].includes(action)) return json(400, 'Yêu cầu AI không hợp lệ.');
      const key = req.headers.get('x-gemini-api-key')?.trim() || apiKey;
      if (!key) return json(503, 'Chưa cấu hình Gemini API Key. Anh/chị mở Cài đặt AI để nhập key.');
      if (!/^AIza[0-9A-Za-z_-]{35,}$/.test(key)) return json(400, 'Gemini API Key không đúng định dạng.');
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > 256000) return json(413, 'Nội dung quá dài. Vui lòng rút gọn lịch sử trò chuyện.');
      let body;
      try { body = JSON.parse(raw); } catch { return json(400, 'Nội dung yêu cầu không hợp lệ.'); }
      const textParts = parts => Array.isArray(parts) && parts.length > 0 && parts.every(p => p && typeof p.text === 'string');
      if (!Array.isArray(body?.contents) || !body.contents.length || body.contents.length > 20 ||
          body.contents.some(c => !c || !['user', 'model'].includes(c.role) || !textParts(c.parts)) ||
          (body.systemInstruction && !textParts(body.systemInstruction.parts))) return json(400, 'Nội dung yêu cầu không hợp lệ.');
      const payload = {
        contents: body.contents.map(c => ({ role: c.role, parts: c.parts.map(p => ({ text: p.text })) })),
        ...(body.systemInstruction ? { systemInstruction: { parts: body.systemInstruction.parts.map(p => ({ text: p.text })) } } : {}),
        generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: COPILOT_MAX_OUTPUT_TOKENS },
      };
      const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:${action}${action === 'streamGenerateContent' ? '?alt=sse' : ''}`;
      const res = await fetchImpl(googleUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        await res.body?.cancel();
        if (res.status === 429) return json(429, 'Gemini đang giới hạn lượt gọi hoặc hết hạn mức. Vui lòng thử lại sau.');
        if ([400, 401, 403].includes(res.status)) return json(400, 'Gemini chưa chấp nhận yêu cầu. Kiểm tra API key, quyền truy cập model và hạn mức trong Google AI Studio.');
        return json(502, 'Chưa nhận được trả lời từ Gemini. Vui lòng thử lại sau.');
      }
      return new Response(res.body, { headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' } });
    } catch {
      return json(502, 'Không kết nối được trợ lý AI. Vui lòng thử lại.');
    }
  };
}
