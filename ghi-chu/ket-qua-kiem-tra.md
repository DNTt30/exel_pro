## 2026-10-22 — Lịch toàn cửa hàng và Dashboard mobile

Chi tiết: `docs/MOBILE_LAYOUT_20261022.md`. Sửa tiếng Việt lỗi mã; mặc định lịch toàn cửa hàng, mobile xem đồng nghiệp theo ngày; Dashboard hai cột KPI, khung cuộn vừa màn hình. 2 test component và 14 Playwright đạt; build đạt, deploy Published.

## 2026-10-21 — Quỹ giờ cửa hàng và Dashboard

Chi tiết: `docs/STORE_WEEKLY_HOURS.md`. Vitest toàn bộ 1.020 đạt/7 bỏ qua; thêm 4 test API đạt; nhóm liên quan chạy lại 44 đạt. Playwright 10/10 desktop/mobile. Build đạt sau khi giới hạn RAYON_NUM_THREADS=2. Không đặt hạn mức vào dữ liệu thật. Đã deploy; đối chiếu 20 tài nguyên public đạt, trang đăng nhập desktop/mobile đạt; chạy lại 2 ca quỹ giờ đạt.

# Kết quả kiểm tra và việc đã hoàn thành

Cập nhật: 21/10/2026.
Trạng thái: Ghi nhận theo thời điểm; không dùng kết quả cũ để khẳng định code hiện tại hoặc production đã đạt.
Nguồn: Kết quả công cụ trong phiên làm việc và [docs/HANDBOOK_PUBLICATION.md](../docs/HANDBOOK_PUBLICATION.md).

## Bộ chọn công thức cùng nguồn Sổ tay — phát hành 21/10/2026

Nguồn: thiết kế người dùng yêu cầu chọn món, lưu dữ liệu, đồng bộ Sổ tay, phân quyền, ghi nhớ và kiểm thử từng mẫu; sau đó yêu cầu tiếp tục. Hướng dẫn [RECIPE_CATALOG.md](../docs/RECIPE_CATALOG.md).

- Bộ chọn đọc các bản đã duyệt: tự điền, nhãn theo nguyên liệu, phạm vi/revision/ngày công bố, mở nguồn, chỉnh tạm/khôi phục, nhớ lựa chọn và đếm số lần chọn theo tài khoản/phạm vi, tìm kiếm khi trên 5 mẫu; Tùy chỉnh luôn cuối. Không lưu định lượng vào localStorage hay dùng nguồn cũ khi tải thất bại.
- JSON `handbook_entries.recipe_spec` đi cùng bản ghi và payload duyệt; thêm/sửa/gỡ dùng quyền, CAS, lịch sử và admin_logs có sẵn. Sổ tay, máy tính và nguồn truy xuất TÚ mini dùng cùng định lượng. Mẫu viết cứng cũ đã bỏ khỏi runtime. Khi đổi tài liệu bằng client cũ không gửi spec, định lượng cũ được vô hiệu hóa nếu văn bản đổi.
- Đối chiếu chỉ đọc production xác nhận Milo 600g → 800/1000ml; Nestea 400g → 1000/2000ml. Adapter chỉ đọc một dòng pha rõ ràng, không lẫn 250ml theo ly hoặc Milo nóng. Sửa tài liệu sẽ chuyển dòng pha thành bảng định lượng, bỏ dòng trùng khỏi nội dung để tránh hai nguồn số liệu.
- Không tìm thấy tỷ lệ pha cốt trong tài liệu cà phê đã duyệt. Đã tạo đúng một đề nghị **Pha cốt cà phê** từ ví dụ người dùng, `confirmed_at=NULL`, `pending_review`; chưa công bố. Nhân viên không thấy mẫu này trước khi Admin duyệt. Tùy chỉnh vẫn có ví dụ riêng được ghi rõ chưa duyệt.
- Đã áp dụng hai migration `20261022000000_handbook_recipe_spec.sql`, `20261022000001_coffee_recipe_proposal.sql` sau sao lưu schema. Hash tên/nội dung/revision/trạng thái các tài liệu đã công bố trước–sau không đổi; không tự sửa số liệu đang áp dụng.
- Frontend **Published**; `FRONTEND_RELEASE_OK` 18 assets, báo cáo `artifacts/release/frontend-verified-20261021T090633Z.json`. Public login Edge desktop/mobile không có pageerror; chưa E2E tài khoản quản lý thật/duyệt thật.
- **1018 passed / 7 skipped**, 96 file đạt/2 bỏ qua. **8 Playwright passed (37,4 giây)** cho bot và tính tỷ lệ trên desktop/mobile; đã xem ảnh mobile. Lint không lỗi, còn 2 import cũ; build đạt, còn cảnh báo chunk lớn. Python compile và diff whitespace đạt.
- `test_recipe_catalog_db.py` đạt trên PostgreSQL disposable: quyền nhân viên/quản lý/Admin, ngoài phạm vi, validation, không lộ bản chờ duyệt, revision/nhật ký, client cũ, seed chờ duyệt và chạy lặp không trùng. Cụm đã dừng. Không thêm dịch vụ trả phí.

