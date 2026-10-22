---
name: 1000-gio-workflow
description: Bộ kỹ năng & quy trình làm việc đúc kết từ "16 bài học sau 1000 giờ dùng Claude · Nhật Anh AI" (nhatanh.ai/1000-gio). Tự động áp dụng giao việc thông minh, bộ nhớ 3 ngăn, bàn giao phiên, phân tầng sub-agent và 4 nấc Eval kiểm tra chất lượng mỗi khi làm việc.
---

# Kỹ năng: 16 Bài Học Sau 1000 Giờ Dùng AI Agent (Nhật Anh AI)

Skill này tích hợp trọn vẹn 16 bài học thực chiến từ [nhatanh.ai/1000-gio](https://nhatanh.ai/1000-gio/) vào quy trình làm việc hàng ngày giữa người dùng và AI Agent.

---

## PHẦN 1: QUY TẮC GIAO VIỆC & TƯƠNG TÁC (BÀI 1 → BÀI 5)

### Bài 1 & Bài 2: Không chỉ để code & Lên kế hoạch từng bước dễ hiểu
- **Nguyên tắc:** Mọi đầu ra (trang web, báo cáo Excel/PDF, slide, hình ảnh, tài liệu) đều là file. Khi người dùng giao việc lớn hoặc nói "lên kế hoạch trước":
  1. Trình bày kế hoạch từng bước bằng lời dễ hiểu (không lạm dụng thuật ngữ kỹ thuật nếu không cần thiết).
  2. Mỗi bước nêu rõ: **Làm gì**, **Ở file nào**, **Thế nào là xong**.
  3. Sau khi thực hiện xong mỗi bước, tóm tắt ngắn gọn việc vừa làm; nếu gặp lỗi, giải thích nguyên nhân bằng lời thường và đề xuất hướng sửa.

### Bài 3: Nói tự nhiên / Lộn xộn — Tóm tắt 3 dòng trước khi làm
- **Nguyên tắc:** Khi người dùng nhập bằng giọng nói (`Windows + H` / `Fn × 2`) hoặc gửi yêu cầu dài, nhiều ý lộn xộn:
  - Tóm tắt lại trong **đúng 3 dòng** xem Agent hiểu người dùng cần gì.
  - Hỏi lại ngắn gọn những thông tin còn thiếu trước khi bắt tay vào sửa nhiều file.

### Bài 4: Làm theo ví dụ thật (Reference-Driven)
- **Nguyên tắc:** Khi người dùng gửi ảnh mẫu, đoạn văn mẫu hoặc giao diện mẫu:
  1. Chỉ ra **3 đến 5 điểm đắt giá nhất** làm nên cái hay của mẫu đó (bố cục, màu sắc, nhịp điệu, cách trình bày).
  2. Thực hiện sản phẩm bám sát đúng các điểm đó, phân tách rõ: **Phần giữ nguyên** và **Phần thay đổi**.

### Bài 5: Phỏng vấn trước quyết định lớn (`/grill-me`)
- **Nguyên tắc:** Khi người dùng cần chốt một quyết định hoặc thiết kế tính năng mới:
  1. Phỏng vấn bằng tiếng Việt, **mỗi lần chỉ hỏi 1 câu** (hoặc dùng công cụ `ask_question`).
  2. Luôn kèm theo **phương án đề xuất của Agent** để người dùng chỉ cần gật đầu đồng ý hoặc chỉnh nhẹ.
  3. Ghi ngay từng quyết định đã chốt vào file (`docs/bo-nho/ghi-chu/` hoặc file kế hoạch) để không mất mát khi hội thoại dài.

---

## PHẦN 2: QUẢN TRỊ BỘ NHỚ 3 NGĂN & CONTEXT (BÀI 6 → BÀI 10)

### Bài 6: Nhắc lần 2 thì thành quy tắc
- **Nguyên tắc:** Mỗi khi người dùng phải nhắc hoặc sửa Agent cùng một điều đến **lần thứ hai**, Agent chủ động đề xuất 1 dòng quy tắc ngắn gọn để thêm vào `AGENTS.md` (chỉ thêm khi người dùng đồng ý).

### Bài 7: Giữ `AGENTS.md` dưới 50 dòng (Dạng Mục lục)
- **Nguyên tắc:** `AGENTS.md` chỉ giữ những quy tắc lúc nào cũng cần và đóng vai trò **mục lục chỉ đường** tới các file chi tiết trong `docs/` hoặc `.agents/`. Nếu `AGENTS.md` vượt quá 50 dòng, đề nghị rút gọn hoặc tách bớt ra file riêng.

### Bài 8: Vận hành 3 loại trí nhớ trong dự án
1. **Sổ tay quy định (`AGENTS.md`):** Người dùng là ai, phong cách làm việc, quy tắc bất di bất dịch.
2. **Sổ ghi chép (`docs/bo-nho/muc-luc.md` & `docs/bo-nho/ghi-chu/`):** Các quyết định kiến trúc, nghiệp vụ đã chốt.
3. **Giấy nhớ việc đang làm (`docs/bo-nho/dang-lam.md`):** Việc đang dở và bước tiếp theo.
- **Khi nào cần ghi vào bộ nhớ:**
  - Khi người dùng sửa Agent → ghi thành quy tắc/ghi chú.
  - Khi người dùng chốt một quyết định → ghi lại kèm lý do.
  - Khi hoàn thành một việc → cập nhật `docs/bo-nho/dang-lam.md`.

### Bài 9 & Bài 10: Giữ Context gọn & Viết Lời Nhắn Bàn Giao Phiên Mới
- **Nguyên tắc:** Context càng dài, độ chính xác tìm kiếm thông tin càng giảm (từ 93% ở 256K xuống 76% ở 1M token).
- Khi cuộc trò chuyện dài, gợi ý người dùng dùng lệnh `/compact` hoặc tự động xuất **Khung Bàn Giao Phiên Mới** để copy 1 lần sang cuộc trò chuyện mới:
  ```markdown
  Mình đang làm [Tên việc], bạn đọc docs/bo-nho/dang-lam.md và giúp mình làm tiếp nhé.
  ### Đã xong
  - ...
  ### Còn lại (theo thứ tự)
  1. ...
  ### File liên quan
  - ...
  ### Quyết định đã chốt (kèm lý do)
  - ...
  ```

---

## PHẦN 3: VIỆC LỚN, SUB-AGENT & 4 NẤC EVAL (BÀI 11 → BÀI 16)

### Bài 11 & Bài 12: Model to lên kế hoạch, Sub-agent nhẹ đọc/tìm kiếm
- Việc đọc tài liệu dài, tìm kiếm thông tin rộng hoặc gom ngữ cảnh: ưu tiên giao cho sub-agent (`research` hoặc model `flash` / `flash_lite`) để giữ context phiên chính luôn sạch và tập trung suy luận.
- Kế hoạch lớn lưu thành file (`docs/bo-nho/ke-hoach.md`) để phiên sau hoặc sub-agent thực thi tuần tự từng bước.

### Bài 13: Giao việc kèm điều kiện hoàn thành (`/goal`)
- Khi người dùng có tác vụ lớn chạy dài hơi, gợi ý dùng `/goal` với 3 yếu tố:
  1. Điều kiện hoàn thành cụ thể, đo lường/kiểm tra được.
  2. Bắt buộc đưa bằng chứng (test pass, build pass, screenshot) ngay trong chat.
  3. Giới hạn số lượt tối đa rõ ràng.

### Bài 14: 4 Nấc Eval — Luôn kiểm tra trước khi báo "Xong"
Trước khi báo cáo hoàn thành bất kỳ yêu cầu nào, Agent PHẢI thực hiện:
- **Nấc 1 (Tự kiểm tra):** Kiểm tra lại kết quả theo đúng tiêu chí yêu cầu (chạy `vitest`, `npm run build`, kiểm tra đường dẫn/UI), liệt kê rõ những gì đã kiểm tra và những chỗ chưa kiểm tra được.
- **Nấc 2 (Xác nhận chéo):** Đảm bảo không bỏ sót edge-case (như ca chưa chốt `:reg`, ca chi viện, dữ liệu rỗng).
- **Nấc 3 (`/goal`):** Lặp cho tới khi đạt đủ điều kiện.
- **Nấc 4 (Sub-agent độc lập soát lỗi):** Với tính năng phức tạp, kích hoạt quy trình 3 Agent (`bug_hunter` → `qa_tester` → `dev_fixer` tại `.agents/skills/bug-hunt-pipeline/SKILL.md`) để một agent chưa tham gia viết code soát lại độc lập.

### Bài 15 & Bài 16: Lưu "Bộ não" trên GitHub & Đa nền tảng (`AGENTS.md`)
- Lưu trữ toàn bộ quy tắc (`AGENTS.md`), bộ nhớ (`docs/bo-nho/`), và skills (`.agents/skills/`) trên GitHub (không bao giờ commit key/mật khẩu) để đồng bộ giữa mọi máy tính, VPS và đọc được trên mọi công cụ AI (Antigravity, Claude, Gemini, Codex).
