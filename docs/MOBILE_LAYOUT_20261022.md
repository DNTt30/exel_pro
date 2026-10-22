# Sửa giao diện mobile 22/10/2026

- Sửa chuỗi tiếng Việt sai mã trong trang lịch nhân viên.
- Mặc định Toàn cửa hàng, chọn cửa hàng gốc của người dùng; giữ phạm vi dữ liệu được phép hiện có.
- Mobile có bộ chọn T2–CN và bảng nhân viên/ca theo giờ bắt đầu, giữ OFF khác ngày chưa xếp, ghi rõ đăng ký chưa chốt và chi viện. Desktop tiếp tục dùng bảng tuần. Chuyển Lịch của tôi để đăng ký ca cá nhân.
- Khối hướng dẫn chuyển thành mục mở rộng, thanh chọn ngày bám đầu vùng cuộn.
- Dashboard giảm khoảng trống và dùng hai cột KPI trên mobile. AppLayout thêm min-height/min-width phù hợp vùng cuộn trong khung ứng dụng.
- Preview phát triển: `npm run dev:agent`, mở `/?preview=employee` hoặc `/?preview=dashboard`. Dữ liệu thử, Supabase tắt, không phải phiên đăng nhập production. Preview không đóng gói vào bản public.
- Hai test component kiểm tra thứ tự ca, trạng thái và chi viện đạt. Bốn kịch bản layout riêng desktop/mobile đạt; kiểm tra build và lint đạt (hai cảnh báo Login có từ trước).

Kiểm tra cuối: toàn bộ 14 Playwright desktop/mobile đạt (gồm bot nháp, quỹ giờ và công thức). Build GitHub Pages đạt, lệnh deploy đã Published. Hai cảnh báo lint Login và cảnh báo chunk Schedule >500KB đã có từ trước. Không sửa dữ liệu thật hay quyền đọc/ghi.

Đối chiếu 22 tài nguyên public đạt: `artifacts/release/frontend-verified-20261022T134751Z.json`. Kiểm tra lịch/Dashboard dùng phiên mẫu cô lập; chưa kiểm tra bằng phiên nhân viên thật.