## Phát hành bot VN0500 và tính tỷ lệ — 21/10/2026

Nguồn: người dùng yêu cầu “deploy đi”, thay yêu cầu chưa deploy trước đó. Phần “chưa triển khai” trong các kết quả lịch sử bên dưới đã được thay bằng trạng thái này.

- Frontend `npm run deploy` → **Published**. Đối chiếu **18 tài nguyên public** với build đạt `FRONTEND_RELEASE_OK`; báo cáo `artifacts/release/frontend-verified-20261021T044845Z.json`. Edge headless tải trang đăng nhập public trên desktop 1440×1000 và mobile 390×844, không có pageerror. Công cụ tỷ lệ đã có trong bundle Sổ tay công khai.
- Đã sao lưu public schema và áp dụng hai migration nháp/scope. Auth bot VN0500 được cấp role `schedule_bot`, credentials mã hóa DPAPI ngoài repo. Lần kiểm chứng đầu phát hiện production dùng `week_date` kiểu date, khác text ở schema cũ; đã bổ sung migration `20261021000001_schedule_bot_week_types.sql`, kiểm thử local đạt rồi áp dụng, giữ nguyên quyền và dữ liệu lịch.
- `AUTH_POSTGREST_OK`: JWT có role bot, đọc đúng VN0500 với **19 nhân viên**, từ chối đọc trực tiếp employees/schedules/schedule_weeks/attendance và từ chối cửa hàng ngoài scope. Không dùng tài khoản quản lý hoặc service-role để chạy bot.
- CLI thật tạo và đọc lại nháp tuần **2026-10-26**, revision **1**. Chạy lần hai trả `existing-draft`, vẫn revision 1. Do chưa có đăng ký ca, **0 ca mới và thiếu 21 khung ca**; không báo đủ người, không tự bịa ca, không ghi/công bố lịch chính thức. Quản lý cần nhận đăng ký rồi tạo lại nháp trong UI.
- PostgreSQL disposable chạy lại toàn bộ baseline/operational/draft/bot suite đạt với migration tương thích kiểu ngày. Cụm local đã dừng. Kết quả frontend trước phát hành: 1010 passed/7 skipped, Playwright sandbox 6 passed. Không thêm dịch vụ trả phí.
- Chưa E2E luồng mở nháp trên giao diện quản lý bằng tài khoản người dùng thật; việc xác minh backend thật ở đây dùng bot Auth/PostgREST. Không tích hợp mô hình cho bot; CLI/Playwright vẫn là kịch bản cố định.

## Quyền bot VN0500 và tính nhanh tỷ lệ — kiểm chứng local ngày 21/10/2026 (trước phát hành)

Nguồn: yêu cầu thực hiện nốt, bổ sung phép tính cà phê và câu trả lời chọn cửa hàng **VN0500** của người dùng. Hướng dẫn cập nhật tại [AGENT_SCHEDULING.md](../docs/AGENT_SCHEDULING.md).

