# Mốc lưu tiến độ — 23/09/2026

**Cập nhật mới nhất 24/09/2026:** đã tiếp tục xử lý sau mốc này. Xem [tiến độ, kiểm thử và timeline mới](STABILITY_ROLLOUT_2026-09-24.md). Các mục dưới đây là lịch sử tại thời điểm tạm dừng, không phản ánh trạng thái mới nhất.

Trạng thái: **đã lưu vào workspace, đang làm dở; chưa sẵn sàng triển khai production**.
Tạm dừng theo yêu cầu người dùng: lưu tất cả thay đổi và tóm tắt phần hoàn thành/chưa hoàn thành.
Chưa commit, push, deploy frontend hoặc áp migration lên Supabase.

## Phạm vi

Rà soát đã nêu 18 vấn đề về lịch, phiên đăng nhập, chấm công, phân quyền, realtime và migration.
Ứng dụng thực tế là `frontend/`; không sửa prototype `schedule-app/`.
Mật khẩu mặc định vẫn là `1`. Shape `schedule[week][empId][day]` được giữ nguyên.

## Đã viết code

- Đăng nhập: kiểm tra mã 9 số, không dùng cache nhân viên khi lookup thất bại, không dùng lại phiên cũ để vượt lỗi mật khẩu, phân biệt lỗi xác thực/kết nối, dọn phiên admin trong bước OTP.
- Lịch: đọc version, giữ metadata bằng WeakMap ngoài shape lịch; truyền expected version cho RPC; xếp hàng thao tác lưu; rollback đúng snapshot và ném lỗi cho bên gọi.
- Sao chép tuần và nhập Excel: chuyển việc lưu lịch qua action store thay cho ghi API trực tiếp.
- AI: chỉ bulk-save nhân viên có trong kết quả AI; giữ thông tin covering_store ở ca hỗ trợ.
- Phiên: reset dữ liệu khi đăng nhập/đăng xuất; session epoch chặn bootstrap và một số request lịch/công cũ cập nhật state; bỏ tự đăng nhập lại bằng mật khẩu mặc định khi restore phiên.
- Ghi nhớ đăng nhập: adapter localStorage/sessionStorage dùng chung cho Zustand và Supabase, nhận lựa chọn từ form.
- Chấm công: xóa override bằng delete riêng, giữ số 0 là một giá trị thực tế; sửa note OFF/AL còn sót khi nhập số giờ.
- Hai route chấm công dùng chung `useTimesheetValues`, phân biệt chưa xếp/OFF và bỏ ca đăng ký chưa chốt khỏi giờ lịch chính thức; Excel dùng dữ liệu hiệu lực.
- Chu kỳ tháng chấm công dùng con trỏ riêng, không ghi ngày bất kỳ vào currentWeek; action chọn tuần chuẩn hóa về thứ Hai.
- Quyền: SM không còn được nhận thành AM; nhận diện role/type SM ngay cả khi có jobTitle; kệ hỗ trợ danh sách nhiều dept.
- Cảnh báo thiếu giờ/ca bao gồm trường hợp 0 giờ/0 ca.
- Realtime feedback chuyển subscription sang bảng `feedbacks`.
- Các API đọc chính ném lỗi thay vì trả dữ liệu rỗng giả; bootstrap giữ dữ liệu trước và báo lỗi khi tải thất bại.

## Migration đang ở mức bản nháp

- Sửa mã hóa UTF-16 sang UTF-8 và dollar quoting trong hai migration 20260921 (JWT hook, khóa lịch).
- Thêm `20260920000000_auth_foundation.sql`: helper phân quyền/profile/lookup và policy cho môi trường mới.
- Thêm `20260923000000_stability_transactions.sql`: expected version bắt buộc, bulk atomic, khóa tuần, chuyển submitted sang pending, RPC `approve_shift_swap_atomic_v2` đổi ca trong một transaction.
- API frontend đã gọi RPC v2. Database chưa có RPC này sẽ chưa duyệt đổi ca được. Không deploy frontend hiện tại trước khi hoàn thiện và áp migration tương thích.

## Kiểm tra đã chạy

