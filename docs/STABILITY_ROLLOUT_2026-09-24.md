# Tiến độ ổn định hệ thống — cập nhật 24/09/2026

Code và migration đã lưu trong workspace. **Chưa commit, push, áp migration lên Supabase hoặc deploy hosting.**
Ứng dụng thực tế nằm trong `frontend/`; prototype `schedule-app/` không được sửa.
Mật khẩu mặc định vẫn là `1`; cấu trúc lịch và `employee.dept` khi chi viện được giữ nguyên.

## Những gì đã sửa

| Nhóm | Kết quả |
| --- | --- |
| Đăng nhập | Kiểm tra mã nhân viên, không dùng cache để vượt lỗi lookup/mật khẩu; phân biệt lỗi kết nối; dọn phiên admin khi cần OTP; nhận diện SM/AM đúng. |
| Phiên người dùng | Ghi nhớ đăng nhập dùng local/session storage; tuần tự hóa login/logout; reset dữ liệu và bỏ kết quả request thuộc phiên cũ, gồm bootstrap, lịch, công, kệ, nhân sự, cửa hàng và log. |
| Lưu lịch | Truyền version đọc từ DB, khóa khi hai client cùng sửa; xếp hàng ghi; bulk optimistic và rollback theo từng nhân viên; lỗi trả về UI. |
| AI, Excel, sao chép tuần | Bulk-save qua store; AI chỉ ghi nhân viên trong kết quả; giữ covering_store; từ chối bulk snapshot đã cũ khi chờ lưu. |
| Realtime | Đúng bảng feedbacks; đệm sự kiện lịch khi đang ghi; áp phiên bản mới sau khi ghi xong; tải lại các tuần đã cache khi nhận DELETE. |
| Chấm công | Xóa override thực sự bằng DELETE; giữ số 0; bỏ note OFF cũ khi nhập số; thống nhất nguồn/tổng công ở admin và nhân viên; tách con trỏ tháng khỏi tuần lịch. |
| Hiển thị/rule | Phân biệt chưa xếp và OFF; cảnh báo cả 0 giờ/0 ca; sửa cột tổng che ngày trên mobile. |
| Khóa tuần | Chuẩn hóa pending thay submitted; sửa trigger cho upsert duyệt tuần; khóa ghi lịch và xóa trạng thái tuần khi pending/approved, kể cả chi viện chuỗi cũ. |
| Đổi ca | Giao dịch DB đổi cả hai lịch và trạng thái đơn; lỗi một phần rollback toàn bộ; trigger áp dụng cả khi cập nhật trạng thái trực tiếp. |
| Bù công | RPC duyệt/từ chối và sửa ca trong cùng giao dịch; chặn tự duyệt; trả lịch/version đã commit cho UI. |
| Quyền | Giới hạn công/đơn/kệ theo chủ sở hữu hoặc cửa hàng; restrictive policy chặn policy cũ mở rộng quyền; SM không tự nâng quyền, vẫn quản lý nhân viên thường. |
| PWA khi phát triển | Không đăng ký service worker ở dev; dọn worker/cache của ứng dụng để tránh trộn module React cũ/mới sau HMR. Production vẫn đăng ký PWA. |

API đọc lịch, nhân viên, cửa hàng, công, đơn và kệ trả lỗi thay vì dữ liệu rỗng giả.
Các test tự tính lại công thức mật khẩu đã được thay bằng test gọi login thật với dependency giả lập.
Test component/CRUD được mock các API bên ngoài; bộ test thường không chủ động gọi Supabase/Telegram thật.

## Kết quả kiểm tra

- `npm.cmd run test`: **446 đạt, 7 bỏ qua**, 45 file đạt và 2 file live bỏ qua.
- `npm.cmd run lint`: đạt, không warning.
- `npm.cmd run build`: đạt; còn cảnh báo bundle trên 500 kB.
- `git diff --check`: đạt tại chặng kiểm tra cuối; Windows có cảnh báo chuyển LF/CRLF.
- PostgreSQL 17 cục bộ: chạy toàn bộ migration trên DB mới và DB chứa schema/policy Phase 1 cũ trong repository.
- Test DB gồm: RLS theo cửa hàng, chặn nâng quyền, SM CRUD nhân viên thường, version conflict giữa hai kết nối, bulk rollback, upsert trạng thái tuần, khóa pending/approved, khóa ca chi viện legacy, đổi ca atomic/idempotent, xóa công và bù công atomic/idempotent/rollback.
- Edge 1440×1000 và 390×844: login, lịch admin/nhân viên và công admin/nhân viên; kiểm tra 0/OFF/trống, đổi tháng không đổi currentWeek, không có exception ứng dụng. Dữ liệu và trạng thái kết nối trong bài kiểm tra là giả lập; các request ngoài localhost bị chặn.
- Ảnh kiểm tra nằm trong `artifacts/stability-ui/` (đã lưu trên đĩa, được gitignore). Đây là smoke test UI, không thay cho E2E với Auth/PostgREST thật.

## Cách chạy lại

Frontend, trong `frontend/`:

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Database, từ root, với PostgreSQL kiểm thử riêng đã chạy ở **127.0.0.1:55439**:

