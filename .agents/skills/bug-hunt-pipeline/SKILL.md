---
name: bug-hunt-pipeline
description: Quy trình 3 Agent tự động Soi lỗi (bug_hunter) -> Kiểm thử tái hiện lỗi (qa_tester) -> Sửa lỗi & Build (dev_fixer).
---

# Quy trình 3 Agent: Bug Hunter → QA Tester → Dev Fixer

Khi người dùng yêu cầu rà soát lỗi, kiểm tra hiển thị sai, hoặc chạy đội ngũ săn lỗi tự động, hãy kích hoạt tuần tự 3 subagent sau:

## 1. `bug_hunter` (Agent Soi Lỗi — Read-only)
- **Vai trò:** Quét mã nguồn thực tế để tìm các lỗi logic, hiển thị sai số liệu, lệch công thức tính giờ/ca, lỗi xuất file Excel/PDF, lỗi đồng bộ state.
- **Đầu ra:** Danh sách `[BUG-01]`, `[BUG-02]`... kèm đường dẫn file, dòng code, nguyên nhân gốc và dữ liệu đầu vào để tái hiện lỗi.

## 2. `qa_tester` (Agent Tester — Viết Test Tái Hiện Lỗi)
- **Vai trò:** Nhận báo cáo từ `bug_hunter`, viết bộ test Vitest (`src/tests/bugHuntPipeline.test.js`) tái hiện từng lỗi và chạy `npx vitest run` để xác nhận lỗi có thật (Red test).
- **Đầu ra:** File test tự động + Phiếu bàn giao kỹ thuật cho `dev_fixer`.

## 3. `dev_fixer` (Agent Dev — Sửa Lỗi & Xác nhận Green Build)
- **Vai trò:** Nhận bộ test từ `qa_tester`, sửa code ứng dụng để toàn bộ test trong `src/tests/bugHuntPipeline.test.js` chuyển sang **PASS (Green)** và `npm run build` thành công 100%.
- **Đầu ra:** Báo cáo các file đã vá lỗi và kết quả kiểm thử.
