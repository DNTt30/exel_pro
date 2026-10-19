# Thiết kế Lịch Ca dùng cho nhiều môi trường bán lẻ

Ngày: 12/10/2026. Trạng thái: bản thiết kế, chưa triển khai cấu hình mới hoặc migration.

## Mục tiêu

Dùng chung một lõi quản lý lịch, nhân sự, công và đổi ca cho nhiều đơn vị. Mỗi đơn vị có nhận diện, khung ca, chính sách và tài liệu riêng. Circle K, WinMart, GS25 là ví dụ khách hàng tiềm năng do chủ dự án nêu; không coi họ đã cho phép sử dụng thương hiệu hoặc có cùng quy chế.

Một workspace đại diện cho **đơn vị có quyền quản lý dữ liệu**, không chỉ là tên thương hiệu. Hai bên vận hành cùng một thương hiệu vẫn có thể phải tách dữ liệu hoàn toàn.

## Hai cách triển khai

**Đề xuất giai đoạn đầu:** một codebase, mỗi khách hàng một bản triển khai và Supabase project riêng. Dùng cùng schema/cấu hình để nâng cấp đồng nhất; không fork code theo thương hiệu. Giảm phạm vi phải sửa auth/RLS ngay, nhưng có chi phí vận hành và cập nhật nhiều project. Cần tách domain/origin hoặc namespace cache nếu nhiều bản cùng origin, tránh lẫn phiên và dữ liệu local.

**Nếu chọn một app chung:** phải triển khai đa workspace đầy đủ trước khi nhận đơn vị thứ hai. Tạo `workspaces`, `workspace_memberships`; gắn `workspace_id` vào mọi dữ liệu thuộc đơn vị và kiểm tra bằng RLS/Edge Function. Mã nhân viên chỉ duy nhất trong workspace, còn auth user có định danh riêng. Không thêm dropdown thương hiệu rồi coi đó là cách ly dữ liệu.

Chưa chốt lựa chọn triển khai; chờ chủ dự án chọn. Không migration tenant/auth khi lựa chọn còn mở.

## Cấu hình cần thiết

| Nhóm | Cho phép tùy chỉnh | Phạm vi và lưu ý |
| --- | --- | --- |
| Nhận diện | Tên đơn vị, logo có quyền dùng, màu chính, thông tin liên hệ | Workspace; chỉ cấu hình này được đọc trước login. Tên/icon PWA cần xử lý riêng lúc build hoặc endpoint manifest, không chỉ đổi React state. |
| Vận hành | Giờ mở cửa, có ca đêm không, khung ca, giờ nghỉ không tính công, định biên theo ngày/khung giờ | Workspace mặc định; cửa hàng được ghi đè những mục được cấp quyền. |
| Nhân sự | Tên hiển thị vị trí, loại hợp đồng, kỹ năng, định dạng mã nhân viên | Quyền nội bộ tách khỏi nhãn chức danh; không suy quyền chỉ từ chữ “quản lý”. |
| Công và cảnh báo | Chu kỳ công, ngưỡng giờ theo hợp đồng, thời gian nghỉ giữa ca, hạn đăng ký, cấp duyệt | Có phiên bản và ngày hiệu lực. Các con số hiện tại là cấu hình khách hàng cũ, không tự nhận là luật chung. |
| Tính năng | Lịch/công/đổi ca là lõi; bật thêm kệ hàng, sổ tay, AI khi cần | Bật/tắt theo nhu cầu; dữ liệu cũ vẫn được giữ. Tắt menu không thay thế kiểm soát API. |
| Tài liệu và AI | Sổ tay riêng, phiên bản tài liệu, quyền xem theo role/cửa hàng | Storage private và truy xuất phía server. Không dùng sổ tay đơn vị A để trả lời đơn vị B. |
| Tích hợp | Mẫu nhập Excel, kênh thông báo, dịch vụ AI | Cấu hình public không chứa token. Credentials nằm ở server/secrets. Tên người gửi phải dùng domain được xác minh. |

Không cung cấp sẵn một bộ “quy chuẩn Circle K/WinMart” khi chưa có tài liệu được xác nhận. Mẫu khởi tạo chỉ gồm “Cửa hàng 24/7”, “Cửa hàng theo giờ mở cửa”, “Tự cấu hình”; đều ghi là mẫu, yêu cầu quản lý xác nhận trước áp dụng.

## Giao diện quản trị

Một trang **Cài đặt đơn vị**, gồm bốn phần dễ hiểu:

1. **Thông tin & giao diện:** tên, logo, màu; xem trước login và header.
2. **Ca làm & công:** khung ca, chu kỳ, ngưỡng cảnh báo, ngày hiệu lực; xem trước tác động trước khi lưu.
3. **Vai trò & tính năng:** tên chức danh và các module sử dụng. Quyền cấu hình chỉ cho người được server xác nhận.
4. **Tài liệu & kết nối:** tài liệu nội bộ, phạm vi người xem và trạng thái cấu hình dịch vụ.

Nhân viên đăng nhập vào đúng môi trường được cấp, không được tùy ý đổi workspace để xem dữ liệu đơn vị khác. SM chỉ sửa cấu hình cửa hàng trong phạm vi được giao. Nếu một người có nhiều workspace, danh sách lựa chọn phải lấy từ membership do server xác nhận; đổi workspace phải xóa state/cache và hủy request/realtime của workspace trước.