- Đã bổ sung migration vai trò `schedule_bot` không kế thừa `authenticated`, scope cửa hàng riêng, RPC chỉ trả cột cần xếp lịch và lịch ba tuần liên quan. Bot không có quyền đọc trực tiếp bảng nghiệp vụ, ghi lịch chính thức/chấm công hoặc duyệt. Quyền nháp của người quản lý giữ nguyên. Snapshot nguồn lưu theo đúng cửa hàng; server từ chối nhân viên ngoài cửa hàng trong cả đề xuất và nguồn.
- CLI dùng Supabase Auth/RPC và cùng engine xếp lịch, đọc lại sau lưu. Chạy lại giữ nguyên nháp đã có, kể cả sửa của quản lý. Đã kiểm thử bằng client giả lập; chưa gọi Auth/PostgREST thật. Script cấp bot/lưu credentials DPAPI ngoài repo được chuẩn bị nhưng chưa thực thi các cờ ghi remote.
- Sổ tay/Tra công thức có **Tính nhanh tỷ lệ**, chỉnh lượng gốc/đích/thành phần, thêm/bớt thành phần, hỗ trợ dấu phẩy thập phân. 20g → 20ml + 45ml; 80g → **80ml + 180ml**, tổng **260ml** nước thêm vào. TÚ mini nhận mẫu câu này và tính cục bộ, không gọi mô hình; không xem là agent hiểu mọi câu tự do hay công thức chuẩn mới được duyệt.
- Suite frontend cuối: **1010 passed / 7 skipped**, 95 file đạt/2 bỏ qua. Kiểm thử quản lý và nhân viên đều mở được máy tính mà không gửi sửa/duyệt Sổ tay. `npm run build` và `npm run build:gh` đạt; lint không lỗi, còn 2 cảnh báo import cũ tại Login; build còn cảnh báo chunk lớn. Python scripts compile đạt, `git diff --check` đạt. Bundle production không chứa fixture/entry sandbox.
- Playwright/Edge: **6 passed (34,6 giây)** trên desktop/mobile sau sửa snapshot theo cửa hàng; gồm đọc/lưu/sửa/reload nháp, chạy lại không trùng, thiếu nhân sự/lỗi storage, tính tỷ lệ và đầu vào sai. Đã xem ảnh mobile của máy tính tỷ lệ.
- PostgreSQL disposable: `test_schedule_bot_db.py` đạt toàn bộ baseline/operational, draft CAS/RLS và bot scope. Xác nhận từ chối ngoài phạm vi, chặn đọc bảng/ghi lịch chính thức, thu hồi scope, chỉ cột cần thiết; snapshot lịch và trạng thái tuần không đổi. Cụm local đã dừng.
- **Chưa deploy hoặc tạo tài khoản thật**, tuân thủ yêu cầu ban đầu. Supabase preflight chỉ đọc xác nhận VN0500 hoạt động, hai bảng mới chưa tồn tại. Phát hành frontend/migrations và xác minh Auth/PostgREST remote còn chờ đợt triển khai được phép; không báo bot đã dùng backend thật. Không chạm dữ liệu lịch/công production, không thêm dịch vụ trả phí.

## Bot tạo lịch nháp — kiểm chứng local ngày 20/10/2026

Nguồn: yêu cầu nâng cấp exel_pro để bot đọc nhân viên/lịch và tạo nháp; kết quả công cụ trong phiên. Hướng dẫn: [AGENT_SCHEDULING.md](../docs/AGENT_SCHEDULING.md).

- Tái sử dụng hộp thoại và engine xếp lịch đăng ký; thêm lưu/mở/sửa đề xuất riêng, giới hạn số ca và số người từng ca/ngày. Kiểm tra trùng giờ, nghỉ giữa ca, ranh giới tuần, phiên bản nguồn và phiên bản nháp. Không tự áp dụng/nộp/duyệt lịch.
- Môi trường DEV riêng: 5 nhân viên giả, một tuần lịch sẵn và đăng ký tuần sau; Supabase client bị tắt. Bot chỉ lưu localStorage sandbox, không có nút áp dụng. Production build không chứa entry/fixture sandbox (đã kiểm tra output).
- Frontend toàn bộ: **993 passed, 7 skipped**, 92 file đạt/2 bỏ qua. `npm run build` đạt; `npm run lint` không lỗi, còn 2 cảnh báo import không dùng có sẵn trong Login. Build còn cảnh báo chunk lớn. `git diff --check` đạt.
- Playwright/Edge headless: **4 passed (34,6 giây)**, desktop/mobile. Đọc danh sách và lịch, tạo 30 ca/5 người (6 ca, 48 giờ/người), sửa/lưu/reload, chạy lại không trùng, báo thiếu và lỗi storage; không request ngoài localhost và không đổi lịch gốc. Sandbox Windows bị treo lúc dọn tiến trình ở lần đầu; đã chạy lại ngoài sandbox và kết thúc exit 0.
- Migration API nháp đã chạy trên PostgreSQL local với auth/RLS thật từ migrations repo: deny anon/staff/ngoài cửa hàng; chặn sửa trực tiếp; kiểm tra đầu vào, CAS hai kết nối đồng thời (một thành công/một conflict), chỉ một bản ghi; snapshot `schedules` và `schedule_weeks` không đổi. Harness operational hiện có cũng đạt. Cụm local đã dừng sau kiểm tra.
- **Chưa deploy**, chưa áp dụng migration lên Supabase production, chưa gọi PostgREST/Auth staging bằng tài khoản thật. Không tạo tài khoản bot production hay dịch vụ trả phí. Kịch bản là tự động cố định, chưa tích hợp AI hiểu ngôn ngữ tự nhiên. Các file ML và CLI đang thay đổi từ trước được giữ nguyên.

