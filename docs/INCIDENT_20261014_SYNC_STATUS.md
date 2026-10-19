# Nhãn Offline sau bản phát hành 13/10

## Nguyên nhân đã xác nhận

Auth và API cấu hình Supabase vẫn trả HTTP 200. Tải nhân viên bị từ chối `42501`: cột mới `employees.workspace_role_id` chưa được cấp SELECT cho `authenticated`. Migration hồ sơ cá nhân đã chuyển bảng employees từ quyền SELECT toàn bảng sang quyền theo cột, nên cột thêm sau đó không tự có quyền đọc.

`CloudSyncBadge` lại gộp lỗi tải/lưu dữ liệu và lỗi WebSocket thành chữ `Offline`, khiến lỗi quyền dữ liệu trông giống mất kết nối Supabase.

## Khắc phục production ngày 14/10/2026

- Áp dụng `20261014000000_workspace_role_read_grant.sql`: chỉ cấp SELECT cột vai trò cho authenticated, giữ nguyên RLS, quyền ghi và các cột hồ sơ riêng tư; tải lại schema PostgREST.
- Kiểm tra chỉ đọc dưới role authenticated và danh tính Admin trong transaction rollback: employees, stores, schedules, feedbacks, shift_swaps, store_shelves, shelf_items, schedule_weeks và workspace_roles đều thực thi được. Không thử sửa dữ liệu nhân sự thật.
- Phát hành frontend: phân biệt `Lỗi đồng bộ`, `Live gián đoạn`, `Kiểm tra đăng nhập`, trạng thái đang lưu và chưa nối Live. Chỉ báo Live khi kênh thực sự SUBSCRIBED. Xóa cảnh báo phiên cũ sau khi khôi phục phiên thành công.
- `npm run deploy` báo Published; trang công khai HTTP 200, HTML khớp bản build `index-CXO4Wd36.js`.

## Ngăn tái diễn

Suite database trước đó dùng schema nền với quyền SELECT toàn bảng, nên không phát hiện thiếu grant của cột mới. Đã sửa fixture để áp dụng migration bảo mật hồ sơ trước migration vai trò: tái hiện lỗi trước hotfix; đọc được sau hotfix; anon và quyền đọc trực tiếp ngày sinh vẫn bị từ chối. Suite operational với `--production-shape` đạt toàn bộ.

37 test giao diện trạng thái và stability regression đạt. Lint không lỗi (14 cảnh báo hiện hữu), build thành công. Cập nhật SQL Editor bundle, hướng dẫn rollout và script preflight để kiểm tra cả quyền SELECT cột mới, không chỉ sự tồn tại bảng/RPC.

Người dùng tải lại trang hoặc bấm nút thử lại trên thanh trạng thái; bản sửa không yêu cầu đổi mật khẩu.
