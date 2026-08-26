# KIẾN TRÚC — OFC Schedule App
Chi tiết đầy đủ: docs/PROJECT_AUDIT.md (Phase 0). Tóm tắt vận hành:
```
pages/admin|employee → components (+ modals lazy-load) → hooks → store/useStore (Zustand)
   → services/api/* (duy nhất chạm supabase-js) → Postgres + RLS (p1_*) / Edge Functions
```
- **Auth**: form nội bộ (Hướng B) → phiên Supabase Auth ẩn dưới; 2FA Telegram OTP cho admin (`admin-otp`).
- **Authorization**: DB là chuẩn — `user_store_roles` + helper `is_admin()/has_role()/dept_in_scope()`; policy `p1_*`.
- **Schedule engine**: `utils/scheduleConflicts.js` (BLOCKER→INFO) · scoring `scheduleScore.js` (trọng số cấu hình được) · ghi atomic `upsert_schedules_bulk` (optimistic locking).
- **Excel**: export `exportPayroll.js` (mẫu C&B), import pipeline Zod `scheduleImportSchema.js`.
- **AI**: client-side, read-only (`aiGuard.js` chặn hành động ghi).