## Bộ nhớ — hoàn tất ngày 18/10/2026

- Người dùng đã xem và đồng ý bản thiết kế trước khi tạo.
- Tạo `ghi-chu/`, mỗi chủ đề một file, mục lục một dòng cho mỗi ghi chú; tạo `dang-lam.md` và quy tắc cập nhật trong `CLAUDE.md`.
- Lần kiểm tra trước khi tạo chưa có bộ nhớ ở các đường dẫn trên, nên không có file cũ cần gộp hoặc việc đã xong cần chuyển ra.
- Các quyết định cũ được nhận diện và đánh dấu tại ghi chú tương ứng: nghỉ 11 giờ và quản lý công bố ngay tài liệu cửa hàng. ML/Jev được ghi là thử nghiệm, không mặc định đã vận hành thật.
- Chỉ đưa việc chưa hoàn tất vào `dang-lam.md`. Không sao chép secret hay thông tin cá nhân vào bộ nhớ.

## Kiểm tra local ban đầu của đợt dọn app — đã được xử lý tiếp

- Frontend: `npm.cmd run test -- --maxWorkers=1` trong `frontend/` cho kết quả **83 file đạt, 1 file lỗi, 2 file bỏ qua; 882 kiểm thử đạt, 1 lỗi, 7 bỏ qua**.
- Lỗi tại `wordCloud.test.jsx`: kiểm thử Dashboard cũ mock `getAdminLogs`, trong khi component mới gọi `getCopilotActivity`. Cần cập nhật kiểm thử theo hành vi mới; chưa chạy lại đạt.
- PostgreSQL local: `scripts/test_practical_workflows.py` đã chạy qua bộ kiểm thử operational hardening, hạn đăng ký dùng chung, xung đột revision, chặn lưu quá hạn và quyền riêng tư của trạng thái đọc thông báo.
- Bộ PostgreSQL trên **chưa đạt toàn bộ**: dừng ở bước ghi hội thoại Admin do RLS từ chối. Cần rà fixture và policy trước khi kết luận nguyên nhân.
- Lint ở thời điểm chạy không có lỗi, có 4 cảnh báo import không dùng; đã chỉnh một số import Dashboard sau đó nhưng chưa xác nhận lại kết quả toàn bộ.
- Chưa chạy build và kiểm tra trình duyệt cho toàn bộ phiên bản sau đợt dọn mới nhất.

## Kiểm tra Sổ tay trước đợt dọn mới nhất

Tài liệu rollout ghi nhận ngày 17/10/2026: 65 kiểm thử frontend đạt, kiểm thử PostgreSQL đạt, kiểm tra desktop/mobile đạt, lint không lỗi và build thành công. Đây là kết quả của phiên bản trước các thay đổi dọn app tiếp theo.

Kiểm thử trình duyệt dùng dữ liệu/mạng giả lập; kiểm thử Storage dùng schema mô phỏng. Các kết quả này không xác nhận đã thử Gemini hoặc Supabase Storage trên production.

## Rà luồng luật/công thức — 18/10/2026

- Chạy lại 5 file `handbookManager`, `handbookKnowledge`, `handbookPublicationUi`, `copilotRag`, `copilotPermissions`: **57/57 kiểm thử đạt**. Kiểm tra API đề nghị/duyệt, xác nhận nội dung, lỗi giữ dữ liệu nhập, quyền đọc và truy xuất RAG.
- Chạy lại `python scripts/test_handbook_publication.py` trên PostgreSQL local: **đạt**. Bao gồm phân quyền, giữ bản đang công bố khi chờ duyệt, từ chối có lý do, kiểm tra revision, gỡ mềm, duyệt đồng thời, phạm vi ảnh và nhật ký. Storage là bảng mô phỏng; không thử upload thật.
- Qua đọc code phát hiện giới hạn chưa được kiểm thử trên UI hiện tại: các tab Sổ tay cũ vẫn render `GS25_HANDBOOK_DATA` trực tiếp, song song với `KnowledgeLibrary`. Sửa/gỡ bản database chưa đồng bộ toàn bộ các tab tĩnh đó.
- Cơ chế thay nguồn tĩnh dựa tên chuẩn hóa; đổi tên hoặc tạo tài liệu cùng nội dung nhưng khác tên không tự xác lập quan hệ thay thế. Không coi test đạt là đã xử lý đầy đủ trùng lặp/mâu thuẫn nguồn.
- Ngày hiệu lực chỉ là văn bản; chưa có lịch tự kích hoạt. Quy định viết trong Sổ tay không tự thay hằng số/validator của bộ xếp lịch.
- Không thay đổi code ứng dụng hoặc deploy trong lần rà này. Chưa kiểm chứng Gemini, upload ảnh và luồng đầu-cuối bằng tài khoản production.

