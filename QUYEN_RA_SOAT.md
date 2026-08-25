# BIÊN BẢN RÀ SOÁT PHÂN QUYỀN — kết quả kiểm chứng trên code

> Mỗi mục: ✅ đã đúng / 🔧 đã vá hôm nay / 📌 cần bạn chốt chính sách (đề xuất kèm theo).

## 🔴 Nhóm 1 — Mâu thuẫn logic

### 1.1 SM bị chặn menu Nhân viên nhưng phải xếp lịch — lấy dữ liệu NV từ đâu?
**✅ Không có mâu thuẫn trong thực tế.** Trang Lịch ca & Chấm công của SM dùng chung hook `useGroupedEmployees` — luôn tải ĐỦ danh sách NV (tên, mã NV, loại) thuộc các CH phụ trách để xếp ca/duyệt công. Menu "Nhân viên" bị chặn chỉ chặn QUẢN LÝ (thêm/sửa/xóa/khóa mã).
- SM xem roster: qua bảng Lịch ca (mỗi CH một khối) + Chấm công ✓
- SM sửa thông tin NV: ❌ đúng chủ đích — việc này chỉ ADMIN làm
→ **Chốt:** giữ nguyên. Không thêm menu trùng lặp.

### 1.2 sm_id là 1-1 hay 1-nhiều?
Model hiện tại: **mỗi CH có đúng 1 SM chịu trách nhiệm** (`stores.sm_id`), nhưng 1 SM được gán NHIỀU CH. Nghĩa là quan hệ SM↔CH dạng 1-nhiều phía SM.
- ✅ Hỗ trợ sẵn: SM quản lý chuỗi nhỏ 2-5 CH
- ❌ Chưa hỗ trợ: 2 SM đồng quản lý 1 CH lớn
→ **Đề xuất chốt:** giữ 1-SM/CH cho pilot (trách nhiệm rõ, tránh xung đột duyệt). Khi có CH thật sự cần đồng quản lý → nâng cấp sang bảng nối `store_managers(store_id, emp_id)` — schema tách biệt, không phá code hiện tại.

## 🟡 Nhóm 2 — Luồng nghiệp vụ

### 2.1 NV không có quyền Đổi ca?
**✅ Sai thực tế — NV CÓ gửi đổi ca.** EmployeeSchedule đã có nút yêu cầu đổi ca theo ngày (`swap badge`, lịch sử `mySwapsThisWeek`), SM/Admin duyệt tại trang Bù công C&B.

### 2.2 Bị từ chối thì sao? Có khiếu nại?
**✅ Có luồng phản hồi.** Khi duyệt/từ chối, SM ghi chú bắt buộc hiển thị lại cho NV (`fb.status === 'approved' ? 'Phản hồi:' ...`). NV thấy trạng thái + lý do ngay trong danh sách Bù công.
→ Nếu NV không đồng ý: tạo yêu cầu MỚI kèm nội dung khiếu nại — đủ dùng ở quy mô pilot.

### 2.3 Không xác nhận công trước ngày 25 thì sao? — 📌 CẦN CHỐT
**Đề xuất chính sách (chưa code):**
- Ngày 25–26: banner nhắc + SM thấy danh sách chưa xác nhận (đã có widget tiến độ)
- Sau ngày 26 (kết thúc chu kỳ): hệ thống coi như **"công mặc định đúng"**, danh sách chưa-xác-nhận chuyển thành hàng đợi cho SM rà tay
- File xuất C&B đánh dấu cột ghi chú những NV không xác nhận
=> Bạn chọn: (a) mặc định đúng như trên, hay (b) khóa bảng lương chờ SM bấm xác nhận hộ từng người?

### 2.4 Sửa công thực tế thiếu audit trail? — 🔧 ĐÃ VÁ HÔM NAY
Mỗi lần sửa giờ thực tế giờ **tự động ghi Nhật ký**: ai sửa, ngày nào, giá trị cũ → mới (kèm mã chữ AL/PL/UL...), xem được ở trang Nhật ký (Admin). Việc bắt buộc nhập lý do cho MỖI ô sửa sẽ phiền thao tác — đề xuất chỉ bắt buộc lý do khi XÓA hoặc SỬA GIẢM >2h (lần sau).

