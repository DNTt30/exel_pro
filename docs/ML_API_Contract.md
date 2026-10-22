# API Contract: Dịch Vụ Dự Báo Nhu Cầu Nhân Sự (ML Demand Worker)

- **Người lập:** Business Analyst (BA)
- **Đối tượng áp dụng:** Frontend Development Team, Backend ML Team
- **Dự án:** GS25 Smart Scheduler (Exel Pro)
- **Tài liệu tham chiếu mã nguồn:** `backend-ml/scheduler_ml/api.py`, `backend-ml/README.md`
- **Ngày lập:** 06/10/2026
- **Trạng thái:** Hoàn tất rà soát mã nguồn (Active Contract)

---

## 1. Tổng Quan & Lưu Ý Nghiệp Vụ Quan Trọng

Backend ML team đã hoàn thiện một microservice Python bằng **FastAPI**, phục vụ việc dự báo nhu cầu nhân sự cho mô hình **LightGBM**. Để Frontend team tích hợp chính xác và tránh hiểu nhầm nghiệp vụ, vui lòng lưu ý các điểm then chốt sau:

1. **Endpoint Tên Chuẩn:** Endpoint chính là `POST /predict-weekly-demand` (KHÔNG PHẢI `/predict`).
2. **Read-only Worker:** Không có endpoint `POST /train` trên API (việc train model chỉ thực hiện offline qua CLI bằng dữ liệu lịch sử).
3. **Môi trường & Phạm vi thử nghiệm:**
   - Worker chạy cục bộ tại `http://127.0.0.1:8001`.
   - Dữ liệu hiện tại là dữ liệu giả lập (`is_mock_data: true`, `production_ready: false`).
   - Kết quả dự báo mang tính chất tham mưu/gợi ý định biên cho Cửa hàng trưởng (SM), **chưa tự động thay đổi lịch hay chốt duyệt công**.
4. **Quy tắc về Ngày Dự Báo (`start_date`):**
   - `start_date` **bắt buộc phải là ngày Thứ Hai** trùng khớp với mốc `forecast_origin` của model artifact đã huấn luyện (ví dụ với model hiện tại là `2026-09-28`).
   - Nếu truyền ngày khác hoặc cửa hàng chưa có dữ liệu lịch sử, API sẽ từ chối với mã lỗi `HTTP 422`.
5. **Cấu trúc kết quả:** Mỗi tuần trả về chính xác **21 bản ghi dự báo** tương ứng với 7 ngày (từ Thứ Hai đến Chủ Nhật) × 3 ca/ngày.
6. **Mã ca tiêu chuẩn:** API sử dụng trực tiếp các mã ca: `"6-14"`, `"14-22"`, `"22-6"` (tương ứng với Ca Sáng, Ca Chiều, Ca Đêm).

---

## 2. Thông Tin Kết Nối (Base Information)

- **Base URL:** `http://127.0.0.1:8001`
- **Interactive Swagger Docs:** `http://127.0.0.1:8001/docs`
- **OpenAPI Schema:** `http://127.0.0.1:8001/openapi.json`
- **Default Content-Type:** `application/json`

---

## 3. Danh Sách API Endpoints

### 3.1. Endpoint Kiểm Tra Trạng Thái: `GET /health`

Dùng để Frontend kiểm tra xem ML worker đã khởi động chưa và model artifact đã sẵn sàng phục vụ hay chưa trước khi gọi dự báo.

- **Method:** `GET`
- **URL Path:** `/health`
- **Authentication:** Không yêu cầu (Local loopback)

#### Response Body (`200 OK`)

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `ready` | `boolean` | Có | `true` nếu model đã được nạp thành công; `false` nếu chưa có model artifact |
| `is_mock_data` | `boolean` | Có | Cố định `true` |
| `production_ready` | `boolean` | Có | Cố định `false` |
| `forecast_origin` | `string \| null` | Có | Ngày Thứ Hai mà model có thể dự báo (`YYYY-MM-DD`), hoặc `null` nếu model chưa sẵn sàng |

#### Response Ví Dụ

```json
{
  "ready": true,
  "is_mock_data": true,
  "production_ready": false,
  "forecast_origin": "2026-09-28"
}
```

---

### 3.2. Endpoint Dự Báo Nhu Cầu Tuần: `POST /predict-weekly-demand`

