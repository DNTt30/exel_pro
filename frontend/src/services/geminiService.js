/**
 * Service to handle Google Gemini API integration via REST
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function generateGeminiContent(prompt, systemInstruction = '', apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please configure it in settings.');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      role: 'system',
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || 'Lỗi kết nối Gemini API';
    throw new Error(errorMsg);
  }

  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].content.parts[0].text;
  }

  return 'Không nhận được phản hồi từ Gemini.';
}
