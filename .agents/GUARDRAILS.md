# AGENT GUARDRAILS (Phanh An Toàn Cho Tác Nhân AI)

Tài liệu này xác lập ranh giới quyền hạn bắt buộc đối với MỌI tác nhân AI (chính hoặc phụ) khi hoạt động trong dự án `d:\schedule-app\`.

---

## 1. Vùng Cấm Tuyệt Đối (FORBIDDEN - HARD BRAKE)

Bất kỳ hành động nào vi phạm danh sách dưới đây đều bị coi là lỗi nghiêm trọng (`CRITICAL_VIOLATION`):

| Khu vực / Thao tác | Mô tả rủi ro & Lý do cấm |
|---|---|
| **`frontend/src/store/useStore.js` (`login`)** | Tuyệt đối không thay đổi cơ chế xác thực hoặc đổi mật khẩu mặc định `"1"`. |
| **`frontend/src/lib/supabase.js`** | Không can thiệp client khởi tạo Supabase. |
| **Trực tiếp gọi Supabase từ Component** | Mọi tương tác DB phải đi qua tầng API tập trung `frontend/src/services/api.js`. |
| **File `.env` / Credentials** | Không commit, không log, không in ra màn hình bất kỳ API Key hay URL bí mật nào. |
| **Thêm Backend Node.js** | Dự án là kiến trúc Serverless/SPA frontend giao tiếp trực tiếp với Supabase qua RLS. |
| **Đổi mã nhân viên định dạng 9 số** | Regex `MA_RE = /^\d{9}$/` là chuẩn toàn hệ thống. |
| **Phá vỡ shape dữ liệu ca làm việc** | Bắt buộc tuân thủ shape: `schedule[weekDate][empId][dayKey] = '6-14' | { shift: '14-22', covering_store: 'VN0485' }`. Không gộp `''` (chưa xếp) và `'off'` (nghỉ). |

---

## 2. Vùng Được Phép Thao Tác (ALLOWED)

Các tác nhân được phép chủ động đọc, ghi, kiểm thử trong phạm vi sau:

| Thao tác | Phạm vi được phép |
|---|---|
| **Đọc dữ liệu** | Toàn bộ thư mục `frontend/src/`, `docs/`, `supabase/`, `scripts/`. |
| **Chạy kiểm thử & linter** | `npm run test`, `npm run lint`, `npm run build` trong `frontend/`. |
| **Sửa đổi logic UI / Utility** | Các component trong `frontend/src/components/`, `frontend/src/utils/` (khi có chỉ định). |
| **Viết thêm bài kiểm thử** | Được tự do tạo mới và bổ sung test cases vào `frontend/src/tests/*.test.js`. |
| **Tối ưu hóa hiệu năng** | Code splitting, lazy loading route, loại bỏ biến thừa/cảnh báo linter. |

---

## 3. Quy Tắc Tự Kiểm Định (Self-Evaluation Rule)

Mọi tác nhân sau khi hoàn thành nhiệm vụ phải tự chạy lệnh kiểm tra:
```bash
npm run test
npm run lint
```
Chỉ khi cả 2 lệnh trên đều `PASS` (0 error, 100% test pass), tác nhân mới được bàn giao kết quả cho Quản lý.
