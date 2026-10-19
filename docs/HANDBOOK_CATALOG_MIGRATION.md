# Chuyển Sổ tay và công thức sang database

Ngày cập nhật: 19/10/2026. Đã áp dụng 4 migration ngày 17–18/10 và phát hành frontend. Có 98 bản nhập chờ Admin duyệt, 0 tài liệu công bố tại lần kiểm tra sau phát hành. Xem [kết quả phát hành](RELEASE_20261019.md).

## Dữ liệu chuyển

Danh mục nhập có **98 tài liệu, gồm 62 công thức**: công thức FF Onsite, chế biến/bán lẩu, bảo quản, giờ hủy, vệ sinh, hóa chất, báo cáo ca và các bản quy định cũ. Nguồn ban đầu nằm ở `scripts/data/legacy-handbook/`; danh mục có cấu trúc ở `scripts/data/handbook-catalog.json`. Đây là ảnh chụp dữ liệu để chuyển đổi và kiểm thử, không được import vào ứng dụng chạy thật.

Giữ nguyên định lượng và nội dung nguồn. Ví dụ nguồn quầy có xốt chả cá dùng 1000ml, SOP nước súp có 2000ml: giữ thành tài liệu riêng để Admin đối chiếu đúng sản phẩm, phạm vi và phiên bản; không tự ghép hoặc chọn một định lượng thay người phụ trách. Các bản quy định cũ cũng cần rà lại trước duyệt.

Mỗi nguồn có mã nhập và ID cố định. Chạy lại không tạo thêm đề nghị, không phục hồi tài liệu đã gỡ và không ghi đè bản quản lý đang dùng. Tài liệu toàn đơn vị cùng tên đã tồn tại được giữ nguyên; nếu có nhiều bản cùng tên, ghi `ambiguous_preserved` để Admin xử lý thay vì tự chọn bản thắng. Đối chiếu trong `handbook_catalog_imports` bằng tài khoản database phù hợp.

## Trình tự triển khai

1. Sao lưu dữ liệu Sổ tay hiện có; xác nhận database đã có các migration nền/phân quyền.
2. Áp dụng `supabase/migrations/20261017000000_handbook_publication.sql` nếu chưa có. Migration này chuyển nội dung legacy chưa được duyệt thành đề nghị, không tự công bố.
3. Áp dụng `supabase/migrations/20261018000000_handbook_catalog.sql`: thêm tên gọi khác và cập nhật RPC duyệt/đọc. `confirmed_at` cho phép NULL để bản nhập máy không giả làm một lần xác nhận của người dùng.
4. Áp dụng `supabase/migrations/20261018000001_handbook_catalog_seed.sql`: tạo tài liệu chưa công bố cùng đề nghị chờ Admin duyệt. Chưa có tác dụng lên nhân viên/TÚ mini trước khi duyệt.
5. Với toàn bộ frontend đang làm trong workspace này, còn phải áp dụng migration `20261017000001_practical_workflows.sql` sau khi hoàn tất kiểm tra riêng của đợt dọn app; có phụ thuộc hạn đăng ký và thông báo. Không phát hành frontend mới lên một schema chưa tương thích.
6. Chạy test/lint/build, phát hành frontend để Admin có giao diện duyệt. Trước khi có bản công bố, nhân viên thấy trạng thái chưa có tài liệu; không dùng lại nội dung tĩnh.
7. Admin kiểm tra dữ liệu nhập và duyệt các tài liệu cần dùng, rồi kiểm chứng bằng tài khoản Admin, quản lý và nhân viên ở hai cửa hàng. Có thể duyệt từng bản hoặc dùng **Duyệt toàn bộ** sau bước xác nhận nội dung/định lượng.

Không chạy lại migration Sổ tay cũ sau migration ngày 18/10 vì các định nghĩa RPC cũ có thể thay thế bản mới hỗ trợ tên gọi khác. Dùng đúng thứ tự migration.

## Cách dùng

