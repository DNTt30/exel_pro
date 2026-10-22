# Bot tạo lịch nháp và tính tỷ lệ — 21/10/2026

Trạng thái mới nhất 21/10/2026: **đã phát hành frontend và migrations Supabase**, sau khi người dùng yêu cầu “deploy đi”. Bot thật chỉ có phạm vi **VN0500**, đã kiểm chứng Supabase Auth/PostgREST. Không thêm dịch vụ trả phí. Website: https://dntt30.github.io/exel_pro/.

Bot đã đọc 19 nhân viên và lưu nháp tuần **2026-10-26**, revision 1; chạy lại trả `existing-draft`, không tạo trùng/ghi đè. **Chưa có đăng ký ca cho tuần này nên nháp có 0 ca mới và báo thiếu 21 khung ca**. Cần nhân viên đăng ký rồi quản lý mở nháp/tạo lại; chưa công bố hay ghi lịch chính thức.

## Khảo sát và lựa chọn kiến trúc

- Ứng dụng thật ở `frontend/`: React 19, Vite 8, Tailwind 4, Zustand, React Router. GitHub Pages chỉ phục vụ frontend; backend hiện có là Supabase PostgreSQL, RLS, Auth và Edge Functions. Không cần thêm backend Node.
- Form đăng nhập nội bộ gọi `useStore.login`, triển khai thực tế ở `store/slices/authSlice.js`: đăng nhập Supabase Auth, kiểm tra tài khoản hoạt động, hạn mật khẩu mặc định, đổi mật khẩu và OTP admin. Không thay đổi cơ chế này.
- API qua `services/api.js` và các module `services/api/*`; phiên đăng nhập qua `sessionPersistence`. Dữ liệu nghiệp vụ nằm trong Supabase; Zustand chỉ giữ dữ liệu đang dùng và lưu phiên/tuần hiện tại.
- Phân quyền server dùng `current_emp_id`, `has_permission`, `can_manage_store`; frontend có route guards và phạm vi quản lý. Quyền trên UI không thay thế RLS.
- Tái sử dụng `AISchedulerModal`, `generateAISchedule`/`scheduleRegisteredShifts`, `scheduleConflicts`, `shiftHelper`. Chỉ chọn đúng ca đăng ký, giữ OFF, ngày trống, ca chốt và chi viện. Không đổi cửa hàng gốc nhân viên.
- Trước thay đổi, đề xuất chỉ nằm trong bộ nhớ hộp thoại. `schedule_weeks.status = draft` là trạng thái lịch vận hành đã lưu, không phải bản đề xuất riêng. Bổ sung `schedule_drafts` để lưu đề xuất mà không ghi `schedules` hay `schedule_weeks`.
- Các thử nghiệm `backend-ml/`, tài liệu ML và file CLI đang thay đổi từ trước không thuộc phạm vi công việc này.

## Chạy app và tạo dữ liệu thử

Yêu cầu Node theo README (22.12+), npm. Trong `frontend/`:

```sh
npm ci
npm run dev:agent
```

Mở **http://127.0.0.1:4174/**. Không cần `.env` hay tài khoản thật cho môi trường thử. Vite mode `agent-sandbox` chỉ hoạt động khi DEV; URL/query string không bật được trong production. Supabase client bị vô hiệu hóa, không đăng ký service worker. Bản build production loại entry và fixture sandbox.

Trang tự nạp 5 nhân viên giả tại `TEST01`, lịch tuần **2026-10-19** và đăng ký tuần **2026-10-26**. Đây là fixture cố định để chạy lại, không phải dữ liệu tải từ backend. Mỗi người STFT đăng ký ca 6–14; nhu cầu 4 người/ngày T2–T6 và 5 người/ngày T7–CN; tối đa 6 ca/người. Kết quả đủ điều kiện: 30 ca, 48 giờ và 6 ca/người, không trùng giờ.

Lịch mẫu gốc luôn giữ nguyên. Nháp lưu tại localStorage `agent-sandbox-drafts-v1`; phiên giả lập dùng `agent-sandbox-session-v1`, khác khóa phiên thật. Chạy lại cập nhật cùng một bản nháp theo cửa hàng/tuần, có kiểm tra phiên bản. Muốn làm lại từ đầu, chỉ xóa **hai khóa sandbox này** trên origin 127.0.0.1:4174; không cần xóa toàn bộ storage.

Chạy app thông thường bằng `npm run dev`, cấu hình `frontend/.env` như README. Không dùng tài khoản quản trị thật cho kịch bản bot mẫu.

## Tạo, sửa và xem lại nháp

