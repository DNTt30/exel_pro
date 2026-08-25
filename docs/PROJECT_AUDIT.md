# PROJECT AUDIT — OFC Schedule App (exel_pro)

> Ngày audit: 2026-08-25 · Commit gốc: `f0f2917` · Phạm vi: toàn repo `D:schedule-app` (= github.com/DNTt30/exel_pro)
> Phương pháp: đọc code + probe trực tiếp Supabase REST (anon key) + git history. **Chưa sửa code** — đây là Phase 0.

---

## A. ARCHITECTURE

### Frontend (production — `frontend/`)
React 19 + Vite 8 (rolldown) + Tailwind 4 + Zustand v5 (persist: `currentWeek`, `user`) + React Router 7 + Vitest 4 (23 file / 152 test, pass) + oxlint (0 warning). JS thuần (không TS). Deploy GitHub Pages (`dntt30.github.io/exel_pro/`) qua workflow gate lint→test→build→publish gh-pages (peaceiris).

### Backend
Không backend Node tự vận hành. "Backend" = **Supabase** (Postgres + Auth + RLS + Edge Functions):
- `supabase/functions/admin-otp` — OTP 2FA admin qua Telegram (service_role ghi `admin_otps`, verify hash SHA-256, TTL 5 phút, max 5 lần thử, device token 30 ngày). Đã deploy, đã xác minh 200 OK end-to-end.
- `supabase/functions/telegram-notify` — thông báo.

### Database
Postgres (Supabase project `plitfdjzuealjxbylwxy`). Bảng nghiệp vụ: `stores` (id, name, sm_id, is_active…), `employees` (id=maNV 9 số, dept, role/type/job_title, max_h, is_active…), `schedules` (week_date × emp_id, giá trị JSON-ish ca), `attendance` (PK emp_id+work_date, actual_hours), `feedbacks`, `shift_swaps`, `store_shelves` + `shelf_items`, `schedule_weeks`, log: `admin_logs`/`activity_logs`/`audit_logs`/`ai_conversations`, bảo mật: `admin_otps`.
Prisma ở root chỉ để migrate/studio (server-side, bypass RLS) — frontend **không** import Prisma (đã grep xác nhận).

### Authentication (Hướng B — hiện trạng)
Form nội bộ: admin `admin/1`, NV = mã 9 số. Dưới nắp: Supabase Auth với **email/password suy diễn**: `{maNV}@ofc.app` / `ofc-{maNV}-1` (`lib/authSession.js`). Client tự `signUp` provision user khi thêm NV, tự `updateUser({data})` ghi metadata vai trò. Login throttle client-side (`loginThrottle`). 2FA Telegram cho tài khoản admin.

### Authorization (hiện trạng)
100% client-side: `isManagerFromEmp/isStoreManagerFromEmp/isAreaManagerFromEmp/canPickStore/appRoleOf` suy vai trò từ chuỗi `job_title`+`role`+`type`; phạm vi cửa hàng từ `user.dept` (có thể là **danh sách phẩy** "VN0485,VN0497") ∪ `stores.sm_id`. Router guard client-only. DB hiện **không enforce gì** (mục P0-1).

### Service architecture
`services/api.js` barrel → `services/api/{stores,employees,schedules,feedbacks,logs,shiftSwaps,shelves,weeks,attendance}.js`. Component ⇒ useStore ⇒ api ⇒ supabase-js. Rule "chỉ service gọi Supabase" được tuân thủ tốt.

### AI architecture
Client-side engine `utils/aiSchedulerEngine.js` (~1170 dòng): xếp ca theo doanh thu (PEAK_TABLE → demand matrix → CANON_ORDER night→short-peak PT→long backbone). AI Copilot drawer hỏi-đáp + gợi ý; chưa có action-mutation qua permission layer.

### Excel architecture
Export: `utils/exportPayroll.js` (mẫu C&B đầy đủ), `utils/excelExport.js`. Import: `components/modals/ImportScheduleModal.jsx` — parse SheetJS, preview parsedData, auto-tạo NV (`provisionAuthUser`), lưu tuần tự từng bản ghi.