Dự báo số lượng nhân viên cần thiết cho từng ca làm việc trong cả tuần (21 ca) cho một cửa hàng cụ thể.

- **Method:** `POST`
- **URL Path:** `/predict-weekly-demand`
- **Header:** `Content-Type: application/json`

#### Request Body Specification

> **Cảnh báo (Strict Schema):** Backend cấu hình `extra="forbid"`. Frontend **tuyệt đối không gửi thêm bất kỳ trường thừa nào** ngoài 2 trường dưới đây, nếu không sẽ bị lỗi `422 Unprocessable Entity`.

| Trường | Kiểu dữ liệu | Ràng buộc validation | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `store_id` | `string` | Độ dài 1–64 ký tự, regex `^[A-Za-z0-9_-]+$` | Có | Mã cửa hàng GS25 (ví dụ: `"VN0485"`) |
| `start_date` | `string` | Định dạng ngày chuẩn ISO `YYYY-MM-DD` | Có | Ngày Thứ Hai bắt đầu tuần cần dự báo (phải khớp `forecast_origin`, ví dụ `"2026-09-28"`) |

##### Ví dụ Request Payload:
```json
{
  "store_id": "VN0485",
  "start_date": "2026-09-28"
}
```

---

#### Response Body Specification (`200 OK`)

| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `source` | `string` | Nguồn dự báo, giá trị cố định: `"mock_lightgbm"` |
| `is_mock_data` | `boolean` | Cố định `true` (xác nhận dữ liệu giả lập thử nghiệm) |
| `production_ready` | `boolean` | Cố định `false` |
| `model_version` | `string` | Mã phiên bản của model (ví dụ: `"mock-e5a7b689df12"`) |
| `history_last_date` | `string` | Mốc ngày cuối cùng của tập dữ liệu lịch sử được dùng để train (`YYYY-MM-DD`, ví dụ `"2026-09-27"`) |
| `forecast_origin` | `string` | Mốc Thứ Hai khởi điểm dự báo (`YYYY-MM-DD`, ví dụ `"2026-09-28"`) |
| `predictions` | `Array<Prediction>` | Mảng chứa **đúng 21 phần tử** cho 7 ngày × 3 ca |

##### Chi tiết từng phần tử trong mảng `predictions`:

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `store_id` | `string` | Theo request | Mã cửa hàng |
| `shift_date` | `string` | `YYYY-MM-DD` | Ngày làm việc cụ thể trong tuần |
| `shift_code` | `string` | Enum: `"6-14"`, `"14-22"`, `"22-6"` | Mã ca làm việc (Sáng: `6-14`, Chiều: `14-22`, Đêm: `22-6`) |
| `predicted_staff_count` | `integer` | Số nguyên $\ge 0$ | **Số lượng nhân sự khuyến nghị** sau khi làm tròn cho hiển thị demo |
| `raw_prediction` | `float` | Số thực | Giá trị dự báo hồi quy thô chưa làm tròn từ LightGBM |

##### Ví dụ Response Thành Công (`200 OK`):
```json
{
  "source": "mock_lightgbm",
  "is_mock_data": true,
  "production_ready": false,
  "model_version": "mock-4d7a8bf21c56",
  "history_last_date": "2026-09-27",
  "forecast_origin": "2026-09-28",
  "predictions": [
    {
      "store_id": "VN0485",
      "shift_date": "2026-09-28",
      "shift_code": "6-14",
      "predicted_staff_count": 3,
      "raw_prediction": 2.9412
    },
    {
      "store_id": "VN0485",
      "shift_date": "2026-09-28",
      "shift_code": "14-22",
      "predicted_staff_count": 3,
      "raw_prediction": 3.0185
    },
    {
      "store_id": "VN0485",
      "shift_date": "2026-09-28",
      "shift_code": "22-6",
      "predicted_staff_count": 2,
      "raw_prediction": 1.9831
    }
    // ... tổng cộng 21 ca cho đến ngày 2026-10-04
  ]
}
```

---

## 4. Xử Lý Mã Lỗi & Ngoại Lệ (Error Handling)

