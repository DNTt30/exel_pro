# GS25 Schedule & Store Operations Platform (OFC)

> Hệ thống Quản lý Phân ca Thông minh, Chấm công Thực tế và Quản lý Kệ hàng Cận Date cho Hệ thống Cửa hàng Tiện lợi GS25.

[![Continuous Integration (CI)](https://github.com/DNTt30/exel_pro/actions/workflows/ci.yml/badge.svg)](https://github.com/DNTt30/exel_pro/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/DNTt30/exel_pro/actions/workflows/deploy.yml/badge.svg)](https://github.com/DNTt30/exel_pro/actions/workflows/deploy.yml)
[![Eval Score](https://img.shields.io/badge/Eval%20Score-100%2F100-brightgreen)](https://dntt30.github.io/exel_pro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📖 1. Giới Thiệu Dự Án

Ứng dụng phục vụ việc quản lý điều phối nhân sự và vận hành chuỗi cửa hàng tiện lợi **GS25**:
- **Xếp lịch tuần tự động & AI Copilot:** Hỗ trợ Cửa hàng trưởng (SM) phân ca chuẩn GS25 (ca 4 tiếng, 8 tiếng), đảm bảo tuân thủ luật lao động (nghỉ giữa ca $\ge 11$h, giới hạn Part-time $\le 23$h hoặc $\le 91$h/chu kỳ), kiểm soát thiếu/thừa nhân sự theo định biên doanh thu.
- **Hạn chót nộp lịch tuần:** SM thiết lập hạn nộp lịch trước ngày/giờ chỉ định, hệ thống tự động khóa ô đăng ký ca đối với nhân viên khi hết hạn.
- **Quản lý hạn dùng kệ hàng (Shelf Expiry & Date):** Giao kệ cho nhân sự phụ trách, ghi nhận date hàng hóa cận hạn và cảnh báo tự động trước $N$ ngày.
- **Đối soát chấm công thực tế (ezHR9):** Nhập file Excel bảng công thực tế từ máy chấm công vân tay ezHR9, đối soát chênh lệch giờ công và hỗ trợ quy trình khiếu nại/bù công C&B.
- **Đơn xin đổi ca (Shift Swap):** Nhân viên chủ động gửi đơn đổi ca cho đồng nghiệp cùng cửa hàng và trình Cửa hàng trưởng duyệt điện tử.

---

## 🛠️ 2. Kiến Trúc Công Nghệ

- **Frontend Core:** [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/)
- **State Management:** [Zustand 5](https://github.com/pmndrs/zustand) phân bổ theo kiến trúc Slices (`authSlice`, `scheduleSlice`, `employeeSlice`, `shelfSlice`, `adminSlice`)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL 15+, Row-Level Security, Realtime WebSocket, Edge Functions)
- **Data Export & Reports:** SheetJS (`xlsx`), jsPDF, HTML2Canvas
- **Testing & Quality Gates:** [Vitest 4](https://vitest.dev/), [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

---

## 📁 3. Cấu Trúc Thư Mục

```text
├── .github/
│   ├── workflows/          # GitHub Actions (CI test/lint & CD deploy)
│   └── dependabot.yml      # Cấu hình tự động quét bảo mật
├── frontend/
│   ├── src/
│   │   ├── components/     # UI Components, Modals, Layouts, Visual Charts
│   │   ├── data/           # Constants chuẩn GS25, công thức, định biên
│   │   ├── lib/            # Supabase Client, Auth Session, Throttle
│   │   ├── pages/          # Admin & Employee Views (Schedule, Timesheet, Stores...)
│   │   ├── services/api/   # Lớp API gọi CSDL đóng gói chuẩn theo từng thực thể
│   │   ├── store/slices/   # Zustand State Slices
│   │   ├── tests/          # 42+ Unit & Integration Test Suites
│   │   └── utils/          # Bộ engine AI xếp lịch, xử lý ca, đối soát ezHR9
│   ├── package.json
│   └── vite.config.js
├── supabase/
│   ├── functions/          # Edge Functions (telegram-notify, admin-otp, reset-password)
│   └── migrations/         # Baseline Schema & CSDL migrations có version
├── sql_missing_indexes_audit.sql # Script SQL tối ưu hóa chỉ mục hiệu năng cao
└── README.md
```

---

## 🚀 4. Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

### Yêu cầu tiên quyết:
- **Node.js:** $\ge 20.x$ (Khuyên dùng Node 22 LTS)
- **npm:** $\ge 10.x$

### Các bước thực hiện:
```bash
# 1. Clone mã nguồn
git clone https://github.com/DNTt30/exel_pro.git
cd exel_pro/frontend

# 2. Cài đặt thư viện phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường
cp .env.example .env
# Chỉnh sửa VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env

# 4. Chạy môi trường phát triển (Development Server)
npm run dev
```
Ứng dụng sẽ khả dụng tại: `http://localhost:5173`

---

## 🧪 5. Kiểm Thử & Kiểm Soát Chất Lượng (Quality Gates)

Dự án áp dụng cổng kiểm soát chất lượng tự động nghiêm ngặt:

```bash
# Chạy toàn bộ 42 test suites kiểm tra logic nghiệp vụ và bảo mật
npm test

# Kiểm tra cú pháp và chất lượng mã nguồn bằng oxlint
npm run lint

# Chạy vòng lặp đánh giá chất lượng toàn diện (Autonomous Eval Loop)
npm run audit:all

# Build kiểm tra đóng gói sản phẩm
npm run build
```

---

## 🔒 6. Chính Sách Bảo Mật & Phân Quyền (RBAC)

- **Row Level Security (RLS):** Toàn bộ các bảng CSDL (`schedules`, `employees`, `stores`, `feedbacks`, `shelf_items`, `shift_swaps`) đều được kích hoạt chính sách RLS phân tách quyền hạn chặt chẽ theo `store_id` và chức danh.
- **Bảo mật xác thực:** Chống brute-force đăng nhập với cơ chế throttle lũy tiến, mã hóa mật khẩu qua Supabase Auth, hỗ trợ xác thực mã OTP quản trị viên.
- **Không hardcode Secrets:** Tuyệt đối không lưu trữ Secret token hoặc Service Role key ở client bundle.

### 6.1 Cập nhật trạng thái Security Audit (21/09)
*   **P0-3 (Quyền Role phụ thuộc Metadata client):** 🔶 Đã được ngăn chặn (Mitigated) ở Frontend. Giải pháp triệt để đã được khởi thảo qua script `20260921000000_p03_custom_jwt_hook.sql` (Custom Access Token Hook của Supabase) chờ kích hoạt trên dashboard.
*   **P0-2 (Mật khẩu mặc định suy diễn được):** ⚠️ Vẫn đang được cấu hình có chủ đích trong giai đoạn chuyển tiếp. Frontend đã vá lỗ hổng `password === '1'`, bắt buộc nhân viên nhập password thật. Việc xóa bỏ công thức gen password tĩnh sẽ được thực hiện khi tính năng **Đăng nhập OTP (Telegram/Email)** hoàn thiện ở Sprint tiếp theo.

---

## 🌐 7. Triển Khai Trực Tuyến

Trang web production được xuất bản tự động qua GitHub Pages:  
👉 **[https://dntt30.github.io/exel_pro/](https://dntt30.github.io/exel_pro/)**
