# Hệ Thống Quản Lý Lịch Làm Việc OFC (Schedule App)

Một ứng dụng web mạnh mẽ được xây dựng bằng **React**, **Vite**, **Tailwind CSS**, và **Supabase** để quản lý lịch làm việc của nhân sự, ca kíp, đơn đổi ca, và các yêu cầu C&B. Hệ thống tích hợp một **Trợ lý AI (AI Copilot)** mô phỏng thuật toán xử lý ngôn ngữ tự nhiên (NLP) tiên tiến chạy hoàn toàn ở phía client.

## 🌟 Các tính năng nổi bật

### 1. Trợ Lý AI Thông Minh (OFC AI Copilot)
Được thiết kế theo kiến trúc của các LLM doanh nghiệp hiện đại với phân lớp Intent (Ý định) rõ ràng:
- **Kiến thức RAG (Retrieval-Augmented Generation)**: Ưu tiên trả lời ngay các chính sách, quy định, nội quy công ty (như quy định thời gian nghỉ ca đêm, phụ cấp tăng ca, số giờ làm tối đa của Part-time, v.v.).
- **Truy vấn dữ liệu động (Function Calling Simulation)**: AI tự động kết nối với cơ sở dữ liệu để giải đáp các câu hỏi như: "Hôm nay ai làm việc?", "Tú làm ca mấy giờ?", "Có đơn đổi ca nào chờ duyệt không?".
- **Nhận thức thời gian thực (Real-time Context)**: Tích hợp đồng hồ hệ thống. AI tự động hiểu và biên dịch các từ chỉ thời gian tương đối ("hôm nay", "ngày mai", "hôm qua") và có thể cung cấp thông tin ngày giờ hiện tại chính xác.
- **Lưu trữ ngữ cảnh**: Lịch sử trò chuyện với AI được lưu trữ tự động trong `localStorage` để không bị mất khi tải lại trang, đi kèm với chức năng Xóa lịch sử.

### 2. Quản Lý Lịch Làm Việc (Schedule Management)
- **Giao diện trực quan**: Cập nhật ca làm việc dễ dàng cho từng ngày trong tuần.
- **Tối ưu hóa hiệu năng (Bulk Upsert)**: Nhập lịch từ file Excel hoặc Sao chép lịch từ tuần trước của hàng trăm nhân sự chỉ trong **1 Network Request duy nhất**. Đã khắc phục triệt để lỗi thắt cổ chai N+1 Query.
- **Optimistic UI**: Giao diện phản hồi ngay lập tức khi người dùng thao tác. Hệ thống tự động rollback nếu quá trình lưu cơ sở dữ liệu gặp sự cố.

### 3. Phê Duyệt & Quy Trình
- **Shift Swaps (Đổi Ca)**: Nhân viên tạo yêu cầu đổi ca, quản lý duyệt, hệ thống *tự động hoán đổi lịch* trên bảng phân ca.
- **C&B Feedbacks (Báo Bù Công)**: Xử lý nhanh các yêu cầu quên chấm công hoặc giải trình với quy trình duyệt rõ ràng.

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)
- **Frontend**: React.js, Vite, Tailwind CSS, Lucide React (Icons).
- **State Management**: Zustand (kết hợp Middleware Persist).
- **Backend & Database**: Supabase (PostgreSQL) sử dụng Backend-as-a-Service.
- **Routing**: React Router DOM.
- **Styling**: Vanilla CSS kết hợp các class tiện ích của Tailwind.

## 🚀 Hướng Dẫn Cài Đặt (Local Development)

1. Cài đặt các thư viện (Node Modules):
   ```bash
   npm install
   ```
2. Chạy ứng dụng ở môi trường phát triển (Dev Server):
   ```bash
   npm run dev
   ```
3. Xây dựng bản Production:
   ```bash
   npm run build
   ```

## 📝 Nhật Ký Cập Nhật Gần Nhất
- `perf`: Sửa lỗi N+1 Query trong API lưu lịch. Chuyển đổi từ vòng lặp request sang `saveBulkEmployeeSchedules` (Bulk Upsert).
- `feat`: Cập nhật logic nhận diện ý định (Intent Parser) cho AI Copilot, dùng ranh giới từ (Word Boundary) để tránh nhận nhầm chuỗi con.
- `feat`: Thêm đồng hồ thực tế cho AI (trả lời được các câu hỏi thời gian).
- `feat`: Lịch sử AI Chat lưu trữ qua `localStorage`.
