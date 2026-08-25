# AUTH & RLS HARDENING — RUNBOOK Phase 1

> Áp dụng sau khi đọc `docs/PROJECT_AUDIT.md` (P0-1…P0-4) và `docs/RLS_MATRIX.md`.

## Bước 1 — Chạy migration (bắt buộc, ~1 phút)
Supabase Dashboard → SQL Editor → dán toàn bộ `sql_phase1_security.sql` → Run.
Script **idempotent** (chạy lại an toàn). Kiểm tra cuối file:
- `select count(*) from pg_policies where policyname like 'open_%'` phải = 0
- `select role, count(*) from user_store_roles group by role` phải có STORE_MANAGER/EMPLOYEE/ADMIN…

## Bước 2 — Đăng nhập lại app
Mọi người đăng nhập lại 1 lần để nhận phiên authenticated (RLS mới dựa trên phiên).
Login NV dùng RPC `login_lookup` — đã vá phía frontend, hoạt động cả trước lẫn sau harden.

## Bước 3 — Xác minh tự động
```bash
cd frontend && npm run test        # rlsSecurity.test.js tự chuyển sang chế độ STRICT
```

## Rollback khẩn cấp
Chạy `sql_rls_relax_writes.sql` + mở log như `sql_logs_mo.sql` (đã có sẵn trong repo) — app quay về trạng thái mở như cũ trong khi điều tra.

---

## P0-2 — Kế hoạch bỏ mật khẩu suy diễn (2 tuần, không phá pilot)

| Mốc | Việc | Ai |
|---|---|---|
| T0 (xong Phase 1) | RLS strict đã bật → kẻ xấu dù login được cũng chỉ thấy đúng phạm vi vai trò của nạn nhân | ✅ |
| Tuần 1 | Admin đổi mật khẩu admin thật (đã có flow `mustSetupPassword`) | Admin |
| Tuần 1–2 | SM/NV: trang "Đổi mật khẩu" đầu tiên (Supabase updateUser), ép đổi lần đầu bằng cột `profiles.credential_set_at` | FE + BE |
| Tuần 2 | Tắt nhánh formula `toAuthPassword()`: signIn chỉ chấp nhận password thật; quên mật khẩu = OTP Telegram/email reset | FE + BE |

Residual risk giai đoạn chuyển tiếp: ai đoán được formula vẫn vào được tài khoản NGƯỜI KHÁC nhưng bị chặn bởi RLS scope của chính tài khoản đó + mọi ghi đều qua phiên JWT định danh thật (truy vết được).

## Còn lại sau Phase 1 (chuyển Phase 2+)
- Custom Access Token Hook gắn claims role/store vào JWT (client metadata hết giá trị quyền)
- Event-based audit schema (before/after/request_id)
- FK + index theo PROJECT_AUDIT §I; optimistic locking schedules (Phase 3)
