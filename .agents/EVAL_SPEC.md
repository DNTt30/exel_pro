# EVAL SPECIFICATION (Tiêu Chí Tự Chấm Điểm Cho AI)

Bản đặc tả Rubric chấm điểm tự động. Mọi tác nhân phải dùng tiêu chuẩn này để tự đánh giá sản phẩm của mình trước khi báo cáo hoàn thành.

---

## 1. Bảng Điểm Đánh Giá (Tối đa: 100 điểm)

| Trọng số | Hạng mục | Tiêu chí đạt điểm tối đa | Cách tự kiểm tra |
|---|---|---|---|
| **35%** | **Unit Test & Regression** | 100% test pass, 0 test failed trong thư mục `src/tests/` | Chạy `npm run test` trong `frontend/` |
| **25%** | **Lint & Clean Code** | 0 error, 0 warning từ Oxlint | Chạy `npm run lint` trong `frontend/` |
| **20%** | **Architecture Integrity** | Không có component nào trực tiếp import từ `@supabase/supabase-js` hoặc bypass `api.js` | Static grep search toàn bộ `src/components/` |
| **10%** | **Data Shape Compliance** | Không dùng magic numbers (giờ ca, ngưỡng 16h/48h/91h), phải tham chiếu từ `constants.js` | Scan JSX/hooks |
| **10%** | **Security & Credentials** | Không chứa secret keys, password hardcode (ngoại trừ quy ước pass="1" trong login) | Scan git status và code diff |

---

## 2. Ngưỡng Nghiệm Thu (Acceptance Threshold)

- **Đạt chuẩn (PASS - Ready for Release)**: Điểm $\ge 95/100$, không có bất kỳ vi phạm nào thuộc Vùng Cấm (`CRITICAL_VIOLATION`).
- **Cần làm lại (RETRY - Loop back)**: Điểm $< 95/100$. Tác nhân phải tự phân tích lỗi và sửa chữa lại.
- **Báo động Đỏ (FAIL - Abort & Escalate)**: Vi phạm Guardrails cấm hoặc làm gãy cơ chế đăng nhập.