1. Bấm **Tạo hoặc xem lịch nháp tuần tiếp theo**. Trong app quản lý thật, mở **Lịch ca → Gợi ý xếp lịch**, chọn tuần và cửa hàng.
2. Nếu đã từng lưu, bấm **Mở nháp đã lưu** trước. Nếu lịch nguồn đã đổi, hệ thống yêu cầu tạo lại.
3. Trong **Nhu cầu nhân sự & ghi chú**, chỉnh số người từng ca/ngày và số ca tối đa mỗi nhân viên. Các mức giờ tuần, nghỉ 12 giờ và tối đa 3 đêm liên tiếp vẫn theo bộ quy tắc hiện có.
4. Bấm **Tạo lịch nháp**. Có thể chọn/bỏ từng ca đã đăng ký trong bảng nháp; không tự đặt ca ngoài đăng ký. Cấu hình của nháp đã mở được giữ để kiểm tra, còn thay đổi cấu hình phía trên dùng cho lần tạo lại.
5. Thiếu người được liệt kê theo ngày, khung giờ, số cần/có và nguyên nhân. Thiếu giờ tối thiểu là cảnh báo theo quy tắc hiện hành. Trùng giờ, vượt giới hạn giờ/ca hoặc sửa ngoài đăng ký chặn lưu. Nháp thiếu nhân sự vẫn được lưu để quản lý thảo luận, không được báo là đã đáp ứng mọi điều kiện.
6. Bấm **Lưu bản nháp**, đóng, tải lại trang và bấm **Mở nháp đã lưu** để xem lại. Lỗi lưu không hiện thông báo thành công; phiên bản cũ không được ghi đè im lặng.

Sandbox không có nút áp dụng/công bố. Trong app thật, người quản lý vẫn có nút **Áp dụng** hiện có: gọi lại bulk write có kiểm tra quyền, phiên bản, khóa tuần và ràng buộc server. Nộp/duyệt lịch tiếp tục qua luồng hiện có; lưu nháp không thực hiện các bước này. Bộ xếp lịch là heuristic: có thể còn thiếu người và cần quản lý điều chỉnh, không cam kết tìm mọi nghiệm khả thi.

## Chạy bot Playwright

Tắt server `dev:agent` thủ công trước khi chạy, vì Playwright tự mở một server riêng và không tái sử dụng server đang chạy.

```sh
# Lần đầu, nếu máy chưa có Chromium cho Playwright
npx playwright install chromium
npm run test:agent
```

