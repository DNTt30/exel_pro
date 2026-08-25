# CẨM NANG DÙNG THỬ — CHO QUẢN LÝ CỬA HÀNG (SM)

## 1. Đăng nhập
- Web: https://dntt30.github.io/exel_pro/
- Tài khoản: **mã NV 9 số của bạn** · Mật khẩu: `1`
- Vào thẳng trang Quản trị. Điện thoại dùng tốt, không cần cài app.

## 2. Chuẩn bị 1 lần (bạn hoặc OFC làm giúp)
```sql
-- Gán SM phụ trách nhiều cửa hàng (chạy trong Supabase SQL Editor):
UPDATE stores SET sm_id = '260716009' WHERE id IN ('VN0485','VN0497'); -- sửa mã & mã CH
-- Báo nghỉ việc thì khóa tài khoản:
UPDATE employees SET is_active = false WHERE id = '260512008';
```

## 3. Việc tuần của SM (5–10 phút/ngày)
| Việc | Ở đâu | Ghi chú |
|---|---|---|
| Nhập lịch tuần | **Nhập lịch** → kéo thả file Excel ezHR | Nhận cả ca viết kiểu `6h-18h`, `22-6 VN0497` |
| Để AI xếp hộ | **Xếp lịch AI** → nhập doanh số T2–T6 / T7–CN | PT tự dồn ca ngắn giờ vàng, FT giữ khung xương |
| Sửa lịch tay | Bấm ô bất kỳ trên bảng lịch | Kéo thả đổi ca giữa 2 NV |
| Chốt công thực tế | **Chấm công** → ✏️ Sửa công thực tế | Nhập số giờ ezHR, ô vàng = ghi đè |
| Duyệt yêu cầu NV | **Yêu cầu C&B** / Đổi ca | NV gửi lên hiện ngay |
| Xuất công lương | **Chấm công** → 📗 Xuất Công Lương C&B | Đúng mẫu 31 ngày 26→25 gửi C&B |

## 4. Ngày 25 hàng tháng
- Mỗi NV thấy thông báo vàng trên app → tự bấm **"Xác nhận đúng & đủ công"**.
- SM xem tiến độ ở ô **"Xác nhận công"** trên Dashboard; còn thiếu ai thì nhắn đôn đốc.
- NV bấm "Báo chênh lệch" sẽ rơi vào Yêu cầu C&B chờ SM xử lý.

## 5. Quy tắc hệ thống tự kiểm tra giúp bạn
- STPT: đủ 16–23h/tuần (vượt đỏ ⚠️ >91h/tháng) · STFT/CSR_NEW: ≥48h & ≥6 ca
- Nghỉ giữa ca ≥11h: hết 22h không dính 6h sáng hôm sau
- NV mới phải có bạn cứng kèm cùng ca

## 6. Khi gặp lỗi
- F5 trang trước, nếu vẫn lỗi: chụp màn hình + mô tả gửi Zalo nhóm dự án.
- Dữ liệu lưu Supabase cloud — máy hỏng cũng không mất lịch.

---
> Chi tiết ranh giới quyền: xem `MA_TRAN_QUYEN.md`. SM chỉ thao tác trong các cửa hàng được gán `sm_id`.
