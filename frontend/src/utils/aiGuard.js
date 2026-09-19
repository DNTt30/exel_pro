// =====================================================================
// AI SECURITY GUARDRAIL (MÀNG LỌC BẢO MẬT AI 4 LỚP)
// Bảo vệ dữ liệu nội bộ, ngăn rò rỉ secret, chống prompt injection
// và đảm bảo AI hoạt động an toàn 100% trong môi trường GS25.
// =====================================================================

export const AI_ALLOWED_ACTIONS = ['read', 'explain', 'summarize', 'search', 'recommend'];
export const AI_FORBIDDEN_ACTIONS = ['delete', 'approve', 'reject', 'update_schedule', 'update_employee', 'payroll'];

/** Ném lỗi nếu hành động AI yêu cầu vượt quyền đọc/gợi ý. */
export function assertAiActionAllowed(action) {
  if (!AI_ALLOWED_ACTIONS.includes(action)) {
    throw new Error('AI_ACTION_FORBIDDEN: ' + action + ' — AI chỉ được đọc/gợi ý, thao tác ghi phải do con người thực hiện.');
  }
  return true;
}

// ─── 1. MÀNG LỌC ĐẦU VÀO: CHỐNG PROMPT INJECTION & DÒ RỈ SECRET ─────────────

// Các mẫu câu cố tình bẻ khóa (Jailbreak / Prompt Injection)
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|directives|rules)/i,
  /quên\s+(hết\s+)?(mọi\s+)?(chỉ\s+dẫn|quy\s+định|quy\s+tắc|lệnh)\s+(trước|cũ)/i,
  /bỏ\s+qua\s+(hết\s+)?(mọi\s+)?(chỉ\s+dẫn|quy\s+định|quy\s+tắc|bảo\s+mật)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+prompt|instructions|initial\s+prompt)/i,
  /tiết\s+lộ\s+(system\s+prompt|lời\s+nhắc\s+hệ\s+thống|cấu\s+hình\s+gốc)/i,
  /(cho\s+tôi\s+biết|lấy|show|hack)\s+(mật\s+khẩu|password|admin\s+pass|api\s*key|secret|token)/i,
  /give\s+me\s+(the\s+)?(password|token|api\s*key|secret|credential)/i,
  /drop\s+table|delete\s+from|select\s+\*\s+from\s+auth/i
];

// Các mẫu Secret/Credential có thể vô tình bị dán vào
const SENSITIVE_TOKEN_PATTERNS = [
  /AIza[0-9A-Za-z_-]{35}/g,                                     // Google API Key
  /sk-[a-zA-Z0-9_-]{20,}/g,                                    // OpenAI / Generic Secret Key
  /ey[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.?[A-Za-z0-9-_.+/=]*/g, // JWT Tokens
  /ofc-[a-zA-Z0-9_-]+-1/g,                                      // Internal password formula
  /(?:password|mật khẩu|matkhau)\s*[:=]\s*['"]?[^'"]+['"]?/gi  // Password assignments
];

/**
 * Kiểm tra và làm sạch câu hỏi của người dùng trước khi gửi cho AI.
 * @param {string} text - Câu hỏi của người dùng
 * @returns {{ safe: boolean, text: string, reason?: string }}
 */
export function sanitizeAiInput(text) {
  if (!text || typeof text !== 'string') return { safe: true, text: '' };

  const trimmed = text.trim();

  // 1. Quét Prompt Injection / Jailbreak
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        text: trimmed,
        reason: '🛡️ Yêu cầu bị chặn: Hệ thống phát hiện câu lệnh vi phạm chính sách an toàn thông tin nội bộ.'
      };
    }
  }

  // 2. Tự động che giấu (Mask) các secret nếu người dùng vô tình dán vào
  let sanitized = trimmed;
  SENSITIVE_TOKEN_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[🔒 THÔNG TIN BẢO MẬT ĐÃ ĐƯỢC ẨN]');
  });

  return { safe: true, text: sanitized };
}

// ─── 2. TƯỜNG LỬA DỮ LIỆU: CÔ LẬP DỮ LIỆU TỐI THIỂU (DATA MINIMIZATION) ─────

const EMPLOYEE_ALLOWED_FIELDS = ['id', 'name', 'dept', 'role', 'type', 'jobTitle', 'maxH', 'experienceMonths', 'isNew'];

/**
 * Lọc sạch danh sách nhân viên trước khi đưa vào context AI:
 * Chỉ giữ lại các trường nghiệp vụ được phép, xóa bỏ 100% trường nhạy cảm.
 */
export function sanitizeEmployeesForAi(employees = []) {
  if (!Array.isArray(employees)) return [];
  return employees.map(emp => {
    const clean = {};
    EMPLOYEE_ALLOWED_FIELDS.forEach(field => {
      if (emp[field] !== undefined) clean[field] = emp[field];
    });
    return clean;
  });
}

// ─── 3. MÀNG LỌC ĐẦU RA: NGĂN CHẶN RÒ RỈ SECRET TỪ AI ───────────────────────

/**
 * Quét sạch văn bản do AI trả về trước khi hiển thị cho người dùng.
 * Đảm bảo AI không bao giờ vô tình leak key, password hay token.
 * @param {string} text - Câu trả lời từ AI
 * @returns {string} - Văn bản đã qua màng lọc an toàn
 */
export function sanitizeAiOutput(text) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // Lọc API Keys
  sanitized = sanitized.replace(/AIza[0-9A-Za-z_-]{35}/g, '[🔒 API_KEY_PROTECTED]');
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[🔒 SECRET_KEY_PROTECTED]');

  // Lọc JWT / Supabase Auth Tokens
  sanitized = sanitized.replace(/ey[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.?[A-Za-z0-9-_.+/=]*/g, '[🔒 SESSION_TOKEN_PROTECTED]');

  // Lọc mật khẩu mặc định / nội bộ
  sanitized = sanitized.replace(/ofc-[a-zA-Z0-9_-]+-1/g, '[🔒 MẬT KHẨU ĐÃ ĐƯỢC ẨN]');

  return sanitized;
}

