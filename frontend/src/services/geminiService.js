/**
 * Service to handle Google Gemini API integration via REST
 * v3 — fixed model, handbook context, streaming, retry
 */

import { supabase, supabaseAnonKey } from '../lib/supabase';
import { DEFAULT_GEMINI_MODEL, COPILOT_MAX_OUTPUT_TOKENS } from '../../../supabase/functions/_shared/copilotConfig.js';
export { DEFAULT_GEMINI_MODEL };

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
  return _callGemini(contents, systemInstruction);
}

/**
 * Gọi Gemini API với multi-turn conversation
 */
export async function generateGeminiMultiTurn(contents, systemInstruction = '') {
  return _callGemini(contents, systemInstruction);
}

/**
 * Streaming multi-turn
 */
export async function streamGeminiMultiTurn(contents, systemInstruction = '', _legacyApiKey, onChunk) {
  const payload = _buildPayload(contents, systemInstruction);
  const url = _getBaseUrl('streamGenerateContent');

  const response = await fetch(url, {
    method: 'POST',
    headers: await requestHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `Gemini API lỗi ${response.status}`);
  }

  const reader = response.body.getReader();
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
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: mỗi event bắt đầu bằng "data: "
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // giữ lại dòng chưa hoàn chỉnh

    for (const line of lines) consume(line);
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);

  return fullText || 'Không nhận được phản hồi từ Gemini.';
}

/**
 * Validate Gemini API key format (kiểm tra format, không gọi API).
 */
export function isValidGeminiKey(key) {
  return typeof key === 'string' && (key.trim().length >= 35);
}

// ===================== INTERNAL HELPERS =====================

function _buildPayload(contents, systemInstruction) {
  const payload = {
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: COPILOT_MAX_OUTPUT_TOKENS,
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

async function _callGemini(contents, systemInstruction) {
  const payload = _buildPayload(contents, systemInstruction);
  const url = _getBaseUrl('generateContent');

  const response = await fetch(url, {
    method: 'POST',
    headers: await requestHeaders(),
    body: JSON.stringify(payload)
  });

  // The proxy owns the bounded retry budget for all callers.
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || data.error || `Lỗi kết nối Gemini API (${response.status})`;
    throw new Error(errorMsg);
  }

  if (data.candidates && data.candidates.length > 0) {
    return (data.candidates[0].content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('') || 'Không nhận được phản hồi từ Gemini.';
  }

  return 'Không nhận được phản hồi từ Gemini.';
}
