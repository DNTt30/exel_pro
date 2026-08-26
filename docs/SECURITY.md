# BẢO MẬT — Trạng thái & Runbook
## Đã harden (Phase 1–4)
- RLS bật trên 13 bảng nghiệp vụ+log; policy `p1_*`: anon = 0 quyền, authenticated scoped theo CH.
- `admin_otps` chỉ service_role. Log tables bất biến (INSERT-only).
- Trigger: `attendance.updated_by` server-side; cấm self-approve feedback; stores guard sm_id/is_active/name.
- Approval tuần: SM trình → AM/ADMIN duyệt/từ chối (`weeks_guard`).
## Còn lại (theo dõi)
- Password formula `ofc-{maNV}-1`: lộ trình bỏ trong `docs/AUTH_HARDENING.md` (RLS đã khống chế thiệt hại).
- JWT custom claims hook (metadata client hết giá trị quyền): Phase kế tiếp khi cần.
## Kiểm tra định kỳ
`npm run test` gồm: rlsSecurity (STRICT probe), securityRegression (anon surface). Chi tiết ma trận: docs/RLS_MATRIX.md.