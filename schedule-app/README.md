# Lịch làm việc — SM Văn Chương (bản web)

Vite + React 19 + Tailwind v4. Không backend — dữ liệu lưu ở `localStorage` của trình duyệt, dùng để chạy thử UI/logic trước khi nối vào hệ thống thật.

## Chạy thử (hot reload)

```bash
npm install
npm run dev
```

Mở link Vite in ra (mặc định `http://localhost:5173`). Sửa file trong `src/` sẽ tự cập nhật ngay trên trình duyệt (Hot Module Replacement — không cần refresh tay).

Build production: `npm run build` → xuất ra `dist/`.

## Cấu trúc

```
src/
  data/constants.js       enum ca làm, ngưỡng giờ, định biên mặc định — sửa ở ĐÂY, không sửa trong logic
  data/seedData.js        9 nhân viên mẫu, cố tình dựng để demo đủ các rule bên dưới
  utils/date.js           cộng ngày, tính giờ (xử lý ca qua đêm 22:00→06:00)
  hooks/useScheduleStore.js   state, tính tổng giờ/tuần, tính thiếu người, lưu localStorage, nhật ký sửa
  components/             Legend, ShiftCell (ô ca có thể sửa), StoreGrid, StaffingPanel, SettingsPanel, ChangeLogPanel
```

## Từng bug/yêu cầu đã chốt trước đó → xử lý ở đâu

| Vấn đề | Cách xử lý trong code |
|---|---|
| Giá trị rác ("0", "1" thay vì giờ) | `ShiftCell` chỉ nhận qua `<select>` + `<input type="time">`, không có ô nhập tự do nào |
| Giờ viết nhiều kiểu (22-6 / 22h-6h) | Giờ luôn là `HH:MM` từ time-picker, không thể gõ tay sai định dạng |
| Tô màu tay không nhất quán | Màu suy ra từ `SHIFT_TYPES[entry.type].color` — một nguồn duy nhất, không có chỗ nào tô tay |
| Ô trống mơ hồ (nghỉ hay chưa xếp?) | Có 2 trạng thái tách biệt: `off` (viền liền, có nhãn) và `unset` (viền đứt, chữ "Chưa xếp") — mặc định của ô không có dữ liệu luôn là `unset`, không bao giờ là trắng-vô-nghĩa |
| Màu vừa là ca vừa là vai trò (VD PHAN CAO TÙNG: 22-6 khi đỏ khi xanh) | Tách 2 field độc lập: `type` (ca) và `coveringStore` (đang hỗ trợ store nào) — không còn 1 màu gánh 2 nghĩa |
| Mã NV sai độ dài | `EMPLOYEE_CODE_PATTERN` = đúng 9 chữ số; mã sai hiện cảnh báo đỏ ngay ở `EmployeeRow` |
| Điều động chéo store rải rác trong ô | Field `coveringStore` riêng, hiện thành badge "→ VN0497" trên ô, và được cộng đúng vào định biên của store đang được hỗ trợ (`staffingGaps`) |
| Không tổng giờ/tuần | `employeeStats` tính tự động mỗi khi đổi ca, hiện ngay dưới tên nhân viên |
| **Tối thiểu 16h/tuần (part-time) & 48h / 6 buổi (full-time)** | `DEFAULT_MIN_HOURS` + `DEFAULT_MIN_SHIFTS_FULLTIME` trong `constants.js`, sửa được ngay trên UI ở khung "Cấu hình" — full-time phải đạt **cả hai**: ≥48h **và** ≥6 buổi |
| **Thiếu người → cần support** | Bảng `staffingRequirements` (định biên) là input bạn tự nhập ở "Cấu hình"; `staffingGaps` so khớp số người đang trực (kể cả người đang hỗ trợ chéo) với định biên; panel "Cần hỗ trợ" liệt kê từng khung ca thiếu + nút "Gán hỗ trợ" chọn người đang rảnh ngày đó |
| Không có audit trail | `changeLog` ghi lại mỗi lần đổi ca: ai, sửa ai, ca gì → ca gì, lúc nào — xem ở "Nhật ký thay đổi" |
| Tab tuần đặt tên không đồng bộ | Chưa áp dụng multi-tuần (xem "Chưa làm" bên dưới) |

## Cố tình chưa làm (để lần sau)

Đây là bản khung cho **một tuần**, chạy hoàn toàn phía trình duyệt. Trước khi dùng thật, cần thêm:

- **Backend + đăng nhập thật** — hiện `currentUserName` chỉ là ô nhập tay, ai cũng gõ tên gì cũng được. Nhật ký thay đổi vì vậy chỉ mang tính tham khảo, chưa đủ tin cậy để làm bằng chứng.
- **Nhiều tuần / lịch sử** — mới có 1 tuần cố định (`WEEK_START` trong `seedData.js`). Cần thêm chọn tuần + một nơi lưu tổng hợp nhiều tuần để so xu hướng.
- **Danh sách nhân viên đầy đủ** — 9 người trong `seedData.js` chỉ để demo đủ các rule (có người thiếu giờ, có ca thiếu người, có ca hỗ trợ chéo...). Thay bằng dữ liệu thật của bạn theo đúng shape đó.
- **Duyệt lịch** — chưa có trạng thái Draft/Đã duyệt như đã bàn, mọi thay đổi có hiệu lực ngay.
- Popover sửa ca ở cột cuối cùng bên phải có thể bị tràn nhẹ ra ngoài khung nhìn trên màn hình hẹp — chưa xử lý tự lật hướng.
