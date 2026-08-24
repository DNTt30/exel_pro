# Bảo mật tài khoản admin — OFC Schedule

> Cập nhật: gói vá bảo mật phiên này. Áp dụng cho frontend (`frontend/`).

## Những gì đã vá

| Rủi ro | Bản vá | File |
|---|---|---|
| Mật khẩu hardcode `1` cho admin | Admin phải đặt mật khẩu riêng (SHA-256 + salt, lưu theo thiết bị). Đăng nhập lần đầu bằng `1` sẽ bị ép chuyển tới trang đổi mật khẩu trước khi vào Dashboard | `lib/adminCredential.js`, `pages/admin/SecurityChangePassword.jsx` |
| Brute-force không giới hạn | Sai 5 lần / 5 phút → khóa 5 phút (mỗi mã đăng nhập) | `lib/loginThrottle.js` |
| Phiên treo vĩnh viễn trên máy dùng chung | Tự đăng xuất sau **20 phút** không tương tác; phiên tối đa **12 giờ** kể từ `loginAt` | `components/layout/AppLayout.jsx` |
| Không truy vết | Đã có sẵn log `LOGIN_SUCCESS` / `LOGIN_FAILED` (xem trang Nhật ký) — giữ nguyên và tiếp tục ghi khi bị khóa | `store/useStore.js` |

## Lưu ý vận hành

- Mật khẩu admin lưu **theo thiết bị**: máy mới/khác trình duyệt → lần đầu vẫn dùng mật khẩu mặc định rồi được ép đặt lại. Muốn đồng bộ nhiều máy, lặp thao tác một lần trên từng máy.
- Quên mật khẩu trên một thiết bị: xóa key `ofc-admin-cred-v1` trong localStorage của trình duyệt đó (hoặc F12 → Application → Local Storage) để quay về mặc định `1` và thiết lập lại.
- Nhân viên vẫn đăng nhập bằng mã 9 số + mật khẩu mặc định (theo quy ước dự án); throttle chặn brute-force trên mã NV.

## Việc nên làm tiếp (cần quyết định kiến trúc)

1. **RLS Supabase**: hiện app dùng anon key phía client (Hướng B). Kiểm tra bảng nhạy cảm (`employees`, `feedbacks`) đã bật RLS chưa trong Supabase Dashboard; nếu chưa, mọi người có anon key đều đọc được toàn bộ dữ liệu. Cần policy theo `auth.uid()` sau khi chuyển sang Supabase Auth thật.
2. **Đổi cách cấp mật khẩu Supabase Auth** (`lib/authSession.js` đang sinh mật khẩu từ ID): nếu tách hẳn sang Supabase Auth, mật khẩu ứng dụng sẽ do người dùng giữ thay vì derive từ mã NV.
3. **HTTPS bắt buộc** khi deploy (GitHub Pages mặc định HTTPS ✓). Không chạy production qua HTTP LAN.
4. **2FA cho admin**: có thể thêm bước OTP qua Telegram Edge Function sẵn có (`supabase/functions/telegram-notify`) khi đăng nhập admin từ thiết bị lạ.

## 2FA Telegram cho admin (đã thêm)

Luồng: mật khẩu đúng → Edge Function `admin-otp` tạo mã 6 số, lưu **hash** vào bảng `admin_otps`, gửi qua Telegram → admin nhập mã → server xác minh (tối đa 5 lần) → phát hành **deviceToken** (ghi nhớ 30 ngày, chỉ lưu hash).

Bật 2FA:
1. Chạy `sql_admin_otp.sql` trong Supabase SQL Editor (tạo bảng `admin_otps`, RLS khóa hoàn toàn).
2. `supabase functions deploy admin-otp --project-ref <ref>` (dùng chung secrets TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / NOTIFY_SECRET với telegram-notify).
3. Thêm vào `frontend/.env`: `VITE_ADMIN_OTP_URL=https://<ref>.functions.supabase.co/admin-otp` rồi build/deploy lại.

- Chưa cấu hình biến trên → 2FA tự tắt, app chạy như bình thường.
- Quên mất thiết bị tin tưởng: xóa key `ofc-admin-device-token` trong localStorage để buộc OTP lại; hoặc xóa các dòng `purpose='device'` trong bảng `admin_otps` để thu hồi TẤT CẢ thiết bị.
