# Tú mini — đếm nhân viên theo tên

Nguyên nhân: câu “vn0485 có bao nhiêu đức” không chứa từ khóa nhân sự mà bộ dựng ngữ cảnh nhận diện, nên mô hình không nhận danh sách nhân viên và trả thiếu dữ liệu.

Sửa bằng bộ xử lý dữ liệu cục bộ trước khi gọi mô hình:
- Nhận mã cửa hàng và yêu cầu số lượng theo tên, có/không dấu.
- Kiểm tra quyền trợ lý hiện có: quản lý trong cửa hàng được gán, Admin/OFC theo phạm vi. Nhân viên vẫn chỉ có phạm vi cá nhân trong trợ lý; giải thích quyền rõ ràng, không mở rộng quyền.
- Tải lại danh sách nhân viên qua API hiện có cho đúng mã cửa hàng được hỏi, không dùng nhầm cửa hàng đang chọn trên UI.
- Đếm nhân viên còn hoạt động, khử trùng mã nhân viên, khớp phần cuối tên theo từ, bỏ ghi chú trong ngoặc. Không fuzzy match và không tính “Nguyễn Đức Anh” vào tên gọi “Đức”.
- Trả số lượng cùng danh sách tên (tối đa 20 tên). Không gửi danh sách lên mô hình AI để đếm.
- Lỗi tải/quyền thiếu khác với kết quả 0. Nếu chạm ngưỡng 1.000 bản ghi, chưa kết luận chính xác.
- Nhật ký câu trả lời dùng cửa hàng đã hỏi, tránh gán dữ liệu VN0485 sang cửa hàng khác đang chọn.

45 kiểm tra router/quyền/drawer đạt, gồm câu gốc chạy qua giao diện chat và không gọi Gemini. Số lượng trong test là dữ liệu giả, chưa truy vấn số người tên Đức thật tại VN0485.

Đang chờ xác định phạm vi deploy vì workspace có thay đổi đồng thời tại đăng nhập, phiên đăng nhập và giao diện trang chủ. Không ghi đè hoặc tự xuất bản các thay đổi chưa xác định này.