---

## B. DEPENDENCY MAP

```
Page (pages/admin/*, pages/Dashboard.jsx, pages/employee/*)
 ↓
Component (components/*, modals/*)
 ↓
Hook (hooks/useGroupedEmployees.js …)
 ↓
Store (store/useStore.js — Zustand, persist user+currentWeek)
 ↓
Service (services/api/*.js — duy nhất chạm supabase-js)
 ↓
supabase-js (lib/supabase.js, anon key) → Postgres + RLS (+ Edge Functions)
```
Lệch kiến trúc đáng chú ý: `lib/authSession.js` tự tạo client riêng để provision (chấp nhận được nhưng phải đưa về server khi harden); `utils/dataScope.js visibleDeptIds` là nguồn scope duy nhất phía client (đã thống nhất 2026-08-25).

---

## C. CRITICAL FINDINGS

### P0 — critical security / data corruption

| # | Vấn đề | Bằng chứng / File | Ảnh hưởng | Hướng sửa | Migration | Test cần thêm | Risk khi sửa |
|---|---|---|---|---|---|---|---|
| P0-1 | **RLS mở hoàn toàn**: 12 bảng có policy `FOR ALL TO anon, authenticated USING(true) WITH CHECK(true)` | `sql_chay_1_lan.sql` (đã chạy), `sql_logs_mo.sql` (đã chạy); probe REST anon-key đọc được stores/employees | Ai có anon key (public trong bundle) đọc+SỬA+XÓA mọi dữ liệu: lịch, công, NV, feedback, log | Migration RLS mới theo ma trận mục tiêu (docs/RLS_MATRIX.md): `anon` = SELECT tối thiểu phục vụ login; `authenticated` = scoped theo store/role qua helper SQL; log tables = INSERT-only + admin SELECT | `supabase_security_rls.sql` + `sql_rls_authenticated.sql` có sẵn nhưng **chưa đủ mạnh** (authenticated=all) và **chưa áp dụng** — viết lại | Test pgTAP/REST: anonymous denied, cross-store denied… (§E) | Cao: app đang dựa phiên Auth Hướng B — phải đảm bảo mọi client có session trước khi bật, otherwise UI trắng dữ liệu ghi |
| P0-2 | **Mật khẩu suy diễn được từ mã NV công khai**: `AUTH_PASSWORD='1'`, password thật `ofc-{maNV}-1`, email `{maNV}@ofc.app` | `frontend/src/lib/authSession.js:4-16`; danh sách maNV đọc được bởi anon (P0-1) | Kẻ xấu tự đăng nhập **bất kỳ ai** (kể cả SM/admin `admin@ofc.app`) | Loại bỏ formula: đặt password thật qua invite/OTP admin, bắt buộc đổi lần đầu; tạm thời chặn signIn khi chưa đổi | Cột `profiles.credential_set_at`; policy từ chối login cũ khó làm ở DB → chuyển flow sang magic-link/invite | Test: login bằng formula phải FAIL sau migration | Cao: phá UX Hướng B hiện tại → cần phase chuyển tiếp có kế hoạch truyền thông tới SM |
| P0-3 | **Metadata vai trò do client ghi**: `authMetadata()` + `updateUser({data})` đặt `role/is_manager/dept` | `lib/authSession.js:98-105,169,183` | Forged JWT metadata = self-promote SM/OFC nếu policy tin `auth.jwt()` (script p0 hiện tại có nhánh này!) | Nguồn chân lý vai trò = bảng DB (`user_store_roles`), JWT claim sinh bằng Custom Access Token Hook đọc DB; client không được ghi role | Bảng authorization mới (mục I) + hook | Test forged-metadata không đổi được quyền hiệu lực | Trung bình: cần hook + redeploy GoTrue config |
| P0-4 | **Audit log không tin cậy**: 4 bảng log mở ghi cho anon; `attendance.updated_by`, `admin_logs.actor` do client gửi | `sql_logs_mo.sql`; `useStore.saveAttendanceCell` fire-and-forget appendAdminLog | Kẻ xấu xoá/ghép log; actor giả mạo | Log tables: INSERT-only TO authenticated, SELECT admin-only; actor = `auth.uid()` DEFAULT trong trigger, cấm client ghi đè; audit event schema (before/after/request_id) | Trigger `set_actor()` + policy | Test: anon INSERT bị chặn; actor luôn = JWT sub | Thấp |

