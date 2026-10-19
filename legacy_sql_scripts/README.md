# SQL lịch sử — không dùng để cài mới

Các file ở đây phục vụ đối chiếu lịch sử. Schema hiện hành nằm trong
`supabase/migrations/` với timestamp; không đổi lại thành `001_init.sql` vì
có thể phá lịch sử migration của database đang chạy.

`scratch_stores_schema.sql` đã bỏ: trùng baseline và chứa policy cho phép mọi
người đọc/ghi. Không chạy lại script này để sửa lỗi thiếu bảng.

Khi cập nhật database cũ, đọc `docs/DATABASE_CATCHUP_20260928.md` và các hướng
dẫn rollout của tính năng trước khi chạy migration.
