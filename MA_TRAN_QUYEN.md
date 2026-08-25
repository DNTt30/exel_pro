# MA TRẬN QUYỀN — ADMIN vs SM (cập nhật lần 2)

## 🧑‍💼 ADMIN (`admin` / mật khẩu `1`) — chỉ bạn giữ
| Khu vực | Quyền |
|---|---|
| Đăng nhập | Tài khoản đặc biệt, không phải mã NV |
| Cửa hàng | Thấy **tất cả**, bộ lọc có "Tất cả cửa hàng" |
| Nhân viên | Thêm / sửa / **khóa mã NV** (is_active) |
| Cửa hàng (trang) | Gán `sm_id`, sửa thông tin CH |
| Nhật ký | Xem toàn bộ lịch sử hệ thống |
| Lịch ca / AI xếp lịch | Mọi CH, nhập/xuất ezHR, doanh thu tự sinh ca |
| Chấm công | Sửa công thực tế mọi CH, xuất công lương C&B |
| Bù công & đổi ca | Duyệt tất cả |
| Kệ & date | Toàn chuỗi |

## 👔 SM (mã NV 9 số / `1`) — quản lý cửa hàng được gán `sm_id`
| Khu vực | Quyền |
|---|---|
| Cửa hàng hiển thị | **Chỉ CH có `sm_id` trùng mã SM** (1 hoặc nhiều); KHÔNG có nút "Tất cả" |
| Dashboard | Số liệu theo phạm vi CH của mình + tiến độ xác nhận công NV |
| Lịch ca | Xem/sửa lịch các CH phụ trách; nhập file ezHR; AI xếp lịch theo doanh thu CH đó |
| Chấm công | Sửa công thực tế + xuất công lương C&B các CH phụ trách |
| Bù công & đổi ca | Duyệt yêu cầu NV trong phạm vi |
| Kệ & date | Theo CH phụ trách |
| ❌ Không thấy | Trang Nhân viên · Cửa hàng · Nhật ký (menu ẩn, gõ URL cũng bị chặn) |
| ❌ Không làm | Khóa/mở mã NV, gán SM, xem log người khác |

## 👷 NHÂN VIÊN thường
- Trang chủ (xác nhận công ngày 25), Lịch ca (đa CH cùng SM), Chấm công cá nhân, Bù công, Kệ của tôi.

## ⚙️ Cách gán quyền SM
```sql
-- 1. Cho hệ thống nhận vai quản lý:
UPDATE employees SET job_title = 'Cửa hàng trưởng' WHERE id = '260716009';
-- 2. Gán phạm vi cửa hàng (một hoặc nhiều):
UPDATE stores SET sm_id = '260716009' WHERE id IN ('VN0485','VN0497');
```