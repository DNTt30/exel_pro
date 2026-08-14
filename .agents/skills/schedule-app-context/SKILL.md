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
- **Backend / DB**: Supabase (sử dụng thư viện `@supabase/supabase-js` qua RESTful). Các hàm gọi API nằm ở `src/services/api.js`.

## 2. Quy tắc Đăng nhập (Auth)
- Hệ thống sử dụng form đăng nhập tự chế (Không dùng Supabase Auth).
- **Mật khẩu mặc định**: Luôn luôn là `1` cho MỌI TÀI KHOẢN (cả Admin và Nhân viên). 
- Tài khoản Admin: `admin` / Mật khẩu: `1`.
- Tài khoản Nhân viên: `<Mã NV>` / Mật khẩu: `1`.
- Chỉnh sửa logic này tại `src/store/useStore.js` hàm `login(userId, password)`.

## 3. Kiến trúc Dữ liệu Lịch làm việc (Scheduling)
- Lịch được lưu trong biến state `schedule: { [weekDate]: { [empId]: { T2: '6-14', T3: '14-22' } } }`.
- Các loại ca (Shift) phổ biến: `6-14`, `14-22`, `10-18`, `18-22`.
- Có validation cảnh báo: Nhân sự PT thiếu 16h/tuần sẽ bị báo đỏ (⚠️). Nhân sự FT/CSR không đủ 6 ca/tuần sẽ báo lỗi.

## 4. Nghiệp vụ "Điều chuyển / Mượn nhân sự" (Cross-store Staff)
Đây là logic **RẤT QUAN TRỌNG** của hệ thống:
- Khi một cửa hàng (VD: VN0485) mượn một nhân viên từ cửa hàng gốc (VN0470), chúng ta **KHÔNG ĐỔI** trường `dept` (cửa hàng gốc) của nhân viên đó.
- Thay vào đó, mã ca làm việc trong lịch sẽ được nối thêm đuôi `_MãCửaHàngĐích` (Ví dụ: `6-14_VN0485`).
- **Hiển thị trên UI**:
  - Tại bảng cửa hàng Đích (VN0485): Nhân viên xuất hiện với chữ *(Hỗ trợ)* màu cam, ô lịch hiện `6-14`.
  - Tại bảng cửa hàng Gốc (VN0470): Nhân viên vẫn ở đó, nhưng ô lịch bị làm xám và hiện chữ nghiêng `6-14 VN0485` để quản lý biết nhân viên đang đi chi viện.
  - Xử lý parsing này nằm trong `src/pages/admin/Schedule.jsx` (hàm `parseShiftForCell` và `groupedEmps`).

## 5. Các Component Chính
- `Schedule.jsx`: Màn hình cốt lõi (Bảng tính Excel-like) để xếp lịch. Gồm 3 Modal quản lý tích hợp sẵn.
- `AddEmployeeModal.jsx`: Thêm nhân viên.
- `AddStoreModal.jsx`: Thêm cửa hàng.
- `TransferModal.jsx`: Giao diện xử lý Điều chuyển (Mượn nhân sự).

*Ghi chú: Đừng thay đổi logic cốt lõi ở phần 2 và 4 trừ khi User yêu cầu rõ ràng.*
