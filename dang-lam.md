# Đang làm

Cập nhật: 21/10/2026. Đây là các việc còn dở, không phải danh sách tính năng đã phát hành.

- [ ] Admin kiểm tra đề nghị **Pha cốt cà phê** trong Sổ tay → Chờ duyệt: 20g → 20ml lượt 1 + 45ml lượt 2, nguồn là ví dụ người dùng. Chưa duyệt thì không đưa vào bộ chọn mẫu đã công bố; vẫn tính được trong Tùy chỉnh. Milo/Nestea đọc bản Sổ tay hiện có. Hướng dẫn [RECIPE_CATALOG.md](docs/RECIPE_CATALOG.md).

- [ ] VN0500 tuần 26/10: nháp revision 1 đã lưu nhưng chưa có đăng ký ca nên 0 ca mới/thiếu 21 khung ca. Cần nhân viên đăng ký và quản lý xem/tạo lại nháp. Frontend, migrations, bot Auth/API đã phát hành và kiểm chứng ngày 21/10 theo yêu cầu deploy; chi tiết [hướng dẫn](docs/AGENT_SCHEDULING.md). Chưa E2E giao diện quản lý bằng tài khoản người dùng thật.

Đã phát hành chống double-click/spam TÚ mini (database + Edge + frontend): khóa gửi tức thì, cách 3 giây, server tối đa 10 yêu cầu Gemini/60 giây/tài khoản. 125 test liên quan và kiểm thử PostgreSQL đồng thời đạt; 15 file public đã đối chiếu. Khi vận hành theo dõi mức giới hạn này có phù hợp nhu cầu, chưa thử spam bằng tài khoản production thật.

Bản sửa thống kê TÚ mini thiếu căn cứ đã phát hành và đối chiếu 15 file công khai; 117 kiểm thử đạt. Chỉ trả số lượt từ lịch sử đã lưu, theo quyền và giới hạn mẫu. Không còn bước deploy cho bản sửa này; khi vận hành cần đối chiếu tổng lượt bằng tài khoản thật (kiểm thử hiện dùng dữ liệu giả lập).

- [ ] Kiểm chứng bằng đăng nhập thật: nhân viên tra công thức, TÚ mini trả lời theo bản mới, upload/hiển thị ảnh, sửa/gỡ qua duyệt. Read-only production ngày 19/10 xác nhận **0 bản nhập chờ duyệt, 114 tài liệu công bố**; ghi chú cũ chờ Admin duyệt 98 bản đã lỗi thời. Chưa đối chiếu nội dung/định lượng từng tài liệu hoặc xác nhận E2E Storage/Gemini thật.
- [ ] Xác nhận GitHub Actions sau khi nguồn mới được đẩy lên remote. Các job đã bổ sung và lệnh tương ứng đạt trên máy này; không coi kết quả local là kết quả CI remote.
- [ ] Theo dõi lần vận hành đầu trên desktop/mobile cho hạn đăng ký chung, xuất Excel và trạng thái đọc thông báo. PostgreSQL và 8 kiểm thử frontend bổ sung đã đạt; chưa thao tác thay đổi lịch/công trên production để thử.

Đã phát hành database và frontend ngày 19/10; hướng dẫn sử dụng và bằng chứng tại [docs/RELEASE_20261019.md](docs/RELEASE_20261019.md).

Cũng đã phát hành nút duyệt toàn bộ, trang Sổ tay rộng hơn và giao diện Cài đặt đơn vị/Vai trò cải tiến. Không còn bước triển khai cho các thay đổi giao diện này; việc vận hành cần xác minh tiếp vẫn ở danh sách trên.

Đã sửa và phát hành lỗi TÚ mini không biết ngày hiện tại: trả lời thời gian cơ bản trực tiếp và thêm mốc giờ Việt Nam vào prompt. 79 kiểm thử đạt và bản công khai đã đối chiếu thành công; chi tiết tại ghi chú kết quả.

Kết quả kiểm tra và việc đã hoàn thành: [ghi-chu/ket-qua-kiem-tra.md](ghi-chu/ket-qua-kiem-tra.md).

Đã triển khai các sửa lỗi từ review: hủy/timeout TÚ mini, giữ phần trả lời dở, cache offline và thống kê cửa hàng dùng chung. Full suite 986 passed/7 skipped; kiểm thử PostgreSQL và desktop/mobile đạt. Bản nguồn dùng tag `release-20261019-stability`; thử nghiệm ML và file CLI tạm vẫn ở ngoài phạm vi bản phát hành.