### 2.5 NV đa-CH bị trùng/thiếu công khi xuất C&B?
**📌 Phát hiện thật:** dữ liệu công thực tế gắn theo NGƯỜI (`emp_id + work_date`), không gắn theo CH → mỗi NV chỉ có 1 dòng số liệu, không bao giờ nhân đôi. NHƯNG file xuất đang lặp theo nhóm CH kèm nhân bản NV chi viện → nếu SM hai CH cùng xuất, dòng chi viện có thể lặp.
→ **Chốt đề xuất:** xuất C&B luôn theo **CH GỒC của NV**; CH tiếp nhận chỉ xem, không xuất. (Sẽ vá ở lần deploy kế nếu bạn đồng ý.)

### 2.6 Mượn NV sang CH của SM khác?
**✅ Vận hành được từ trước:** ô ca ghi `{ shift, covering_store }`, CH đích hiện '(Hỗ trợ)' màu cam. SM bên nhận thấy NV đó trong bảng lịch của mình (nhân bản hiển thị) dù sm_id khác — cross-scope hoạt động ở mức XEM/XẾP CA.

### 2.7 NV tự xem bảng lương? — 📌 roadmap
Hiện NV chỉ thấy giờ công thực tế của mình. Trang "Payslip cá nhân" (giờ chuẩn × hệ số, tổng dự kiến) là tính năng mới — nên làm sau pilot.

### 2.8 Admin/SM tự duyệt cho chính mình? — 🔧 ĐÃ CHẶN HÔM NAY
Nếu người duyệt trùng người gửi yêu cầu → hệ thống chặn với thông báo rõ ràng.

## 🟢 Nhóm 3 — Vòng đời dữ liệu & thuật ngữ

### 3.1 Khóa SM vẫn còn đứng tên CH? — 🔧 ĐÃ VÁ HÔM NAY
Bấm khóa một SM đang phụ trách ≥1 CH → popup cảnh báo liệt kê các CH đó, yêu cầu gán SM khác trước nếu cần.

### 3.2 Đổi sm_id CH sang SM khác — SM cũ thế nào?
Dữ liệu lịch/công/danh sách CH **giữ nguyên và vẫn hiển thị** nếu SM cũ đăng nhập (dữ liệu gắn theo NV, không mất). Các yêu cầu duyệt dở dang thuộc về CH → tự chuyển sang hàng đợi của SM MỚI (query theo phạm vi CH, không theo người cũ). Không cần xử lý thêm.

### 3.3 stores.is_active (khóa cửa hàng)? — 📌 cần migration SQL
Schema chưa có cột. Đề xuất: thêm `is_active boolean default true` + lọc khỏi dropdown xếp lịch + ẩn khỏi dashboard. Ước lượng 1 file SQL + 3 điểm sửa code.

### 3.4 Reset mật khẩu NV?
Theo thiết kế Hướng B mật khẩu mặc định là `1` và NV tự đổi sau (trang Security dành cho quản lý). Reset = admin hướng dẫn NV đổi lại. Nếu muốn "admin đặt lại mật khẩu bất kỳ" → cần cơ chế lưu hash riêng, đề xuất để sau pilot vì tăng độ phức tạp bảo mật.

### 3.5 Kệ & date — 3 tên 1 feature?
**✅ Đúng là một feature, ba góc nhìn:** cùng component `ShelfDateBoard` + `ShelfDateUi`. Hạn sử dụng (date/HSD) hiển thị đầy đủ ở CẢ BA cấp (component dùng chung), không chỉ Admin.

---
## TỔNG KẾT THAY ĐỔI CODE HÔM NAY
| # | Vá | File |
|---|---|---|
| 1 | Audit trail sửa công thực tế vào Nhật ký | useStore.js |
| 2 | Chặn tự duyệt yêu cầu của chính mình | FeedbackCB.jsx |
| 3 | Cảnh báo khóa SM còn đứng tên CH | Employees.jsx |