## Cấu trúc kỹ thuật đề xuất

- `workspace_profiles`: cấu hình đã phát hành gồm `schema_version`, `revision`, `effective_from`, branding, modules và chính sách; phân tách phần public và phần cần xác thực bằng API/RLS phù hợp. Không cho anonymous đọc cả hàng cấu hình chỉ để lấy logo.
- `store_policy_overrides`: chỉ chứa các mục cửa hàng được phép ghi đè. Chính sách workspace xác định rõ allowlist; không cho SM nới giới hạn đã khóa.
- Resolver `resolveWorkspacePolicy(profile, storeOverrides, effectiveDate)` thuần JavaScript + schema Zod. Từ chối cấu hình không hợp lệ; không âm thầm bỏ qua cấu hình đã lưu lỗi.
- `frontend/src/services/api/workspace.js` và export qua `services/api.js`; component không gọi Supabase trực tiếp.
- Một slice cấu hình trong Zustand; thay cấu hình có optimistic update/rollback nếu thích hợp. Server kiểm tra quyền và revision khi ghi để tránh mất thay đổi do hai quản lý cùng sửa.
- `shiftHelper`, payroll, AI scheduler và Edge Functions dùng cùng policy/version; không chỉ đổi số trên giao diện. Ngày hiệu lực bảo đảm mở lịch sử không bị tính lại theo quy định mới một cách âm thầm.
- Giữ shape lịch `schedule[weekISO][empId][dayKey]`; `''` khác `off`; chi viện giữ cửa hàng gốc và dùng `covering_store`. Trường hợp đa workspace giữ slice chỉ thuộc workspace đang hoạt động, DB có khóa/ràng buộc workspace tương ứng. Không chi viện xuyên khách hàng theo mặc định.
- Mã ca lịch sử phải tiếp tục giải mã được khi danh mục ca thay đổi; lưu catalog theo phiên bản/ngày hiệu lực. Không tái định nghĩa mã ca cũ để rồi làm sai số công đã chốt.

## Điểm phải tháo gỡ từ code hiện tại

- `data/constants.js`: `MA_RE`, `STANDARD_ROLES`, `SCHEDULE_RULES`, `DECISION_RULES`, bộ ba ca định biên và tỷ trọng doanh số đang cố định.
- `data/initialData.js`: danh mục `SHIFTS`, trong đó `8-17` có 8 giờ tính công; cần tách thời gian hiện diện và nghỉ không lương thay vì tính đơn giản giờ kết thúc trừ bắt đầu.
- `utils/payrollCalculator.js`: có định mức/đơn giá riêng; ví dụ PT 22.000 ở đây trong khi constants là 25.000, FT 208 giờ trong khi constants có mốc 192. Cần thống nhất cấu hình và xác nhận ý nghĩa, không đổi đồng loạt các số khi chưa đối chiếu.
- `lib/authSession.js`: mã nhân viên dùng làm email định danh, một `admin` chung và nhận diện quyền theo tên chức danh. Chỉ đổi thương hiệu không giải quyết được đăng nhập nhiều khách hàng có mã NV trùng nhau.
- `data/gs25HandbookData.js`, `data/ffOnsiteRecipes.js`, kiến thức trong `aiSchedulerEngine.js`: nội dung riêng đang đóng trong bundle. Chuyển riêng tài liệu, không chia sẻ chung theo app.
- Tên app và PWA hiện đã trung tính nhưng còn rải ở nhiều vị trí; tập trung cấu hình nhận diện cả build, email, thông báo và frontend.

## Trình tự triển khai

1. **Cấu hình nhận diện:** gom tên/icon/liên hệ về một nguồn, trang cài đặt cho admin, validation và mặc định giữ hành vi hiện tại. Tiêu chí: đổi workspace profile không cần sửa JSX, login/PWA/thông báo đồng bộ, không ảnh hưởng lịch cũ.
2. **Chính sách vận hành:** cấu hình ca và định mức có ngày hiệu lực, nối cùng resolver vào lịch/công/AI/server. Kiểm thử ca qua đêm, giờ nghỉ, tháng, lịch sử, blank/OFF, chi viện và rollback.
3. **Tài liệu riêng:** tách nội dung nội bộ khỏi bundle/public, private storage và server-side retrieval kiểm tra quyền; thử cả request trái quyền trực tiếp.
4. **Chạy thử môi trường thứ hai:** dữ liệu giả có giờ mở cửa, mã NV, ca và vai trò khác; chứng minh không dùng quy định hoặc tài liệu môi trường cũ. Nếu chọn app chung, auth/membership/RLS đa workspace là điều kiện bắt buộc trước bước này và phải được thực hiện từ nền tảng, không vá cuối cùng.

Chưa thêm thanh toán, marketplace mẫu cấu hình, trình kéo-thả dựng app hoặc model ML riêng cho mỗi thương hiệu. Chỉ mở rộng khi có nhu cầu vận hành đã xác nhận.

## Cần chốt

Cách triển khai (bản riêng hay app chung) và một bộ quy định thật của môi trường thử nghiệm thứ hai. Không cần chọn tên thương hiệu cụ thể để bắt đầu làm lõi cấu hình.
