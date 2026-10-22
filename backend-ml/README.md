# GS25 — Python worker thử nghiệm nhu cầu nhân sự

Worker **local, chỉ nhận dữ liệu giả lập**. Train LightGBM bằng `ideal_staff_count`, đánh giá theo thời gian, lưu model và cung cấp API dự báo 7 ngày × 3 ca. Chưa kết nối Supabase hoặc thay đổi lịch của ứng dụng. Dự báo không tự động phân công nhân viên.

## Chạy trên Windows PowerShell

Từ thư mục gốc repo, tạo CSV nếu chưa có:

```powershell
node scripts/generate_ml_data.js
cd backend-ml
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.lock.txt
.venv/Scripts/python.exe -m scheduler_ml.train
.venv/Scripts/python.exe -m uvicorn scheduler_ml.api:app --host 127.0.0.1 --port 8001
```

Đã kiểm tra môi trường Python 3.14.3 / Windows x64. `requirements.lock.txt` ghi phiên bản đã chạy; `requirements.txt` ghi khoảng phiên bản để chủ động nâng cấp sau này. Trên Linux/macOS, dùng `.venv/bin/python` thay cho `.venv/Scripts/python.exe`.

API docs local: <http://127.0.0.1:8001/docs>. Ví dụ trong terminal khác:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
$body = @{ store_id = 'VN0485'; start_date = '2026-09-28' } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8001/predict-weekly-demand -Method Post -ContentType 'application/json' -Body $body
```

CSV hiện tại kết thúc ngày **27/09/2026**, nên model này chỉ dự báo tuần **28/09–04/10/2026**, không phải tuần hiện tại. Muốn tuần khác cần cập nhật lịch sử tới Chủ nhật ngay trước tuần đó rồi train lại. API từ chối mốc dự báo ngoài phạm vi của model và cửa hàng chưa có dữ liệu.

Train lại vào thư mục mới (không ghi đè lần chạy cũ), sau đó khởi động lại API để nạp model mới:

```powershell
.venv/Scripts/python.exe -m scheduler_ml.train --csv ../ml_mock_history_VN0485.csv --output models/mock-run-02
$env:ML_MODEL_DIR = 'models/mock-run-02'
.venv/Scripts/python.exe -m uvicorn scheduler_ml.api:app --host 127.0.0.1 --port 8001
```

Mỗi thư mục kết quả gồm `model.txt` (native LightGBM), `metadata.json`, `history.csv` và `evaluation.json`. Metadata chứa phiên bản feature, checksum model/dữ liệu, mốc lịch sử, cửa hàng và cờ mock. `.venv/` và `models/` được bỏ qua khi commit. API thiếu hoặc hỏng artifact trả trạng thái chưa sẵn sàng và HTTP 503 khi dự báo.

## Dữ liệu và cách đánh giá

- CSV dùng schema của `scripts/generate_ml_data.js`; ánh xạ `MORNING/AFTERNOON/NIGHT` sang `6-14/14-22/22-6` đúng ứng dụng. Dữ liệu phải đủ ba ca mỗi ngày cho từng cửa hàng, cùng khoảng ngày, kết thúc vào Chủ nhật. Cần 28 ngày khởi tạo lịch sử và ít nhất 8 tuần hoàn chỉnh sau đó.
- Chỉ chấp nhận `is_mock_data=true`. Mỗi dòng dùng `ideal_staff_count` làm nhãn; không dùng `assigned_staff_count` để học hoặc tính baseline.
- Features gồm thứ, ca, cửa hàng, ngày trong tuần dự báo, doanh thu ca cùng ngày tuần trước, trung bình doanh thu/traffic từ 7–28 ngày **trước đầu tuần dự báo**. Không lấy doanh thu, traffic, thời tiết hoặc nhãn của tuần đang dự báo. Cờ lễ ngẫu nhiên trong generator cũng không được dùng làm đầu vào tương lai.
- Giữ bốn tuần cuối để kiểm tra; model đánh giá chỉ được fit trên các tuần trước. Mỗi tuần kiểm tra dùng lịch sử đã quan sát trước thứ Hai của tuần đó, gồm dữ liệu các tuần kiểm tra trước nếu đã kết thúc. Đây là đánh giá dự báo từng tuần, không phải dự báo một lần cho cả tháng.
- So sánh với trung vị nhân sự lý tưởng của cùng thứ/ca trong 28 ngày trước. Báo MAE (sai số trung bình, đơn vị người/ca), MAE sau làm tròn, tỷ lệ dự báo thiếu. Không chuyển sai số thành “% độ chính xác”. Sau đánh giá mới fit model phục vụ trên toàn bộ lịch sử.
- Output luôn có `is_mock_data: true`, `production_ready: false`. Số người làm tròn chỉ là đầu ra demo, chưa phải định biên đã được SM duyệt; không có confidence/probability giả.

Chạy kiểm thử:

```powershell
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m pip check
```

Kiểm thử bảo vệ mốc dữ liệu đầu tuần, tách cửa hàng, loại nhãn phân công thực tế, chia tập theo thời gian, train lặp lại, kiểm tra artifact và API thành công/lỗi. Bộ test tự tạo fixture, không phụ thuộc file CSV nằm ngoài git.

## Kết quả chạy local ngày 05/10/2026

CSV gồm 540 dòng, 180 ngày từ 01/04 đến 27/09/2026. Sau khoảng khởi tạo và căn tuần, có 357 mẫu train và 84 mẫu kiểm tra (31/08–27/09). Kết quả:

| Cách dự báo | MAE người/ca | MAE sau làm tròn | Tỷ lệ dự báo thiếu |
| --- | ---: | ---: | ---: |
| LightGBM | 0,051848 | 0,047619 | 0% |
| Trung vị cùng thứ/ca trong 28 ngày trước | 0,047619 | 0,047619 | 0% |

LightGBM **chưa vượt baseline** trên dữ liệu này. Tỷ lệ dự báo thiếu 0% chỉ là thống kê của 84 mẫu giả lập kiểm tra, không phải bảo đảm vận hành. Không điều chỉnh model theo kết quả tập kiểm tra để làm đẹp chỉ số.

20 kiểm thử đạt; `pip check` không phát hiện xung đột. Có một cảnh báo deprecated từ thư viện TestClient khi dùng httpx, chưa ảnh hưởng kết quả. Đã khởi động Uvicorn thật trên loopback, gọi HTTP 200 và nhận đủ 21 dự báo; server kiểm tra đã được dừng. Kết quả lưu local tại `models/mock-run/evaluation.json` và `sample-prediction.json`.

## Trước khi dùng dữ liệu thật

Xác nhận doanh thu/POS và nhãn nhu cầu với SM, xử lý lịch sử đến muộn/thiếu dữ liệu; đánh giá nhiều tuần/cửa hàng và đối chiếu baseline hiện tại. Bộ mock này chỉ có một ca gắn nhãn 5 người nên chưa thể đánh giá tin cậy tình huống đó. Các giả định lễ/mưa/doanh thu trong generator không phải quy chuẩn GS25.

Chỉ mở tích hợp DB sau khi sửa migration/RLS trong `docs/sql_ml_schema.sql` theo `docs/ML_Smart_Scheduler_Review.md`. Frontend sau này đọc dự báo đã lưu qua tầng API hiện có; giữ lại rule giờ công, ca đêm và chi viện. Worker hiện không có auth và chỉ dành cho loopback local; chưa triển khai lên dịch vụ công khai.

Tài liệu API đối chiếu: [LightGBM native model](https://github.com/lightgbm-org/LightGBM/blob/main/docs/Python-Intro.rst), [FastAPI response model](https://fastapi.tiangolo.com/tutorial/response-model/), [kiểm thử lifecycle](https://fastapi.tiangolo.com/advanced/testing-events/).
