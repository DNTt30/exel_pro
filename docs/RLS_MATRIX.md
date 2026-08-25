# RLS MATRIX — OFC Schedule App

> Kèm theo `docs/PROJECT_AUDIT.md` (Phase 0). Hai phần: **hiện trạng đã xác minh** (probe REST ngày 2026-08-25) và **ma trận mục tiêu Phase 1**. DB = source of truth; frontend chỉ UX.

---

## 1. HIỆN TRẠNG (đã xác minh bằng anon key trực tiếp)

| Bảng | Policy hiện tại | anon SELECT | anon INSERT/UPDATE/DELETE | Ghi chú |
|---|---|---|---|---|
| stores | `open_all_stores FOR ALL USING(true)` | ✅ mở | ✅ **mở** | P0 |
| employees | `open_all_employees` | ✅ mở | ✅ **mở** | P0 — lộ toàn bộ maNV/job_title |
| schedules | `open_all_schedules` | ✅ mở | ✅ **mở** | P0 |
| feedbacks | `open_all_feedbacks` | ✅ mở | ✅ **mở** | P0 — nội dung nhân viên |
| shift_swaps | `open_all_shift_swaps` | ✅ mở | ✅ **mở** | P0 |
| store_shelves / shelf_items | `open_all_*` | ✅ mở | ✅ **mở** | P0 |
| schedule_weeks | `open_all_schedule_weeks` | ✅ mở | ✅ **mở** | P0 |
| attendance | open (sql_chay_1_lan) | ✅ mở | ✅ **mở** | P0 — công thực tế |
| admin_logs / activity_logs / audit_logs / ai_conversations | `open_*` (sql_logs_mo.sql) | ✅ mở | ✅ **mở** | P0 — log phải bất biến |
| admin_otps | **không policy nào** | ❌ khoá | ❌ khoá | ✅ đúng — chỉ service_role qua Edge Function |

Script "hardening" tồn tại nhưng **chưa áp dụng hoặc chưa đủ**: `supabase_security_rls.sql`, `sql_supabase_auth_rls_p0.sql` (có helper `is_admin_or_manager()`, còn tin JWT metadata — xem P0-3), `sql_rls_authenticated.sql` (authenticated = full CRUD mọi bảng → vẫn không có store-scope).

---

## 2. MA TRẬN MỤC TIÊU (Phase 1)

Role: `ADMIN` · `AREA_MANAGER` (AM) · `STORE_MANAGER` (SM) · `EMPLOYEE` (FT/PT) · `anon` · `service_role`.
Scope: SM = các CH trong `user_store_roles(role=STORE_MANAGER)`; AM = CH được gán; EMPLOYEE = dữ liệu bản thân (+ lịch CH mình để xem ca).

