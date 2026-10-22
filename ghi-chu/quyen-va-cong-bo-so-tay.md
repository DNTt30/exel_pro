# Quyền và công bố Sổ tay

Cập nhật: 21/10/2026.
Trạng thái: Quyết định hiện hành; database và frontend đã phát hành. Ghi nhận 98 tài liệu chờ duyệt là lịch sử của lần nhập, đã được thay bằng kết quả 19/10; ngày 21/10 bổ sung đề nghị pha cốt cà phê chờ Admin duyệt. Chưa xác minh upload ảnh/Gemini thật.
Nguồn: Người dùng chọn phạm vi toàn đơn vị/từng cửa hàng, nhập văn bản kèm ảnh tùy chọn và yêu cầu Admin duyệt thay đổi của quản lý.

- Chỉ cần hai phạm vi tài liệu: toàn đơn vị và từng cửa hàng.
- Admin kiểm soát toàn bộ và duyệt công bố. Quản lý được đề xuất thêm, sửa, gỡ tài liệu trong phạm vi được phép; đề xuất phải được Admin duyệt trước khi có hiệu lực.
- Nhân viên chỉ đọc tài liệu đã công bố thuộc phạm vi của mình; không được xem bản nháp, bản chờ duyệt hoặc tài liệu cửa hàng khác.
- Nhập/dán văn bản; ảnh là tùy chọn. Trước khi gửi/công bố phải có bước xem lại và xác nhận nội dung, định lượng. Không coi việc đính kèm ảnh là đã trích xuất kiến thức từ ảnh.
- Sửa tài liệu không làm thay đổi bản đang công bố trước khi duyệt. Gỡ cần lưu dấu vết thay vì xóa mất lịch sử.
- TÚ mini, trang Sổ tay và tra nhanh công thức cần dùng chung nguồn được duyệt, đúng phạm vi. Không dùng lại công thức tĩnh cũ để thay thế một bản đã bị gỡ.
- Không tải được nguồn mới phải báo lỗi, không âm thầm coi dữ liệu cũ là quy định hiện hành.
- Quyết định bổ sung 19/10: người dùng yêu cầu nút **Duyệt toàn bộ**. Admin được duyệt các đề nghị thêm/sửa đang lọc sau khi xác nhận nội dung/định lượng; đề nghị gỡ vẫn duyệt riêng. Thay thế giới hạn duyệt từng bản trước đó, không thay đổi quyền nhân viên/quản lý và không tự bấm duyệt thay người dùng.

## Quyết định đã thay thế

Nâng cấp 21/10: mẫu tính tỷ lệ lưu ngay tại `handbook_entries.recipe_spec`, cùng phạm vi/revision/lịch sử gửi-duyệt-gỡ của tài liệu. Nhân viên chỉ đọc bản đã duyệt và tính hoặc tùy chỉnh tạm; không được ghi mẫu. Quản lý đề nghị, Admin duyệt. Máy tính và dữ liệu tra cứu TÚ mini cùng đọc định lượng này. Không tự suy ra mẫu cà phê từ công thức pha ly: ví dụ người dùng được nhập thành đề nghị, chưa tự công bố. Chi tiết: [RECIPE_CATALOG.md](../docs/RECIPE_CATALOG.md).

**Đã cũ:** cho quản lý công bố ngay tài liệu riêng của cửa hàng. Yêu cầu sau cùng và phương án đang thực hiện là **Admin duyệt các thay đổi của quản lý trước khi công bố**, cả tài liệu chung lẫn tài liệu cửa hàng.

Chi tiết luồng, migration và giới hạn: [docs/HANDBOOK_PUBLICATION.md](../docs/HANDBOOK_PUBLICATION.md). Kết quả kiểm tra theo thời điểm: [ket-qua-kiem-tra.md](ket-qua-kiem-tra.md).

## Rà soát ban đầu ngày 18/10/2026 — đã được xử lý tiếp

- Các luồng đề nghị/duyệt/gỡ và RAG đạt kiểm thử local, chưa đủ để kết luận production ổn định.
- `KnowledgeLibrary` và tra nhanh đã dùng nguồn chung; các tab Sổ tay cũ vẫn đọc dữ liệu tĩnh riêng, cần đồng bộ tiếp để sửa/gỡ có tác dụng nhất quán.
- Nhận diện bản thay thế hiện dựa tên chuẩn hóa, chưa có mã quy trình ổn định liên kết tài liệu cũ/mới.
- Nội dung quy định trong Sổ tay là nguồn tra cứu, không tự sửa quy tắc thực thi của lịch. Ngày hiệu lực chưa tự kích hoạt.

## Chuyển nguồn dữ liệu theo yêu cầu mới ngày 18/10/2026

Người dùng yêu cầu chuyển hết các công thức đang có sang luồng hoạt động thật, bỏ hardcode, bao gồm giao diện nhân viên. Sổ tay, tra nhanh và RAG đã chuyển sang chỉ đọc database, phát hành ngày 19/10. Các tab tĩnh đã bỏ; dữ liệu gốc được giữ tại `scripts/data/legacy-handbook/` để đối chiếu, không import vào runtime.

- Danh mục 98 tài liệu/62 công thức được chuẩn bị dưới dạng migration tạo đề nghị chờ Admin duyệt; không tự coi thao tác nhập là đã xác nhận định lượng.
- Tài liệu có ID ổn định; tên gọi khác là dữ liệu được duyệt cùng nội dung. Không còn cơ chế khôi phục bản tĩnh theo tên sau sửa/gỡ.
- Nhân viên chỉ đọc bản đã công bố trong phạm vi quyền. Trang đang mở cần Tải lại; câu hỏi mới của TÚ mini tải nguồn mới.
- Bản toàn đơn vị cùng tên đã tồn tại được giữ nguyên khi nhập. Chạy lại migration không tạo lại nội dung đã sửa/gỡ.
- **Giới hạn còn hiệu lực:** đã phát hành nhưng nội dung nhập còn chờ Admin duyệt; chưa thử upload ảnh/Gemini thật; không OCR ảnh; quy định văn bản không tự thay validator lịch/giờ.

Hướng dẫn triển khai và duyệt dữ liệu: [HANDBOOK_CATALOG_MIGRATION.md](../docs/HANDBOOK_CATALOG_MIGRATION.md).
