# Việc Đang Làm & Bàn Giao (`docs/bo-nho/dang-lam.md`)

Cập nhật lần cuối: `2026-10-23`

## ✅ Đã hoàn thành gần nhất
1. **Thiết kế lại Cài đặt đơn vị & Logo thương hiệu (`commit e7ac8130`):** Phóng to logo trên Header, Login, Sidebar cài đặt; làm mới trang Vai trò & phân quyền.
2. **Thanh chọn tuần/tháng thông minh (`commit 1fa8080d`):** Ghim sticky Toolbar, thêm bộ chuyển tuần/tháng ngay trên tiêu đề bảng lịch và bảng công, tự động cuộn mượt lên đầu khi đổi kỳ.
3. **Đồng bộ hiển thị Quỹ giờ & Tổng giờ (`commit 4a14bc32`):** Loại bỏ ca đăng ký chưa chốt (`confirmed: false` / `:reg`) khỏi Real-time Tracker, thẻ KPI và Modal Part-time; thêm nhãn phụ `+...h ĐK` chờ chốt và ô Tổng chốt góc dưới phải.
4. **Dây chuyền 3 Agent Săn lỗi (`commit d72a2316`):** Tạo `bug_hunter` → `qa_tester` → `dev_fixer`, viết bộ test `src/tests/bugHuntPipeline.test.js` và sửa 5 lỗi nghiêm trọng ở `pdfExport.js`, `excelExport.js`, `exportPayroll.js` (lỗi `parseFloat("22-6") === 22`), `exportOFC.js`, `shiftHelper.js` và `EmployeeSchedule.jsx`.
5. **Tích hợp Skill & Bộ nhớ "16 Bài học sau 1000 giờ dùng Claude" (`commit 3d090ec1`):** Tạo `AGENTS.md`, `.agents/rules/1000-gio-rule.md`, `.agents/skills/1000-gio-workflow/SKILL.md` và `docs/16_BAI_HOC_1000_GIO_CLAUDE.md`.
6. **Gỡ bỏ mục thừa "Hướng dẫn & hỗ trợ" khỏi Menu & Trang chủ:** Vì đã dùng ezHR9 để trao đổi nội bộ và đã có Bù công C&B + Hướng dẫn sử dụng (`HelpDrawer`), đã gỡ mục `Hướng dẫn & hỗ trợ` khỏi Sidebar (`AppLayout.jsx`), gỡ nút thừa trên `EmployeeHome.jsx`, và tự động điều hướng `/employee/support` → `/employee/home`, `/admin/support` → `/admin/dashboard` trong `App.jsx`.

## 📌 Việc tiếp theo (Khi mở phiên mới)
- Kiểm tra trải nghiệm thực tế trên trình duyệt sau khi deploy.
- Khi có yêu cầu tính năng mới hoặc phát hiện điểm bất thường, kích hoạt skill `1000-gio-workflow` hoặc `bug-hunt-pipeline`.
