// =====================================================================
// PHASE 7 — AI ACTION GUARD: AI mặc định READ-ONLY.
// Mọi hành động ghi phải đi qua permission layer của app (useStore/api),
// AI không bao giờ gọi raw SQL hay tự duyệt/xoá.
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
