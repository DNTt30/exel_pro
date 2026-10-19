# Hướng dẫn Cài đặt đơn vị

Chỉ tài khoản Admin hệ thống được mở **Cài đặt đơn vị**. Trang gồm hai mục: **Nhận diện đơn vị** và **Vai trò & quyền**. Nút **Cách sử dụng** ở đầu mỗi trang mở hướng dẫn theo ba bước; các mục hướng dẫn nhỏ giải thích ngay bên dưới chức năng liên quan.

## Nhận diện đơn vị

1. Điền **Tên ứng dụng** (2–40 ký tự). Có thể thêm tên công ty hoặc chuỗi vào **Tên đơn vị**. Tên từng cửa hàng vẫn quản lý tại mục Cửa hàng.
2. Trong **Thông tin đơn vị**, thêm **Email liên hệ công khai** nếu cần. Đây là địa chỉ hỗ trợ hiển thị ở trang đăng nhập, không phải email nhận OTP của nhân viên; email OTP nằm trong hồ sơ cá nhân.
3. Tại **Logo & màu nhận diện**, tải logo PNG, JPG hoặc WebP, tối đa 2 MB, rồi chọn màu. Chỉ dùng logo đơn vị có quyền sử dụng.
4. Xem trước giao diện ứng dụng hoặc trang đăng nhập. Trên điện thoại, bấm **Xem trước nhận diện** để mở phần này.
5. Bấm **Lưu cài đặt** để áp dụng cho mọi người. Khi chưa lưu, thay đổi chỉ nằm trong bản nháp. Thanh lưu nổi khi có thay đổi và trở về cuối trang sau khi lưu xong.

**Bỏ thay đổi và tải lại** khôi phục cấu hình đã lưu. Nếu Admin khác vừa thay đổi cấu hình, app báo xung đột và giữ bản nháp để kiểm tra; tải lại trước khi nhập và lưu phiên bản mới. Nếu mất mạng khi lưu, bản nháp được giữ trong trang hiện tại, không báo thành công giả.

Màu cảnh báo và trạng thái ca giữ nguyên để dễ theo dõi. Tên và biểu tượng ứng dụng đã cài trên màn hình điện thoại hiện vẫn là **Lịch Ca**.

Trang dùng toàn bộ chiều rộng phần nội dung. Trên máy tính rộng, biểu mẫu nằm bên trái và bản xem trước bên phải. Trên điện thoại/màn hình nhỏ, bản xem trước thu gọn phía trên, biểu mẫu xếp một cột; ô nhập đủ lớn để dễ thao tác. Thanh lưu nổi khi có thay đổi và nằm trên menu dưới của điện thoại.

## Vai trò & quyền

1. Đặt tên chức danh, ví dụ **Trưởng ca**, rồi chọn nhóm quyền phù hợp và bấm **Lưu vai trò**.
2. Tìm nhân viên theo tên, mã hoặc cửa hàng. Chọn nhân viên, chọn vai trò mới và xem phần tóm tắt quyền trước khi bấm **Áp dụng vai trò**.
3. Nhân viên đăng xuất rồi đăng nhập lại để cập nhật menu. Quyền truy cập dữ liệu được áp dụng ở backend ngay sau khi lưu.

| Nhóm quyền | Mục đích |
| --- | --- |
| Nhân viên | Xem lịch cá nhân, đăng ký lịch rảnh, đổi ca và gửi yêu cầu công. |
| Quản lý cửa hàng | Quản lý lịch, công và nhân viên trong cửa hàng được phân công. |
| Quản lý khu vực | Quyền OFC hiện tại, truy cập toàn đơn vị; chưa giới hạn riêng từng khu vực. |

Tên gọi không tự cấp quyền. Đổi tên vai trò giữ nguyên nhóm quyền. Để đổi nhóm quyền, tạo vai trò khác rồi gán lại cho nhân viên. Việc gán vai trò không đổi cửa hàng gốc hoặc định mức giờ làm.

**Ngưng gán mới** chỉ ngừng dùng vai trò cho người khác, không thu hồi quyền của nhân viên đang sử dụng. Để thu hồi vai trò quản lý tùy chỉnh, chọn nhân viên rồi chọn **Bỏ vai trò tùy chỉnh — về Nhân viên** và áp dụng. **Mở lại** cho phép tiếp tục gán vai trò. Không thể tạo quyền Admin hệ thống từ danh sách này.

## Kiểm tra bản giao diện ngày 14/10/2026

- 51 kiểm thử liên quan nhận diện, vai trò và API đạt.
- Hai kịch bản trình duyệt dùng dữ liệu giả lập đạt trên desktop 1440×1000 và điện thoại 390×844: lưu, xem trước, tải logo, xung đột, mất mạng, tạo/đổi tên/gán/thu hồi/ngưng vai trò và chặn route nhân viên.
- Lint không có lỗi; còn 14 cảnh báo có sẵn ở các phần khác.
- Thay đổi này không cần migration mới. Các kiểm tra giao diện không ghi dữ liệu thật lên Supabase.
- Frontend đã phát hành bằng `npm run deploy`; trang công khai trả HTTP 200 và HTML trùng bản build (`index-pTfq5jNi.js`). Build còn cảnh báo kích thước bundle lớn ở các phần hiện có.
