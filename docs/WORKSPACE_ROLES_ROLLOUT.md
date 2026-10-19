# Vai trò tùy chỉnh

Admin vào **Cài đặt đơn vị → Quản lý vai trò & quyền truy cập** để tạo, đổi tên, ngưng gán mới/mở lại và gán vai trò cho nhân viên đã có hồ sơ. Khi thêm nhân viên mới, tạo hồ sơ trước rồi gán vai trò tại đây.

## Nhóm quyền

| Nhóm | Quyền kế thừa | Phạm vi |
|---|---|---|
| Nhân viên | STFT/STPT/CSR_NEW theo loại hợp đồng | Nghiệp vụ nhân viên hiện có |
| Quản lý cửa hàng | SM | Cửa hàng được phân công theo `dept` và rule hiện tại |
| Quản lý khu vực | OFC | **Toàn bộ cửa hàng trong đơn vị**, đúng phạm vi OFC hiện có |

Tên tùy chỉnh chỉ là dữ liệu hiển thị trong danh sách nhân viên, lưới lịch, bảng công và hồ sơ. Không ghi tên này vào `role`/`job_title` để tránh cơ chế nhận diện tên quản lý cũ tự cấp quyền. `type`, `max_h`, `dept`, mật khẩu và dữ liệu lịch không đổi khi gán vai trò.

Nhóm quyền của một vai trò đã tạo không đổi được: tạo vai trò khác và gán lại từng người để thay đổi quyền có chủ đích. Ngưng gán mới giữ nguyên quyền người đang dùng, không xóa dữ liệu. Bỏ vai trò tùy chỉnh đưa nhân viên về quyền nhân viên theo hợp đồng. Không hỗ trợ tạo quyền Admin mới hay bật/tắt quyền riêng lẻ.

## Triển khai

1. Đảm bảo database catchup đã chạy; cài đặt nhận diện dùng `sql_workspace_branding.sql` của bước trước.
2. Chạy toàn bộ [sql_workspace_roles.sql](sql_workspace_roles.sql) trong Supabase SQL Editor. Nếu đã chạy bản trước ngày 14/10/2026, chạy bổ sung `supabase/migrations/20261014000000_workspace_role_read_grant.sql`. Cột vai trò mới cần quyền SELECT riêng vì hồ sơ nhân viên sử dụng quyền đọc theo cột. Không cần đổi JWT hoặc mật khẩu.
3. Build và phát hành frontend sau khi migration thành công. Nếu chưa có migration, danh sách nhân viên vẫn đọc được nhưng phần vai trò báo chưa sẵn sàng.
4. Admin tạo một vai trò quyền Nhân viên và một vai trò quyền SM; thử gán trên tài khoản kiểm thử. Người được đổi quyền đăng nhập lại để cập nhật menu. Quyền dữ liệu do RLS đọc vai trò canonical từ DB được áp dụng ngay.
5. Kiểm tra SM không quản lý được cửa hàng ngoài phạm vi và không vào được màn hình quản lý vai trò. Log `workspace_role_saved` / `employee_role_assigned` được ghi cùng giao dịch.

Đây vẫn là mô hình **một deployment/database cho một đơn vị**. Vai trò tùy chỉnh không tạo cách ly nhiều khách hàng trong cùng database. Phạm vi OFC chưa có phân vùng khu vực nhỏ hơn toàn đơn vị.

## Kiểm chứng local

- Unit: `workspaceRoles.test.js`, `workspaceRolesApi.test.js`: tên hiển thị không cấp quyền, lỗi API/migration, chống ghi cũ, phiên đăng xuất, giữ hợp đồng và phạm vi đọc.
- PostgreSQL: chạy `scripts/check_workspace_roles.sql` trong database **trống dùng riêng cho test** có các role `anon`, `authenticated`. Kiểm tra anon/staff/SM/AM, gọi REST trực tiếp, role giả trong JWT, rename, archive, CAS, rollback/log và chạy migration hai lần. Tuyệt đối không chạy script fixture này trên database thật.
- Browser: `node scripts/check_workspace_roles_ui.mjs` khi Vite ở :5179, Edge CDP ở :9227; mock toàn bộ API từ xa. Kiểm tra tạo/đổi tên/gán/bỏ/ngưng gán, lỗi mạng/trùng tên/xung đột, desktop/mobile và chặn route nhân viên.

Chưa chạy migration hoặc deploy frontend production trong đợt này.
