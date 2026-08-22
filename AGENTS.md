# Schedule App (OFC) — Project Rules

Hệ thống quản lý lịch làm việc, đổi ca, timesheet và feedback C&B cho chuỗi cửa hàng. App thật nằm trong `frontend/`. Thư mục `schedule-app/` là prototype cũ — **không sửa** trừ khi được yêu cầu rõ.

Chi tiết nghiệp vụ dài: `.agents/skills/schedule-app-context/SKILL.md`. File này chỉ giữ quy tắc bắt buộc khi viết code.

## Commands

Chạy trong `frontend/`:

```bash
npm install
npm run dev      # Vite, mặc định http://localhost:5173
npm run test     # vitest run
npm run lint     # oxlint
npm run build    # vite build
```

Cần `frontend/.env` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Không commit `.env`.

Prisma (migrate / studio) nằm ở **root repo**, không trong `frontend/`. Không import `@prisma/client` vào Vite — Prisma bypass RLS. Connection: `DATABASE_URL` (6543 + pgbouncer) và `DIRECT_URL` (5432). User DB khuyến nghị: `prisma` (`sql_prisma_user.sql`).

## Stack & layout

- React 19 + Vite 8 + Tailwind 4 + Zustand (`persist`) + React Router 7
- Supabase JS client: `frontend/src/lib/supabase.js`
- API duy nhất: `frontend/src/services/api.js` (không gọi Supabase từ component)
- State: `frontend/src/store/useStore.js`
- Hằng số / rule giờ: `frontend/src/data/constants.js`
- Enum ca: `frontend/src/data/initialData.js` (`SHIFTS`)
- Tính ca, giờ, định biên, chi viện: `frontend/src/utils/shiftHelper.js`
- Validate Zod: `frontend/src/schemas/validationSchemas.js`
- AI Copilot (client): `frontend/src/utils/aiSchedulerEngine.js`

Routes: `frontend/src/App.jsx`. Admin: `/admin/*`. Nhân viên: `/employee/*`.

## Auth (Hướng B)

Sửa login chỉ trong `useStore.login`.

- Mật khẩu mặc định **luôn là `1`** cho mọi tài khoản
- Admin: `admin` / `1`
- Nhân viên: mã 9 số (`MA_RE = /^\d{9}$/`) / `1`
- Manager: `role` chứa “quản lý” / “cửa hàng trưởng”, hoặc `role`/`type` = `SM` → `isManager: true`

Đây là form nội bộ, không phải Supabase Auth trên UI.

## Dữ liệu lịch — không phá shape

```
schedule[weekDate][empId][dayKey] = '6-14'
  | { shift: '14-22', covering_store: 'VN0485' }
```

- `weekDate`: ISO `YYYY-MM-DD` có số 0 (`2026-08-10`)
- `dayKey`: `T2` … `T7`, `CN`
- `''` = chưa xếp. `'off'` = nghỉ. Hai trạng thái này **không được gộp**
- Đọc ca luôn qua `normalizeShift` / `getShiftCode` / `getCoveringStore`. Hỗ trợ chuỗi cũ `6-14_VN0485`

## Chi viện (covering_store) — rule cứng

Khi cửa hàng B mượn NV của cửa hàng A:

- **Không đổi** `employee.dept` (cửa hàng gốc)
- Ghi `{ shift, covering_store }` trên ô ca
- Cửa hàng đích: hiện NV *(Hỗ trợ)* màu cam, ô ca là mã ca
- Cửa hàng gốc: ô xám, chữ nghiêng `6-14 VN0485`

Logic UI: `shiftHelper.parseShiftForCell` + `useGroupedEmployees`.

## Quy chuẩn giờ (`SCHEDULE_RULES`)

| Loại | Rule |
|---|---|
| STPT | ≥ 16h/tuần; ≤ 23h/tuần (~91h/tháng). Vượt → đỏ `⚠️ > 91h`. Thiếu → vàng `⚠️ < 16h` |
| STFT / CSR_NEW | ≥ 48h/tuần **và** ≥ 6 ca/tuần |

Thêm rule giờ/ca mới thì sửa `constants.js` + `shiftHelper.js` + test trong `frontend/src/tests/`. Không nhét số magic vào JSX.

## Persistence

- Lưu lịch nhiều người: `saveBulkEmployeeSchedules` (bulk upsert). Không loop `saveEmployeeSchedule`
- Optimistic UI + rollback nếu API fail
- Bảng chính: `stores`, `employees`, `schedules`, `feedbacks`, `shift_swaps`
- Map field: `maxH` ↔ `max_h`, `empId` ↔ `emp_id`

## Conventions

- JSX + JS, không TypeScript
- Functional components, hooks
- UI tiếng Việt; identifier tiếng Anh
- Tailwind utility classes; icon `lucide-react`
- Sửa UI: kiểm tra desktop + mobile, và các route dùng chung state (admin vs employee)
- Đổi logic lịch/giờ/chi viện: chạy `npm run test` trong `frontend/`
- Không thêm backend Node. Không đổi mật khẩu mặc định. Không đưa secret vào git
