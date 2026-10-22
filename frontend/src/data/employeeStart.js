export const EMPLOYEE_START_STEPS = [
  { id: 'profile', label: 'Kiểm tra hồ sơ và cửa hàng', path: '/employee/profile', hint: 'Kiểm tra tên, mã nhân viên và cửa hàng gốc. Nếu sai, gửi yêu cầu hỗ trợ; không đổi cửa hàng để đi chi viện.' },
  { id: 'schedule', label: 'Xem lịch cả cửa hàng', path: '/employee/schedule', hint: 'Mở Lịch ca → Toàn cửa hàng, chọn ngày để xem đồng nghiệp và ca tiếp theo. Kiểm tra trạng thái duyệt của tuần.' },
  { id: 'registration', label: 'Đăng ký ca tuần sau', path: '/employee/schedule?view=mine', hint: 'Chọn đúng tuần → chọn những ca có thể làm → lưu và kiểm tra thông báo thành công. Đăng ký chỉ là nguyện vọng, chưa phải lịch chính thức.' },
  { id: 'timesheet', label: 'Kiểm tra công và báo chênh lệch', path: '/employee/timesheet', hint: 'Chọn chu kỳ công, đối chiếu công thực tế. Báo thiếu/sai công ở Bù công C&B. Chỉ xác nhận khi đã kiểm tra.' },
  { id: 'handbook', label: 'Tìm hướng dẫn trong Sổ tay', path: '/employee/handbook', hint: 'Tìm tài liệu theo công việc: pha chế, ca mở/đóng, vệ sinh, an toàn. Kiểm tra phiên bản và phạm vi cửa hàng trên tài liệu đã duyệt; hỏi quản lý nếu chưa có.' },
];
export const HELP_TOPICS = { schedule: 'Lịch ca / đăng ký', timesheet: 'Cách xem công', handbook: 'Sổ tay / công việc', profile: 'Hồ sơ / cửa hàng', other: 'Thắc mắc khác' };
export const HELP_STATUSES = { new: 'Mới gửi', in_progress: 'Đang xử lý', answered: 'Đã trả lời · chờ bạn xác nhận', resolved: 'Đã giải đáp' };