## Giới hạn phát hành ghi nhận trước 19/10 — đã được thay thế

Ở thời điểm ghi nhận trước 19/10, hai migration ngày 17/10/2026 cho Sổ tay và luồng vận hành cùng frontend tương ứng chưa được xác nhận phát hành. Trạng thái này được thay bằng kết quả phát hành ngày 19/10 ở cuối ghi chú.

Việc tiếp theo được giữ duy nhất tại [dang-lam.md](../dang-lam.md).

## Chuyển toàn bộ danh mục — kết quả mới nhất ngày 18/10/2026

- Hoàn thành code Sổ tay/tra nhanh/TÚ mini chỉ đọc database, chuyển nguồn cũ sang snapshot ngoài frontend, tạo danh mục 98 tài liệu (62 công thức) và hai migration ngày 18/10 cho tên gọi khác/nhập chờ duyệt.
- Sửa kiểm thử Dashboard cũ để kiểm tra nhóm câu hỏi thật thay vì word cloud đã bỏ.
- Lần chạy toàn bộ frontend đạt **85 file, 886 kiểm thử; 2 file/7 kiểm thử bỏ qua**. Sau bổ sung chặn tên gọi khác của tài liệu đã gỡ và hai test tra nhanh/nguồn trống, chạy lại nhóm liên quan: **44/44 đạt**.
- `scripts/test_handbook_catalog.py` đạt trên PostgreSQL local: nhập lặp an toàn, giữ bản đã có, chờ Admin duyệt, không giả xác nhận, giữ định lượng/tên gọi khác, kiểm tra quyền, sửa/đổi tên, gỡ và không xuất hiện lại khi nhập lại.
- Kiểm tra trình duyệt desktop/mobile đạt: quản lý gửi sửa, Admin xác nhận và duyệt, nhân viên thấy 220ml thay 250ml; sau gỡ nhân viên không còn thấy cả hai. Không tràn chiều ngang trên màn hình 390px. Mạng và dữ liệu giả lập, không ghi production.
- Build cuối thành công, còn cảnh báo chunk lớn; lint không lỗi, còn 2 cảnh báo import cũ tại Login. Các file sửa được kiểm tra whitespace.
- Nội dung công thức không còn trong bundle theo đường import dữ liệu cũ; test kiến trúc kiểm tra runtime không import các snapshot/catalog seed.
- Chưa áp dụng migration hay phát hành frontend lên production. 98 là số nguồn trong gói nhập, không phải số tài liệu đã công bố thực tế. Upload ảnh thật và Gemini thật chưa được kiểm chứng.

## Phát hành và kiểm tra ngày 19/10/2026 — trạng thái mới nhất

- Đã áp dụng 4 migration ngày 17–18/10 vào Supabase thật và phát hành frontend: **Published**, sau đó đối chiếu 12 file công khai đạt `FRONTEND_RELEASE_OK`. Chi tiết tại [RELEASE_20261019](../docs/RELEASE_20261019.md).
- Đã nhập thật **98 nguồn, gồm 62 công thức**; tại thời điểm kiểm tra có **98 bản nhập chờ duyệt, 0 tài liệu công bố**. Admin cần kiểm tra nội dung/định lượng và duyệt trong app. Không tự công bố thay người phụ trách.
- `test_practical_workflows.py` đạt toàn bộ trên PostgreSQL local. Lỗi Admin do fixture dùng mã không khớp `current_emp_id()`; frontend đã dùng đúng `admin`. Sửa fixture, thêm kiểm tra từ chối mã giả; không nới quyền.
- Bổ sung 8 kiểm thử frontend: mất mạng chặn đăng ký, đồng hồ máy chủ, đổi tài khoản bỏ phản hồi cũ, revision conflict, Excel không lấy state cũ và nêu giới hạn, phân trang thông báo và lỗi ghi trạng thái đọc. Nhóm 4 file liên quan đạt **47/47**. Lint/build đạt với các cảnh báo cũ đã ghi nhận.
- Kiểm tra SQL chỉ đọc trên production đạt `HANDBOOK_RELEASE_READONLY_OK`: dùng identity Auth thực, kiểm tra Admin đọc đề nghị, nhân viên không thấy nháp, hạn đăng ký, quyền anonymous và bucket riêng tư. Không thao tác thay đổi lịch/công hoặc duyệt tài liệu thử trên production.
- Đã sao lưu public schema, nội dung Sổ tay và cấu hình/policy Storage vào `artifacts/release/` trước triển khai. Thử backup đầu bị giới hạn quyền Storage của Prisma, chưa gây thay đổi; đã dùng CLI quản trị để backup phần này rồi mới áp dụng migration.
- Vẫn chưa xác minh upload ảnh/Gemini và đăng nhập giao diện bằng tài khoản thật sau phát hành. Frontend đã lên `gh-pages`; chưa commit toàn bộ workspace lên `main`.

