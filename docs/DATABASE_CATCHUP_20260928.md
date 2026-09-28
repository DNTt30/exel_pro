# Bù migration trước khi phát hành frontend

Đối chiếu schema thật ngày 28/09/2026, project **plitfdjzuealjxbylwxy**. **Đã áp dụng lên production:** chủ dự án chạy gói trong SQL Editor và nhận `DATABASE_CATCHUP_OK`; kiểm tra độc lập qua Management API sau đó trả `DATABASE_CHECKS_OK`. OTP SQL và Edge Function `reset-password` đã được triển khai riêng trước đó.

Kiểm tra hiện tại xác nhận RPC, cột tương thích, RLS và quyền OTP; chưa thay thế smoke test đăng nhập/lưu lịch trên frontend sau phát hành. Hai secrets `RESEND_API_KEY`, `PASSWORD_RESET_EMAIL_FROM` vẫn chưa có; `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` đã có. Chưa phát hành frontend trong bước xác nhận này.

## File cần chạy

Mở [sql_database_catchup_20260928.sql](sql_database_catchup_20260928.sql), copy **toàn bộ** vào [Supabase SQL Editor](https://supabase.com/dashboard/project/plitfdjzuealjxbylwxy/sql/new), chọn role `postgres` và chạy một lần. Không chạy riêng từng đoạn hoặc bỏ `BEGIN`/`COMMIT`.

Kết quả cuối phải là **`DATABASE_CATCHUP_OK`**. File có kiểm tra RPC, RLS, quyền OTP trước khi commit; lỗi ở bất kỳ đoạn nào sẽ rollback toàn bộ. Lock timeout 10 giây tránh chờ khóa bảng vô hạn; nếu timeout, chạy lại cả file vào lúc ít thao tác. Không xóa bảng nhân viên/lịch, không đổi mật khẩu Auth, không tự bật Jev auto-approval.

Chuẩn bị bản sao lưu DB theo quy trình vận hành trước khi chạy. Chọn thời điểm phát hành đồng bộ với frontend: bản mới yêu cầu `expect_version` khi lưu lịch; overload lưu lịch 3 tham số cũ bị gỡ để tránh PostgREST chọn nhầm. Client cũ đang mở có thể phải tải lại sau khi cập nhật frontend.

## Những thiếu sót đã xử lý trên DB thật

| Phần | Hiện trạng quan sát | Xử lý trong gói |
| --- | --- | --- |
| Auth foundation | Helper cũ dựa trên `app_profiles` và `user_store_roles`; thiếu `can_manage_store`, `ensure_app_profile_v2`, `employee_is_manager` | Cập nhật helper và RLS theo dữ liệu nhân viên |
| Đăng nhập Phase 1 | Thiếu `login_lookup_v2`; OTP đã thêm cột mật khẩu nhưng chưa đủ RPC | Lookup có hạn mật khẩu, đánh dấu đã đổi và reset cờ theo quyền |
| Lịch | Có hàm lưu 3 tham số và bulk cũ | Version bắt buộc, giao dịch bulk/đổi ca/feedback, kiểm tra khóa tuần |
| Kiểu tuần | `schedule_weeks.week_date` là `date`, bản baseline là `text` | Hàm đọc khóa dùng `week_date::text`; giữ nguyên kiểu và dữ liệu thật |
| Cột legacy | Thiếu `stores.is_active/demand`, `store_shelves.due_date`, `shelf_items.sku/expiry_date_2`, các cột feedback mới | Bổ sung cột; đồng bộ `feedbacks.name` ↔ `emp_name` cho cả client cũ và mới |
| Jev | Thiếu bảng/RPC/cột quyết định | Tạo hạ tầng; không thêm cấu hình bật tự duyệt |
| OTP | Đã có bảng, RPC và Edge Function | Chạy lại SQL idempotent, giữ challenge/history đang có |

Nguồn: 8 migration từ `20260919000000` đến `20260927000000`, cộng `20260928000000_legacy_schema_compat.sql`. Baseline được giữ để hỗ trợ cài mới; `CREATE TABLE IF NOT EXISTS` không tự vá cột trên bảng cũ nên cần migration tương thích cuối. File sinh tự động ghi tên và SHA256 của từng nguồn.

Gói tạo hàm JWT hook cũ nhưng **không bật hook trong Dashboard**; quyền ứng dụng vẫn được DB kiểm tra. Không cần bật hook để hoàn thành đợt rollout này.

SQL Editor không tự ghi lịch sử Supabase CLI migrations. Không chạy `db push`/`migration repair --status applied` hàng loạt chỉ vì thấy thông báo thành công; cần đối chiếu lịch sử riêng trước khi chuyển sang quản lý triển khai bằng CLI.

## Sau khi chạy

1. Chạy [sql_database_catchup_checks.sql](sql_database_catchup_checks.sql), phải trả `DATABASE_CHECKS_OK`.
2. Phát hành frontend tương ứng, tải lại trang và đăng nhập tài khoản kiểm thử NV/SM/admin.
3. Thử lưu lịch; thử hai phiên sửa cùng ô để xác nhận lỗi xung đột; tuần đã trình/duyệt phải bị khóa. Kiểm tra SM không sửa cửa hàng ngoài quyền.
4. Sau khi cấu hình email bên dưới, thử khôi phục bằng tài khoản kiểm thử có email đã xác minh; nhận mã → đổi mật khẩu → đăng nhập lại. Admin nhận OTP qua Telegram.

## Resend: các cấu hình còn cần từ chủ tài khoản

1. Tạo tài khoản [Resend](https://resend.com/signup).
2. Thêm tên miền hoặc subdomain do anh quản lý, cấu hình DNS theo Resend và chờ trạng thái Verified. Gmail là **hộp thư nhận của nhân viên**; địa chỉ gửi phải thuộc domain đã xác minh. `onboarding@resend.dev` chỉ gửi thử tới email chủ tài khoản Resend, không dùng để gửi OTP toàn bộ nhân viên. [Tài liệu domain](https://resend.com/docs/dashboard/domains/introduction), [giới hạn resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
3. Tạo API key có quyền gửi email cho domain đó. Trong [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/plitfdjzuealjxbylwxy/functions/secrets), thêm:

   | Tên secret | Giá trị |
   | --- | --- |
   | `RESEND_API_KEY` | API key thật từ Resend |
   | `PASSWORD_RESET_EMAIL_FROM` | Ví dụ `GS25 Schedule <otp@auth.example.com>`; thay bằng địa chỉ thuộc domain thật đã Verified |

   Không đưa API key vào frontend `.env`, SQL, git hoặc chat. App gọi Resend bằng Edge Function; cấu hình Supabase Auth SMTP không thay thế hai secrets này.
4. SM nhập đúng Gmail đã xác minh cho nhân viên trong hồ sơ. SM không được đổi email tài khoản quản lý; admin/AM xử lý các tài khoản đó. Không tự điền địa chỉ mẫu vào dữ liệu thật.
5. Test một email OTP thật, kiểm tra inbox/spam và log gửi của Resend. Chưa có key/domain nên bước gửi email thật chưa được kiểm chứng trong phiên này.

Gói Free hiện có giới hạn 100 email/ngày; quota tháng xem trực tiếp [bảng giá Resend](https://resend.com/pricing) khi đăng ký. Không cần gửi API key qua chat.

## Kiểm thử local và tái tạo

Các script chỉ dùng PostgreSQL riêng `127.0.0.1:55439`, không đọc `.env` hay kết nối DB thật:

```powershell
python scripts/build_db_catchup.py --check
python scripts/test_db_catchup.py --bundle
python scripts/test_db_catchup.py --bundle --production-shape
python scripts/test_password_reset_db.py --bundle --production-shape
python scripts/test_jev_db.py --bundle --production-shape
```

Fixture tái hiện các khác biệt schema đã quan sát (date/varchar/integer, tên cột feedback, cột thiếu, bảng quyền enum), nạp policy/trigger legacy trước rồi nâng cấp. Kiểm tra bao gồm RLS, xung đột đồng thời, rollback bulk/đổi ca/feedback, khóa tuần, lookup, credential RPC, ghi hàng hóa, chạy lại giữ nguyên dữ liệu và rollback toàn bộ khi cố ý gây lỗi cuối file. Đây là kiểm chứng local; smoke test nghiệp vụ trên production vẫn cần sau khi chủ dự án chạy SQL và phát hành frontend.

Sửa migration nguồn rồi chạy `python scripts/build_db_catchup.py` để tái tạo file; không sửa trực tiếp file SQL đã sinh.
