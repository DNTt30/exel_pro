# Về dự án & Cách làm việc (Mục lục < 50 dòng — Chuẩn Bài 7 & 16)
Hệ thống Xếp lịch, Chấm công & Vận hành cửa hàng GS25 (`schedule-app`).
- **Phong cách trả lời:** Tiếng Việt ngắn gọn, nêu kết luận trước, luôn kèm link file/symbol click được.
- **Quy tắc bất di bất dịch:**
  1. Ca nhân viên mới đăng ký (`confirmed: false` / `:reg`) KHÔNG được tính vào giờ phân ca chính thức, quỹ giờ cửa hàng hay báo cáo lương/OFC/PDF/Excel.
  2. Sau khi sửa code: luôn tự kiểm tra Eval (`npx vitest run` & `npm run build`) trước khi báo xong; nếu người dùng yêu cầu đưa lên bản live thì chạy `npm run deploy`.
  3. Nhắc lần 2 thì đề xuất thêm vào file này (giữ file này luôn dưới 50 dòng).

# Bộ nhớ 3 ngăn (Đọc khi bắt đầu phiên hoặc khi cần ngữ cảnh — Bài 8)
- Việc đang làm & vừa hoàn thành: `docs/bo-nho/dang-lam.md`
- Mục lục ghi chú & quyết định: `docs/bo-nho/muc-luc.md`
- Tóm tắt 16 bài học 1000 giờ & lời nhắn mẫu: `docs/16_BAI_HOC_1000_GIO_CLAUDE.md`

# Kỹ năng (Skills) chuyên biệt trong dự án
- Quy trình 16 bài học 1000 giờ: `.agents/skills/1000-gio-workflow/SKILL.md`
- Quy trình 3 Agent Săn lỗi (`bug_hunter` → `qa_tester` → `dev_fixer`): `.agents/skills/bug-hunt-pipeline/SKILL.md`