## Bổ sung duyệt toàn bộ và mở rộng trang — 19/10/2026

- Theo yêu cầu mới, thêm nút Duyệt toàn bộ cho Admin trong tab Chờ duyệt. Chốt danh sách thêm/sửa đang lọc, xác nhận nội dung/định lượng, tái sử dụng RPC duyệt và nhật ký từng tài liệu; báo tiến độ/kết quả một phần, tải lại sau xử lý. Không duyệt gỡ hàng loạt. Đổi tài khoản dừng gửi các bản tiếp theo.
- Mở rộng trang Sổ tay Admin/nhân viên theo chiều ngang vùng nội dung, bỏ max-width cố định. Không thay đổi giao diện các trang không thuộc Sổ tay.
- 21 kiểm thử trong 3 file Sổ tay đạt, gồm quyền hiển thị, bộ lọc, xác nhận, kết quả lỗi một phần và chuyển tài khoản. Lint không lỗi, vẫn còn hai cảnh báo cũ tại Login; build đạt.
- Trình duyệt 1440px/390px đạt: trang dùng chiều rộng khả dụng, duyệt hàng loạt có xác nhận, nhân viên thấy bản mới, gỡ qua duyệt và không tràn ngang. Dữ liệu/mạng giả lập; không duyệt tài liệu production khi kiểm thử.
- Deploy **Published**; kiểm tra 12 file công khai đạt `FRONTEND_RELEASE_OK`, báo cáo `artifacts/release/frontend-verified-20261019T041023Z.json`. Bản chính mới `index-DRcEP5u6.js`. Không cần migration mới.

## Cải tiến Cài đặt đơn vị — 19/10/2026

- Người dùng yêu cầu mở rộng và tiếp tục tự rà giao diện. Đã bỏ giới hạn chiều rộng của layout dùng chung Nhận diện/Vai trò, giảm trang trí, thêm mô tả mục điều hướng, gom tên và email hỗ trợ vào một khối, giữ logo/màu ở khối riêng. Bản xem trước ở bên phải màn hình rộng và thu gọn phía trên ở màn hình nhỏ.
- Sau xem ảnh vòng đầu, bỏ khối liên hệ đứng riêng vì để trống nhiều. Đã kiểm tra lại ảnh desktop/mobile của bố cục cuối. Thanh lưu khi có bản nháp được kiểm tra nằm trong viewport và không đè menu dưới mobile; input mobile dùng cỡ chữ 16px.
- 51 kiểm thử nhận diện/vai trò/API đạt. Hai kịch bản trình duyệt đạt: tải logo, xem trước/lưu, xung đột, mất mạng, tạo/đổi tên/gán/thu hồi/ngưng vai trò, chặn truy cập nhân viên. Kiểm tra chiều rộng 390/640/768/1024/1280/1440/1920px cho trang nhận diện, desktop/mobile cho vai trò. Toàn bộ dữ liệu/mạng thử được giả lập.
- Lint không lỗi (2 cảnh báo import cũ tại Login), build đạt (cảnh báo chunk lớn còn). `npm run deploy` báo **Published**; đối chiếu 15 file công khai đạt `FRONTEND_RELEASE_OK`, báo cáo `artifacts/release/frontend-verified-20261019T064351Z.json`, bundle chính `index-ta--HSdL.js`.
- Không đổi schema, quyền, cấu hình nhận diện hoặc vai trò production trong lần thử. Hướng dẫn cập nhật tại `docs/WORKSPACE_SETTINGS_USER_GUIDE.md`.

## TÚ mini nhận biết ngày/giờ — 19/10/2026