### P1 — high priority production issue

| # | Vấn đề | File | Sửa |
|---|---|---|---|
| P1-1 | Quan hệ bằng text, thiếu FK: `stores.sm_id→employees.id`, `employees.dept→stores.id`, `attendance.updated_by`… | `sql_store_sm.sql`, schema | ADD CONSTRAINT FK + validate orphan trước |
| P1-2 | Multi-store bằng **string phẩy** `dept="VN0485,VN0497"` | `getUserDepts()` authSession.js:51-58 | Bảng nối `user_store_roles(user_id, store_id, role)` + view tổng hợp; backfill từ sm_id + dept split |
| P1-3 | Lost-update bulk upsert: `saveBulkEmployeeSchedules` không optimistic lock | `services/api/schedules.js`, useStore | Cột `version`/`updated_at` + `WHERE version=`; trả CONFLICT cho UI báo người dùng |
| P1-4 | Import Excel thiếu contract: chưa Zod-parse, preview chưa phân loại valid/warning/error theo row, lưu tuần tự không transaction, auto-create NV trong loop | `ImportScheduleModal.jsx` | Pipeline Upload→Parse→Zod→Business rules→Preview→Confirm→RPC transaction (single SQL function)→Result |
| P1-5 | Schedule approval chưa có state machine (DRAFT/SUBMITTED/APPROVED/REJECTED + timestamps) | useStore, schedules API | Thêm cột trạng thái + RLS chặn bypass (chỉ AM/admin APPROVED) |
| P1-6 | Vai trò = free-text ("quản lý","cửa hàng trưởng","OFC",type="SM") | authSession.js:18-44 | Chuẩn hoá enum `ADMIN/AREA_MANAGER/STORE_MANAGER/FULL_TIME/PART_TIME/EMPLOYEE`; map label tiếng Việt ở UI |

### P2 — architectural
- **TypeScript**: toàn bộ .jsx/.js. Migrate dần: types/ → services → schemas → store. Không rewrite 1 lần.
- **Zustand persist `user`** gây stale-session (đã nhiều lần phải re-login sau đổi quyền) → bỏ persist user, fetch profile fresh mỗi boot.
- **Error handling** rải rác toast string; chuẩn hoá `{code,message,details,requestId}` + mapping DATABASE_ERROR/PERMISSION_DENIED/CONFLICT…
- **Excel export**: `exportPayroll.js` ổn; tách chung util workbook writer.

### P3 — optimization
- Schedule grid render toàn bộ dòng (backlog virtualization >100 NV); đo benchmark trước.
- Đọc full-table mỗi mount (employees/stores) — cân nhắc select cột cần + cache SWR-style.
- Bundle: XLSX đã dynamic-import đúng ✓; lucide tree-shake ok.

### P4 — nice-to-have
- Gom tài liệu root (`MA_TRAN_QUYEN`, `QUYEN_RA_SOAT`, `HUONG_DAN_SM`) vào `docs/`; dọn scratch files (`scratch_*.mjs`, `sheet*.csv`, `browser_test_result.png`) khỏi repo root.
- `deploy.yml`: thay bước peaceiris (hôm nay đã gặp race fail 1 lần) bằng pattern chính thức upload-pages-artifact/deploy-pages; bỏ fallback hardcode anon key trong yml.

---

## D. TECHNICAL DEBT
- 21 file SQL rải rác ở root, thứ tự chạy "truyền miệng" (`sql_chay_1_lan.sql` tự nhận "thay thế mọi file khác" nhưng vẫn còn script relax/open sau đó) → cần thư mục `supabase/migrations/` đánh版本 + 1 file "state hiện tại" duy nhất.
- Hai hệ hình historically: Prisma schema (introspect Supabase, comment "requires additional setup") vs SQL tay — chọn 1 nguồn migrate.
- Session user shape lệch nhau giữa các trang (đã thống nhất visibleDeptIds 2026-08-25) — cần 1 hook `useScope()`.

