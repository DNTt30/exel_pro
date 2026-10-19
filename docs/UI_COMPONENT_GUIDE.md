# Giao diện và component dùng chung

Cập nhật 15/10/2026. Phạm vi đợt này: khung hộp thoại, nút thao tác, trạng thái duyệt, form nhu cầu cửa hàng, kết quả gợi ý lịch và các vùng trang trí nổi bật trên thanh đầu trang/Dashboard.

## Quy ước giao diện

- Nền trắng/xám, chữ chính slate-900, nội dung phụ slate-600. Giữ màu đơn vị trong phần nhận diện đã cấu hình.
- Nút chính màu đậm, nút phụ nền trắng có viền. Màu đỏ dành cho hành động nguy hiểm; trạng thái thiếu/lỗi phải có chữ và số rõ ràng.
- Không dùng nhấp nháy để báo đơn chờ duyệt. Không thêm gradient chỉ để phân biệt chức năng.
- Các thao tác phổ biến dùng vùng bấm tối thiểu 44px. Form phải có nhãn; bảng rộng cuộn trong vùng riêng.
- Kết quả xếp lịch: thiếu người hiển thị trước; dư người, chi viện và lịch đầy đủ mở theo nhu cầu. Cảnh báo không phủ nền màu cả màn hình.

## Dùng component nào?

| Chức năng | Component | Nơi đã dùng |
| --- | --- | --- |
| Hộp thoại, tên, mô tả, vùng cuộn, chân nút | `components/modals/Modal.jsx` | Các modal hiện có, thêm Gợi ý xếp lịch và Sao lưu |
| Hành động chính/phụ/nguy hiểm, đang xử lý | `components/ui/Button.jsx` | Xếp lịch, xác nhận, ngoại lệ Admin, gợi ý định biên |
| Xác nhận một hành động | `components/modals/ConfirmModal.jsx` | Gọi lại Modal và Button; không tự dựng khung/nút riêng |
| Trạng thái duyệt | `components/ui/StatusBadge.jsx` | Đổi ca, bù công và thanh duyệt lịch tuần |
| Doanh số/lượt khách ngày thường/cuối tuần | `components/StoreDemandFields.jsx` | Thêm/sửa cửa hàng và cấu hình gợi ý xếp lịch |
| Báo thiếu/dư, chi viện, xem trước lịch | `components/schedule/SchedulerResults.jsx` | Gợi ý xếp lịch; hai danh sách thiếu/dư dùng chung CoverageList nội bộ |

`AISchedulerModal` giữ việc tải dữ liệu, tạo đề xuất, kiểm tra dữ liệu nguồn và lưu. `SchedulerResults` chỉ nhận props để hiển thị, không gọi API hoặc đọc Zustand. Quy tắc nghỉ/giờ/đăng ký vẫn thuộc utilities và backend.

### Modal

- Dùng `title`, `description` và `footer` để tránh tự viết header/footer.
- Khi tác vụ không được ngắt giữa chừng, truyền `closeDisabled`. Nó khóa nút đóng, Esc và click ngoài. `preventBackdropClose` chỉ chặn click ngoài, giữ tương thích với màn hình cũ.
- Chỉ hộp thoại trên cùng xử lý Esc/Tab; khi đóng trả focus về phần tử mở. Có kiểm thử cho hộp thoại lồng nhau, trạng thái đang lưu và phần mở rộng bằng `summary`.
- Modal dùng header tùy chỉnh (`hideHeader`) nên truyền `ariaLabel` phù hợp. Các header nghiệp vụ cũ được giữ tương thích, chưa ép chuyển đồng loạt.

### Button và form

- `variant`: `primary`, `secondary`, `danger`; `busy` tự khóa bấm và hiện spinner. Mặc định `type="button"`, nút gửi form phải khai báo `type="submit"`.
- Chỉ dùng `className` cho bố cục/kích thước khi cần; không thêm một bộ màu khác vào mỗi nơi gọi.
- StoreDemandFields chuẩn hóa dữ liệu tại một chỗ, giữ nguyên bucket còn lại khi sửa. Giá trị âm thành 0, không còn cách xử lý bỏ dấu âm rồi biến thành số dương.
- Nút AI nổi đã bỏ vì trùng nút trên thanh đầu trang và có thể che ô nhập. Nút trợ lý trên thanh đầu trang vẫn có ở cả màn hình Admin và nhân viên.

## Giới hạn của việc gom component

### Bảng chấm công: ưu tiên đọc và đối chiếu

