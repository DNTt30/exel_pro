# PROJECT AUDIT — OFC Schedule App (exel_pro)

> Ngày audit: 2026-08-25 · Commit gốc: `f0f2917` · Phạm vi: toàn repo `D:schedule-app` (= github.com/DNTt30/exel_pro)
> Phương pháp: đọc code + probe trực tiếp Supabase REST (anon key) + git history. **Chưa sửa code** — đây là Phase 0.

---

## ✅ CẬP NHẬT TRẠNG THÁI P0 — KIỂM TRA LẠI NGÀY 25/08 SAU PHASE 1–6

| P0 | Tình trạng lúc audit | Hiện tại (bằng chứng probe trực tiếp) |
|---|---|---|
| **P0-1 RLS mở toàn bộ** | ❌ Mở 13 bảng | ✅ **ĐÃ FIX** — RLS bật trên 13 bảng, policy `p1_*`; probe lại: **anon = 0 dòng trên toàn bộ** (stores→ai_conversations), INSERT log bị chặn HTTP 401 |
| **P0-2 Mật khẩu suy diễn được** | ❌ `ofc-{maNV}-1` | ⚠️ **VẪN MỞ** (chủ đích giai đoạn chuyển tiếp): code còn `AUTH_PASSWORD='1'` (`authSession.js:4,8`). Đã khống chế thiệt hại nhờ P0-1: kẻ giả mạo đăng nhập được nhưng chỉ thấy/đụng đúng phạm vi vai trò của nạn nhân + mọi ghi mang JWT định danh thật. Kế hoạch bỏ hẳn: docs/AUTH_HARDENING.md |
| **P0-3 Role client tự ghi** | ❌ metadata tin được | 🟡 **MITIGATED** — không policy nào đọc `auth.jwt()`/metadata (grep sạch); quyền hiệu lực lấy từ bảng `user_store_roles`. Client vẫn ghi metadata nhưng chỉ là display. Fix trọn vẹn = Custom Access Token Hook (backlog) |
| **P0-4 Log không đáng tin** | ❌ mở ghi + actor tự khai | 🟢 **ĐÃ FIX phần lớn** — anon INSERT log bị chặn 401; log bất biến (không UPDATE/DELETE); `attendance.updated_by` do trigger đóng dấu từ JWT. Dư địa: người đang đăng nhập (nhờ P0-2) vẫn có thể tự nhận danh danh khác → khép kín khi P0-2 đóng |

**Kết luận:** 2/4 P0 đóng hoàn toàn (đã xác minh), 1 mitigated, 1 còn mở có kiểm soát — việc đóng P0-2 yêu cầu đổi trải nghiệm đăng nhập của toàn bộ SM/NV nên tách làm đợt riêng theo kế hoạch 2 tuần.

---

## A. ARCHITECTURE