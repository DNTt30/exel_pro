# Gợi ý xếp lịch — cập nhật quy tắc và báo cáo 14/10/2026

## Các quyết định đã được xác nhận

- Nghỉ giữa ca thuộc hai ngày làm khác nhau: tối thiểu **12 giờ**, thay cho 11 giờ.
- Tối đa **3 đêm liên tiếp**, tính cả tuần liền trước và liền sau. Ca có thời gian trong 22–06 giờ được tính là ca đêm; ca tách đoạn chỉ tính một ngày.
- Vượt giờ, thiếu nghỉ, quá số đêm hoặc quá 6 ngày làm của FT: chặn. Admin có thể yêu cầu ngoại lệ với lý do 10–500 ký tự; database xác minh quyền và lưu vi phạm vào `server_audit_events`. Trùng giờ và tuần khóa không được ghi đè.
- Chỉ hiển thị báo cáo thiếu/dư trong app ở đợt này. Không bổ sung gửi Telegram/email hoặc gửi tin tự động khi chạy đề xuất.

## Cách sử dụng

1. Mở **Lịch ca → Gợi ý xếp lịch**, chọn cửa hàng và bấm **Xếp lịch**.
2. Xem số ca được chọn và các ngày còn thiếu. Dòng tăng cường cho biết phần nhu cầu do doanh số/lượt khách hoặc ghi chú. Nhu cầu là ước tính theo quy tắc, không phải dự báo ML đã huấn luyện.
3. Mở **Dư người** để xem khung giờ có số người cao hơn nhu cầu. Không tự xóa ca đã chốt.
4. Mở **Có thể trao đổi chi viện** nếu có ứng viên: chỉ người đã đăng ký, chưa được chốt, không khóa lịch và thuộc cửa hàng trong phạm vi quản lý. Đây chưa phải xác nhận cửa hàng gốc có thể cho mượn người. Quản lý cần trao đổi trước khi điều chuyển.
5. Bấm **Áp dụng** để lưu. Lưu lỗi giữ bản xem trước; thay đổi dữ liệu nguồn sẽ hủy hiệu lực đề xuất cũ.

Chỉ chọn đúng ca đã đăng ký; không thay OFF/trống, không tự thêm ca cho đủ giờ và không tự mượn người. Thông báo đổi lịch/duyệt lịch trong app đã có từ bản trước. Báo cáo thiếu người hiện nằm ngay trong kết quả, chưa có hộp thư riêng gửi báo cáo giữa các quản lý.

## Thuật toán và kiểm tra

- Độ phủ được tính theo từng khoảng giờ, cộng các nhu cầu chồng nhau. Ngoài giờ có định biên, ca đã chốt vẫn được tính để báo dư.
- Khi các tiêu chí bằng nhau, thứ tự nhân viên xoay theo tuần, ổn định khi chạy lại cùng dữ liệu; không luôn ưu ái mã nhỏ.
- Sau lượt chọn ban đầu, thử thay tối đa 32 lựa chọn. Chỉ giữ phương án giảm tổng số giờ-người còn thiếu và không tăng giờ-người dư. Không cam kết tối ưu toàn cục.
- `scheduleRuleViolations` dùng chung cho đề xuất và sửa tay/bulk. Kiểm tra sớm ở frontend dùng các tuần đã tải; database luôn kiểm tra lịch thực và tuần kề, khóa ghi theo nhân viên để tránh hai yêu cầu đồng thời vượt quy tắc.
- Migration mới: `supabase/migrations/20261014000001_schedule_rest_and_nights.sql`. Phải áp dụng trước khi phát hành frontend; giữ RLS, quyền Admin và trigger kiểm tra cuối giao dịch của migration cũ.

## Giới hạn cần tiếp tục xác nhận với nhân sự

Giới hạn 3 đêm là quy tắc vận hành đã chọn. Giữ một ngày không xếp ca không đồng nghĩa đã kiểm tra đầy đủ 24 giờ nghỉ liên tục. App chưa có bộ tính toàn bộ giới hạn làm thêm theo tháng/năm, thỏa thuận làm thêm hoặc ngoại lệ theo ngành. Việc Admin ghi lý do trong app không thay thế điều kiện pháp luật.

Tham chiếu để nhân sự đối chiếu Điều 106, 107, 110 và 111: [Bộ luật Lao động — văn bản hợp nhất 18/VBHN-VPQH năm 2026](https://congbao.chinhphu.vn/van-ban/van-ban-hop-nhat-so-18-vbhn-vpqh-468971/62878.htm). Chưa có xác nhận từ bộ phận nhân sự trong phiên này.

## Kiểm thử

- Unit: 12 giờ đúng ngưỡng; đêm thứ 3/4; nối cả hai đầu tuần; đăng ký không tính là đã làm; PT 16+8 giờ; ca ngắn không phủ phần còn lại; dư ngoài định biên; nguồn tăng cường; xoay tuần; cải thiện phương án; phạm vi chi viện; rollback và truyền lý do Admin.
- PostgreSQL riêng: chạy lại migration, quyền SM/Admin, ghi trực tiếp không bỏ qua kiểm tra, ngoại lệ có nhật ký, bulk rollback, cạnh tranh ở ranh giới tuần và thông báo riêng cho nhân viên.
- Browser fixture: desktop/mobile, thiếu/dư, bản xem trước, lỗi lưu/thử lại, dữ liệu cũ hết hiệu lực, hộp thoại lý do và thông báo duyệt lịch.

Lệnh: `npm run test`, `npm run lint`, `npm run build` trong `frontend/`; `scripts/test_operational_hardening.py` với PostgreSQL cục bộ. Các bài kiểm thử không gửi tin hoặc sửa lịch production.

Kết quả: **861 passed, 7 skipped**; lint không lỗi (14 cảnh báo có sẵn). Kiểm thử PostgreSQL trả `OPERATIONAL_HARDENING_OK`. Hai bộ kiểm tra browser cho gợi ý xếp lịch và ngoại lệ Admin/thông báo nhân viên đều qua trên desktop/mobile.

Migration riêng đã áp dụng lên production bằng `python scripts/release_operational_database.py --apply --schedule-policy-only`, sau khi sao lưu schema. Kiểm tra sau triển khai xác nhận `night_guard=true`, `rest_12h=true`; các quyền và hàm API hiện có còn đầy đủ. Frontend build thành công, `npm run deploy` trả `Published`. Bundle chính: `index-CBTBBq3B.js`. Còn cảnh báo kích thước bundle lớn có sẵn.

Trang công khai đã trả HTTP 200 và HTML khớp chính xác bản build: SHA-256 `2bbfc67083f94e93502ed0f7a98cc7c479bd7d636cdc459b99721a8103631090`.
