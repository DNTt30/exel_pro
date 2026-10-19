# Quy tắc xếp lịch

Cập nhật: 18/10/2026.
Trạng thái: Quyết định hiện hành; mức hoàn thành phải đối chiếu kiểm thử và phát hành.
Nguồn: Yêu cầu chỉ xếp ca NV đăng ký và các trả lời xác nhận của người dùng về giới hạn đêm, giờ nghỉ, quyền ghi đè.

- Gợi ý xếp lịch chỉ sử dụng những ca/khung giờ nhân viên đã đăng ký. Không tự xếp người OFF hoặc chưa đăng ký vào ca.
- Tính độ phủ theo khoảng thời gian thực, không chỉ đếm mã ca. Cần báo cả thiếu và dư người để quản lý điều chỉnh; phần định biên tăng cường phải có giải thích.
- Nghỉ giữa ca: 12 giờ. Tối đa 3 đêm liên tiếp. Đây là cấu hình vận hành đã được người dùng chọn, không phải kết luận rằng app kiểm tra đầy đủ mọi quy định pháp luật.
- Kiểm tra lịch sửa tay và lịch đề xuất phải dùng cùng bộ quy tắc; quyền và ràng buộc lưu cần được bảo vệ phía server.
- Với vượt giờ, thiếu giờ nghỉ và vượt giới hạn đêm: chặn theo quy tắc; Admin được ghi đè trong phạm vi cho phép, bắt buộc lý do và nhật ký. Không suy rộng ngoại lệ này sang mọi lỗi hoặc mọi quyền.
- Người có thể chi viện được đưa ra để quản lý quyết định, không tự kéo người OFF từ cửa hàng khác.
- Dữ liệu lịch, phân biệt chưa xếp/OFF, cửa hàng gốc và `covering_store` phải giữ theo [AGENTS.md](../AGENTS.md). Định mức giờ dùng các hằng số và hàm chung hiện có.

## Quyết định đã thay thế

- **Đã cũ:** mức nghỉ 11 giờ. Người dùng đã chọn nâng lên **12 giờ**; không tái sử dụng 11 giờ khi viết code hoặc test mới.
- **Đã cũ:** tự động lấy người rảnh/OFF để lấp thiếu. Yêu cầu sau đó giới hạn gợi ý vào ca đã đăng ký; chi viện cần quản lý quyết định.

Kết quả đã kiểm chứng: [ket-qua-kiem-tra.md](ket-qua-kiem-tra.md). Công việc còn dở: [dang-lam.md](../dang-lam.md).
