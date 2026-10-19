# AI xếp lịch theo đăng ký — 14/10/2026

> Đây là ghi nhận bản phát hành đầu ngày. Quy tắc mới 12 giờ nghỉ, tối đa 3 đêm liên tiếp, báo dư, xoay vòng ưu tiên và migration bổ sung được mô tả tại [SCHEDULER_POLICY_20261014.md](SCHEDULER_POLICY_20261014.md).

## Quy tắc đã chốt với người dùng

AI chỉ chọn đúng ca nhân viên đã đăng ký. Không tự thêm ca cho ngày trống, đổi ngày OFF thành ngày làm, tự xếp SM giờ hành chính hoặc ép full-time đủ 48 giờ. Nếu thiếu người hợp lệ, báo quản lý ngày, khung giờ, số người cần/có/thiếu.

- Ca đã chốt, ca chi viện và lịch khóa giữ nguyên. Chỉ đăng ký chưa chốt mới tham gia lựa chọn; đăng ký không được chọn vẫn giữ nguyên trên lịch.
- Ưu tiên phủ khung giờ thiếu người trước, vẫn kiểm tra giới hạn tuần, maxH và nghỉ giữa ca, kể cả ranh giới hai tuần.
- Chỉ đạo bằng ghi chú không vượt đăng ký. Night Ready được ưu tiên trong người có đăng ký; không tự kéo người OFF từ cửa hàng khác vào.
- Tính độ phủ theo khoảng thời gian: hai ca 6–10 và 10–14 có thể phủ ca 6–14; chỉ có ca 6–10 thì báo thiếu 10–14. Nhu cầu tăng cường chồng giờ được cộng vào định biên.
- Ước tính doanh số không tự xóa định biên tối thiểu cửa hàng. Ghi chú quản lý có thể điều chỉnh nhu cầu và được thể hiện trong mục xem nhu cầu từng ngày.
- Thuật toán chọn tham lam có giới hạn, không cam kết tìm nghiệm tối ưu toàn cục. Mọi phần còn thiếu vẫn được báo để quản lý xem xét.

## Giao diện

Mặc định chỉ hiện cửa hàng, số đăng ký và nút Xếp lịch. Kết quả nhóm theo ngày, hiển thị ca và số người thiếu. Lý do, cảnh báo người cứng ca đêm, lịch đề xuất và cấu hình doanh số/ghi chú mở khi cần. Không còn công tắc bỏ qua đăng ký/OFF và khối đọc ảnh doanh số trên modal này.

Kết quả là bản xem trước; chỉ bấm Áp dụng mới lưu. Lịch nguồn thay đổi sẽ làm mất hiệu lực bản xem trước. Không có ca mới thì không cho bấm Áp dụng. Lỗi lưu giữ bản xem trước để thử lại.

## Xác minh

- Toàn bộ frontend: **843 passed, 7 skipped**. Có 23 kiểm thử mới cho đăng ký, phân bổ, giờ nghỉ, ca ngắn, ca chốt/chi viện và thiếu người.
- Đã chỉnh các fixture cũ dùng chuỗi ca đã chốt làm “đăng ký” sang đúng shape đăng ký thực tế.
- Browser fixture desktop 1440×1000 và mobile 390×844: chọn đúng ca, báo khung giờ thiếu, giữ OFF/trống, không ghi khi xem trước, lưu lỗi/thử lại, vô hiệu bản xem trước cũ và không có đăng ký đều đạt.
- Lint không lỗi; 14 cảnh báo có sẵn ở phần khác. Không cần migration database.
- Kiểm thử không ghi dữ liệu thật và không gửi thông báo Telegram/email. Cảnh báo thiếu người hiển thị trong app cho quản lý.
- Đã build và phát hành frontend. Trang công khai trả HTTP 200 và HTML khớp bản build `index-B99IdaiL.js`; còn cảnh báo kích thước bundle lớn có sẵn.