```powershell
python scripts/test_stability_db.py
python scripts/test_stability_db.py --legacy
```

Harness không đọc `.env`, tạo database tên ngẫu nhiên `ofc_stability_test_*`, giữ lại để kiểm tra.
Schema Auth trong harness là tối thiểu giả lập `auth.uid()` và role, không phải toàn bộ Supabase Auth.

UI: Vite ở `127.0.0.1:5179`, Edge headless dùng profile riêng và CDP cổng `9227`, sau đó:

```powershell
node scripts/check_stability_ui.mjs
```

Bộ kiểm tra live chỉ chạy khi đặt `RUN_LIVE_SECURITY_TESTS=1`; probe ghi RLS còn cần `RUN_RLS_WRITE_PROBE=1`.
Chỉ bật các cờ này trên môi trường kiểm thử đã xác nhận. Bộ `securityRegression` có PATCH/DELETE với ID probe.

## Thứ tự đưa lên môi trường thật

1. Xác định Supabase project và hosting đích, lấy schema/migration history hiện tại và bản sao lưu. Đối chiếu function signatures, trigger, policy và các cột với repository.
2. Đối chiếu quyền đang có trong `user_store_roles`, `stores.sm_id` và chức danh/dept của `employees`. Helper mới lấy quyền từ hồ sơ nhân viên ở DB; cấu hình cấp quyền đặc thù ngoài repository phải được đối chiếu trước khi áp dụng.
3. Chạy trên staging trước. Foundation `20260920000000` là dependency bổ sung có timestamp trước các migration đã có; kiểm tra migration history để bảo đảm nó được áp dụng, không bỏ sót chỉ vì môi trường đã chạy migration 20260921. Hai file 20260921 đã đổi UTF-16/dollar quoting sang UTF-8 hợp lệ; không chạy lại tùy tiện các migration đã ghi nhận.
4. Áp foundation và stability transaction trong cửa sổ bảo trì, theo dependency. Frontend mới cần các RPC: `login_lookup_v2`, `ensure_app_profile_v2`, `save_employee_schedule`, `upsert_schedules_bulk`, `approve_shift_swap_atomic_v2`, `resolve_feedback_atomic_v2`.
5. Sau khi RPC/quyền trên staging đạt, deploy frontend tương ứng và buộc các tab bản cũ tải lại. Expected version giờ bắt buộc; client cũ truyền null sẽ bị từ chối ghi, không được bỏ qua điều kiện này để chữa tạm.
6. Chạy thử đăng nhập, OTP/đổi mật khẩu, hai trình duyệt sửa cùng lịch, submit/approve/reject tuần, đổi ca/bù công, công 0/OFF/xóa, nhập Excel và đối chiếu file xuất/in bằng dữ liệu nghiệp vụ.
7. Chỉ đưa production sau khi staging đạt; kiểm tra lại các luồng chính và theo dõi lỗi đồng bộ sau triển khai.

Rollback cần đi cùng phiên bản API. **Không rollback hosting về frontend cũ trong khi giữ RPC bắt buộc version mới.**
Nếu migration chưa commit thì rollback transaction. Nếu đã deploy, ưu tiên sửa tiến về trước; khi cần rollback phải khôi phục các định nghĩa function/policy/trigger từ bản sao schema đã lưu cùng frontend tương ứng, bảo toàn lịch/công đã ghi mới. Không drop bảng hoặc restore dữ liệu cũ đè lên phát sinh mới.

## Phần chưa hoàn thành / giới hạn

- Chưa đối chiếu schema thực tế, cấu hình Auth/OTP/JWT hook, custom policy và migration history của Supabase đích.
- Chưa deploy staging/production hoặc chạy các test live. Môi trường DB kiểm thử không thay thế kiểm thử PostgREST, Realtime và Auth thật.
- Chưa chạy trọn luồng kéo thả/import Excel, tải file Excel/PDF và in trên browser với dữ liệu thực tế; các parser/exporter có unit test trong suite hiện tại.
- Chưa kiểm tra giao dịch xuyên suốt với các thiết bị/trình duyệt thật và các cấu hình private browsing cụ thể; storage/session đã có regression test giả lập.
- Schema baseline là phần core của app; các bảng log/AI và các RPC credential từ bộ legacy vẫn cần đối chiếu khi dựng một môi trường production hoàn toàn mới.
- Chưa tối ưu cảnh báo bundle lớn; không phải lỗi build.

## Timeline còn lại

| Chặng | Trạng thái / ước lượng |
| --- | --- |
| Sửa các lỗi đã liệt kê + bổ sung bù công atomic/PWA dev | Đã lưu code |
| Unit, lint/build, migration và giao dịch cục bộ, smoke UI | Đã kiểm tra như trên |
| Đối chiếu schema và cấu hình staging | 30–60 phút sau khi có môi trường; lâu hơn nếu có drift/custom policy |
| Áp staging và UAT bằng tài khoản/dữ liệu nghiệp vụ | 45–90 phút |
| Production và kiểm tra sau deploy | 20–30 phút sau khi staging đạt |

Đây là ước lượng công việc còn lại, không phải cam kết giờ lên production.
