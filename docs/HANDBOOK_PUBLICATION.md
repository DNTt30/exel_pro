# Sổ tay có duyệt và nguồn kiến thức TÚ mini

## Quyền và luồng sử dụng

Theo quyết định ngày 17/10/2026: chỉ có phạm vi **toàn đơn vị** và **từng cửa hàng**. Một deployment hiện tương ứng một đơn vị. Mọi thay đổi của quản lý, kể cả tài liệu riêng cửa hàng, cần Admin duyệt. Tài khoản Admin được duyệt; OFC/AM vẫn là quản lý, không tự công bố.

1. Vào **Sổ tay AI → Thêm tài liệu**. Chọn loại, phạm vi, nhập/dán nội dung và nguồn (nếu có).
2. Công thức phải có size, nguyên liệu, định lượng và đơn vị đo, các bước, cảnh báo. Quy định ghi rõ thời điểm áp dụng trong nội dung. Tối đa 4.000 ký tự/tài liệu; tách quy trình dài thành những mục hoàn chỉnh.
3. Có thể kèm tối đa 3 ảnh JPG/PNG/WebP, mỗi ảnh không quá 5 MB. Ảnh không bắt buộc, không tự OCR. **TÚ mini chỉ đọc phần văn bản**; chép đủ số liệu quan trọng từ ảnh vào nội dung.
4. Bấm **Kiểm tra trước khi gửi**, đọc lại toàn văn và ảnh; tích xác nhận nội dung, phạm vi và định lượng. Sửa lại nội dung sẽ yêu cầu xác nhận lại.
5. **Gửi Admin duyệt**. Bản đang công bố vẫn giữ nguyên. Admin mở **Chờ duyệt → Xem và duyệt**, đối chiếu bản trước, xác nhận rồi duyệt. Nếu từ chối phải có lý do; quản lý sửa và gửi lại từ **Lịch sử duyệt**.
6. **Đề nghị gỡ** cũng cần lý do và Admin duyệt. Chỉ gỡ mềm; dữ liệu, lịch sử duyệt và ảnh vẫn được giữ. Có thể đề nghị khôi phục từ **Đã gỡ**.
7. Nhân viên vào **Sổ tay → Tài liệu đã công bố** để đọc. Bấm **Tải lại** để cập nhật một trang đang mở. Câu hỏi tiếp theo của TÚ mini luôn tải nguồn mới; không cần deploy lại khi thêm nội dung.

Quản lý được đề xuất tài liệu chung và tài liệu trong phạm vi quản lý; không được sửa/gỡ tài liệu cửa hàng khác. Nhân viên không thấy bản chờ duyệt, lịch sử nội dung đã gỡ hoặc ảnh riêng của cửa hàng khác. Tài liệu đã công bố hiện dành cho mọi nhân viên thuộc phạm vi đó, không dùng để lưu lương cá nhân hoặc bí mật dành riêng cho quản lý.

## Thiết kế và giới hạn

- `handbook_entries`: bản hiện hành; `handbook_changes`: từng đề nghị bất biến và quyết định duyệt. RPC khóa dòng, đối chiếu revision, ghi log trong cùng transaction. Chỉ một đề nghị chờ duyệt cho mỗi tài liệu hiện hữu. Lỗi lưu giữ nguyên nội dung đang nhập.
- Không có quyền ghi trực tiếp bảng cho `anon`/`authenticated`; quyền lấy từ danh tính Auth và dữ liệu nhân viên phía server. Không tin `created_by`, `role` hoặc cờ Admin trong trình duyệt.
- Ảnh ở bucket private `handbook-images`; đường dẫn tải lên theo UID, không cho ghi đè/xóa trực tiếp. Link xem ảnh hết hạn sau 60 giây; link đã cấp có thể còn dùng đến khi hết hạn sau một lần gỡ. Ảnh tải lên rồi bỏ form chưa được tự thu gom; giữ lại để tránh xóa nhầm, cần tác vụ dọn ảnh không được tham chiếu về sau.
- Dữ liệu đang áp dụng được đọc bằng `get_handbook_knowledge()` với JWT hiện tại trước mỗi câu hỏi gửi Gemini, rồi lọc theo cửa hàng đang chọn. Không cache liên phiên. Nếu không tải được nguồn mới thì báo lỗi, không âm thầm dùng quy định cũ.
- RAG giữ ngân sách 4 đoạn / 6.000 ký tự. Sau đợt chuyển danh mục ngày 18/10, chỉ dùng tài liệu đã duyệt từ database; không còn nguồn công thức tĩnh dự phòng. Tên và tên gọi khác của tài liệu đã gỡ được trả dưới dạng dấu hiệu chặn, không có nội dung/ảnh.
- Sửa cùng tài liệu giữ ID ổn định, đổi tên không làm bản tĩnh cũ xuất hiện lại. Có thể thêm tên gọi khác để tra bằng tên cũ. Các bản chung/riêng mâu thuẫn được giữ phạm vi rõ và yêu cầu xác nhận, không cộng/trộn định lượng.
- Ngày hiệu lực đang ghi trong nội dung, chưa có lịch tự kích hoạt/ngừng hiệu lực. Lịch sử câu trả lời cũ không bị viết lại khi tài liệu thay đổi. Không có huấn luyện model hoặc embedding trả phí.
- Trang quản lý dùng chung `KnowledgeLibrary`, `KnowledgeContent`, `Modal`, `Button` với trang đọc. Các tab cấu hình localStorage cũ không điều khiển được hệ thống nên không nằm trong luồng quản lý mới; nhật ký hỏi AI vẫn ở phần nhật ký/analytics hiện có.

