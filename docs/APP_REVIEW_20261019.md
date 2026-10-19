# Rà soát trạng thái ứng dụng — 19/10/2026

## Bằng chứng tại thời điểm rà soát

- Full frontend suite: **975 passed, 7 skipped**, 89 file passed / 2 skipped. Các test bỏ qua thuộc `rlsSecurity.test.js` và `securityRegression.test.js`, phụ thuộc môi trường tích hợp. Không suy ra production không có lỗi từ các test local.
- Frontend public khớp 15 file build; báo cáo `artifacts/release/frontend-verified-20261019T115856Z.json`.
- Chạy read-only `release_operational_database.py --handbook-catalog`: các kiểm tra cấu trúc chính đều true; **98 nguồn nhập, 0 bản nhập chờ duyệt, 114 tài liệu đang công bố**. Không còn đúng khi dùng ghi chú cũ “98 bản đang chờ duyệt” để mô tả hiện tại. Đây là số lượng, chưa xác nhận nội dung/định lượng của từng bản.
- Không đăng nhập thay người dùng, không sửa lịch/công/nội dung production, không thử tải vào Google trong lượt rà soát.

## Điểm cần xử lý

### P1 — Trợ lý có thể chờ vô hạn khi stream bị treo

`frontend/src/services/geminiService.js:56` gửi fetch không có signal/timeout; vòng `reader.read()` tại dòng 81 không có giới hạn thời gian chờ chunk. Timeout server tại `supabase/functions/chat-proxy/handler.js:19` chỉ bảo vệ đến lúc nhận headers. AbortController của Drawer hiện chủ yếu ngăn cập nhật UI, không truyền xuống fetch Gemini. Nếu provider/network đã trả headers rồi treo giữa luồng, nút gửi có thể tiếp tục bị khóa và đóng/mở không bảo đảm hủy tác vụ bên dưới.

Hướng sửa: truyền signal xuyên Drawer → engine → service; đặt timeout chờ chunk và thời gian tổng; cancel reader/fetch, mở khóa và giữ phần trả lời đã có kèm trạng thái lỗi. Đây là lỗ hổng xử lý lỗi xác nhận qua code, chưa tái hiện trên mạng production.

### P1 — Cache PWA không cập nhật HTML dự phòng theo bản mới

`frontend/public/sw.js:49` trả HTML từ mạng nhưng không ghi lại HTML mới vào cache. Cache name cố định; nếu sw.js không đổi qua lần deploy, HTML precache có thể còn từ bản cũ. Khi mất mạng, có thể dùng HTML cũ trỏ đến JS chưa có trong cache. Ngoài ra biểu thức `caches.match('./index.html') || caches.match(req)` dùng Promise làm điều kiện: nhánh thứ hai không chạy khi lookup đầu trả undefined.

Hướng sửa: await lookup, cập nhật cache HTML chỉ với response hợp lệ, kiểm tra nâng phiên bản và fallback offline. Chưa khẳng định đây là nguyên nhân của một sự cố cụ thể người dùng đang gặp.

### P2 — Phạm vi thống kê câu hỏi nhiều cửa hàng chưa thống nhất

`frontend/src/services/api/logs.js:21` (`getCopilotActivity`) lọc exact string `store_id`; `getCopilotUsage` đầu file dùng danh sách mã và thêm chuỗi ghép. Với A,B, một API chỉ khớp A,B còn API kia khớp A, B và A,B. Cả hai chưa bao quát thứ tự B,A hoặc mọi tổ hợp; bản ghi ALL không được phân bổ cho từng cửa hàng. UI Dashboard thường chọn một cửa hàng hoặc ALL nên không khẳng định mọi lần xem Dashboard đều sai, nhưng chưa nên diễn giải các số thành toàn bộ hoạt động có liên quan đến cửa hàng.

Hướng sửa: thống nhất định nghĩa phạm vi và helper truy vấn, sau đó chuẩn hóa liên kết bản ghi–cửa hàng; giữ RLS kiểm tra đầy đủ phạm vi, không OR nới quyền. Tổng số bản ghi và mẫu 200 lượt vẫn phải phân biệt.

### P1/P2 — Phát hành và CI chưa bao phủ đầy đủ bản nguồn hiện tại

Git còn nhiều mục sửa/chưa theo dõi; commit gần nhất hiện là `7666f8e9`, trong khi gh-pages đã nhận nhiều bản build mới. Chưa có commit/tag nguồn tương ứng thì khó tái tạo, rollback hoặc xác định chính xác code đã kiểm tra trên CI.

CI PostgreSQL tại `.github/workflows/ci.yml:43` mới gọi `test_operational_hardening.py`; các kiểm thử mới cho publication/catalog, practical workflows và rate limit chưa được nối vào job này. Riêng `test_copilot_rate_limit.py` đang dùng đường dẫn psql Windows cố định nên cần nhận cấu hình môi trường trước khi đưa lên CI Linux.

Hướng sửa: kiểm tra và chốt thay đổi thành các commit có phạm vi rõ, thêm tag phát hành; nối các kiểm thử database mới vào CI dùng database tạm. Không tự gom/commit toàn bộ working tree trong lượt review.

## Cần kiểm chứng vận hành, không gọi là lỗi đã xác nhận

- Luồng tài khoản thật Admin/SM/NV: đăng nhập, đổi/reset mật khẩu, sửa/lưu lịch và công, cùng một tài khoản trên hai thiết bị.
- Với 114 tài liệu đã công bố: TÚ mini đọc đúng phiên bản/phạm vi; upload ảnh; sửa/gỡ tài liệu theo duyệt. Số lượng tài liệu không chứng minh nội dung chính xác.
- Giới hạn spam hiện dành cho TÚ mini; không coi là kiểm chứng chống double-submit cho mọi form khác trong app hoặc đảm bảo quota tổng Google.

Ưu tiên: sửa timeout/hủy tác vụ và cache PWA; đồng thời chốt nguồn phát hành; sau đó thống nhất thống kê và hoàn thiện CI. Chưa cần thêm tính năng mới để xử lý các điểm này.
