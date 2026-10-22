# Trang chủ nhân viên

Trang chủ `/employee/home` ưu tiên tuần này/tuần sau, bốn chỉ số, tiến độ giờ, nút đăng ký và xem toàn cửa hàng. Trang quản trị giữ nguyên vai trò quản lý.

- Giờ/ngày **đăng ký chờ xếp**: chỉ ca có registered và chưa confirmed; không coi lịch đã được quản lý nhập là bằng chứng nhân viên từng đăng ký.
- Giờ/ngày **đã xếp**: ca confirmed (kể cả chuỗi lịch cũ), có thể vẫn thuộc tuần nháp chưa được duyệt.
- Ngày còn trống: chưa có mã ca; OFF được đếm riêng. Ngày có ca tách đoạn vẫn tính một ngày.
- Thanh tiến độ theo giờ đã xếp; định mức lấy SCHEDULE_RULES. Đây không phải số giờ công thực tế ezHR.
- Ca gần nhất xét đầy đủ ngày/giờ trong tuần đang xem, bao gồm ca đêm đang diễn ra, không quay về đầu tuần đã qua, không lấy đăng ký làm ca đã xếp.
- Đăng ký tuần sau mở lịch cá nhân; xem lịch cửa hàng giữ tuần đang xem. Quyền sửa và hạn đăng ký vẫn do luồng lịch hiện có kiểm tra.
- Nhắc đổi ca, cảnh báo hạn dùng kệ, xác nhận công dùng dữ liệu/luồng hiện có. Thẻ xác nhận công đã confirmed được ẩn khỏi trang chủ. Cảnh báo hạn đăng ký chỉ hiển thị khi đã tải được hạn từ server.
- Khi tải lịch thất bại, không hiện số 0 giả; có trạng thái lỗi và nút thử lại.

Preview cô lập: `npm run dev:agent` rồi mở `/?preview=home`; lỗi tải mẫu `/?preview=home&failSchedule=1`. Không kết nối Supabase, không chứa trong build public.

Kiểm tra: 1.030 Vitest đạt, 7 bỏ qua. Playwright 17/18 đạt lượt đầu; 1 ca lỗi tải desktop bị timeout ở màn hình tải ứng dụng và đã đạt khi chạy lại riêng. Build và deploy trang chủ đã Published. Sau đó phát hiện thay đổi đồng thời ở auth/home trong workspace; không ghi đè những thay đổi này.