| HTTP Code | Trường hợp xảy ra | Cấu trúc Response lỗi | Hành động khuyến nghị cho Frontend |
| :---: | :--- | :--- | :--- |
| **`422`** | 1. `store_id` không tồn tại trong tập dữ liệu của model.<br>2. `start_date` không phải ngày Thứ Hai khớp với `forecast_origin`.<br>3. Payload sai kiểu dữ liệu hoặc chứa trường dư thừa. | `{"detail": "This run only forecasts the week starting 2026-09-28; refresh history and retrain for another week."}`<br>hoặc danh sách lỗi Pydantic: `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` | Hiển thị thông báo giải thích tuần chưa hỗ trợ dự báo ML. **Fallback tự động về Định biên mặc định (Store Staffing Demand)** của cửa hàng. |
| **`503`** | Model artifact chưa được train hoặc file model bị lỗi/thiếu. | `{"detail": "Model unavailable. Train local mock artifacts and restart the worker."}` | Hiển thị badge: *"Dịch vụ AI chưa sẵn sàng"* và fallback về định biên chuẩn của cửa hàng. Không làm gãy giao diện xếp lịch. |
| **`404`** | Gọi nhầm path (ví dụ gọi `/predict` hoặc `/train`). | `{"detail": "Not Found"}` | Kiểm tra lại URL endpoint. |

---

## 5. Hướng Dẫn Tích Hợp Cho Frontend Dev (Frontend Guidelines)

### 5.1. TypeScript Interface Đề Xuất

Frontend team có thể copy trực tiếp TypeScript interfaces sau vào file `frontend/src/types/mlDemand.ts`:

```typescript
export type ShiftCode = '6-14' | '14-22' | '22-6';

export interface MLDemandRequest {
  store_id: string;
  start_date: string; // Định dạng YYYY-MM-DD, phải là Thứ Hai
}

export interface MLShiftPrediction {
  store_id: string;
  shift_date: string;
  shift_code: ShiftCode;
  predicted_staff_count: number;
  raw_prediction: number;
}

export interface MLWeeklyDemandResponse {
  source: 'mock_lightgbm';
  is_mock_data: true;
  production_ready: false;
  model_version: string;
  history_last_date: string;
  forecast_origin: string;
  predictions: MLShiftPrediction[];
}

export interface MLHealthResponse {
  ready: boolean;
  is_mock_data: true;
  production_ready: false;
  forecast_origin: string | null;
}
```

### 5.2. Hàm Gọi API Mẫu (Client Service)

Gợi ý triển khai trong `frontend/src/services/api/mlDemand.js`:

```javascript
const ML_BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:8001';

export async function checkMLHealth() {
  try {
    const res = await fetch(`${ML_BASE_URL}/health`);
    if (!res.ok) return { ready: false };
    return await res.json();
  } catch (error) {
    console.warn('[ML Service] Health check failed:', error);
    return { ready: false };
  }
}

export async function fetchWeeklyMLDemand(storeId, startDateMonday) {
  const payload = {
    store_id: storeId,
    start_date: startDateMonday,
  };

  const res = await fetch(`${ML_BASE_URL}/predict-weekly-demand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || `ML API error (${res.status})`;
    throw new Error(message);
  }

  return await res.json();
}
```

### 5.3. Chiến Lược Ghép Nối Với Luồng Xếp Lịch Hiện Tại (Fallback Strategy)

1. **Kiểm tra trước (Pre-flight):** Trước khi hiển thị nút hoặc kích hoạt gợi ý AI cho một tuần, gọi `checkMLHealth()`. Nếu `ready === false` hoặc `forecast_origin !== tuần_đang_chọn`, hiển thị trạng thái "Dùng định biên cơ bản".
2. **Chiến lược Fallback an toàn:**
   - Nếu gọi API thành công: Map 21 bản ghi trong `predictions` vào `requiredMatrixByDay` trong `aiSchedulerEngine.js` (dựa trên mapping `6-14` $\rightarrow$ MORNING, `14-22` $\rightarrow$ AFTERNOON, `22-6` $\rightarrow$ NIGHT).
   - Nếu gặp lỗi `503` hoặc `422`: Giữ nguyên dữ liệu định biên mặc định hiện tại từ `stores.demand` / `buildStaffingByDay()`. Tuyệt đối không gián đoạn luồng làm việc của SM.
3. **Hiển thị giao diện người dùng (UI/UX):**
   - Đánh dấu rõ nhãn: *"Dự báo thử nghiệm LightGBM (Chưa chốt định biên chính thức)"*.
   - Cho phép SM xem số người dự kiến `predicted_staff_count` và so sánh với định biên tiêu chuẩn trước khi quyết định áp dụng.
