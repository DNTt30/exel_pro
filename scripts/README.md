# Scripts dự án

Chạy từ root repo, trừ khi đầu file ghi rõ thư mục khác.

- `check_*_ui.mjs`: kiểm thử trình duyệt; đọc yêu cầu Vite/CDP ở đầu từng file.
- `check_workspace_roles.sql`: fixture kiểm thử, chỉ chạy trong database trống riêng.
- `test_operational_hardening.py`: kiểm tra giao dịch/quyền/ngoại lệ và thông báo trên PostgreSQL local tách biệt; xem `docs/OPERATIONAL_HARDENING.md`.
- `check_operational_ui.mjs`: kiểm tra Admin hủy/ghi đè lịch, SM bị chặn, nhật ký và tuần trong thông báo; mock toàn bộ mạng ngoài.
- `jev_agents.mjs`: điều phối agent local theo cấu hình hiện có.
- `generate_ml_data.js`: dữ liệu giả lập, không đưa vào dữ liệu vận hành.
- `build_db_catchup.py`: dựng bundle migration từ các migration đã version.
- `release_operational_database.py --handbook-catalog`: kiểm tra chỉ đọc trạng thái phát hành Sổ tay; thêm `--apply` để sao lưu và áp dụng 4 migration đã kiểm thử. Không tự duyệt tài liệu.
- `check_handbook_release.sql`: kiểm tra chỉ đọc quyền/Sổ tay/hạn đăng ký trên database đã triển khai; không tạo tài liệu hay đăng nhập người dùng.
- `verify_frontend_release.py`: so sánh file GitHub Pages công khai với `frontend/dist`, lưu báo cáo vào `artifacts/release/`.

Các scratch browser cũ đã bỏ vì trùng với kiểm thử hiện có, phụ thuộc Playwright
chưa được khai báo và có thao tác với app thật. Script fetch nhân viên cũ đã bỏ
vì in toàn bộ dữ liệu nhân sự. Unit/integration tests nằm ở `frontend/src/tests/`.
