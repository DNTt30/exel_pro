# Hồ sơ nhân viên — 28/09/2026

Đã áp dụng migration `20260928000001_employee_profile.sql` và deploy Edge Function `employee-profile` trên project `plitfdjzuealjxbylwxy`. Lệnh `npm run deploy` đã trả `Published` cho frontend GitHub Pages.

Đã xác minh website trả HTTP 200 và phục vụ đúng bundle mới `index-BSzqU7CS.js`.

## Sử dụng

- Nhân viên/SM/OFC: mở menu **Hồ sơ của tôi** (`/employee/profile`). Tên, mã NV, vai trò, cửa hàng chỉ hiển thị. Ngày sinh, trường học, ngành học và dự định làm đến đều tùy chọn; để trống rồi lưu sẽ ghi NULL.
- Email khôi phục: nhập địa chỉ mới → **Lưu email khôi phục** → nhập mật khẩu hiện tại. Cả thêm email lần đầu lẫn thay email đều cần xác nhận. Nút **Đổi mật khẩu** dẫn đến luồng bảo mật hiện có.
- Admin/SM: trong **Nhân viên**, bấm tên nhân viên để mở chi tiết. Badge vàng nhắc khi tháng dự định nghỉ là tháng hiện tại hoặc tháng kế tiếp, chỉ áp dụng nhân viên đang hoạt động. Đây là dự định, không tự khóa tài khoản hoặc tạo đơn nghỉ.
- `work_plan_until` dùng text: nhận `MM/YYYY`, `Tháng MM/YYYY`, `YYYY-MM`, hoặc nội dung như “Đến khi ra trường”. Nội dung tự do không được suy đoán thành ngày để tạo cảnh báo.

## Bảo mật

- Không mở quyền UPDATE bản ghi của chính mình trên bảng employees. RPC `update_my_employee_profile` xác định ID từ phiên Auth và chỉ cập nhật bốn trường tùy chọn.
- Bốn cột cá nhân không được đọc trực tiếp bằng role authenticated. RPC `get_employee_profiles` chỉ trả chính người gọi hoặc nhân viên trong phạm vi quản lý. Các cột danh bạ phục vụ phân ca vẫn đọc được như trước; `login_lookup_v2` không thêm thông tin cá nhân.
- Đổi email: Edge kiểm tra JWT bằng Auth, giới hạn 5 lần xác nhận/15 phút, xác thực mật khẩu bằng client Auth riêng và kiểm tra đúng UUID. Client này không thay phiên trình duyệt; session xác thực phụ được sign-out riêng.
- Chỉ service_role được gọi RPC ghi email sau xác nhận. Ngay cả quản lý cũng không được sửa email của chính mình qua UPDATE trực tiếp. Quy trình quản lý cập nhật email nhân viên khác vẫn giữ quyền hiện có.
- RPC ghi email kiểm tra email cũ để chống ghi đè từ phiên khác; dùng cùng advisory lock với OTP, chặn khi reset đang xử lý, vô hiệu hóa OTP cũ và ghi audit trong cùng transaction. Không log mật khẩu/email trong thông báo audit mới.
- Frontend giữ mật khẩu trong state của popup, xóa sau lần thử hoặc khi đóng; không persist. Các request ghi dùng JWT đã gắn với mã NV mở form, tránh ghi nhầm tài khoản nếu phiên đổi giữa chừng.

## Kiểm chứng

- `node scripts/agent_eval_loop.mjs`: **654 passed, 7 skipped**, lint 0 lỗi/cảnh báo, build đạt, kiểm tra kiến trúc/guardrails đạt 100/100.
- `python scripts/test_employee_profile_db.py --production-shape`: PostgreSQL local schema legacy; kiểm tra riêng tư, self-write, NULL, giới hạn đồng thời, invalidation OTP, race reset/email, tài khoản bị khóa và chạy lại migration.
- `node scripts/check_profile_ui.mjs`: 8 ảnh desktop/mobile của hồ sơ, popup mật khẩu, danh sách và chi tiết quản lý; không có lỗi runtime hoặc tràn ngang toàn trang. Dữ liệu giả, request ngoài localhost bị mock/chặn. Ảnh nằm trong `artifacts/profile-ui/` (không commit).
- Trên Supabase thật: bốn cột nullable; authenticated không đọc trực tiếp DOB, không gọi được RPC ghi email; vẫn đọc được danh bạ và gọi RPC hồ sơ có phân quyền. HTTP request không JWT tới Edge mới trả `401 AUTH_REQUIRED`.
- Không nhập mật khẩu thật hoặc đổi mật khẩu tài khoản thật trong kiểm thử. Sau khi tải lại app, chủ tài khoản có thể xác nhận luồng đổi email bằng mật khẩu của mình.

## Triển khai lại

1. Áp dụng `supabase/migrations/20260928000001_employee_profile.sql` sau các migration nền đã triển khai. Migration chạy trong transaction, không thay dữ liệu hồ sơ đã có.
2. `npx --yes supabase functions deploy employee-profile --project-ref plitfdjzuealjxbylwxy --no-verify-jwt --use-api`. Gateway cho request tới handler; handler bắt buộc xác thực JWT trước mọi thao tác.
3. Test/lint/build rồi `npm run deploy` trong `frontend/`.

Không chạy riêng gói catch-up 28/09 cũ sau migration hồ sơ: gói cũ cấp lại SELECT cả bảng employees. Nếu dựng lại toàn bộ DB, phải áp dụng migration hồ sơ ở cuối để giữ quyền riêng tư cho bốn cột mới. SQL Editor/Management API không tự đánh dấu lịch sử Supabase CLI; không tự repair lịch sử toàn bộ.

Lưu email hồ sơ không gọi Resend. Việc gửi OTP khi quên mật khẩu vẫn phụ thuộc địa chỉ gửi Resend thuộc tên miền đã xác minh; trang hồ sơ không giải quyết thay cấu hình nhà cung cấp email.
