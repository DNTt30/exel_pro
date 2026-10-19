# Cài đặt đơn vị — giai đoạn nhận diện

Đã triển khai local ngày 12/10/2026. Route `/admin/settings`, menu **Hệ thống → Cài đặt đơn vị**. Chỉ Admin hiện tại (`admin`) được sửa. Không mở quyền này cho SM/OFC khi chưa có phân quyền riêng.

## Đã hoạt động trong mã nguồn

- Tên ứng dụng (2–40 ký tự), tên đơn vị (tối đa 100), logo PNG/JPG/WebP, 5 màu nhận diện bảo đảm chữ trắng dễ đọc, email liên hệ công khai.
- Logo được giải mã và xuất lại thành PNG 192×192 ngay tại trình duyệt; không tải lên bên thứ ba, không nhận SVG hay URL ảnh ngoài. Ảnh đầu vào tối đa 2 MB, kết quả tối đa 180.000 ký tự.
- Xem trước trước khi lưu; thay đổi chung chỉ áp dụng sau khi server lưu thành công. Lỗi giữ nguyên cấu hình đang dùng và bản nháp để thử lại.
- Tên/logo xuất hiện ở login và header; tên đơn vị ở login/sidebar; tên app trên dashboard/tab trình duyệt; màu ở sidebar, nhãn app và nút đăng nhập; email hỗ trợ ở login. Màu cảnh báo và ca làm không đổi.
- Các thiết bị đọc cùng cấu hình từ DB khi mở app hoặc quay lại tab. Không hứa đồng bộ realtime tức thì trên tab khác đang mở liên tục.
- RPC ghi cấu hình yêu cầu Supabase Auth và `public.is_admin()`; không tin role từ client. Không có quyền INSERT/UPDATE/DELETE trực tiếp cho anon/authenticated. Kiểm tra revision trong transaction có khóa hàng, ngăn ghi đè từ hai phiên. Audit được lưu trong cùng transaction; không ghi dữ liệu ảnh vào log.
- Bảng public chỉ chứa nhận diện, email liên hệ công khai và metadata revision/thời gian. Không chứa hồ sơ nhân viên, chính sách, API key, địa chỉ riêng hoặc tài liệu nội bộ.

## Đưa vào sử dụng

1. Sau baseline `DATABASE_CATCHUP_OK`, chạy [sql_workspace_branding.sql](sql_workspace_branding.sql) trên SQL Editor của đúng Supabase project. Script dùng transaction, có thể chạy lại mà không ghi đè cấu hình đã lưu. Không cần đổi secrets hoặc deploy Edge Function cho tính năng này.
2. Build/deploy frontend theo quy trình hiện có. Kiểm tra migration trước khi phát hành. Nếu chưa có bảng/mất mạng, app vẫn dùng nhận diện mặc định; trang cài đặt báo lỗi và khóa lưu, không báo thành công giả.
3. Đăng nhập Admin → Cài đặt đơn vị → nhập thông tin → xem trước → lưu. Mở một cửa sổ mới để kiểm tra login. Dùng nhân viên/SM để kiểm tra không có menu và gọi RPC trực tiếp cũng bị từ chối.

Lần triển khai này chưa chạy SQL trên Supabase thật và chưa deploy frontend. Các bản sửa RAG/đổi nhận diện khác đang có trong working tree cần được xem xét cùng đợt phát hành; không xem tính năng này đã lên production chỉ vì test local qua.

## Phạm vi chưa triển khai

- Tên/icon manifest và PWA đã cài vẫn là Lịch Ca; không sửa manifest bằng Blob gây thay đổi danh tính ứng dụng. Nhãn hướng dẫn cài đặt giữ tên Lịch Ca cho đúng với bản cài.
- Chủ đề email OTP, thông báo push/sao lưu và tên tự giới thiệu TÚ mini hiện vẫn là nhận diện sản phẩm mặc định. Các mục này chưa đọc cấu hình động.
- Chưa chỉnh chu kỳ công, ngưỡng giờ, danh mục ca, role, bật/tắt module. Những mục ảnh hưởng lịch sử cần policy có ngày hiệu lực, kiểm thử và validation chung giữa client/server như bản thiết kế.
- Một bản triển khai phục vụ một đơn vị. Không phải multi-tenant; không được gộp nhiều khách hàng độc lập vào DB này chỉ bằng cách đổi tên đơn vị.
- Không nhập sẵn logo/tài liệu của thương hiệu. Quyền tài liệu nội bộ và việc chúng còn nằm trong public/bundle vẫn cần xử lý theo [báo cáo quyền sử dụng](BRANDING_RIGHTS_REVIEW.md).

## Kết quả kiểm tra

- PostgreSQL 17 local, database riêng: chạy migration hai lần; anon đọc được nhận diện; anon/nhân viên/SM không thể ghi; giả role trong claims không cấp quyền; Admin chỉ ghi được qua RPC; xung đột revision, màu/logo sai và NULL bị chặn; lỗi không đổi row; một lần lưu thành công tạo đúng một audit.
- 21 test mới cho validation, API và slice: quyền, payload public, lỗi mạng/migration, chống ghi đồng thời, giữ bản đã lưu khi thất bại.
- Toàn bộ frontend: 763 passed, 7 skipped. Lint không có lỗi, còn 14 cảnh báo có sẵn. Build thành công, còn cảnh báo chunk lớn.
- `scripts/check_workspace_ui.mjs`: dữ liệu giả, chặn gọi mạng bên ngoài; desktop 1440px/mobile 390px, logo upload, preview/lưu, conflict, lỗi server, route nhân viên và nhận diện login. Ảnh kiểm tra trong `artifacts/workspace-ui/` (không commit).
