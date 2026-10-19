# Tiêu Chuẩn Vận Hành Đội Ngũ AI Agent (AI Agent Workflow SOP)

*Tài liệu này quy định luồng làm việc (Pipeline) bắt buộc đối với hệ thống AI Agents khi thực hiện bất kỳ thay đổi mã nguồn nào trong dự án.*

---

## 🚀 QUY TRÌNH PHÁT TRIỂN TIÊU CHUẨN (CORE PIPELINE)

Mỗi khi phát triển tính năng mới hoặc sửa lỗi (fix bug), hệ thống tự động phải tuân thủ nghiêm ngặt 6 bước sau:

### 1. 🎯 Phân bổ nhiệm vụ (PM Agent)
- Tiếp nhận yêu cầu từ người dùng (Human).
- Trực tiếp đóng vai trò Project Manager (PM): Phân tích nghiệp vụ, chốt giải pháp, chia nhỏ thành các task kỹ thuật.
- Khởi tạo (Spawn) các Sub-agents với Prompt chỉ thị rõ ràng.

### 2. 💻 Viết mã nguồn (Coding Agent)
- Tạo nhánh (branch) mới `feature/...` hoặc `bugfix/...` theo chuẩn Git flow.
- Trực tiếp viết, sửa đổi mã nguồn (Frontend/Backend/Database).
- Báo cáo hoàn thành nháp.

### 3. 🕵️ Đánh giá mã nguồn (Review Agent)
- Vào vai Senior Developer (Peer Review).
- Tìm kiếm lỗi logic, cấu trúc tồi (Spaghetti code), kiểm tra tính tuân thủ nguyên tắc Clean Code và SOLID.
- Gửi feedback phản hồi và ép Coding Agent sửa lại nếu chưa đạt chuẩn.

### 4. 🧪 Kiểm thử tự động (Test Agent)
- Chạy các bộ Unit Test (Vitest/Jest) hiện có để đảm bảo không làm gãy tính năng cũ (Regression Testing).
- Viết thêm Testcase mới cho đoạn code vừa được sinh ra.
- Nếu test thất bại (Fail), log bug yêu cầu Coding Agent fix.

### 5. 🛡️ Kiểm toán bảo mật (Security Agent)
- Rà soát lỗ hổng bảo mật (Vulnerabilities) trước khi hợp nhất mã.
- Tập trung vào: Data Leakage, SQL Injection, Auth Bypass, Hardcoded Secrets, RLS Policies trên Supabase.

### 6. 👑 Phê duyệt cuối cùng (Human Approval)
- PM Agent tổng hợp kết quả (Báo cáo PR, Lỗi đã sửa, Kết quả Test).
- Trình bày cho Người dùng (Human / Store Manager) xem xét.
- Đợi Human "Duyệt" (Approve) mới tiến hành Merge code và Deploy.

---

## 🛠️ NGUYÊN TẮC BỔ SUNG (THEO MÔ HÌNH MODULE)
Đối với các Module lớn (VD: Quản lý kho, Quản lý Khách hàng), quy trình mở rộng theo các pha:
1. **BA Phase:** Clarification & QA Template.
2. **Design Phase:** Sinh ra tài liệu SRS -> Basic Design -> Detail Design.
3. **Dev Phase:** Chạy quy trình 6 bước Core Pipeline ở trên.
4. **Deploy Phase:** Kéo code, build và kiểm tra trên môi trường thực tế.

> **Ghi chú cho AI (Antigravity):** *Đọc file này trước khi bắt đầu bất kỳ Sprint code nào để đảm bảo duy trì chất lượng Enterprise-grade cho dự án.*
