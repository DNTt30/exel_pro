# DEPLOYMENT
- Push `main` → workflow `.github/workflows/deploy.yml`: install → lint → test → build (VITE_BASE_PATH=/exel_pro/) → publish gh-pages (peaceiris). Gate đỏ = không deploy.
- Secrets GitHub bắt buộc: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_OTP_URL, VITE_TELEGRAM_PROXY_SECRET.
- Edge Functions: `supabase functions deploy admin-otp` (+ secrets TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID/NOTIFY_SECRET).
- SQL migrations: chạy tay trong Supabase SQL Editor theo thứ tự phase (`sql_phase*.sql`), đều idempotent. Rollback khẩn cấp RLS: `sql_rls_relax_writes.sql`.
- Lưu ý đã gặp: peaceiris từng race-fail 1 lần → nếu deploy xong mà web cũ, push commit rỗng hoặc publish tay nhánh gh-pages.