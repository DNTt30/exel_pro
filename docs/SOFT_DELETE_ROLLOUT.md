# Xóa mềm nhân viên và cửa hàng — 30/09/2026

- `deleteEmployeeData(id)` và `deleteStore(id)` chỉ UPDATE `is_active=false`, kiểm tra dòng được cập nhật để không báo thành công khi RLS chặn hoặc mã không tồn tại.
- Zustand giữ hồ sơ với trạng thái ngưng hoạt động. Không xóa lịch ca, chấm công, nhân viên trực thuộc hay kệ hàng. Nhật ký ghi thay đổi trạng thái và giữ mã hồ sơ để tra cứu.
- Màn hình quản lý hiển thị badge **Ngưng hoạt động**, popup mô tả rõ việc giữ lịch sử. Nút mở lại dùng luồng cập nhật trạng thái hiện có. Không yêu cầu xóa nhân viên/kệ trước khi ngưng cửa hàng. Giữ điều kiện gán SM khác trước khi ngưng SM qua thao tác này.
- `deleteAttendanceCell`, `deleteFeedback`, `deleteShiftSwap`, `deleteShelf` tiếp tục xóa giao dịch tương ứng theo phạm vi yêu cầu. Quét API không còn DELETE trên `employees` hoặc `stores`.
- Dùng cột `is_active` hiện có; không cần migration mới. Không sửa cơ chế đăng nhập; tài khoản nhân viên ngưng hoạt động đã bị chặn bởi auth hiện tại.

Kiểm chứng: **707 test đạt, 7 bỏ qua**; lint không lỗi/cảnh báo, build và kiểm tra kiến trúc/guardrails đạt. Script `scripts/check_soft_delete_ui.mjs` kiểm tra desktop/mobile với dữ liệu giả: ngưng và mở lại cả hai loại hồ sơ, 8 UPDATE, không DELETE, lịch sử và kệ hàng còn nguyên. Ảnh ở `artifacts/soft-delete-ui/` (không commit). Không ngưng bất kỳ hồ sơ thật nào trong lượt kiểm thử.

`npm run build` đạt, `npm run deploy` báo **Published**. Website trả HTTP 200 và bundle `/exel_pro/assets/index-C01qE1K_.js` khớp bản build ngày 30/09/2026.
