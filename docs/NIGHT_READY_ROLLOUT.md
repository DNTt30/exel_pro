# Night Ready, chi viện và phân tích ca — 29/09/2026

## Hành vi

- Quản lý sửa nhân viên → checkbox **Cứng Ca Đêm (Night Ready)**. Lưu `NIGHT_READY` trong `employees.skills`; bỏ tick giữ nguyên các kỹ năng khác. Nhân viên có thẻ hiện huy hiệu mặt trăng cạnh tên.
- AI dành người đủ kỹ năng cho ca 22–6 trước khi lấp ca ngày. Ca đã có người chưa được chứng nhận vẫn được bổ sung người kèm dù vượt định biên tối thiểu. Nếu không có ứng viên hợp lệ, hiện cảnh báo đỏ theo từng ngày; quản lý cần xử lý trước khi chốt lịch.
- Ưu tiên người tại cửa hàng. Khi thiếu, chỉ mượn người đang OFF rõ ràng, có Night Ready, đang hoạt động và thuộc cửa hàng user quản lý. Không dùng ô trống như OFF; không thay `dept`. Ghi `{ shift: '22-6', covering_store: '<cửa hàng đích>' }`.
- Giữ nguyên các ngày khác của người hỗ trợ và các ca chi viện đi nơi khác. Kiểm tra tổng giờ, giới hạn số ca, nghỉ giữa ca kể cả ranh giới tuần, tuần khóa tại cửa hàng gốc/đích/chi viện. Cần tải thành công lịch hai tuần liền kề trước khi sinh đề xuất qua UI.
- Xem trước hiển thị người hỗ trợ, các ca dạng object và cảnh báo đỏ riêng. Chỉ nút **Áp dụng** mới ghi lịch; dùng bulk RPC atomic, kiểm tra version và rollback. Đề xuất bị hủy khi đầu vào thay đổi; kiểm tra lại snapshot trước khi lưu.
- Bảng **Kỹ năng & phân bổ ca** ở trang Lịch ca tải 8 tuần đã kết thúc, phân trang dữ liệu từ API và giới hạn nhân sự theo quyền quản lý. Tím = đêm, cam = ngày. Chỉ tính ca đã chốt (kể cả chi viện), không phải số liệu chấm công. Ca đúp đếm từng phần ca.
- Danh sách cần train: STFT/STPT chưa có Night Ready, hồ sơ ≥90 ngày, có ca đã chốt nhưng 0 ca đêm trong khoảng trên. Ngày tạo hồ sơ là mốc tham khảo, không khẳng định ngày vào làm. Thiếu lịch sử/ngày tạo không tự kết luận cần train. Hai ngưỡng nằm trong `SKILL_ANALYTICS_RULES`.

## Database và phát hành

Migration: `supabase/migrations/20260928000002_employee_skills.sql`.

Chạy sau migration Employee Profile và trước frontend mới. Thêm `text[] NOT NULL DEFAULT '{}'`; chỉ cấp SELECT cột `skills`, giữ nguyên quyền riêng tư của DOB/trường/ngành/dự định làm việc. Quyền sửa dùng RLS quản lý hiện có. Không tự chứng nhận bất kỳ nhân viên hiện hữu nào.

Không chạy lại bundle catch-up cũ sau các migration mới: bundle đó chưa bao gồm thay đổi privacy/profile/skills gần đây.

Đã triển khai ngày 29/09/2026:

- Supabase `plitfdjzuealjxbylwxy`: migration áp dụng thành công; `skills` là `text[]`, default rỗng; authenticated đọc được kỹ năng, anon không đọc được, authenticated vẫn không đọc trực tiếp DOB.
- Frontend: `npm run deploy` báo `Published`; URL thật trả HTTP 200 và bundle `/exel_pro/assets/index-D2021xR1.js` (kiểm tra với query release để bỏ cache CDN).
- Bộ kiểm tra tổng hợp: **679 passed, 7 skipped**; lint không lỗi/cảnh báo, build thành công, kiểm tra kiến trúc và guardrails đạt 100/100, fingerprint mã nguồn không đổi trong lượt kiểm tra cuối.
- PostgreSQL production-shape và 6 ảnh desktop/mobile đều qua. Chưa áp dụng đề xuất AI vào lịch nhân viên thật; thao tác đó do SM xem trước và bấm Áp dụng.

## Kiểm chứng

- `python scripts/test_employee_skills_db.py --production-shape`: PostgreSQL riêng tại localhost:55439; migration chạy lại được, SM đúng phạm vi, NV không tự chứng nhận, anon không đọc kỹ năng, hồ sơ riêng tư vẫn khóa. Đồng thời chạy regression transaction/RLS nền.
- `npm run test`, `npm run lint -- --deny-warnings`, `npm run build` trong `frontend/`.
- `node scripts/check_skills_ui.mjs`: Vite localhost:5179, Edge kiểm thử CDP:9227; desktop/mobile, checkbox/huy hiệu, lịch sử, cảnh báo đỏ và xem trước chi viện. Chặn/mock mọi yêu cầu ngoài localhost, không ghi dữ liệu thật. Ảnh ở `artifacts/skills-ui/` (không commit).

## Vận hành

SM cần đánh dấu đúng những người đã đủ kỹ năng ca đêm trước khi dùng AI. Thẻ rỗng không tương đương không có kinh nghiệm; hệ thống chỉ hiểu là chưa được xác nhận. Cảnh báo không tự biến mất chỉ vì người đó là FT/SM hoặc có thâm niên.
