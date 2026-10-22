# Công thức tính tỷ lệ dùng chung Sổ tay — 21/10/2026

Trạng thái: đã phát hành database và frontend ngày 21/10 theo luồng triển khai đang được cho phép. 18 tài nguyên public khớp build; bộ kiểm thử cuối 1018 passed/7 skipped, Playwright sandbox 8 passed; PostgreSQL quyền/duyệt/nhập lặp đạt. Kiểm tra public desktop/mobile xác nhận trang đăng nhập tải không có lỗi JavaScript; chưa E2E đăng nhập quản lý thật để duyệt công thức. Mẫu cà phê vẫn chờ Admin duyệt, không tự công bố.

## Dùng máy tính

Vào **Sổ tay / Tra công thức → Tính nhanh tỷ lệ**. Chọn công thức và nhập **Lượng [nguyên liệu] muốn pha**. Lượng gốc và lượng muốn pha phải cùng đơn vị. Chọn **Tùy chỉnh** ở cuối danh sách để tự nhập định lượng.

- Milo và Nestea chanh lấy định lượng từ tài liệu Sổ tay đã duyệt, không lấy từ danh sách số liệu viết cứng trong component. Bản đọc production ngày 21/10: Milo 600g → 800ml + 1.000ml; Nestea 400g → 1.000ml + 2.000ml. Những lượng 250ml bán theo ly hoặc biến thể Milo nóng không được trộn vào công thức pha bình.
- Tài liệu cà phê hiện tại chỉ hướng dẫn pha ly. Ví dụ pha cốt 20g → 20ml + 45ml do người dùng cung cấp được chuẩn bị thành **đề nghị chờ Admin duyệt**, không tự coi là công thức đã công bố. Trong khi chờ, vẫn có thể tính bằng Tùy chỉnh.
- Hiển thị phạm vi, phiên bản và thời điểm công bố; **Xem tài liệu Sổ tay gốc** mở nội dung nguồn ngay tại máy tính.
- Mặc định chỉ lượng muốn pha được sửa. **Điều chỉnh cho lần pha này** mở các trường nguồn; nếu thay đổi sẽ hiện **Đã chỉnh so với công thức gốc**. **Khôi phục công thức gốc** bỏ sửa tạm. Các thao tác này không ghi Sổ tay.
- Nhớ lựa chọn và số lượt chọn trên trình duyệt, tách theo tài khoản/phạm vi. Không lưu bản sao định lượng vào localStorage. Món thường chọn lên trước; Tùy chỉnh luôn cuối. Danh sách trên 5 món có ô tìm kiếm.
- Mở máy tính sẽ tải lại nguồn. Nếu nguồn lỗi, không dùng bản cũ; nếu công thức đã bị gỡ/không còn trong phạm vi, yêu cầu chọn lại. Định lượng trong lần đang mở gắn với phiên bản đang hiển thị.

## Thêm, sửa, gỡ mẫu

Quản lý/Admin vào màn hình quản lý **Sổ tay**, thêm hoặc sửa tài liệu loại **Công thức pha chế / chế biến**. Bật **Có định lượng dùng cho tính nhanh tỷ lệ**, nhập nguyên liệu chính, lượng gốc, đơn vị, các thành phần và ghi chú. Nội dung văn bản dùng cho các bước/lưu ý; tránh nhập lại số lượng khác với bảng.

Kiểm tra → xác nhận → gửi đề nghị → **Admin duyệt**. Mẫu chỉ xuất hiện/thay đổi sau duyệt. Đề nghị gỡ dùng luồng gỡ tài liệu hiện có. Lịch sử duyệt giữ snapshot định lượng, người gửi/người duyệt, thời gian và revision; nhật ký quản trị ghi gửi/duyệt/gỡ. Nhân viên không có quyền ghi mẫu qua API, chỉ đọc và tính/tùy chỉnh tạm.

Để công bố mẫu cà phê đã chuẩn bị: **Sổ tay quản lý → Chờ duyệt → Pha cốt cà phê → Xem và duyệt**; đối chiếu định lượng/phạm vi trước khi xác nhận. Nếu chưa phù hợp, từ chối rồi sửa/gửi lại theo luồng có sẵn.

## Nguồn dữ liệu và bảo vệ

`handbook_entries.recipe_spec` là JSON cùng bản ghi tài liệu: `baseIngredientName`, `baseAmount`, `baseUnit`, `components[{name,amount,unit}]`, `notes`. Tên/phạm vi/phiên bản lấy từ `title`, `store_id`, `revision`, `published_at` của tài liệu; không có bảng mẫu thứ hai hay quyền công bố mới.

Hai migration: `20261022000000_handbook_recipe_spec.sql` bổ sung trường/validation vào RPC gửi/duyệt/đọc hiện có; `20261022000001_coffee_recipe_proposal.sql` nhập đúng một đề nghị cà phê chưa xác nhận, chạy lại không trùng hoặc ghi đè. Không thay tài liệu đã công bố. Client cũ sửa văn bản mà không gửi trường định lượng sẽ xóa định lượng cũ để tránh dùng số lỗi thời.

Adapter đọc văn bản cũ chỉ chấp nhận một dòng **Pha:** hoặc **Pha Nestea:** với lượng gốc gram và các thành phần ml rõ ràng. Không suy luận khoảng số hoặc nhiều biến thể. Khi quản lý sửa tài liệu cũ phù hợp, dòng pha được chuyển vào bảng và bỏ khỏi văn bản để chỉ còn một nguồn định lượng. Món mới dùng bảng định lượng, không phải sửa chương trình. Sổ tay và dữ liệu truy xuất cho TÚ mini đều đọc cùng trường đã duyệt.

## Kiểm thử

`recipeCatalog.test.js`: kết quả biết trước cho cà phê 80g → 80/180ml; Milo 1.200g → 1.600/2.000ml; Nestea 800g → 2.000/4.000ml; loại bản gỡ/chưa duyệt, tránh trộn biến thể, cùng định lượng trong truy xuất TÚ mini.

`handbookPublicationUi.test.jsx`: quản lý gửi bảng qua xác nhận, nhân viên chỉ đọc, nguồn lỗi không giữ kết quả cũ. `e2e/recipe-calculator.pw.js`: chọn/sửa/khôi phục/nhớ món trên desktop/mobile bằng fixture giả.

Từ root, PostgreSQL disposable đã chạy ở cổng 55447:

```powershell
$env:STABILITY_PG_PORT='55447'
python scripts/test_recipe_catalog_db.py
```

Suite kiểm tra RLS, phạm vi, Admin duyệt, snapshot chờ duyệt, revision/nhật ký, client cũ và nhập cà phê lặp an toàn. Lệnh quản trị `python scripts/release_recipe_catalog.py --apply` sao lưu schema, áp dụng phần thiếu và xác nhận hash tài liệu đã công bố không đổi; không tự duyệt cà phê.