| Resource | Role | SELECT | INSERT | UPDATE | DELETE | Scope/Ghi chú |
|---|---|---|---|---|---|---|
| stores | ADMIN | ✅ | ✅ | ✅ | ✅ | toàn hệ thống |
| stores | AM / SM | ✅ | ❌ | ⚠️ chỉ staffing/demand fields | ❌ | CH thuộc scope |
| stores | EMPLOYEE | ✅ | ❌ | ❌ | ❌ | phục vụ hiển thị tên CH |
| employees | ADMIN | ✅ | ✅ | ✅ | ✅ | |
| employees | AM | ✅ | ✅ | ✅ | ❌ | CH trong scope |
| employees | SM | ✅ | ❌ | ⚠️ không đổi role/dept/sm_id của người khác; không tự sửa mình | ❌ | CH thuộc scope |
| employees | EMPLOYEE | ✅ (danh bạ cùng CH) | ❌ | ✅ chỉ field cá nhân: sdt/thông tin liên lạc | ❌ | |
| schedules | ADMIN / AM | ✅ | ✅ | ✅ | ✅ | AM trong scope; APPROVED chỉ AM+ |
| schedules | SM | ✅ | ✅ | ✅ | ✅ | CH của mình; chặn khi tuần đã APPROVED (trừ AM+) |
| schedules | EMPLOYEE | ✅ lịch CH mình + cá nhân | ❌ | ❌ | ❌ | đọc qua view scoped |
| attendance | ADMIN / AM | ✅ | ✅ | ✅ | ❌ | sửa công = event audit bắt buộc |
| attendance | SM | ✅ | ✅ | ✅ | ❌ | CH của mình, trước khi chốt tháng |
| attendance | EMPLOYEE | ✅ bản thân | ❌ | ❌ | ❌ | |
| feedbacks | ADMIN / AM | ✅ pending+của CH scope | ✅ | ✅ resolve (state machine) | ❌ | cấm self-approve ở DB |
| feedbacks | SM | ✅ queue của CH scope (trừ yêu cầu của chính mình) | ✅ tạo | ❌ | ❌ | |
| feedbacks | EMPLOYEE | ✅ bản thân | ✅ tạo | ✅ huỷ nếu pending | ❌ | |
| shift_swaps | ADMIN / AM | ✅ | ✅ | ✅ duyệt/từ chối | ❌ | state machine |
| shift_swaps | SM | ✅ CH scope | ✅ | ✅ quyết định trong scope | ❌ | hai bên cùng CH hoặc borrow policy |
| shift_swaps | EMPLOYEE | ✅ liên quan mình | ✅ tạo | ✅ huỷ nếu pending | ❌ | |
| store_shelves / shelf_items | ADMIN | ✅ | ✅ | ✅ | ✅ | |
| … | SM | ✅ | ✅ | ✅ | ✅ | CH của mình (nghiệp vụ kệ) |
| … | EMPLOYEE | ✅ | ✅ cập nhật số lượng | ❌ | ❌ | task kệ được giao |
| schedule_weeks | ADMIN / AM | ✅ | ✅ | ✅ trạng thái chốt | ❌ | soft-lock tuần |
| … | SM | ✅ | ✅ draft | ✅ draft của CH mình | ❌ | |
| logs (admin/activity/audit/ai_conv) | ADMIN | ✅ | ❌(hệ thống ghi) | ❌ | ❌ | **INSERT-only TO authenticated, actor=auth.uid() DEFAULT, client không ghi đè** |
| … | SM / EMPLOYEE | ❌ (riêng activity của mình: ✅) | ❌ | ❌ | ❌ | |
| admin_otps | * | ❌ | ❌ | ❌ | ❌ | chỉ service_role (Edge Function) — giữ nguyên |

Helper SQL Phase 1 (sketch):
```sql
create or replace function public.my_store_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select store_id from user_store_roles where user_id = auth.uid();
$$;
create or replace function public.has_role(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from user_store_roles where user_id = auth.uid() and role = r);
$$;
-- ví dụ policy schedules:
-- create policy sm_write_own_store on schedules for all to authenticated
--   using (public.has_role('ADMIN') or public.has_role('AREA_MANAGER')
--          or public.has_role('STORE_MANAGER') and store_id in (select public.my_store_ids()));
```

---

## 3. SECURITY TEST CASES bắt buộc (map prompt §35)

| # | Scenario | Kỳ vọng |
|---|---|---|
| T1 | anon GET /rest/v1/feedbacks | 0 hàng / lỗi quyền |
| T2 | anon INSERT schedules | 401/403 |
| T3 | EMPLOYEE đọc attendance NV khác | rỗng |
| T4 | EMPLOYEE UPDATE employee khác | 0 rows affected |
| T5 | SM ghi schedules CH ngoài scope (forged store_id trong payload) | WITH CHECK từ chối |
| T6 | SM tự promote: UPDATE user_store_roles của mình | bị chặn (chỉ ADMIN) |
| T7 | SM sửa metadata JWT thành is_manager=true | quyền hiệu lực KHÔNG đổi (DB không đọc metadata) |
| T8 | AM truy cập CH chưa gán | denied |
| T9 | forged actor_user_id khi ghi log | trigger ép = auth.uid() |
| T10 | anonymous gọi Edge Function admin-otp verify bừa mã 6 lần | consumed + rate-limit |

Mỗi case = 1 test Vitest integration (REST với key tương ứng role) + pgTAP nếu bật local supabase. Mọi regression bug → thêm test trước khi fix.