Windows có Microsoft Edge sẵn có thể dùng:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:agent
```

Kịch bản `frontend/e2e/agent-draft.pw.js` chạy desktop 1440×1000 và mobile 390×844: đọc 5 nhân viên qua DOM, xem lịch hiện có, tạo/sửa/lưu nháp tuần kế tiếp, reload và đọc lại, đếm độc lập số ca/định biên trên UI, chạy hai lần trong cùng browser context và xác nhận chỉ có một bản ghi. Kiểm tra thêm trường hợp không đủ ca và lỗi storage. Chặn/kiểm tra request ra ngoài localhost và kiểm tra lịch mẫu gốc không đổi. Ảnh/trace nằm ở `artifacts/agent-playwright/`.

Đây là **kịch bản tự động cố định**, dùng selector và thao tác được lập trình trước. Không phải AI agent hiểu yêu cầu tiếng Việt tự do, không gọi mô hình, Gemini hay backend thật trong E2E sandbox. Thành phần xếp lịch và sửa nháp được dùng chung với app thật; danh sách/lịch chỉ đọc của sandbox là màn hình fixture đơn giản. Đăng nhập thật và màn hình vận hành đầy đủ chưa được E2E với tài khoản production trong đợt này.

Selector ổn định: `employee-list`, `employee-<id>`, `current-schedule`, `schedule-week`, `schedule-store`, `open-scheduler`, `generate-draft`, `load-draft`, `save-draft`, `draft-cell-<id>-<day>`, `draft-status`, `draft-validation`. Ưu tiên `getByRole`/`getByLabel` khi tên giao diện đủ rõ.

## API Supabase thật trong mã nguồn

Đã áp dụng `supabase/migrations/20261020000000_schedule_drafts.sql`, `20261021000000_schedule_bot_scope.sql` và `20261021000001_schedule_bot_week_types.sql`. Bản cuối sửa tương thích `week_date` kiểu date ở production và text ở schema cũ; không đổi dữ liệu lịch hay nới quyền. Có sao lưu public schema trước mỗi lần áp dụng trong `artifacts/release/`.

| Thao tác | API hiện có/bổ sung | Phạm vi |
|---|---|---|
| Đọc nhân viên | `getEmployees` → PostgREST `employees` | RLS hiện có |
| Đọc lịch | `getSchedulesByWeek(s)` → `schedules` | RLS hiện có |
| Bot đọc nhân viên/lịch | RPC `get_schedule_bot_context(p_store,p_week)` | JWT bot + scope cửa hàng; chỉ cột cần xếp lịch |
| Đọc nháp | `getScheduleDraft` → `schedule_drafts` với store/week | JWT + `schedule.write` hoặc scope bot |
| Lưu nháp | `saveScheduleDraft` → RPC `save_schedule_draft` | JWT + quyền trên, CAS phiên bản |

RPC nhận `p_store`, `p_week` (thứ Hai), `p_payload` và `p_revision` (0 khi mới tạo). Payload gồm `schedule`, `sourceSchedule`, `sourceVersions`, `constraints`, `scope: 'home-store'`. Trả `{ payload, revision }`. Một bản nháp dùng chung mỗi cửa hàng/tuần; phiên bản cũ trả `DRAFT_CONFLICT`. Người ghi lấy từ `auth.uid()`, không nhận actor từ client. Cả lịch đề xuất lẫn snapshot nguồn chỉ chứa nhân viên của cửa hàng; không đính kèm toàn bộ lịch đang tải trên màn hình quản lý. Chặn nhân viên ngoài cửa hàng, payload quá lớn và ghi trực tiếp bảng. Anon/nhân viên thường không có quyền lưu/đọc nháp.

API nháp chỉ lưu **đề xuất chưa tin cậy**, không cấp quyền công bố. Các kiểm tra giờ/ca chạy trên UI lúc tạo/sửa/mở/lưu và kiểm tra server của lịch chính thức vẫn bắt buộc khi quản lý áp dụng. PostgreSQL local kiểm tra migration bằng các hàm quyền thực; Supabase Auth/PostgREST production đã được kiểm tra riêng bằng identity bot, gồm đọc đúng scope, từ chối cửa hàng khác/bảng nghiệp vụ trực tiếp và lưu/đọc lại nháp.

Migration tiếp theo `20261021000000_schedule_bot_scope.sql` tạo vai trò PostgreSQL **schedule_bot**, không kế thừa `authenticated`. Supabase Auth phát JWT với vai trò này; bảng riêng `schedule_bot_scopes` quyết định cửa hàng được đọc/ghi nháp. Identity không gắn nhân viên nên không có quyền quản lý hiện hữu. Bot chỉ được đọc nháp và gọi RPC theo scope; không đọc trực tiếp bảng nhân viên/lịch/công, không ghi lịch chính thức, nộp hoặc duyệt. Đặt `enabled=false` trong scope sẽ thu hồi quyền ngay cả khi JWT còn hạn.

RPC đọc nhân viên hoạt động thuộc cửa hàng gốc, lịch tuần trước/đang chọn/tuần sau để kiểm tra nghỉ và trùng giờ, trạng thái khóa tuần và định biên. Không lấy email, điện thoại, hồ sơ HR. Bot không mượn nhân sự cửa hàng khác; thiếu đăng ký/nhân sự thì báo thiếu, không tạo giờ rảnh giả. Ca chi viện đã có của nhân viên cửa hàng gốc được giữ nguyên. Quản lý vẫn cần xem tổng thể chi viện khi áp dụng.

`scripts/release_schedule_bot.py`: mặc định chỉ đọc preflight; cờ `--apply` sao lưu schema rồi áp dụng migration còn thiếu, `--provision` tạo/cấu hình đúng identity bot, `--verify` kiểm tra Auth/PostgREST. Đã chạy thành công các bước này. Script quản trị chỉ dùng key quyền cao trong bộ nhớ tiến trình; không đưa vào frontend, file thông tin bot hoặc log. Thông tin bot nằm ngoài repo tại `%LOCALAPPDATA%\LichCa\agents\VN0500.bin`, mã hóa Windows DPAPI theo người dùng Windows. Không đổi mật khẩu tài khoản người dùng hiện có.

Lệnh quản trị đã dùng từ root (không cần chạy lại để sử dụng bot):

```powershell
# Ghi Supabase thật: chỉ thực hiện trong đợt phát hành được cho phép
python scripts/release_schedule_bot.py --apply --provision --verify --store VN0500
```

CLI tùy chọn dùng API thật (khác kịch bản Playwright sandbox), chạy trong `frontend/` sau khi đã cấp bot:

```sh
npm run bot:draft -- 2026-10-26 VN0500
```

Ngày là thứ Hai tuần muốn tạo nháp; thay ngày cho các tuần sau. CLI dùng cùng engine, kiểm tra ràng buộc, lưu rồi đọc lại nháp. Nếu đã có nháp, trả `existing-draft` và **giữ nguyên cả sửa đổi của quản lý**, không ghi đè khi chạy lại. Quản lý mở **Lịch ca → VN0500 → tuần tương ứng → Gợi ý xếp lịch → Mở nháp đã lưu** để sửa/tạo lại. Dữ liệu nguồn đổi sẽ yêu cầu tạo lại. CLI không dùng tài khoản quản lý; kiểm tra JWT role trước khi thao tác. Trên máy khác có thể cấp các biến môi trường `SCHEDULE_BOT_URL`, `SCHEDULE_BOT_ANON_KEY`, `SCHEDULE_BOT_EMAIL`, `SCHEDULE_BOT_PASSWORD` qua cơ chế quản lý bí mật của máy, không ghi giá trị vào repo hay lịch sử lệnh.

CLI cũng là thuật toán/kịch bản cố định, chưa phải agent hiểu mọi yêu cầu ngôn ngữ tự nhiên. Đã chạy hai lần qua Auth/PostgREST thật cho VN0500, xác nhận lưu rồi giữ nguyên cùng revision 1. Unit test dùng client giả lập và PostgreSQL local kiểm tra quyền/ràng buộc độc lập.

## Tính nhanh công thức

Trong **Sổ tay** hoặc **Tra công thức**, bấm **Tính nhanh tỷ lệ** (cả quản lý và nhân viên). Mẫu do người dùng cung cấp: **20g → 20ml lượt đầu + 45ml lượt sau**. Nhập **80g** nhận **80ml + 180ml = 260ml nước thêm vào**. Có thể sửa lượng gốc, lượng cần pha, từng thành phần/đơn vị, thêm/bỏ thành phần; chấp nhận dấu phẩy thập phân và báo lỗi lượng không hợp lệ. Lượng gốc và lượng muốn pha phải cùng đơn vị. Không sửa tài liệu Sổ tay hay tự suy ra lượng thành phẩm, thời gian, nhiệt độ.

TÚ mini nhận mẫu câu đầy đủ `Pha cốt cà phê 20g -> 20ml lượt đầu + 45ml lượt sau. 80g -> ?`; tính cục bộ, không cần gọi mô hình. Câu không nêu tỷ lệ gốc phải tra nguồn Sổ tay, không mặc định dùng ví dụ cà phê cũ. Đây là nhận dạng mẫu câu giới hạn. `e2e/recipe-calculator.pw.js` kiểm tra ví dụ, sửa tỷ lệ, dấu phẩy và lỗi trên desktop/mobile.

Nâng cấp bộ chọn cùng ngày: [Công thức dùng chung Sổ tay](RECIPE_CATALOG.md). Milo/Nestea đọc bản đã duyệt, lưu lựa chọn gần đây, có phiên bản/phạm vi, chỉnh tạm/khôi phục và tìm kiếm khi danh sách dài. Bảng định lượng được thêm/sửa trong luồng duyệt Sổ tay, không có danh mục mẫu độc lập. Công thức pha cốt cà phê đã được chuẩn bị chờ Admin duyệt.

## Kiểm tra và giới hạn

```sh
cd frontend
npm test
npm run lint
npm run build
```

Kiểm thử PostgreSQL local dùng cụm disposable, không đọc `.env`, tạo database mới có tên ngẫu nhiên:

```powershell
$env:STABILITY_PG_PORT = '55447'
python scripts/test_schedule_bot_db.py
```

Chạy từ root, cần PostgreSQL local đã khởi động tại cổng trên. Harness tái dùng baseline/auth/RLS/operational tests và suite nháp, rồi kiểm tra bot: deny anon/staff/ngoài phạm vi, kiểm tra đầu vào, CAS đồng thời, không trùng dữ liệu, không quyền bảng nghiệp vụ/ghi chính thức, thu hồi scope và giữ nguyên `schedules`/`schedule_weeks`.

Kết quả cuối được ghi trong `ghi-chu/ket-qua-kiem-tra.md`: frontend đã Published, 18 tài nguyên public khớp build; trang đăng nhập desktop/mobile tải được, không có lỗi JavaScript. Chưa E2E toàn bộ giao diện quản lý bằng tài khoản người dùng thật; chưa tích hợp agent hiểu yêu cầu ngôn ngữ tự nhiên. Không coi nháp trống do thiếu đăng ký là lịch đã đáp ứng định biên.