## Phát hành

**Phải cập nhật database trước frontend.** Chỉ build frontend không đủ.

Đợt chuyển toàn bộ công thức và Sổ tay ngày 18/10 có thêm hai migration và danh mục 98 tài liệu chờ duyệt. Khi triển khai bản hiện tại, thực hiện thêm [hướng dẫn chuyển danh mục](HANDBOOK_CATALOG_MIGRATION.md); không dừng ở migration ngày 17/10 bên dưới.

1. Sao lưu schema và dữ liệu `handbook_entries` nếu bảng đã tồn tại. Rà số tài liệu/ảnh hiện có.
2. Chạy nguyên file `supabase/migrations/20261017000000_handbook_publication.sql` bằng SQL Editor hoặc migration runner có quyền tạo policy Storage. Không chạy lại `docs/sql_handbook_entries.sql` cũ hoặc seed SQL trực tiếp.
3. Migration chạy lại an toàn, thay policy `USING(true)`, tạo bảng đề nghị, RPC và bucket private. **Tài liệu legacy chưa có dấu duyệt sẽ chuyển thành đề nghị để Admin kiểm tra**, không tự công bố vì trước đây bảng có policy mở. Không xóa nội dung cũ.
4. Chạy test/lint/build rồi phát hành frontend. Không cần đổi Gemini key hay deploy `chat-proxy` cho thay đổi này.
5. Dùng dữ liệu thử: SM tạo tài liệu cửa hàng A; nhân viên chưa thấy trước duyệt; Admin duyệt; nhân viên A thấy và hỏi TÚ mini; nhân viên B không thấy. Sửa định lượng vẫn giữ bản cũ tới khi duyệt; gỡ chỉ có hiệu lực sau duyệt. Kiểm tra tải ảnh bằng tài khoản đúng/sai cửa hàng.

Kiểm tra schema (không in nội dung tài liệu):

```sql
SELECT to_regprocedure('public.submit_handbook_change(jsonb,uuid,integer,text,boolean)'),
       to_regprocedure('public.review_handbook_change(uuid,boolean,boolean,text)'),
       to_regprocedure('public.get_handbook_knowledge()');
SELECT policyname,cmd,roles,qual FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('handbook_entries','handbook_changes');
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='handbook-images';
SELECT status,count(*) FROM public.handbook_changes GROUP BY status;
```

## Kiểm thử local

Đã chạy ngày 17/10/2026: 65 kiểm thử frontend đạt; bộ PostgreSQL kiểm tra phân quyền, duyệt đồng thời, ảnh riêng và nhật ký đạt; trình duyệt desktop/mobile đạt. `npm run lint` không có lỗi (5 cảnh báo có sẵn ngoài phần thay đổi); `npm run build` thành công, còn cảnh báo bundle lớn có sẵn. Chưa áp dụng migration hoặc phát hành frontend của thay đổi này lên production.

- `python scripts/test_handbook_publication.py`: PostgreSQL local 55442; tạo database dùng thử riêng, không đọc `.env`. Kiểm tra policy/RPC thật; Storage dùng bảng mô phỏng schema, không gọi dịch vụ upload production.
- `cd frontend && npm run test -- --maxWorkers=1 src/tests/handbookManager.test.js src/tests/handbookKnowledge.test.js src/tests/handbookPublicationUi.test.jsx src/tests/copilotRag.test.js src/tests/copilotPermissions.test.js src/tests/copilotDrawer.test.jsx`
- `node scripts/check_handbook_ui.mjs`: Vite 5179 + Edge CDP 9227; thao tác thật desktop 1440/mobile 390, dữ liệu và mạng ghi được giả lập. Ảnh kiểm tra ở `artifacts/handbook-*.png`.
- Các kiểm thử không khẳng định đã kiểm chứng Gemini hoặc Supabase Storage trên production.
