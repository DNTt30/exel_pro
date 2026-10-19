# Kiểm soát lịch và nhật ký vận hành

## Phạm vi bản cập nhật

- Dọn script thử nghiệm không còn dùng, chặn `.env` và database local khỏi Git. App chạy từ `frontend/`; prototype `schedule-app/` giữ nguyên.
- PostgreSQL kiểm tra quyền, phạm vi cửa hàng, dữ liệu ca và giờ công. Frontend kiểm tra sớm bằng Zod để báo lỗi dễ hiểu.
- Trùng giờ (kể cả qua đêm, ca tách và ranh giới hai tuần) luôn bị chặn. Giữ mức tối đa STPT 23h/tuần, các loại còn lại 48h/tuần, hoặc `max_h` thấp hơn; nghỉ tối thiểu 11h giữa hai ngày làm. Chỉ Admin hệ thống được xác nhận ngoại lệ vượt giờ/thiếu nghỉ với lý do 10–500 ký tự. Ngoại lệ không mở khóa tuần đã gửi/duyệt.
- Lịch đăng ký chưa xác nhận không tính vào giờ đã xếp. `''`, `off` và thông tin chi viện giữ nguyên ý nghĩa. Không đổi cửa hàng gốc của nhân viên.
- Lưu hàng loạt là một giao dịch: bất kỳ ca lỗi nào cũng hoàn tác toàn bộ. Khóa theo nhân viên bảo vệ cả hai tuần liền nhau khi có nhiều người sửa đồng thời.
- `server_audit_events` ghi sửa lịch, công, đơn bù công, đổi ca, trạng thái tuần và ngoại lệ. Người thao tác lấy từ phiên xác thực ở database; client không được ghi/xóa bảng nhật ký này. Admin xem cùng nhật ký cũ trên trang Nhật ký.
- Đọc công qua `get_attendance_audited` ghi `payroll.data_read` và lọc bản thân/cửa hàng có quyền. Đây là nhật ký truy xuất công để tính lương ước tính, **không phải** mọi lần mở màn hình hay mọi SELECT trực tiếp; SELECT trực tiếp vẫn tuân theo RLS hiện hữu.
- Chuông thông báo lưu thay đổi lịch và tuần được duyệt trong database; nhân viên chỉ đọc thông báo của mình. Một bản ghi/nhân viên/tuần/loại tránh tạo nhiều thông báo giống nhau. Trạng thái đã đọc lưu tại trình duyệt như hiện tại.

Nhóm quyền có sẵn ánh xạ thành permission key trong `role_permission_keys`. Tên vai trò tùy chỉnh không cấp thêm quyền. SM theo `can_manage_store`; OFC/AM vẫn có phạm vi toàn deployment theo cơ chế hiện tại. Chưa thêm cấu hình khu vực hoặc bảng bật/tắt từng quyền. Một database đại diện một tổ chức, chưa phải nhiều tenant độc lập.

Sao chép tuần trước, danh mục ca, nhập/xuất Excel, giao diện mobile và quy trình tuần `draft → pending → approved/rejected` đã có, được tái sử dụng. Chưa thêm Zalo hoặc dịch vụ email lịch mới. Telegram tiếp tục dùng Edge Function; thông báo trong app hoạt động độc lập với Telegram.

## Thứ tự đưa lên hệ thống

1. Xác nhận database nền đã hoàn thành [catchup](DATABASE_CATCHUP_20260928.md). Không dùng `legacy_sql_scripts/` để cài mới.
2. Chạy lần lượt bằng Supabase SQL Editor (mỗi file một transaction):
   - `supabase/migrations/20261012000000_workspace_branding.sql`
   - `supabase/migrations/20261012000001_workspace_roles.sql`
   - `supabase/migrations/20261012000002_operational_hardening.sql`
   - `supabase/migrations/20261014000000_workspace_role_read_grant.sql`
3. Các bản SQL Editor tương ứng nằm trong `docs/sql_workspace_branding.sql` và `docs/sql_workspace_roles.sql`. Bản roles trong docs đã gồm quyền đọc bổ sung ngày 14/10; nếu chạy migration theo phiên bản phải chạy cả file ngày 14/10. File hardening cũng được kiểm tra chạy lại an toàn.
4. Migration thành công mới build/phát hành frontend. Frontend dùng RPC mới và sẽ báo lỗi nếu database chưa cập nhật; không hạ xuống đường lưu bỏ kiểm tra.
5. Dùng tài khoản thử: SM lưu ca hợp lệ; thử ca trùng và thiếu nghỉ; Admin hủy rồi xác nhận ngoại lệ; kiểm tra nhật ký; duyệt tuần và kiểm tra chuông nhân viên. Không thử trên lịch thật đang vận hành.

Migration không tự sửa lịch cũ. Khi chỉnh một tuần có dữ liệu cũ sai định dạng/vi phạm, phải sửa dữ liệu hoặc dùng ngoại lệ Admin phù hợp. Thiếu giờ tối thiểu vẫn là cảnh báo, không chặn lưu lịch nháp.

## Kiểm thử local

Trong `frontend/`: `npm test`, `npm run lint`, `npm run build`.

Kiểm thử database dùng PostgreSQL tách biệt tại `127.0.0.1`, không đọc `.env` và không kết nối Supabase thật:

```powershell
$env:STABILITY_PG_PORT = '55442'
python scripts/test_operational_hardening.py
```

Mặc định `psql` ở `C:/Program Files/PostgreSQL/17/bin/psql.exe`; hệ khác đặt `STABILITY_PSQL=psql`. Script tạo database tên ngẫu nhiên và giữ lại để kiểm tra. Bao gồm RLS, sai phiên bản, giao dịch đổi ca/bù công, lưu nhiều người, ghi đè, phạm vi đọc công, thông báo, lịch khóa và hai phiên sửa tuần liền nhau. Suite nền `test_stability_db.py` kiểm tra migration trước lớp hardening; suite mới bổ sung lớp này sau fixture nền.

Kiểm tra trình duyệt dùng fixture/mạng giả lập, không gửi email/Telegram thật. CI chạy lint, unit test, build và kiểm tra PostgreSQL trên mỗi push/PR.

## Giới hạn triển khai

Kết quả kiểm tra local ngày 13/10/2026: 814 test đạt, 7 test được skip theo cấu hình hiện có; lint không có lỗi (14 cảnh báo hiện hữu); build thành công, còn cảnh báo chunk lớn. PostgreSQL đạt cả fixture nền và fixture mô phỏng schema production cũ, bao gồm toàn bộ ba migration phía trên. Kiểm tra trình duyệt đạt ở 1440px và 390px: hủy/rollback, gửi lý do cùng version, SM bị chặn, nhật ký và mở đúng tuần từ thông báo. CI đã được cấu hình, chưa chạy trên GitHub trong phiên này.

Đã áp dụng ba migration và phát hành frontend ngày 13/10/2026 theo yêu cầu deploy. Schema đã được sao lưu trước; xem [ghi nhận phát hành](RELEASE_20261013.md). Telegram theo [hướng dẫn proxy](telegram-proxy.md); không đưa bot token hoặc shared secret vào biến `VITE_*`.
