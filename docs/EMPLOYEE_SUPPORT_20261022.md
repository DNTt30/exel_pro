# Hướng dẫn nhân viên mới và yêu cầu hỗ trợ

## Phạm vi

- Trang chủ có liên kết **Bắt đầu tại đây · Hướng dẫn & hỗ trợ**. Route nhân viên: `/employee/support`; quản lý: `/admin/support`.
- Năm bước: kiểm tra hồ sơ, xem lịch cửa hàng, đăng ký tuần sau, kiểm tra công, tìm Sổ tay. Lưu trên Supabase theo tài khoản, có thu gọn/mở lại. “Đã mở trang” và “Tôi đã hiểu” là hai dữ kiện riêng; không dùng làm điểm đánh giá năng lực và không chặn sử dụng ứng dụng.
- Quản lý phân công người hướng dẫn đang hoạt động cùng cửa hàng; không tự suy đoán người hướng dẫn từ chức danh.
- Thẻ ca gần nhất hiển thị trạng thái duyệt tuần, đồng nghiệp có khoảng giờ giao nhau và ca bắt đầu sau giờ kết thúc. Dùng cửa hàng thực làm, loại đăng ký chưa xếp, hỗ trợ ca tách/ca đêm/tuần liền kề. Dữ liệu giới hạn theo những tuần và nhân viên tài khoản được đọc.
- Nhóm Sổ tay dành cho nhân viên mới liên kết tài liệu đã duyệt hiện có. Không sao chép quy trình/công thức thành bản khác; tài liệu còn thiếu vẫn cần quản lý biên soạn và duyệt.
- Tú mini có **Đã hiểu**, **Chưa rõ**, **Cần người hỗ trợ**. Chưa rõ ghi nhận phản hồi tự nguyện và điền câu hỏi gợi ý, không tự gửi tiếp. Yêu cầu hỗ trợ chỉ gửi sau bước xem lại và bấm **Xác nhận gửi quản lý**; chỉ chia sẻ câu hỏi/trích đoạn người dùng chọn, không toàn bộ lịch sử chat.
- Vòng đời: mới gửi → quản lý nhận/trả lời → chờ nhân viên xác nhận → đã giải đáp. Nhân viên có thể mở lại. Quản lý không được tự xác nhận thay nhân viên. Mọi chuyển trạng thái và phân công hướng dẫn đều ghi nhật ký.
- Bảng quản lý: từng nhân viên và tiến độ tự xác nhận; từng yêu cầu/cửa hàng/người phụ trách/trạng thái; chủ đề/số yêu cầu/số người/số chưa giải đáp; người đã tự đánh dấu câu trả lời Tú mini chưa rõ. Bộ lọc ngày áp dụng ngày tạo yêu cầu, hoặc ngày cập nhật phản hồi Tú mini; bảng tiến độ là hiện trạng. Số câu hỏi không đồng nghĩa số người.
- Bảng **Theo dõi đăng ký ca** chọn tuần độc lập, đếm người trống cả tuần và người còn đăng ký chờ xếp, có chi tiết giờ/ngày đăng ký, giờ/ngày đã xếp, OFF và ngày trống. Dùng danh sách nhân viên hoạt động có phân quyền từ server và API lịch nhiều tuần có phân trang hiện có; không suy diễn “chưa từng đăng ký” khi ca đã được quản lý chọn.
- Bảng xác nhận công lọc đúng chu kỳ, đọc đủ các trang, dùng phản hồi mới nhất và tách báo chênh lệch khỏi xác nhận. Tải lỗi không hiển thị thành 0. Công thực tế bằng 0 không được thay bằng giờ ca; đăng ký chưa xếp không được tính vào công tham khảo. Mọi bù công/đổi ca vẫn dùng quy trình cũ.

## Cơ sở dữ liệu và phân quyền

Migration: `supabase/migrations/20261022000002_employee_support.sql`.

Bảng mới: `employee_onboarding`, `employee_onboarding_events`, `employee_help_requests`, `employee_help_events`, `employee_answer_feedback`. Không thay thế `feedbacks` C&B hoặc `shift_swaps`.

Chỉ authenticated được đọc theo RLS; mọi ghi đi qua RPC kiểm tra `current_emp_id`, `my_member_stores`, `manages_employee`, `can_manage_store` hiện có. Nhân viên chỉ đọc dữ liệu của mình; quản lý đọc/xử lý phạm vi cửa hàng được giao. Không cấp quyền mới cho tài khoản schedule_bot. Người hướng dẫn không tự được cấp quyền quản lý.