- Nguyên nhân: prompt chỉ có ngày hiện tại bên trong nhánh dữ liệu lịch; câu hỏi ngày thuần túy bị gửi sang luồng Sổ tay thiếu mốc thời gian.
- Thêm `copilotClock.js`: lấy ngày/thứ/giờ theo `Asia/Ho_Chi_Minh` mỗi yêu cầu, hỗ trợ hôm qua/mai/ngày kia. Drawer trả lời câu hỏi thời gian cơ bản trước khi tra Sổ tay, chạy agent hoặc gọi Gemini; ghi log model `local-clock`. Engine cũng dùng cùng helper; mọi prompt Gemini luôn có mốc thời gian riêng, tách khỏi tuần lịch đang xem.
- Không bắt câu hỏi giờ hủy hàng, lịch cá nhân, câu hỏi hỗn hợp hoặc lịch âm vào câu trả lời ngày giờ đơn giản. Không thay đổi quyền dữ liệu.
- 79 kiểm thử trong 4 file đạt, gồm ba role, chuyển ngày 00:00 Việt Nam, năm mới/năm nhuận, không gọi provider/Sổ tay và không nuốt câu nghiệp vụ. Lint/build đạt với các cảnh báo cũ. Không gọi Gemini thật để thử.
- Deploy **Published**; đối chiếu 15 file công khai đạt, báo cáo `artifacts/release/frontend-verified-20261019T070102Z.json`, bundle chính `index-DlMCdW4v.js`.
- Mốc thời gian dựa đồng hồ thiết bị, định dạng theo múi giờ Việt Nam; chưa có cơ chế hiệu chỉnh thiết bị đặt sai giờ bằng máy chủ. Không gọi đây là thời gian máy chủ.

## TÚ mini thống kê có căn cứ — 19/10/2026

- Phản hồi người dùng: trợ lý đoán các chủ đề phổ biến, rồi dùng số nhân viên/phản hồi/đổi ca thay số lượt hỏi. Đây là trả lời thiếu căn cứ và sai đối tượng thống kê; chưa xác minh các con số vận hành đó đúng hay sai tại thời điểm hỏi.
- Thêm API đọc `ai_conversations` bằng JWT hiện tại, đếm chính xác qua Supabase và đọc tối đa 200 câu hỏi gần nhất. Dùng RLS đã phát hành; không lấy câu trả lời AI hay hồ sơ nhân sự để suy ra lượt hỏi. Nhân viên chỉ hỏi thống kê của mình; quản lý đọc trong phạm vi server cho phép và bộ lọc cửa hàng.
- Drawer và engine dùng chung luồng trả lời trực tiếp, không gọi Gemini/Sổ tay cho thống kê. Nêu tổng lượt ghi nhận, thời gian Việt Nam, phạm vi, số mẫu và nguồn; nhóm chủ đề là phân loại tham khảo trong mẫu, không suy ra thứ hạng toàn bộ lịch sử hoặc số người dùng duy nhất. Bộ lọc cửa hàng chỉ đếm bản ghi gắn mã/phạm vi cửa hàng đã chọn; bản ghi `ALL` không tự chia cho từng cửa hàng.
- Phân biệt chưa có bản ghi với lỗi tải; giữ chủ đề khi hỏi tiếp “cho tôi số lượng và dữ liệu thực tế”. Không coi “số lượng” là lương, “tra cứu lịch” là trà, “hủy ca” là hủy hàng; gọi tên TÚ mini trong câu hỏi lương/công thức không tự chuyển sang thống kê. Hủy kết quả nếu tài khoản đổi trong lúc tải.
- 117 kiểm thử trong 7 file đạt; lint không lỗi, còn 2 cảnh báo import cũ tại Login. Build đạt với cảnh báo chunk lớn cũ. Các kiểm thử dùng dữ liệu giả lập; không tuyên bố đã đối chiếu tổng lượt production hoặc gọi Gemini thật trong lượt này.
- Deploy **Published**, kiểm tra 15 file công khai đạt `FRONTEND_RELEASE_OK`; bundle `index-5VnEuXfS.js`, báo cáo `artifacts/release/frontend-verified-20261019T072355Z.json`.

## Chống gửi dồn TÚ mini — 19/10/2026