## E. DEAD CODE / F. DUPLICATE CODE
- `schedule-app/` = prototype Vite độc lập (14 file src, package riêng) — AGENTS.md xác nhận legacy. **Không có logic nào mới hơn production**; logic trùng lặp kiểu cũ của shiftHelper. Đề xuất: `git mv schedule-app archive/schedule-prototype` (P3, không gấp, không xoá history).
- `sql_rls_relax_writes.sql`, `supabase_security_rls.sql`, `sql_supabase_auth_rls_p0.sql`… = các "phương án A/B" chồng lớp → sau hardening phải dọn + đánh dấu superseded.
- Barrel `api.js` giữ nguyên (pattern tốt); trùng lặp logic scope từng trang đã được gỡ ngày 25/08 (commit 63cc4ef).

## G. PERFORMANCE BOTTLENECKS
Grid lịch render đồng bộ toàn bộ (100×7 ô hiện tại OK; 500+ sẽ giật) · full-table fetch mỗi trang · Zustand selector đã dùng useShallow ở phần lớn nơi (tốt) · XLSX lazy ✓ · ảnh icon lucide ok. Benchmark trước khi tối ưu (prompt §28).

## H. SECURITY VULNERABILITIES (tổng hợp)
P0-1…P0-4 ở trên + : bot token KHÔNG nằm trong repo ✓ (chỉ Supabase secrets); `.env` root không track ✓ (DATABASE_URL local only); frontend không chứa service_role/prisma ✓ (grep 0 hit); `npm audit`: **0 vulnerabilities** ✓; fallback anon key trong deploy.yml là publishable key (chấp nhận được, nên chuyển hết sang secret).

## I. DATABASE RISKS
Thiếu FK/index có chủ đích: đề xuất index theo query thực tế: `employees(dept)`, `employees(is_active)`, `stores(sm_id)`, `schedules(week_date,emp_id)` (PK-like), `attendance(emp_id,work_date)` (đã PK ✓), `admin_logs(created_at DESC)`, `admin_logs(actor_user_id)`, `feedbacks(status,created_at)`, `shift_swaps(status)`. Timezone: `created_at timestamptz` ✓ nhưng `week_date/date` nhập tay dạng text ISO — ràng buộc CHECK format + unique (week_date,emp_id) nếu chưa có. Orphan check trước khi thêm FK.

## J. ROADMAP ĐỀ NGHỊ (map prompt §46)
1. **Phase 1 Security**: user_store_roles + enum roles + RLS matrix + auth hook claims + kill formula password (kế hoạch chuyển tiếp 2 tuần cho SM) + log INSERT-only + actor server-side.
2. Phase 2 DB: FK/backfill/index/constraints + migrations chuẩn hoá vào supabase/migrations.
3. Phase 3 Schedule: conflict engine thống nhất (severity INFO→BLOCKER), optimistic locking, approval state machine.
4. Phase 4 Code quality: TS dần (types→services→schemas→store), Zod contract 2 chiều, error model.
5. Phase 5 Excel: import pipeline preview/transaction như P1-4.
6. Phase 6 Performance: benchmark grid, virtualization, query slim.
7. Phase 7 AI: scoring configurable, constraint engine tách khỏi LLM, action layer permission-checked read-first.
8. Phase 8 Testing: unit rule + security regression (mỗi bug 1 test) + RLS test tự động.
9. Phase 9 Docs: ARCHITECTURE/AUTH/RLS_MATRIX/DATABASE/SCHEDULE_ENGINE/EXCEL_IMPORT/AI_ARCHITECTURE/DEPLOYMENT/SECURITY phản ánh code thật.

> Nguyên tắc xuyên suốt: **database là nguồn chân lý authorization**, frontend chỉ UX; không hy sinh security để thêm feature; mỗi phase phải lint+test+build xanh; không DROP/TRUNCATE dữ liệu thật không backup.
