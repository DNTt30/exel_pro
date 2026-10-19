export function scheduleWriteError(error) {
  const raw = String(error.message || '');
  if (raw.includes('REGISTRATION_CLOSED')) return Object.assign(new Error('Hạn đăng ký đã đóng. Vui lòng liên hệ quản lý để gia hạn rồi tải lại lịch.'), { code: 'REGISTRATION_CLOSED' });
  if (raw.includes('SCHEDULE_RULES')) {
    const result = new Error('Lịch vượt giới hạn giờ, ngày làm, số đêm liên tiếp hoặc thiếu thời gian nghỉ.');
    result.code = 'SCHEDULE_RULES';
    try { result.violations = JSON.parse(error.details || '[]'); } catch { result.violations = []; }
    if (!Array.isArray(result.violations)) result.violations = [];
    return result;
  }
  if (raw.includes('SCHEDULE_OVERLAP')) return Object.assign(new Error('Nhân viên bị xếp các ca trùng giờ. Hãy sửa ca trước khi lưu.'), { code: 'SCHEDULE_OVERLAP' });
  if (raw.includes('WEEK_LOCKED')) return Object.assign(new Error('Lịch đang khóa. Cần trả lại tuần để chỉnh sửa trước khi lưu.'), { code: 'WEEK_LOCKED' });
  if (raw.includes('OVERRIDE_NOT_ALLOWED')) return Object.assign(new Error('Chỉ Admin được ghi đè với lý do từ 10–500 ký tự.'), { code: 'PERMISSION_DENIED' });
  if (error.code === '40001' || /40001|CONFLICT/i.test(raw)) return Object.assign(new Error('Lịch đã được người khác sửa. Hãy tải lại tuần.'), { code: 'CONFLICT' });
  if (/INVALID_SHIFT|INVALID_DAY|INVALID_WEEK/.test(raw)) return Object.assign(new Error('Ngày hoặc mã ca không hợp lệ. Kiểm tra lại dữ liệu nhập.'), { code: 'VALIDATION_ERROR' });
  return Object.assign(new Error(raw || 'Không lưu được lịch.'), { code: 'DATABASE_ERROR' });
}