- Test mới `loginFlow.test.js`: 29 trường hợp, đã chạy đạt trong chặng đăng nhập; sau thay đổi nền phiên, nhóm login + performanceBatching cũng đã đạt 33 test.
- Lần chạy gần nhất của `stabilityRegression.test.js`, `crudComprehensive.test.js`, `authSession.test.js`: **67/67 đạt** (22 test stability, 36 CRUD, 9 auth).
- `npm.cmd run lint`: đạt tại checkpoint.
- `npm.cmd run build`: đạt tại checkpoint; còn cảnh báo chunk trên 500 kB.
- Full suite nội bộ từng chạy trong lúc sửa và báo 5 lỗi kỳ vọng/mock cũ. Các lỗi đó đã chỉnh và các file liên quan đã chạy lại đạt; **chưa chạy lại toàn bộ suite sau các chỉnh sửa cuối**.
- Hai bộ test live Supabase (`securityRegression`, `rlsSecurity`) không được chạy lại; môi trường hạn chế mạng, trước đó có 4 lỗi kết nối.
- `git diff --check`: chưa sạch, còn whitespace/CRLF trong hai file migration đổi mã hóa và một dòng PersonalTimesheetModal.
- Có PostgreSQL 17 trên máy, nhưng initdb bị sandbox chặn tạo restricted token/process và thư mục; không tạo được database kiểm thử. Docker cũng không chạy được. Không có database server kiểm thử được khởi động.

## Còn phải hoàn thành

1. **Review migration/RLS trước tiên.** Policy SELECT mặc định trong migration foundation còn quá rộng; cần giới hạn đúng từng bảng/đối tượng. Kiểm tra chống sửa chức danh để tự nâng quyền, quyền đối với nhân viên/cửa hàng đa dept, và tương thích schema user_store_roles của DB cũ.
2. Kiểm tra chữ ký/return type RPC đã tồn tại trước khi thay thế (nhất là ensure_app_profile); hoàn thiện dependency RPC còn ở legacy, credential/profile và bảng log nếu yêu cầu dựng DB mới đầy đủ.
3. Kiểm thử PostgreSQL thật: migrate mới + nâng cấp DB cũ; rollback toàn transaction khi một bên đổi ca thất bại; hai client cùng sửa; pending/approved lock; RLS theo admin/AM/SM/nhân viên; SQL có ca chi viện dạng chuỗi cũ và object.
4. Review tính nhất quán concurrency: bulk hiện lấy version lúc chạy queue; kiểm tra snapshot người dùng đã xem so với realtime/queued write. Realtime hiện bỏ sự kiện lịch trong lúc có pending write, cần cơ chế refresh/buffer phù hợp. Kiểm tra đầy đủ các đường mutation khác trong store khi người dùng chuyển phiên.
5. Hoàn thiện test storage/rememberMe trên reload, đóng tab, private browsing và nhiều tab; kiểm tra request login/logout chồng nhau.
6. Thêm test API thực tế cho version payload, lỗi đọc và RPC v2 (test store hiện dùng mock API); kiểm tra bootstrap lỗi từng nhánh và realtime đúng bảng.
7. Kiểm thử giao diện thật trên desktop/mobile cho login, lịch, bảng công admin/nhân viên, nhập Excel, xóa công, đổi tháng và phiếu công/in/xuất. Chưa chạy browser E2E/visual.
8. Rà soát và thay test tự tính lại công thức trong `passwordSecurity.test.js` bằng test gọi logic thật; chưa hoàn thành mục này.
9. Dọn whitespace, chạy lại full test nội bộ, lint/build và diff review. Sau đó mới chuẩn bị hướng dẫn rollout/rollback và áp migration lên môi trường kiểm thử.
10. Chưa triển khai lên Supabase/hosting. Khả năng triển khai thực tế phụ thuộc quyền/kết nối môi trường, không được coi là đã hoàn tất.

## Timeline

Ước lượng ban đầu đã báo: 90–150 phút cho code và kiểm thử cục bộ, chia 4 chặng:
1. Lưu lịch và phiên đăng nhập.
2. Chấm công và khóa tuần.
3. Phân quyền, realtime, ghi nhớ đăng nhập.
4. Migration, kiểm thử tổng thể, rollout.

Tại checkpoint, chặng 1–3 đã có phần lớn code nhưng còn review/test; chặng 4 đang làm dở. Không có cam kết thời điểm production vì chưa kiểm thử được database và chưa có kết nối triển khai.
