# Mục Lục Ghi Chú & Quyết Định (`docs/bo-nho/muc-luc.md`)

 Mỗi ghi chú 1 dòng theo chuẩn **Bài 8 (Nâng cấp trí nhớ — 1000 giờ dùng Claude)**:

- `docs/16_BAI_HOC_1000_GIO_CLAUDE.md` — Tài liệu tóm tắt trọn bộ 16 bài học, 20 lời nhắn mẫu (P01–P16) và bảng lệnh từ `nhatanh.ai/1000-gio`.
- `.agents/skills/1000-gio-workflow/SKILL.md` — Skill tự động hóa quy trình làm việc 1000 giờ (Giao việc, Bộ nhớ 3 ngăn, Phân tầng Sub-agent, 4 nấc Eval).
- `.agents/skills/bug-hunt-pipeline/SKILL.md` — Quy trình 3 Agent độc lập (`bug_hunter` → `qa_tester` → `dev_fixer`) để rà quét lỗi, viết test Vitest tái hiện và vá lỗi.
- **Quyết định nghiệp vụ cốt lõi (23/10/2026):** Mọi nơi tính giờ chính thức (`StoreHoursBudget`, `Real-time Tracker`, `EmployeeRow`, `summaryMetrics`, `Dashboard`, `PTOvertimeModal`, `exportPayroll`, `exportOFC`, `excelExport`, `pdfExport`) chỉ tính ca đã chốt (`confirmed !== false`), tách bạch hoàn toàn với ca nhân viên đăng ký chờ duyệt (`:reg`).