- Phát hiện guard chỉ dùng React state, có khoảng trễ trước rerender; Edge chưa chặn theo tài khoản. Thêm khóa ref, khoảng nghỉ 3 giây, giữ thời gian chờ server và không tạo log cho lượt bị chặn tại UI.
- Thêm bộ đếm PostgreSQL riêng, cửa sổ trượt 10 yêu cầu Gemini/60 giây và tối thiểu 3 giây/lượt. Khóa hàng theo danh tính server để nhiều worker/tab không cùng lấy một lượt. RPC chỉ service role; kiểm tra thất bại thì không gọi provider. 429 không tự retry; upstream vẫn có tối đa 2 retry cho mỗi lượt đã nhận.
- 122 test/6 file đạt, thêm test cooldown server rồi 18 test Drawer đạt (123 test liên quan tổng cộng). Local PostgreSQL thực: 12 yêu cầu đồng thời cùng tài khoản → 1 accepted; cửa sổ hết hạn, cooldown, giới hạn 10, tài khoản khác và quyền anon/authenticated đã kiểm tra. Database local giữ tại `copilot_rate_427be34b4ea7` để đối chiếu. Không thử spam vào Gemini thật.
- Production migration đã áp dụng, backup `artifacts/release/public-schema-before-20261019T114643Z.sql`; RLS, hạn chế bảng/RPC và quyền service role đạt. `chat-proxy` deploy thành công. Không mở rộng các thay đổi này thành tuyên bố chống mọi bot hoặc chống spam cho toàn bộ app.
- Thêm 2 test tích hợp assistant workers đạt, tổng 125 test liên quan. Frontend **Published**, 15 file công khai đã đối chiếu: `artifacts/release/frontend-verified-20261019T114950Z.json`, bundle `index-DPHtiVse.js`. PostgreSQL kiểm thử đã dừng. Chưa thử nhiều thiết bị với tài khoản production thật.

## Rà soát toàn app sau phản hồi — 19/10/2026

- Full frontend suite đạt 975 test, 7 test tích hợp bảo mật skipped do thiếu môi trường. 89 file passed/2 skipped. Đối chiếu public lần nữa đạt 15 file: `artifacts/release/frontend-verified-20261019T115856Z.json`.
- Database read-only: các kiểm tra foundation/catalog true, 98 nguồn nhập, **0 pending imports, 114 published**. Trạng thái cũ “98 chờ duyệt, 0 công bố” chỉ đúng tại lần nhập đầu, không còn mô tả production hiện tại. Không suy ra ai duyệt hoặc chất lượng nội dung từ số đếm.
- Review ghi nhận: stream Gemini thiếu timeout/hủy xuyên suốt; cache HTML offline không được làm mới và fallback dùng Promise sai; truy vấn thống kê nhiều cửa hàng không thống nhất; nhiều thay đổi chưa commit và CI chưa nối các test DB mới. Chi tiết, mức độ chắc chắn và thứ tự xử lý: [APP_REVIEW_20261019.md](../docs/APP_REVIEW_20261019.md).
- Lượt này chỉ rà soát và cập nhật ghi chú, không sửa/deploy runtime. Không khẳng định đã kiểm chứng đăng nhập hoặc ghi lịch/công qua tài khoản production thật.

## Triển khai các phát hiện review — 19/10/2026

- Đã thêm cancellation/deadline client và proxy, giữ/đánh dấu câu trả lời dở; sửa HTML cache/fallback offline; thống nhất query thống kê qua view chuẩn hóa cửa hàng với RLS cũ; nối test PostgreSQL mới vào CI Linux.
- Full suite **986 passed/7 skipped**. Ba bộ PostgreSQL (`test_practical_workflows.py`, `test_handbook_catalog.py`, `test_copilot_rate_limit.py`) đạt; fixture DB lần lượt `ofc_stability_test_2ba68d68f7b3`, `ofc_stability_test_8ce638ddc666`, `copilot_rate_6fda85010561`. Lint/build đạt với cảnh báo cũ.
- Trình duyệt desktop/mobile đạt. Vòng đầu harness đọc nhầm câu trả lời thành công cũ khi request mới chưa gửi xong; đã sửa harness chờ đúng request rồi chạy lại đạt. Ảnh đã kiểm tra, không thấy tràn ngang phần chat.
- Database view và Edge đã deploy. Scan 226 file staged không khớp secret đang cấu hình hoặc các mẫu credential được kiểm tra; đây không phải chứng nhận không có mọi loại secret. Tag bản nguồn: `release-20261019-stability`. Các thử nghiệm ML chưa đưa vào commit phát hành. Chi tiết: `docs/RELEASE_20261019.md`.
- Bản public cuối khớp 15 file; `artifacts/release/frontend-verified-20261019T130208Z.json`, bundle `index-BtYtWRIz.js`. CI mới chưa được chạy trên GitHub; kiểm thử trong lượt này chạy local.
