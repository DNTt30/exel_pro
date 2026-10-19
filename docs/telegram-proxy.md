# Bảo mật Telegram: chuyển từ token-in-bundle sang Edge Function proxy

## Vấn đề
`notifyTelegram()` hiện chỉ gọi Edge Function bằng JWT phiên đăng nhập. Đã bỏ đường gửi bot token trực tiếp và shared secret của frontend trong hàm này.

## Triển khai proxy (một lần, ~5 phút)
```bash
# 1) Đăng nhập Supabase CLI (cần quyền project)
supabase login

# 2) Đặt secrets cho Function — token bot chỉ sống ở server
supabase secrets set \
  TELEGRAM_BOT_TOKEN=<token_bot> \
  TELEGRAM_CHAT_ID=<chat_id>

# 3) Deploy function
supabase functions deploy telegram-notify --project-ref <project-ref>
```

## Cấu hình frontend (.env của bản build)
```
VITE_TELEGRAM_PROXY_URL=https://<project-ref>.functions.supabase.co/telegram-notify
```
Không đặt bot token hoặc shared secret vào biến `VITE_*`. Chưa cấu hình URL thì `notifyTelegram()` bỏ qua; lỗi Telegram không làm thất bại giao dịch lưu lịch đã hoàn tất. Chuông thông báo trong app hoạt động độc lập.
Nên rotate (đổi) token bot cũ vì nó đã từng nằm trong bundle đã phát hành.

## Kiến trúc
```
App client ──POST {text}──► telegram-notify (Edge Function, giữ token) ──► api.telegram.org
                 │                        │ xác minh Bearer JWT bằng Supabase Auth
                 └─ JWT phiên đăng nhập   └─ token bot nằm trong Supabase Secrets
```

Function vẫn hỗ trợ `NOTIFY_SECRET` cho tích hợp server legacy. Module OTP/backup cũ có cấu hình riêng; việc sửa `notifyTelegram()` không đồng nghĩa mọi đường legacy đã được chuyển đổi. Không bổ sung dịch vụ email/Zalo mới trong đợt này.
