# Định hướng sản phẩm

Cập nhật: 19/10/2026.
Trạng thái: Quyết định đang áp dụng; không phải xác nhận toàn bộ đã triển khai.
Nguồn: Các yêu cầu và xác nhận của người dùng trong cuộc trao đổi dự án; bản thiết kế bộ nhớ được đồng ý ngày 18/10/2026.

- App phục vụ quản lý lịch, chấm công và vận hành cho nhiều đơn vị/chuỗi. Tên mặc định được đề xuất là “Lịch Ca”; Admin có quyền điều chỉnh nhận diện và cấu hình đơn vị.
- Vai trò có thể đặt tên tùy chỉnh, trước mắt chọn nhóm quyền có sẵn thay vì xây trình cấu hình từng quyền riêng.
- Giao diện cần rõ ràng, ít màu, dễ dùng trên điện thoại. Giữ những gì cần cho quản lý theo dõi và nhân viên thao tác; gom component có chức năng giống nhau để dễ bảo trì.
- Bổ sung 19/10: tận dụng chiều ngang trang, tránh khoảng trống lớn hai bên. Áp dụng cho Sổ tay Admin/nhân viên và Cài đặt đơn vị/Vai trò; giữ padding và không tràn ngang trên mobile. Người dùng yêu cầu tiếp tục tự rà để bố cục phù hợp: gom thông tin liên quan, giảm khối trống, hướng dẫn ngắn ngay tại chức năng và dễ thấy nút lưu.
- Ưu tiên chức năng có luồng sử dụng hoàn chỉnh, lưu dữ liệu đúng và kiểm tra quyền phía server. Không hiển thị thành công khi lưu lỗi hoặc dùng số liệu minh họa như kết quả thực tế.
- TÚ mini trả lời ngắn, đúng trọng tâm, lấy nguồn Sổ tay phù hợp phạm vi và quyền của tài khoản. Công thức/định lượng không được suy đoán.
- Sửa theo phản hồi 19/10 về thống kê bịa: không đoán “mọi người thường hỏi gì” từ khả năng của trợ lý. Thống kê phải đọc lịch sử đã lưu theo quyền, nêu khoảng thời gian và giới hạn mẫu; không lấy số nhân viên/đơn chờ xử lý thay cho số lượt hỏi. Không có hoặc không tải được dữ liệu phải nói rõ; câu trả lời AI cũ không phải bằng chứng.
- Bổ sung theo câu hỏi double-click/spam 19/10: TÚ mini phải khóa gửi ngay, tránh ghi nhận trùng do bấm dồn. Giới hạn server dùng chung theo tài khoản qua nhiều tab/thiết bị. Mức triển khai ban đầu do Codex chọn: cách 3 giây giữa các lượt và tối đa 10 yêu cầu Gemini trong 60 giây; đây là giới hạn ứng dụng, không phải quota Google hoặc số người dùng duy nhất.
- Sửa theo phản hồi 19/10: ngày/giờ hiện tại là ngữ cảnh ứng dụng theo `Asia/Ho_Chi_Minh`, không đòi Sổ tay cung cấp. Câu hỏi thời gian cơ bản trả trực tiếp để không tốn Gemini; câu hỏi nghiệp vụ/lịch vẫn theo nguồn và quyền tương ứng.
- Thông báo thiếu người: trước mắt chỉ trong app, theo lựa chọn của người dùng; không tự bật gửi Telegram/email cho chức năng này.
- Đợt dọn đã được đồng ý gồm: hạn đăng ký dùng chung, xuất Excel có phạm vi rõ, checklist tự kiểm tra, nguồn công thức thống nhất, thống kê câu hỏi thật và đồng bộ trạng thái đọc thông báo.

## Trạng thái cần nói đúng

- ML và Jev vẫn thuộc phạm vi thử nghiệm/local trong công việc hiện tại; chưa có bằng chứng để ghi nhận là đã vận hành production.
- Kết quả từ dữ liệu giả không chứng minh chất lượng dự báo ở cửa hàng thật. Chỉ ghi nhận kết quả thử nghiệm cùng nguồn dữ liệu và giới hạn.
- “Sao lưu tự động” phụ thuộc vào việc mở Dashboard không đáp ứng yêu cầu sao lưu nền. Hướng xử lý đã chọn là bỏ lời hứa tự động, giữ xuất Excel và ghi rõ dữ liệu được xuất.

Quy tắc kỹ thuật gốc: [AGENTS.md](../AGENTS.md) và [skill ngữ cảnh dự án](../.agents/skills/schedule-app-context/SKILL.md). Việc chưa xong: [dang-lam.md](../dang-lam.md).