- Admin và nhân viên dùng chung `TimesheetTable` / `TimesheetRow`. Chỉ ghim cột nhân viên (tên, mã, vai trò); cửa hàng hiển thị theo nhóm. Một cột tổng giờ thay cho FT/PT/tổng lặp lại. Bỏ lương ước tính khỏi bảng công; xuất mẫu C&B và phần phiếu lương riêng vẫn giữ.
- Mỗi ngày rộng 72px, tiêu đề ngày ghim trên, đường kẻ ngang rõ. Công đã nhập dùng nền xanh nhạt, công theo lịch dùng nền trắng; OFF, 0 và chưa xếp vẫn khác nhau. Cảnh báo vượt định mức PT vẫn dựa trên hằng số hiện hành.
- Admin có điều hướng kỳ và nút sửa chính. Nhập ezHR9, xuất Excel/C&B, in được gom vào phần mở rộng. Hướng dẫn nhập cũng mở khi cần. Theo phản hồi, ô sửa chỉ giữ input: ngày ở đầu cột, công theo lịch là placeholder khi chưa nhập; chi tiết nằm trong tooltip và nhãn hỗ trợ đọc màn hình, không lặp dòng ngày/“Lịch” trong từng ô.
- Kiểm thử: 15 bài về chấm công, đối soát và kỳ lương đạt. Browser fixture kiểm tra desktop/mobile, ghim tên, chiều cao vùng bảng, lưu đúng ngày và phạm vi xem của nhân viên; không ghi dữ liệu thật.
- Build đạt, lint không lỗi (4 cảnh báo có sẵn ngoài phần sửa). `npm run deploy` trả `Published`, bản `index-D4WBVrjo.js`. Không thay đổi schema/API hay quy tắc tính công.

Không gom các màn hình chỉ vì giống hình thức nhưng khác nghiệp vụ/quyền: hồ sơ nhân viên và báo cáo giờ công; nhập lịch và nhập chấm công. Có thể dùng chung phần trình bày, nhưng API, validation và quyền truy cập vẫn thuộc từng luồng.

Đợt này không phải thay toàn bộ giao diện của app. Các màn hình nghiệp vụ lớn còn tồn tại và không bị viết lại chỉ để giảm số file.

## Xác minh

- Toàn bộ frontend: 865 bài đạt, 7 bỏ qua tại thời điểm hoàn tất refactor chính.
- Kiểm tra cuối: 13 bài về Modal/Copilot đạt, gồm một bài bổ sung về điều hướng bàn phím tới phần `summary`.
- Browser fixture desktop 1440×1000 và mobile 390×844: xếp lịch, thiếu/dư, lưu lỗi/thử lại, nguồn thay đổi, đóng bằng Esc, form doanh số ở trang Cửa hàng, ngoại lệ Admin và thông báo nhân viên đều qua.
- Lint không lỗi, còn 6 cảnh báo có sẵn ở các file khác. Build thành công, còn cảnh báo bundle lớn đã có trước.
- Kiểm thử dùng dữ liệu giả; không gửi sao lưu, email, Telegram hoặc thay đổi dữ liệu nhân viên thật.

## Phát hành

### Sửa đám mây từ khóa Dashboard (15/10/2026)

- Nguyên nhân: thay đổi từ được chọn/callback làm canvas vẽ lại, góc xoay ngẫu nhiên làm từ đổi vị trí. Bộ lọc và kết quả thay đổi chiều cao còn khiến trang dịch chuyển.
- Canvas chỉ vẽ lại khi dữ liệu, chiều rộng, chiều cao cấu hình hoặc DPR thay đổi. Chọn/bỏ chọn chỉ cập nhật viền và danh sách câu hỏi. Từ nằm ngang, màu theo nhóm chủ đề; không gọi `WordCloud.stop()` toàn cục.
- Giữ chiều cao vùng bộ lọc và kết quả, xử lý chiều rộng thực trên điện thoại. Bấm lại cùng từ hoặc “Bỏ lọc” để xóa lọc.
- 4 regression tests đạt. Browser fixture desktop/mobile (DPR 1/2): bấm từ thật, lọc/bỏ lọc đúng, pixels canvas không đổi, vị trí cuộn không nhảy, thay đổi chiều cao viewport không vẽ lại. Không gọi API ghi dữ liệu thật.
- Build đạt sau khi đóng trình duyệt kiểm thử và giới hạn luồng bundler do máy thiếu bộ nhớ khi chạy đồng thời. Lint còn 4 cảnh báo cũ ngoài phần sửa.
- Phát hành `Published`; trang công khai HTTP 200 khớp bản build `index-Bh9Wvp6V.js`, HTML SHA-256 `f87269dd46497e6bdf2368a5f2d421d3f40817d630fd7d7e73f3599998b575ae`. Không cần migration.
- Bổ sung theo phản hồi: chú thích tần suất nằm trong hàng riêng cao 56px bên dưới canvas, không phủ từ khóa. Browser desktop/mobile kiểm tra trực tiếp tọa độ chú thích nằm ngoài canvas; 4 regression tests vẫn đạt. Bản bổ sung `index-BDmec_m_.js` đã `Published`.

### Bản refactor giao diện trước đó

`npm run deploy` đã trả `Published`. Trang công khai trả HTTP 200 và HTML khớp bản build `index-BLV6Lo2u.js` (SHA-256 `d80f4a07139aa5baad309fd96e7f382602efde357bb6b71a50db9b1e8a1c9751`). Không cần migration database cho đợt thay đổi giao diện này.
