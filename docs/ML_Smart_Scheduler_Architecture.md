# Bản Thiết Kế Kiến Trúc AI/ML Tối Ưu Lịch Trình (Smart Scheduler Architecture)
*Tài liệu phân tích và thiết kế hệ thống Machine Learning dự đoán nhu cầu nhân sự cho Exel Pro (GS25).*

---

## 1. Tổng Quan Tầm Nhìn
Chuyển đổi Exel Pro từ một **"Web quản lý lịch CRUD"** thành một **"Hệ Thống Quản Trị Nguồn Nhân Lực AI (AI Workforce Scheduling System)"**.
Sự kết hợp hoàn hảo giữa **Machine Learning (Dự báo nhu cầu)** và **Thuật toán Heuristic (Tối ưu ràng buộc luật lao động)**.

### Quy trình hoạt động cốt lõi:
1. **Machine Learning (LightGBM/XGBoost)** phân tích dữ liệu lịch sử để dự báo: *"Thứ 7 này, ca 14-22 tại cửa hàng VN0485 cần chính xác bao nhiêu nhân sự?"*
2. **Thuật toán Ràng buộc (`shiftHelper.js`)** quét danh sách nhân viên để tìm ra những người thỏa mãn luật: *"Ai chưa quá 91h/tháng (Part-time), ai đảm bảo nghỉ 11h giữa các ca, ai đủ skill?"*
3. **Thuật toán Đề xuất (Scoring/Matching)** chấm điểm độ phù hợp (ví dụ: khoảng cách từ cửa hàng gốc, lịch sử hay làm ca này) để xếp lịch.
4. **Cửa hàng trưởng (SM)** xem bảng đề xuất trực quan, kéo thả tinh chỉnh và chốt duyệt.

---

## 2. Thiết Kế Cơ Sở Dữ Liệu (Supabase PostgreSQL)
Cần bổ sung các Bảng/View để làm Input Data cho việc Train Model và lưu trữ kết quả.

### 2.1. View Dữ liệu Huấn luyện: `ml_demand_training_data`
Dùng để query thẳng vào Pandas/Python train model.
* Cột: `date`, `day_of_week`, `is_holiday`, `store_id`, `shift_id` (Sáng/Chiều/Đêm), `weather_condition` (có thể mock), `actual_staff_count` (Target label - Lấy từ dữ liệu lịch sử đã chốt công).

### 2.2. Bảng Lưu Trữ Dự Báo: `ml_shift_predictions`
Sau khi Python chạy dự báo hàng tuần, kết quả được lưu vào đây để Frontend load siêu tốc.
- `id` (UUID)
- `store_id` (VARCHAR)
- `shift_date` (DATE)
- `shift_type` (VARCHAR: MORNING, AFTERNOON, NIGHT)
- `predicted_demand` (INT: Số lượng nhân sự dự kiến)
- `confidence_score` (FLOAT: Độ tự tin của model 0-1)
- `created_at` (TIMESTAMP)

---

## 3. Kiến Trúc Microservice Python (Machine Learning API)
Vì React/Zustand chạy ở Client và Supabase/PostgreSQL xử lý DB, phần ML nên được tách thành một microservice nhỏ gọn bằng Python.

**Tech Stack:** `FastAPI`, `Pandas`, `Scikit-Learn`, `LightGBM`.
**Thư mục dự kiến:** `/backend-ml/`

### Các Endpoints API chính:
- `POST /train`: Chạy định kỳ (ví dụ mỗi cuối tháng). Kéo data từ `ml_demand_training_data`, huấn luyện model LightGBM và lưu file `.pkl`.
- `POST /predict-weekly-demand`: Nhận `store_id` và `start_date`, mô hình chạy qua 7 ngày x 3 ca = 21 dự đoán, lưu thẳng vào bảng `ml_shift_predictions` của Supabase.
- `POST /score-staff`: Thuật toán Ranking để chấm điểm "% phù hợp" cho danh sách nhân viên khả dụng khi cần chi viện.

