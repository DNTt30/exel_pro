# Bảo mật Telegram: chuyển từ token-in-bundle sang Edge Function proxy

## Vấn đề
Trước đây `VITE_TELEGRAM_BOT_TOKEN` được nhúng trực tiếp vào bundle client → bất kỳ ai mở
DevTools cũng đọc được token và spam bot. Chế độ này **vẫn còn hoạt động như phương án dự phòng**
(kèm cảnh báo trên console) nhưng nên chuyển sang proxy càng sớm càng tốt.

## Triển khai proxy (một lần, ~5 phút)
```bash
# 1) Đăng nhập Supabase CLI (cần quyền project)
supabase login

# 2) Đặt secrets cho Function — token bot chỉ sống ở server
supabase secrets set \
  TELEGRAM_BOT_TOKEN=<token_bot> \
  TELEGRAM_CHAT_ID=<chat_id> \
  NOTIFY_SECRET=<chuỗi-ngẫu-nhiên-tự-tạo>

# 3) Deploy function
supabase functions deploy telegram-notify --project-ref <project-ref>
```

## Cấu hình frontend (.env của bản build)
```
VITE_TELEGRAM_PROXY_URL=https://<project-ref>.functions.supabase.co/telegram-notify
VITE_TELEGRAM_PROXY_SECRET=<chuỗi-ngẫu-nhiên-tự-tạo>
```
Sau khi có `VITE_TELEGRAM_PROXY_URL`, `notifyTelegram()` tự ưu tiên gọi proxy và
**có thể xoá hẳn `VITE_TELEGRAM_BOT_TOKEN`/`VITE_TELEGRAM_CHAT_ID` khỏi .env**.
Nên rotate (đổi) token bot cũ vì nó đã từng nằm trong bundle đã phát hành.

## Kiến trúc
```
App client ──POST {text}──► telegram-notify (Edge Function, giữ token) ──► api.telegram.org
                 │                        │ kiểm tra x-ofc-secret = NOTIFY_SECRET
                 └─ không còn chứa token  └─ rate-limit/audit có thể bổ sung tại đây
```
