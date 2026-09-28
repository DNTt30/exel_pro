# Khôi phục mật khẩu qua OTP — trạng thái 28/09/2026

## Đã hoàn thiện

- Admin nhận OTP qua Telegram đã cấu hình; nhân viên (kể cả SM/OFC có mã 9 số) nhận qua email trong hồ sơ. Không dùng email hay chat ID do request quên mật khẩu tự cung cấp.
- Quản lý có thể nhập Gmail khi thêm/sửa hồ sơ. Trigger DB kiểm tra quyền quản lý; SM không được thay email tài khoản quản lý. Email đổi sau khi phát OTP sẽ làm mã đó mất hiệu lực.
- OTP ngẫu nhiên 6 số, HMAC-SHA256 với secret server, TTL 5 phút; tối đa 3 yêu cầu/15 phút và 5 lần sai. Advisory lock và row lock kiểm soát các request đồng thời.
- `password_reset_otp_requests` giữ lịch sử giới hạn ngay cả khi OTP đã bị xóa sau khi dùng. Mã được claim trước khi gọi Auth; không cho dùng lại khi Auth timeout. Mã mới vô hiệu hóa mã cũ.
- Gửi mã thất bại không báo thành công; challenge bị hủy nhưng vẫn tính rate limit. Không ghi OTP/password/email vào log phản hồi.
- Đổi thành công xóa OTP, ghi `employees.password_changed_at`, `app_profiles.credential_set_at` và `admin_logs` trong một transaction. Nếu Auth thành công nhưng transaction log lỗi, UI thông báo mật khẩu đã đổi và nhật ký cần đồng bộ; không báo sai là mật khẩu chưa đổi.
- Modal 3 bước dùng policy mật khẩu chung. Bước nhập mã chỉ kiểm tra 6 chữ số; server xác thực OTP lúc xác nhận mật khẩu mới. Khi hoàn tất, đóng modal, điền mã NV/admin, xóa ô mật khẩu và focus để đăng nhập lại.
- Nhánh reset trực tiếp trước đây vẫn yêu cầu JWT hợp lệ và quyền ADMIN, dù endpoint nhận OTP được phép gọi trước login.

## Đã triển khai thật

- Đúng dự án `plitfdjzuealjxbylwxy` (khớp cấu hình frontend và DB).
- Đã chạy riêng `docs/sql_password_reset_otps.sql` qua Management API, không chạy toàn bộ migration cũ. Bản migration tương đương: `supabase/migrations/20260927000000_password_reset_otps.sql`. Đây là áp dụng SQL trực tiếp; không dùng `db push` cho các migration cũ chưa triển khai.
- Đã deploy riêng Edge Function `reset-password` bằng `--use-api --no-verify-jwt`. Bản cũ được tải về `artifacts/password-release/previous/` để phục hồi nếu cần.
- Đã xác nhận RLS trên cả hai bảng OTP. Live HTTP smoke: ID sai → 400; email chưa cấu hình → 503; reset trực tiếp thiếu JWT → 401; mật khẩu yếu → 400. Không gửi OTP hoặc đổi mật khẩu tài khoản thật trong smoke test.

## Chưa thể bật đầy đủ trên website

1. **Gửi Gmail:** người dùng xác nhận chưa có dịch vụ email. Adapter hiện dùng Resend để gửi tới hộp thư Gmail; cần `RESEND_API_KEY` và `PASSWORD_RESET_EMAIL_FROM` (địa chỉ thuộc domain đã xác minh) trong Supabase secrets. Không đưa các giá trị này vào Vite/git/chat. Có thể dùng `supabase secrets set --env-file <file-secret-local> --project-ref plitfdjzuealjxbylwxy` khi đã tạo cấu hình thật.
2. **Dữ liệu email:** quản lý cần xác minh và nhập Gmail của từng nhân viên. Không tự suy đoán, không điền email mẫu vào dữ liệu thật.
3. **Frontend:** chưa push/publish bản main đầy đủ. Database thật thiếu `login_lookup_v2`, `can_manage_store`, helper nhận diện quản lý và transaction lưu lịch của các đợt trước. Bản main local đang phụ thuộc các thay đổi đó; publish toàn bộ hiện tại có thể làm hỏng login/lưu lịch. Cần rollout các migration nền đã review trước khi phát hành frontend đầy đủ. Migration OTP đã được điều chỉnh dùng các hàm hiện có (`has_role(app_role)`, `my_managed_stores`) để backend mới hoạt động độc lập.
4. Sau khi có cấu hình và rollout frontend, thử end-to-end bằng tài khoản kiểm thử: Gmail NV / Telegram admin → nhận mã → đổi → đăng nhập lại; kiểm tra admin vẫn đi qua bước OTP đăng nhập hiện hữu.

Secrets Telegram hiện có trên dự án: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Chat nhận OTP admin phải là kênh riêng của người quản trị. `PASSWORD_RESET_HASH_SECRET` có thể cấu hình riêng; nếu chưa có, HMAC dùng service role secret trong Edge runtime.

## Kiểm chứng

Kết quả cuối: **638 test pass, 7 skipped**, lint không lỗi/cảnh báo, build đạt. RLS/privilege trên Supabase thật xác nhận anon và authenticated không đọc được OTP hoặc gọi RPC claim/issue nội bộ.

- Vitest: handler, client API, modal/Login, quyền admin, loại trừ địa chỉ nhận do client cung cấp, lỗi nhà cung cấp, mã sai/hết hạn/dùng lại, password policy và phản hồi sau khi đóng modal.
- PostgreSQL local: `python scripts/test_password_reset_db.py` dùng cluster riêng `127.0.0.1:55439`, không đọc `.env`; kiểm tra migration chạy lại được, quyền anon/authenticated, email, rate/attempt limit đồng thời, claim một lần, expiry, audit một lần và admin.
- `node scripts/check_password_ui.mjs`: 14 ảnh desktop/mobile, mock HTTP phục hồi và chặn toàn bộ request ngoài localhost. Ảnh trong `artifacts/password-ui/`.
- `npm run test`, `npm run lint -- --deny-warnings`, `npm run build` trong `frontend/`.

Tham chiếu kỹ thuật: [Supabase Edge auth](https://supabase.com/docs/guides/functions/auth), [Auth Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid), [Resend Email API](https://resend.com/docs/api-reference/emails/send-email).
