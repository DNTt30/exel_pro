---
name: schedule-app-context
description: >-
  Kỹ năng (Skill) chứa toàn bộ ngữ cảnh, quy tắc kiến trúc và logic nghiệp vụ của dự án Schedule App (OFC). Tự động kích hoạt khi làm việc trong dự án này để AI không quên các quy ước đã thiết lập.
---

# Schedule App (OFC) - Ngữ cảnh & Kiến trúc Dự án

Dự án này là hệ thống Quản lý Lịch làm việc và Feedback C&B cho chuỗi cửa hàng. Dưới đây là các quy chuẩn kỹ thuật và nghiệp vụ:

## 1. Stack Công nghệ
- **Frontend**: React.js (build bằng Vite).
- **State Management**: Zustand (file `src/store/useStore.js`).
- **Styling**: Tailwind CSS.
- **Backend / DB**: Supabase (sử dụng thư viện `@supabase/supabase-js` qua RESTful API kết hợp Row Level Security). Các hàm gọi API nằm ở `src/services/api.js`.

## 2. Quy tắc Đăng nhập (Auth)
- Hệ thống sử dụng form đăng nhập nội bộ (Hướng B).
- **Mật khẩu mặc định**: Luôn luôn là `1` cho MỌI TÀI KHOẢN (cả Admin và Nhân viên).
- **Mã Nhân Viên**: Định dạng chuẩn 9 chữ số liên tiếp (validate qua regex `MA_RE = /^\d{9}$/` trong `src/data/constants.js`).
- Tài khoản Admin: `admin` / Mật khẩu: `1`.
- Tài khoản Nhân viên: `<Mã NV 9 số>` / Mật khẩu: `1`.
- Chỉnh sửa logic này tại `src/store/useStore.js` hàm `login(userId, password)`.

## 3. Kiến trúc Dữ liệu Lịch làm việc (Scheduling)
- Lịch được lưu trong biến state `schedule: { [weekDate]: { [empId]: { T2: '6-14', T3: { shift: '14-22', covering_store: 'VN0485' } } } }`.
- **Định dạng khóa tuần (weekDate)**: Chuẩn ISO `YYYY-MM-DD` có số 0 đứng trước (ví dụ: `'2026-08-10'`).
- **Loại hình nhân sự chuẩn**: `STPT` (Part-time), `STFT` (Full-time), `CSR_NEW` (Chăm sóc khách hàng).
- **Cấu hình quy chuẩn giờ làm** (`src/data/constants.js` -> `SCHEDULE_RULES`):
  - **STPT (Part-time)**: Tối thiểu 16h/tuần, tối đa 23h/tuần (~91h/tháng). Vượt 91h/tháng (hoặc >23h/tuần) báo đỏ `⚠️ > 91h`, dưới 16h/tuần báo vàng `⚠️ < 16h`.
  - **STFT (Full-time)**: Tối thiểu 48h/tuần VÀ tối thiểu 6 ca/tuần. Thiếu sẽ hiển thị cảnh báo `⚠️ < 48h` hoặc `⚠️ < 6 ca`.
- Toàn bộ hàm tính toán và kiểm tra quy chuẩn nằm tập trung tại `src/utils/shiftHelper.js`.

## 4. Nghiệp vụ "Điều chuyển / Mượn nhân sự" (Cross-store Staff)
Đây là logic **RẤT QUAN TRỌNG** của hệ thống:
- Khi một cửa hàng (VD: VN0485) mượn một nhân viên từ cửa hàng gốc (VN0470), chúng ta **KHÔNG ĐỔI** trường `dept` (cửa hàng gốc) của nhân viên đó.
- Thay vào đó, dữ liệu ca được chuẩn hóa thành object có trường `covering_store` riêng biệt: `{ shift: '6-14', covering_store: 'VN0485' }` (hỗ trợ tương thích ngược cả chuỗi cũ `6-14_VN0485` thông qua hàm `normalizeShift`).
- **Hiển thị trên UI**:
  - Tại bảng cửa hàng Đích (VN0485): Nhân viên xuất hiện với chữ *(Hỗ trợ)* màu cam, ô lịch hiện `6-14`.
  - Tại bảng cửa hàng Gốc (VN0470): Nhân viên vẫn ở đó, nhưng ô lịch bị làm xám và hiện chữ nghiêng `6-14 VN0485` để quản lý biết nhân viên đang đi chi viện.
  - Xử lý logic này tập trung tại `src/utils/shiftHelper.js` (`parseShiftForCell`, `getCoveringStore`, `getShiftCode`) và `src/hooks/useGroupedEmployees.js`.

## 5. Các Component Chính
- `Schedule.jsx`: Màn hình cốt lõi (Bảng tính Excel-like) để xếp lịch. Gồm 4 Modal quản lý tích hợp sẵn.
- `ShiftInput.jsx`: Ô chọn ca từ enum `SHIFTS`, phân biệt rõ ràng giữa `OFF` và `Chưa xếp ca`, hỗ trợ điều hướng phím mũi tên.
- `AddEmployeeModal.jsx`: Thêm nhân viên với validate 9 số và phân loại `STFT` / `STPT` / `CSR_NEW`.
- `AddStoreModal.jsx`: Thêm cửa hàng.
- `TransferModal.jsx`: Giao diện xử lý Điều chuyển (Mượn nhân sự).
- `PTOvertimeModal.jsx`: Bảng chi tiết nhân sự Part-time vượt ngưỡng.
