/**
 * Service to handle Google Gemini API integration via REST
 * v2.1 — gemini-2.0-flash (default), multi-model selection, streaming, retry
 */

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: 'Khuyên dùng ⭐',
    desc: 'Thông minh vượt trội, suy luận sắc bén, phản hồi tức thì'
  },
  {
    id: 'gemini-2.0-flash-thinking-exp-01-21',
    name: 'Gemini 2.0 Flash Thinking',
    tag: 'Tư duy sâu 🧠',
    desc: 'Có khả năng suy nghĩ từng bước, giải quyết bài toán phức tạp'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    tag: 'Siêu tốc độ ⚡',
    desc: 'Bản rút gọn, siêu nhẹ, tiết kiệm tối đa quota'
  }
];

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export function getActiveGeminiModel() {
  try {
    const saved = localStorage.getItem('gemini_model');
    if (saved && AVAILABLE_MODELS.some(m => m.id === saved)) return saved;
  } catch {}
  return DEFAULT_GEMINI_MODEL;
}

function _getBaseUrl(modelName) {
  const model = modelName || getActiveGeminiModel();
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
}

/**
 * Gọi Gemini API (single-turn), tương thích ngược với code cũ.
 */
export async function generateGeminiContent(prompt, systemInstruction = '', apiKey, modelName) {
  if (!apiKey) {
    throw new Error('Gemini API Key chưa được cấu hình. Vui lòng thêm key trong Cài đặt AI.');
  }
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];
  return _callGeminiWithRetry(contents, systemInstruction, apiKey, 0, modelName);
}

/**
 * Gọi Gemini API với multi-turn conversation (contents[] array chuẩn Gemini).
 * @param {Array<{role: 'user'|'model', parts: Array<{text: string}>}>} contents
 */
export async function generateGeminiMultiTurn(contents, systemInstruction = '', apiKey, modelName) {
  if (!apiKey) {
    throw new Error('Gemini API Key chưa được cấu hình. Vui lòng thêm key trong Cài đặt AI.');
  }
  return _callGeminiWithRetry(contents, systemInstruction, apiKey, 0, modelName);
}

/**
 * Streaming multi-turn: gọi onChunk(textDelta) mỗi lần nhận được text chunk.
 * Trả về full text khi hoàn thành.
 */
export async function streamGeminiMultiTurn(contents, systemInstruction = '', apiKey, onChunk, modelName) {
  if (!apiKey) {
    throw new Error('Gemini API Key chưa được cấu hình. Vui lòng thêm key trong Cài đặt AI.');
  }

  const payload = _buildPayload(contents, systemInstruction);
  const url = `${_getBaseUrl(modelName)}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API lỗi ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: mỗi event bắt đầu bằng "data: "
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // giữ lại dòng chưa hoàn chỉnh

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const chunk = JSON.parse(jsonStr);
        const delta = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (delta) {
          fullText += delta;
          onChunk?.(delta);
        }
      } catch {
        // ignore parse errors on partial chunks
      }
    }
  }

  return fullText || 'Không nhận được phản hồi từ Gemini.';
}

/**
 * Validate Gemini API key format (kiểm tra format, không gọi API).
 */
export function isValidGeminiKey(key) {
  return typeof key === 'string' && /^AIza[0-9A-Za-z_-]{35,}$/.test(key.trim());
}

// ===================== INTERNAL HELPERS =====================

function _buildPayload(contents, systemInstruction) {
  const payload = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
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

async function _callGeminiWithRetry(contents, systemInstruction, apiKey, attempt = 0, modelName) {
  const payload = _buildPayload(contents, systemInstruction);
  const url = `${_getBaseUrl(modelName)}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // Retry 1 lần nếu rate limit hoặc server error
  if ((response.status === 429 || response.status >= 500) && attempt === 0) {
    await new Promise(r => setTimeout(r, 1500));
    return _callGeminiWithRetry(contents, systemInstruction, apiKey, 1, modelName);
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || `Lỗi kết nối Gemini API (${response.status})`;
    throw new Error(errorMsg);
  }

  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].content.parts[0].text;
  }

  return 'Không nhận được phản hồi từ Gemini.';
}
