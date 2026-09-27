# Phase 1 — Bảo mật mật khẩu (27/09/2026)

## Đã hoàn thiện trong mã nguồn

- `useStore.login` chặn mật khẩu mặc định quá 7 ngày với `PASSWORD_EXPIRED`, trước khi tạo phiên Supabase. Mốc đúng 7 ngày vẫn hợp lệ; quá mốc này thì liên hệ quản lý. Nhập trực tiếp mật khẩu Auth mặc định cũng không vượt được kiểm tra.
- Mật khẩu mặc định trên form vẫn là `1`. Đăng nhập yêu cầu nhập mật khẩu rõ ràng; không còn tự tạo tài khoản Auth khi xác thực thất bại. Provisioning vẫn nằm trong luồng quản lý thêm/import nhân viên bằng client riêng.
- Login và bảo vệ route dùng cùng quyết định: nhân viên/SM/OFC vào `/employee/change-password`, tài khoản `admin` vào `/admin/security/change-password`. Hỗ trợ cả `mustChangePassword` và cờ admin cũ `mustSetupPassword`. Nhập URL trực tiếp không bỏ qua được; menu nghiệp vụ và Copilot không xuất hiện khi đang bị buộc đổi mật khẩu.
- `ensureAuthSession` chỉ khôi phục phiên phù hợp hoặc đăng nhập với mật khẩu được truyền rõ ràng. Đã bỏ nhánh `allowSignUp` dùng mật khẩu mặc định.
- Đã nối action `useStore.changeMyPassword` còn thiếu với API. Form nhân viên, admin và modal dùng chung action; cờ bắt đổi chỉ xóa sau khi API thành công. Kết quả lưu đến muộn không phục hồi người dùng đã đăng xuất. Không ghi mật khẩu thô vào Zustand.
- Các form, API đổi/reset mật khẩu và Edge Function dùng chung `passwordPolicy.js`: tối thiểu 8 ký tự, có số hoặc ký tự đặc biệt; từ chối mật khẩu phổ biến và lặp một ký tự. Khoảng trắng và chữ tiếng Việt không bị tính nhầm là ký tự đặc biệt.
- API đổi mật khẩu không tự đăng nhập bằng mật khẩu mặc định khi thiếu phiên hoặc để trống mật khẩu hiện tại. Kiểm tra tài khoản trong phiên khớp người đang đổi.
- Edge Function `reset-password` đặt metadata `must_change_password: true` cho mật khẩu tạm quản lý cấp, để lần đăng nhập tiếp theo buộc nhân viên tự đổi.

## Kiểm tra local

- Kiểm thử mốc 7 ngày, mật khẩu Auth mặc định nhập trực tiếp, cờ reset, phiên thiếu/sai người, API lỗi, đăng xuất trong lúc đổi mật khẩu.
- Kiểm thử React cho form Login, route đi thẳng, form đổi mật khẩu NV/SM/admin và từ chối mật khẩu yếu trong modal reset.
- Chạy `npm run test`, `npm run lint`, `npm run build` trong `frontend/`.
- `node scripts/check_password_ui.mjs`: kiểm tra 3 vai trò × desktop/mobile; chỉ dùng dữ liệu giả và chặn mọi request ngoài localhost. Ảnh nằm ở `artifacts/password-ui/` (không commit).

## Chưa triển khai lên môi trường thật

1. Triển khai frontend và Edge Function `reset-password` kèm module policy dùng chung.
2. Xác nhận tài khoản nhân viên cũ đã được provision Auth; login không còn tự đăng ký thay cho quản lý.
3. Kiểm tra bằng tài khoản thử trên Supabase: mặc định còn hạn → đổi → đăng nhập lại; mặc định quá hạn → bị chặn → quản lý reset → bắt đổi; admin đổi mật khẩu và đăng nhập lại qua OTP.

Đây là kiểm soát luồng ứng dụng Phase 1. Chưa xác nhận trên Supabase thật và chưa bổ sung chính sách Auth/RLS để thực thi hạn 7 ngày với client gọi thẳng Supabase ngoài ứng dụng. Quyền reset hiện có của Edge Function vẫn là `ADMIN`.