RPC hỗ trợ tạo yêu cầu có UUID chống gửi trùng; chuyển trạng thái kiểm tra revision và khóa bản ghi để không ghi đè thay đổi đồng thời. Client không được ghi trực tiếp hoặc xóa nhật ký. Không thêm backend Node, khóa cao quyền hay dịch vụ trả phí.

Migration phải được áp dụng bằng quy trình quản trị DB trước khi xuất bản frontend. Nếu chưa có migration, trang báo chưa tải được dữ liệu; không giả lập backend trong bản production. Đợt làm việc này chưa áp dụng migration vào Supabase thật và chưa xuất bản thay đổi mới.

## Chạy và kiểm tra

Trong `frontend/`, dùng cấu hình `.env` hiện có, không commit file này:

```powershell
npm.cmd run dev
$env:RAYON_NUM_THREADS='2'
npm.cmd run lint
npm.cmd run test -- --maxWorkers=1
npm.cmd run build
$env:PLAYWRIGHT_CHANNEL='msedge'
npm.cmd run test:agent -- employee-support employee-home mobile-layout
```

Playwright dùng 5 nhân viên TEST01 của sandbox. Module API hỗ trợ được thay bằng test double trong trình duyệt do Playwright cung cấp; chặn HTTPS trong bài test này. Các bài này chứng minh hành vi UI/lưu lại fixture, **không phải đã gọi Supabase thật**. Test DB riêng dùng SQL migration và RLS thật trên PostgreSQL cục bộ:

```powershell
# Từ root repo; PostgreSQL 17 tại đường dẫn Windows ghi trong script
python scripts/test_employee_support_db.py
```

Script không đọc `.env`, tạo database mới trong cụm thử ở `artifacts/pg-employee-support-20261022`, chỉ nghe localhost:55448, chạy ẩn và dừng server khi kết thúc. Không xóa dữ liệu thử; tên DB được in trong kết quả để kiểm tra lại.

## Bàn giao và pilot

1. Kiểm tra bản build với các thay đổi đăng nhập/phiên và lịch đang được sửa đồng thời trong workspace, chốt phạm vi bản xuất bản.
2. Áp dụng migration mới theo quy trình DB hiện có; kiểm tra bằng tài khoản nhân viên, SM đúng cửa hàng, SM ngoài cửa hàng, Admin. Không lấy tài khoản bot xếp lịch làm nhân viên giả để vượt quyền.
3. Xuất bản frontend sau khi chốt phạm vi. Cửa hàng VN0500 trước đây được chọn cho bot xếp lịch; điều đó không tự chứng minh pilot hỗ trợ nhân viên đã hoàn tất tại đây.
4. Chọn người hướng dẫn thực tế; kiểm tra các tài liệu được duyệt; thử một chu kỳ đăng ký/xếp lịch và ít nhất một câu hỏi tới khi nhân viên xác nhận hoặc mở lại. Chưa thể tuyên bố ứng dụng đã được nghiệm thu vận hành chỉ từ test kỹ thuật.
5. Ghi nhận vướng mắc, cải tiến rồi mở rộng. Chưa bổ sung thông báo đẩy/email riêng cho yêu cầu hỗ trợ; người dùng xem câu trả lời tại trang hỗ trợ. Không có AI tự đánh giá nhân viên, không có AI tự công bố lịch.

## Kết quả kiểm tra (23/10/2026)

- Toàn bộ Vitest: 101 file đạt, 2 file bỏ qua; 1.054 test đạt, 7 bỏ qua. Sau các sửa cuối ở bảng đăng ký/xác nhận công, chạy thêm bộ kiểm tra tập trung (kết quả cập nhật bên dưới).
- Playwright cuối: **12/12 đạt** ở desktop 1440×1000 và mobile 390×844, chạy Edge headless. Có kiểm tra lưu rồi tải lại, phân công người hướng dẫn, trả lời/đóng/mở lại, thống kê đăng ký và không tràn màn hình. Các lần chạy đầu có lỗi fixture/HMR khi mã đang thay đổi; đã sửa fixture và chạy lại trọn 12 bài thành công.
- Build production thành công, có cảnh báo chunk Schedule lớn hơn 500 kB. Lint không có lỗi; còn 1 cảnh báo import `Building2` không dùng trong `WorkspaceRoles.jsx` thuộc phần đang sửa đồng thời.
- PostgreSQL cục bộ đã đạt lần kiểm tra đầu cho RLS, phạm vi cửa hàng, quyền sở hữu, chống trùng, revision, chu kỳ yêu cầu và nhật ký bất biến. Kết quả chạy cuối sau khi bổ sung kiểm tra nội dung gửi lại được ghi bên dưới.
- Không chạy pilot với người thật, không ghi yêu cầu thử vào dữ liệu cửa hàng thật, không đổi tài khoản/mật khẩu, không tự thêm dịch vụ.