---

## 4. Nâng cấp Frontend (React & `aiSchedulerEngine.js`)

**Module `aiSchedulerEngine.js`** sẽ được thiết kế lại theo luồng Pipeline:
1. **Fetch Predictions:** Gọi Supabase lấy dự báo từ `ml_shift_predictions` cho tuần sắp xếp.
2. **Calculate Gap:** Tính số nhân sự còn thiếu `Gap = predicted_demand - current_assigned_staff`.
3. **Filter Available Staff:** Chạy qua `shiftHelper.js` để loại những nhân viên vi phạm luật 91h/48h/11h nghỉ ngơi.
4. **Match & Recommend:** Nếu `Gap > 0`, tìm nhân sự tại cửa hàng trước. Nếu hết, tìm nhân sự cửa hàng lân cận (Chi viện) và chấm điểm % phù hợp.

### Giao Diện UX/UI Mới: "Màn hình AI Smart Scheduler"
Trên trang Xếp lịch (`/admin/schedule`), thêm nút **"🌟 Chạy AI Tối Ưu"**.
Khi bấm vào, thay vì xếp mù mờ, hệ thống sẽ bật một Right Drawer hoặc Modal hiển thị:

> 📍 **Thứ 7, 10/10/2026 - Ca Chiều (14:00 - 22:00)**
> 🧠 **Dự báo ML:** Cần 5 người *(Dựa trên: Cuối tuần, Dữ liệu lịch sử 3 tháng qua)*
> 👥 **Đã xếp:** 3 người
> ⚠️ **Cảnh báo:** Thiếu 2 nhân sự
> 
> **🔄 Gợi ý Chi viện (Staff Recommendations):**
> 1. 👤 **Nguyễn Văn A** (Cửa hàng VN0123 - cách 1.5km)
>    *Độ phù hợp: 92% (Chưa vượt 91h, lịch sử hay làm ca chiều)* -> `[ Nút: Thêm vào ca ]`
> 2. 👤 **Trần Thị B** (Cửa hàng VN0488 - cách 2.2km)
>    *Độ phù hợp: 85%* -> `[ Nút: Thêm vào ca ]`

Sau khi SM hoàn tất xác nhận, hệ thống áp dụng xuống Grid xếp lịch chính.

---

## 5. Lộ Trình Triển Khai (Roadmap)

**Giai đoạn 1: Chuẩn bị Dữ liệu & Cơ sở (1-2 ngày)**
- Tạo bảng `ml_shift_predictions` trong Supabase.
- Viết script Python/Node giả lập (mock) dữ liệu lịch sử phong phú (Data Generator) để có đủ data train (vài nghìn records ca làm việc).

**Giai đoạn 2: Xây dựng Model & API Python (2-3 ngày)**
- Khởi tạo thư mục `backend-ml` với FastAPI.
- Viết pipeline huấn luyện LightGBM cơ bản (Features: Thứ trong tuần, Ca, Cuối tháng, Lễ).
- Mở API `/predict`.

**Giai đoạn 3: Frontend & Tích hợp (2-3 ngày)**
- Nâng cấp `aiSchedulerEngine.js` để kết hợp Machine Learning Demand + Rule Constraints.
- Xây dựng giao diện "Cảnh báo thiếu hụt & Gợi ý chi viện" siêu trực quan trên Grid xếp lịch.

## Tổng Kết
Đây là một bước chuyển mình mang tính **Enterprise-grade**. 
Hệ thống không cố gắng vượt mặt con người (SM) bằng cách tự động lưu lịch 100%, mà đóng vai trò như một **Trợ lý Tham mưu Phân tích Dữ liệu** cực kỳ nhạy bén, trao lại quyền quyết định cuối cùng cho SM. Đây chính xác là xu hướng ứng dụng AI/ML thực tế nhất trong SaaS B2B hiện nay!
