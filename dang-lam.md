# Đang làm

Cập nhật: 19/10/2026. Đây là các việc còn dở, không phải danh sách tính năng đã phát hành.

Đã phát hành chống double-click/spam TÚ mini (database + Edge + frontend): khóa gửi tức thì, cách 3 giây, server tối đa 10 yêu cầu Gemini/60 giây/tài khoản. 125 test liên quan và kiểm thử PostgreSQL đồng thời đạt; 15 file public đã đối chiếu. Khi vận hành theo dõi mức giới hạn này có phù hợp nhu cầu, chưa thử spam bằng tài khoản production thật.

Bản sửa thống kê TÚ mini thiếu căn cứ đã phát hành và đối chiếu 15 file công khai; 117 kiểm thử đạt. Chỉ trả số lượt từ lịch sử đã lưu, theo quyền và giới hạn mẫu. Không còn bước deploy cho bản sửa này; khi vận hành cần đối chiếu tổng lượt bằng tài khoản thật (kiểm thử hiện dùng dữ liệu giả lập).

- [ ] Kiểm chứng bằng đăng nhập thật: nhân viên tra công thức, TÚ mini trả lời theo bản mới, upload/hiển thị ảnh, sửa/gỡ qua duyệt. Read-only production ngày 19/10 xác nhận **0 bản nhập chờ duyệt, 114 tài liệu công bố**; ghi chú cũ chờ Admin duyệt 98 bản đã lỗi thời. Chưa đối chiếu nội dung/định lượng từng tài liệu hoặc xác nhận E2E Storage/Gemini thật.
- [ ] Theo kết quả review 19/10: thêm hủy/timeout đầy đủ cho stream TÚ mini; sửa cache HTML/fallback offline PWA; thống nhất phạm vi thống kê nhiều cửa hàng; chốt commit nguồn và bổ sung kiểm thử DB mới vào CI. Chi tiết: [docs/APP_REVIEW_20261019.md](docs/APP_REVIEW_20261019.md). Đây là phát hiện chưa sửa, không nhầm với các bản đã deploy ở trên.
- [ ] Theo dõi lần vận hành đầu trên desktop/mobile cho hạn đăng ký chung, xuất Excel và trạng thái đọc thông báo. PostgreSQL và 8 kiểm thử frontend bổ sung đã đạt; chưa thao tác thay đổi lịch/công trên production để thử.

Đã phát hành database và frontend ngày 19/10; hướng dẫn sử dụng và bằng chứng tại [docs/RELEASE_20261019.md](docs/RELEASE_20261019.md).

Cũng đã phát hành nút duyệt toàn bộ, trang Sổ tay rộng hơn và giao diện Cài đặt đơn vị/Vai trò cải tiến. Không còn bước triển khai cho các thay đổi giao diện này; việc vận hành cần xác minh tiếp vẫn ở danh sách trên.

Đã sửa và phát hành lỗi TÚ mini không biết ngày hiện tại: trả lời thời gian cơ bản trực tiếp và thêm mốc giờ Việt Nam vào prompt. 79 kiểm thử đạt và bản công khai đã đối chiếu thành công; chi tiết tại ghi chú kết quả.

Kết quả kiểm tra và việc đã hoàn thành: [ghi-chu/ket-qua-kiem-tra.md](ghi-chu/ket-qua-kiem-tra.md).
