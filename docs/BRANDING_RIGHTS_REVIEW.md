# Rà soát nhận diện và quyền sử dụng — 12/10/2026

## Kết luận và phạm vi

Đổi tên sản phẩm thành **Lịch Ca**, một tên mô tả chức năng. Đây không phải kết luận tên đã được tra cứu và bảo đảm không trùng nhãn hiệu. Chủ dự án xác nhận ảnh và bản scan sổ tay được phép **dùng nội bộ**; chưa xác nhận quyền phát hành công khai hoặc cấp phép lại.

Rà soát mã nguồn ứng dụng thật trong `frontend/`, nội dung thông báo liên quan trong Edge Functions, ảnh đang dùng và các tệp công khai. Không sửa prototype `schedule-app/`, không sửa dữ liệu nhân sự/cửa hàng, không triển khai production trong lần này. Không có đủ hợp đồng/giấy phép để kết luận một tài sản cụ thể vi phạm pháp luật.

Tên/biểu trưng dùng làm nhận diện chủ yếu đặt ra vấn đề nhãn hiệu và khả năng gây nhầm lẫn; ảnh, bản scan và cách diễn đạt tài liệu có thể đặt ra vấn đề quyền tác giả. Đổi chữ hoặc gỡ logo không tự tạo quyền tái sử dụng toàn bộ tác phẩm. WIPO phân biệt bảo hộ cách thể hiện với ý tưởng/quy trình: [Copyright](https://www.wipo.int/en/web/copyright/protection), [Trademarks](https://www.wipo.int/en/web/trademarks/).

## Đã sửa trong mã nguồn

- Đổi nhận diện sản phẩm trên login, layout admin/nhân viên, dashboard, bảng công, cài đặt PWA, tiêu đề trình duyệt, manifest và thông báo sao lưu thành Lịch Ca.
- Thay ảnh nền và ảnh quản lý có logo bằng nền CSS và hình lịch dựng bằng giao diện. Không chỉnh/xóa logo bên trong ảnh gốc.
- Thay favicon, icon PWA 192/512/maskable bằng biểu tượng lịch SVG mới và bản PNG xuất từ SVG. Thay avatar TÚ mini có biển hiệu/đồng phục GS25 bằng SVG robot mới.
- Ảnh avatar cũ chuyển từ `public/tu_mini_avatar.jpg` sang `src/assets/tu_mini_avatar_legacy.jpg`, không còn import hoặc phát hành cùng build. Các ảnh đăng nhập cũ vẫn được giữ trong nguồn, không import nên không nằm trong build.
- TÚ mini tự giới thiệu là trợ lý Lịch Ca; tiêu đề sổ tay/recipe gọi là tài liệu nội bộ. Giữ thông tin nguồn GS25/Saraya/Ecolab và tên sản phẩm khi đó là nội dung tài liệu được phép dùng nội bộ, không nhận là tài liệu của Lịch Ca.
- Đổi chủ đề email OTP trong `supabase/functions/reset-password/handler.js`. Cần deploy Edge Function để thay đổi này có hiệu lực trên email thật.
- Đổi cache Service Worker sang `lichca-v3` để cập nhật nhận diện trên lần phát hành tiếp theo. Giữ khóa localStorage, sự kiện, ID và tên biến cũ để không làm mất trạng thái hoặc phá tích hợp.
- Bỏ badge MIT của dự án trong README vì không tìm thấy tệp LICENSE tương ứng ở root; không tự chọn giấy phép mới thay chủ sở hữu. Điều này không thay đổi giấy phép của các thư viện phụ thuộc.

## Các điểm còn cần xử lý

| Ưu tiên | Bằng chứng trong repo | Đánh giá và bước tiếp theo |
| --- | --- | --- |
| Cao | `frontend/public/handbook/`: 9 ảnh quy trình, hóa chất, báo cáo | Build chép nguyên vào `dist/handbook`. Trên hosting tĩnh, người biết URL có thể đọc mà không đăng nhập. Quyền dùng nội bộ không đồng nghĩa quyền phát hành công khai. Chuyển sang storage private và kiểm tra quyền server khi cấp URL ngắn hạn, hoặc xin quyền phát hành rõ ràng. |
| Cao | `src/data/gs25HandbookData.js`, `src/data/ffOnsiteRecipes.js`, phần kiến thức trong `src/utils/aiSchedulerEngine.js` | Nội dung nghiệp vụ được đóng trong JavaScript tải xuống trình duyệt. Chặn route bằng React không bảo vệ tài liệu. Để giới hạn nội bộ, chuyển nguồn và truy xuất RAG sang server sau xác thực/phân quyền; kiểm tra quyền khi gửi tài liệu cho nhà cung cấp AI bên ngoài. Không chỉ xóa từ GS25 rồi công bố dưới tên mới. |
| Cao | Bản đã phát hành trước đây, git history, bản sao trên máy người dùng | Bản sửa local chưa thay production, và deploy mới không thu hồi được bản sao đã tải. Rà soát quyền truy cập hosting/repository cùng các bản phát hành cũ nếu tài liệu chỉ được dùng nội bộ. |
| Vừa | `frontend/src/assets/`: ảnh minh họa mang tên `gs25_*`, `allain_hero.png`, chibi và các ảnh chưa có hồ sơ nguồn riêng | Không tìm thấy sổ theo dõi tác giả/giấy phép theo từng ảnh. Các ảnh không được import không vào build hiện tại nhưng vẫn ở repo. Trước khi tái sử dụng hoặc mở mã nguồn, đối chiếu phạm vi cho phép của từng ảnh; tên tệp không đủ để kết luận nguồn hay quyền. |
| Vừa | `frontend/public/icons.svg`: biểu tượng GitHub, Discord, Bluesky… | Không thấy nơi sử dụng trong mã app nhưng file vẫn được phát hành do nằm trong public. Xác minh nguồn/điều khoản hoặc bỏ khỏi gói phát hành khi không cần. Không dùng biểu tượng bên thứ ba làm logo sản phẩm. |
| Vừa | `frontend/package.json`, LICENSE của các dependency | Đã kiểm tra mẫu: React/Three/jsPDF là MIT, Lucide ISC kèm phần Feather MIT, SheetJS Apache-2.0. Có giấy phép sử dụng không có nghĩa bỏ nghĩa vụ lưu thông báo bản quyền/giấy phép. Cần kiểm kê cả dependency gián tiếp và giữ notice khi phân phối; lần này chưa làm kiểm kê đầy đủ. |
| Vừa | `supabase/functions/push-notify/index.ts` | Còn giá trị mặc định VAPID `mailto:admin@gs25.com`. Cần cấu hình `VAPID_SUBJECT` bằng địa chỉ hoặc URL do chủ dự án kiểm soát; không nhận là hộp thư của thương hiệu. Không thay đổi secrets trong lần rà soát này. |
| Vừa | Cấu hình `PASSWORD_RESET_EMAIL_FROM`, dữ liệu cửa hàng/sổ tay trong DB, lịch sử chat | Tên hiển thị cũ có thể đến từ dữ liệu hoặc secrets chứ không nằm trong UI. Chưa truy vấn/chỉnh các dữ liệu production này. Đổi tên người gửi sang Lịch Ca với domain đã xác minh khi cần; giữ tên cửa hàng/tên nguồn chính xác, không đổi hàng loạt dữ liệu nghiệp vụ. |

## Hướng xử lý phù hợp với ứng dụng

Giữ phần lịch, công, nhân sự dưới nhận diện Lịch Ca. Tách tài liệu nghiệp vụ được cấp phép nội bộ ra khỏi tài nguyên công khai, lưu bằng cơ chế kiểm tra quyền ở server. Tiếp tục ghi nguồn và phạm vi sử dụng thật; tên Saraya/Ecolab/ezHR9 xuất hiện để chỉ đúng hóa chất hoặc định dạng tích hợp không tự động đồng nghĩa vi phạm.

Không xem màu xanh/cam, cách tổ chức bảng lịch hoặc ý tưởng xếp ca tự thân là bằng chứng xâm phạm. Ưu tiên xử lý tên/logo gắn nhận diện sản phẩm và quyền phân phối tài liệu thay vì đổi toàn bộ màu sắc hoặc chức năng đang có ích.

## Kiểm tra

- Build production thành công; lint không có lỗi, còn 14 cảnh báo có sẵn.
- Bộ test frontend: 742 passed, 7 skipped (73 suite passed, 2 skipped).
- Kiểm tra login trên desktop 1440px và mobile 390px: tiêu đề mới, không ảnh nhận diện cũ, không tràn ngang.
- Kiểm tra giao diện trợ lý admin/nhân viên trên desktop/mobile bằng dữ liệu giả, không gọi Gemini hoặc ghi Supabase thật.
- Bản build vẫn có 9 ảnh sổ tay và chunk dữ liệu nghiệp vụ: đây là phát hiện chưa được khắc phục, không phải tuyên bố đã bảo vệ nội dung nội bộ.

Trạng thái: thay đổi local; chưa deploy frontend hoặc Edge Function. Chưa có cơ sở bảo đảm tuyệt đối về quyền sở hữu trí tuệ chỉ từ việc rà soát repo.