- **Admin:** Sổ tay → Chờ duyệt → lọc loại “Công thức pha chế / chế biến” → Xem và duyệt → đối chiếu nguồn, định lượng, phạm vi → tích xác nhận → duyệt.
- **Duyệt toàn bộ:** chỉ Admin, áp dụng các đề nghị thêm/sửa trong danh sách đang lọc; bỏ bộ lọc để duyệt mọi đề nghị thêm/sửa. Hộp thoại chốt danh sách, cho xem nội dung và yêu cầu xác nhận trước khi gửi. Mỗi bản dùng RPC kiểm tra quyền/revision và nhật ký hiện có. Hiện tiến độ, số bản đã duyệt và bản chưa xác nhận được nếu lỗi; tải lại danh sách trước khi thử tiếp. Đề nghị gỡ duyệt riêng. Thêm nút không đồng nghĩa tự công bố 98 bản nhập.
- Bản nhập mang người gửi `catalog-import`. Cần sửa trước công bố: từ chối kèm lý do, vào Lịch sử duyệt → Sửa và gửi lại → kiểm tra và duyệt bản mới. Có thể chọn phạm vi cửa hàng phù hợp thay vì toàn đơn vị trong bản gửi lại.
- **Quản lý:** thêm/sửa/gỡ theo cùng quy trình đề nghị. Đang có một đề nghị thì phải xử lý trước khi tạo thay đổi tiếp theo cho cùng tài liệu.
- **Nhân viên:** Sổ tay chỉ có tài liệu đã duyệt trong phạm vi được phép; tìm theo tên/tên gọi khác/nội dung, lọc loại tài liệu và cửa hàng. Không có nút sửa hoặc gỡ. Bấm Tải lại để cập nhật trang đang mở.
- **Tra nhanh và TÚ mini:** cùng đọc `get_handbook_knowledge()`. Chưa có tài liệu hoặc tải lỗi thì báo đúng trạng thái, không dùng công thức được nhúng trong source code. Câu hỏi tiếp theo của TÚ mini lấy nguồn mới; hội thoại cũ không bị viết lại.
- **Đổi tên:** sửa cùng tài liệu, thêm tên cũ vào “Tên gọi khác” nếu muốn tiếp tục tìm bằng tên cũ. Tên gọi khác được duyệt cùng nội dung.
- **Gỡ:** gửi lý do → Admin duyệt → tài liệu biến mất khỏi danh sách đọc và không được dùng trong câu trả lời mới. Lịch sử vẫn giữ để đối chiếu/đề nghị khôi phục.
- **Ảnh:** tối đa 3 ảnh, 5 MB/ảnh; upload theo luồng private Storage hiện có. Những ảnh scan gốc chưa được tự tải lại vào Storage, vẫn được giữ trong repo. TÚ mini đọc văn bản, không tự OCR ảnh.

Các tab Sổ tay tĩnh, đồng hồ hủy hàng cố định và checklist dựa trên nguồn tĩnh đã được thay bằng thư viện tài liệu chung. Nội dung hướng dẫn của chúng được chuyển vào danh mục chờ duyệt. Validator lịch/giờ công vẫn thuộc logic ứng dụng; nhập một quy định dạng văn bản không tự sửa validator.

## Kiểm tra

- `node scripts/build_handbook_catalog.mjs` và `python scripts/build_handbook_catalog_migration.py`: tái tạo danh mục/SQL từ snapshot, không gọi database hay mạng.
- `python scripts/test_handbook_catalog.py`: PostgreSQL local; nhập lặp, giữ bản đã có, chờ duyệt, quyền đọc, tên gọi khác, sửa/đổi tên, gỡ và không tái xuất hiện khi nhập lại.
- `frontend/src/tests/handbookCatalog.test.js`: đối chiếu từng công thức gốc, giới hạn nội dung, không có fallback và không import snapshot vào runtime.
- `node scripts/check_handbook_ui.mjs`: desktop/mobile, SM gửi sửa, Admin duyệt, nhân viên đọc định lượng mới; Admin gỡ rồi nhân viên không còn thấy. Mạng/dữ liệu được giả lập, không xác nhận production.

Không dùng kết quả local để khẳng định Gemini hoặc upload ảnh trên production đã hoạt động.
