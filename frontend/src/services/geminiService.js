/**
 * Service to handle Google Gemini API integration via REST
 * v3 — fixed model, handbook context, streaming, retry
 */

import { supabase, supabaseAnonKey } from '../lib/supabase';
import { createCopilotRequest } from '../utils/copilotRequest';
import { DEFAULT_GEMINI_MODEL, copilotOutputBudget } from '../../../supabase/functions/_shared/copilotConfig.js';
export { DEFAULT_GEMINI_MODEL };

async function responseError(response) {
  const body = await response.json().catch(() => ({}));
  const message = body?.error?.message || body?.error;
  const error = new Error(typeof message === 'string' ? message : `Trợ lý AI tạm thời không phản hồi (${response.status}).`);
  error.status = response.status;
  error.code = body?.code;
  const retryAfter = Number(response.headers.get('Retry-After') || body?.retryAfter);
  if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = Math.min(60, retryAfter);
  return error;
}

function _getBaseUrl(action) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('Chưa cấu hình kết nối trợ lý AI.');
  return `${url}/functions/v1/chat-proxy?model=${DEFAULT_GEMINI_MODEL}&action=${action}`;
}

async function requestHeaders() {
  const session = await supabase?.auth.getSession();
  if (session?.error || !session?.data?.session?.access_token) throw new Error('Vui lòng đăng nhập lại để dùng trợ lý.');
  return { 'Content-Type': 'application/json', apikey: supabaseAnonKey,
    Authorization: `Bearer ${session.data.session.access_token}` };
}

/**
 * Ggọi Gemini API (single-turn)
 */
export async function generateGeminiContent(prompt, systemInstruction = '') {
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];
  return _callGemini(contents, systemInstruction, { copilotScope: { kind: 'instruction', storeIds: [], employeeIds: [] } });
}

/**
 * Gọi Gemini API với multi-turn conversation
 */
export async function generateGeminiMultiTurn(contents, systemInstruction = '', _legacyApiKey, options = {}) {
  return _callGemini(contents, systemInstruction, options);
}

/**
 * Streaming multi-turn
 */
export async function streamGeminiMultiTurn(contents, systemInstruction = '', _legacyApiKey, onChunk, options = {}) {
  const request = createCopilotRequest(options.signal);
  let reader;
  try {
    request.signal.throwIfAborted();
    const payload = _buildPayload(contents, systemInstruction, options);
    const url = _getBaseUrl('streamGenerateContent');

    const response = await request.wait(fetch(url, {
      method: 'POST',
      headers: await request.wait(requestHeaders()),
      signal: request.signal,
      body: JSON.stringify(payload)
    }));

    if (!response.ok) {
      throw await request.wait(responseError(response));
    }

    reader = response.body.getReader();
    request.heartbeat();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    const consume = line => {
      if (!line.startsWith('data:')) return;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') return;
      const chunk = JSON.parse(jsonStr);
      if (chunk.error) throw new Error('Gemini bị gián đoạn. Vui lòng thử lại.');
      const delta = (chunk.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
      if (delta) { fullText += delta; onChunk?.(delta); }
    };

    while (true) {
      const { done, value } = await request.wait(reader.read());
      if (done) break;
      request.heartbeat();
      buffer += decoder.decode(value, { stream: true });

      // SSE: mỗi event bắt đầu bằng "data: "
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // giữ lại dòng chưa hoàn chỉnh

      for (const line of lines) consume(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) consume(buffer);

    return fullText || 'Không nhận được phản hồi từ Gemini.';
  } finally {
    request.dispose();
    if (reader) { void reader.cancel().catch(() => {}); }
  }
}

/**
 * Validate Gemini API key format (kiểm tra format, không gọi API).
 */
export function isValidGeminiKey(key) {
  return typeof key === 'string' && (key.trim().length >= 35);
}

// ===================== INTERNAL HELPERS =====================

function _buildPayload(contents, systemInstruction, options = {}) {
  const payload = {
    contents,
    copilotScope: options?.copilotScope || { kind: 'handbook', storeIds: [], employeeIds: [] },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: copilotOutputBudget(options?.maxOutputTokens),
      topP: 0.9
    }
  };
  if (systemInstruction) {
    payload.systemInstruction = {
      role: 'user',
      parts: [{ text: systemInstruction }]
    };
  }
  return payload;
}

async function _callGemini(contents, systemInstruction, options) {
  const request = createCopilotRequest(options?.signal);
  try {
    request.signal.throwIfAborted();
    const payload = _buildPayload(contents, systemInstruction, options);
    const url = _getBaseUrl('generateContent');

    const response = await request.wait(fetch(url, {
      method: 'POST',
      headers: await request.wait(requestHeaders()),
      signal: request.signal,
      body: JSON.stringify(payload)
    }));

    // The proxy owns the bounded retry budget for all callers.
    if (!response.ok) {
      throw await request.wait(responseError(response));
    }
    const data = await request.wait(response.json());

    if (data.candidates && data.candidates.length > 0) {
      return (data.candidates[0].content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('') || 'Không nhận được phản hồi từ Gemini.';
    }

    return 'Không nhận được phản hồi từ Gemini.';
  } finally { request.dispose(); }
}
