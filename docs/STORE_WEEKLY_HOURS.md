# Quỹ giờ cửa hàng theo tuần

## Sử dụng

- Vào **Cửa hàng → Sửa → Hạn mức giờ cửa hàng / tuần**, nhập ví dụ **224**, rồi lưu.
- Cấu hình áp dụng cho mỗi tuần của cửa hàng. Để trống = chưa đặt, 0 = không cấp giờ. Chưa hỗ trợ mức riêng cho từng tuần.
- Mở **Xếp lịch**, chọn cửa hàng và tuần. Bảng quỹ giờ hiển thị hạn mức, giờ đã xếp, còn lại hoặc vượt.
- Ca chi viện tính vào cửa hàng nhận; đăng ký chưa chọn, ngày trống và OFF không trừ quỹ. Ca đêm tính theo ngày bắt đầu ca trong lịch.
- **Gợi ý xếp lịch** dùng hạn mức này để chọn đăng ký. Ví dụ 224 giờ tương đương 28 ca 8 giờ; nếu định biên đòi 30 ca thì báo thiếu, không tự tăng quỹ.
- Lịch cũ vượt mức được giữ nguyên. Sửa nháp vượt mức sẽ bị chặn lưu/áp dụng; xếp thủ công hiện cảnh báo, chưa áp dụng khóa cứng tại cơ sở dữ liệu.
- Đây là giờ theo lịch, không phải công thực tế ezHR hay giờ tính lương.

## Lưu trữ và quyền

Dùng `stores.staffing.weeklyHoursLimit` trong cột JSON hiện có; không cần migration hay backend mới. Kế thừa quyền sửa cửa hàng/RLS và nhật ký thay đổi hiện có. Không tự đặt 224 cho dữ liệu thật. Lỗi ghi hoặc không có hàng được cập nhật không được báo lưu thành công. Không fallback lưu cấu hình chỉ trên máy.

## Dashboard

Giữ một ô tổng hợp PT vượt giờ, bấm để mở bảng chi tiết đã lọc. Bỏ cảnh báo PT lặp trong danh sách việc cần xử lý. Chuyển cơ cấu nhân sự và tổng hợp cửa hàng vào tab báo cáo; giữ luồng phản hồi C&B. Xóa WordCloudCanvas, test riêng và dependency wordcloud không còn dùng.

## Kiểm tra

- Toàn bộ Vitest: 1.020 passed, 7 skipped; thêm 4 test API lưu/đọc/quyền/lỗi đạt.
- Chạy lại nhóm liên quan sau khi tập trung phép tính vào shiftHelper: 44 passed.
- Playwright desktop/mobile: 10 passed, gồm đặt 224 giờ → tạo nháp → báo thiếu → lưu → mở lại.
- Build đạt khi chạy riêng với RAYON_NUM_THREADS=2; lần chạy đồng thời với kiểm tra trình duyệt bị thiếu bộ nhớ Windows.
- Các test dùng dữ liệu mẫu, không sửa hạn mức hay lịch cửa hàng thật.

## Triển khai

Đã deploy GitHub Pages ngày 21/10/2026. Đối chiếu 20 tài nguyên public với build đạt (`artifacts/release/frontend-verified-20261021T140756Z.json`); trang đăng nhập desktop/mobile đạt. Chạy lại 2 ca Playwright quỹ giờ sau cập nhật cuối đạt. Chưa kiểm tra thao tác ghi hạn mức bằng tài khoản thật; kiểm tra quyền/lỗi lưu qua test API.
