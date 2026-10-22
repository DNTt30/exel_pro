# 📘 Tóm Tắt Đầy Đủ: 16 Bài Học Sau 1000 Giờ Dùng Claude (Nhật Anh AI) & Cách Áp Dụng Khi Dùng Em

> Nguồn gốc: [nhatanh.ai/1000-gio](https://nhatanh.ai/1000-gio/) — Tác giả: **Nhật Anh AI** (Cập nhật: 10/2026)
> Đã tích hợp tự động vào dự án qua:
> - Quy tắc luôn bật: [`.agents/rules/1000-gio-rule.md`](../.agents/rules/1000-gio-rule.md) & [`AGENTS.md`](../AGENTS.md)
> - Kỹ năng quy trình: [`.agents/skills/1000-gio-workflow/SKILL.md`](../.agents/skills/1000-gio-workflow/SKILL.md)
> - Bộ nhớ 3 ngăn: [`docs/bo-nho/muc-luc.md`](./bo-nho/muc-luc.md) & [`docs/bo-nho/dang-lam.md`](./bo-nho/dang-lam.md)

---

## PHẦN 1: GIAO VIỆC NHƯ SẾP (Bài 1 → Bài 5)
*Mục tiêu: Giao việc rõ ràng hơn, ít phải sửa đi sửa lại.*

### Bài 01 (`L01`): AI Agent không chỉ để lập trình
- **Cốt lõi:** Làm việc trực tiếp với file trên máy — mà hầu hết mọi thứ (website, báo cáo Excel/PDF, khóa học, thumbnail, video ngắn, hình động) suy cho cùng **chỉ là file**. Bạn mô tả → AI tạo file → mở xem → góp ý sửa.
- **Lời nhắn mẫu (`P01` — Để AI phỏng vấn bạn rồi gợi ý việc nó làm được):**
  > *"Hãy phỏng vấn mình về công việc hàng ngày, mỗi lần chỉ hỏi một câu: mình làm gì, việc nào tốn thời gian nhất, và mình hay phải làm ra những gì (tài liệu, slide, báo cáo, hình ảnh, video...). Hỏi cho tới khi đủ hiểu, rồi gợi ý 5 thứ ngoài code mà bạn có thể làm ra cho mình, mỗi thứ kèm một ví dụ cụ thể và thời gian tiết kiệm được."*

### Bài 02 (`L02`): Không cần biết code — Lên kế hoạch trước, làm từng bước
- **Cốt lõi:** Nhờ AI lên kế hoạch từng bước bằng lời dễ hiểu, duyệt xong mới làm từng bước. Dùng chế độ `Auto`, đừng bật `Bypass permissions`.
- **Lời nhắn mẫu (`P02` — Lên kế hoạch trước, làm từng bước):**
  > *"Mình muốn [việc]. Trước khi làm, hãy lên kế hoạch từng bước bằng lời dễ hiểu và chờ mình đồng ý. Sau đó làm lần lượt từng bước; xong mỗi bước, nói ngắn gọn bạn vừa làm gì. Nếu có lỗi, giải thích bằng lời thường chuyện gì đã xảy ra, rồi đề xuất cách sửa."*
- **Lời nhắn mẫu (`P02B` — Khi không hiểu AI vừa làm gì):**
  > *"Giải thích cho mình như cho người không biết code: bạn vừa làm gì, vì sao, và mình cần làm gì tiếp theo."*

### Bài 03 (`L03`): Nói với AI thay vì gõ (`Windows + H` / `Fn × 2`)
- **Cốt lõi:** Nghiên cứu ĐH Stanford chỉ ra nói nhanh gấp **3 lần** gõ trên điện thoại, và khi nói bạn tự nhiên kể đủ bối cảnh như giao việc cho đồng nghiệp. Nói lộn xộn hay ngập ngừng AI vẫn hiểu.
- **Lời nhắn mẫu (`P03` — Nói lộn xộn cũng được, để AI tóm tắt lại trước):**
  > *"Mình vừa nói hơi lộn xộn. Trước khi làm, hãy tóm tắt lại trong 3 dòng xem bạn hiểu mình cần gì, và hỏi mình những gì còn thiếu."*

### Bài 04 (`L04`): Đưa ví dụ thật thay vì mô tả
- **Cốt lõi:** Một ảnh mẫu, đoạn văn mẫu hay trang web mẫu đỡ được nhiều vòng sửa hơn 10 tính từ ("hiện đại", "nổi bật", "sang").
- **Lời nhắn mẫu (`P04` — Làm theo ví dụ thật):**
  > *"Đây là [ảnh, đoạn văn, hoặc trang web] mẫu mà mình thích. Hãy chỉ ra 3 đến 5 điểm làm nên cái hay của mẫu này, rồi làm [sản phẩm của mình] theo đúng những điểm đó. Giữ nguyên: [phần cần giữ]. Thay đổi: [phần cần đổi]."*

### Bài 05 (`L05`): Để AI phỏng vấn bạn (`/grill-me`)
- **Cốt lõi:** Với các quyết định lớn, câu trả lời thường đã nằm trong đầu bạn nhưng chưa sắp xếp. Cho AI hỏi từng câu một kèm phương án đề xuất và ghi ngay vào file để không mất nếu cuộc trò chuyện dài.
- **Lời nhắn mẫu (`P05` — Phỏng vấn trước một quyết định):**
  > *"`/grill-me` Mình đang cần quyết định [quyết định]. Hãy phỏng vấn mình bằng tiếng Việt, mỗi lần một câu, kèm câu trả lời bạn đề xuất, và ghi từng câu trả lời vào file."*

---

## PHẦN 2: BỘ NHỚ VÀ CONTEXT (Bài 6 → Bài 10)
*Mục tiêu: AI nhớ đúng thứ cần nhớ, không bị "lú" khi cuộc trò chuyện dài.*

### Bài 06 (`L06`): Nhắc 2 lần thì ghi vào `AGENTS.md` / `CLAUDE.md`
- **Cốt lõi:** Điều gì phải nhắc AI tới lần thứ hai thì ghi thành quy tắc để mọi phiên sau đều tự biết.
- **Lời nhắn mẫu (`P06` — Nhắc lần hai thì thành quy tắc):**
  > *"Từ giờ, mỗi khi mình phải nhắc bạn một điều lần thứ hai, hãy đề xuất một dòng để thêm vào AGENTS.md, và chỉ thêm khi mình đồng ý."*

### Bài 07 (`L07`): Đừng để `AGENTS.md` / `CLAUDE.md` quá dài (Giữ < 50 dòng)
- **Cốt lõi:** Khi AI lờ đi một quy tắc, thường là vì file quy tắc quá dài làm quy tắc quan trọng bị chìm. Hãy biến `AGENTS.md` thành **mục lục** chỉ giữ quy tắc lúc nào cũng cần + đường dẫn tới các file riêng (chỉ mở khi cần).
- **Lời nhắn mẫu (`P07` — Biến thành mục lục):**
  > *"Đọc AGENTS.md của mình. Đề xuất những phần nên chuyển ra file riêng (kèm tên file), để file chính chỉ còn những quy tắc lúc nào cũng cần, cùng một dòng chỉ đường tới từng file. Chỉ sửa khi mình đồng ý."*
- **Lời nhắn mẫu (`P07B` — Giữ luôn ngắn dưới 50 dòng):**
  > *"Thêm vào AGENTS.md quy tắc này: 'Mỗi khi thêm gì vào file này, nếu file dài quá 50 dòng thì đề nghị mình rút gọn trước, và chỉ rút gọn khi mình đồng ý.'"*

### Bài 08 (`L08`): Nâng cấp trí nhớ — Dựng 3 loại bộ nhớ
- **Cốt lõi:** Mỗi phiên mới AI bắt đầu từ số 0. Hãy dựng 3 loại trí nhớ như bàn làm việc của đồng nghiệp:
  1. **Sổ tay quy định (`AGENTS.md`):** Bạn là ai & quy tắc chung.
  2. **Sổ ghi chép (`docs/bo-nho/muc-luc.md` & `docs/bo-nho/ghi-chu/`):** Những gì AI học được & quyết định đã chốt.
  3. **Giấy nhớ (`docs/bo-nho/dang-lam.md`):** Việc đang dở & bước tiếp theo.
- **3 thời điểm bắt buộc ghi vào bộ nhớ:** (1) Khi bạn sửa AI, (2) Khi bạn ra quyết định (kèm lý do), (3) Khi xong một việc.
- **Lời nhắn mẫu (`P08B` — Dọn bộ nhớ mỗi tuần):**
  > *"Dọn bộ nhớ giúp mình: đọc lại các file trong docs/bo-nho/ và dang-lam.md, gộp những ghi chú trùng nhau, đánh dấu ghi chú nào đã cũ hoặc không còn đúng, chuyển những việc đã xong ra khỏi dang-lam.md, và cập nhật muc-luc.md. Cho mình xem danh sách thay đổi trước, chỉ sửa khi mình đồng ý."*

### Bài 09 (`L09`): Context càng dài, AI càng dễ sót
- **Cốt lõi:** Số liệu thực nghiệm của Anthropic (MRCR v2, 8 needles): ở **256K token** tìm đúng **93%**, nhưng ở **1M token** chỉ còn **76%** (cứ 4 thông tin thì sót 1). Hãy dùng `/compact` / `/autocompact` để tóm tắt sớm hơn trước khi chất lượng giảm.

### Bài 10 (`L10`): Mở phiên mới, nhưng bàn giao trước
- **Cốt lõi:** Khi cuộc trò chuyện quá dài, hãy nhờ AI viết một **Lời nhắn bàn giao** đóng khung để copy dán sang phiên mới.
- **Lời nhắn mẫu (`P10` — Lời nhắn bàn giao sang phiên mới):**
  > *"Mình sắp mở phiên mới. Hãy viết một lời nhắn bàn giao để mình dán vào phiên mới: những gì đã xong, những gì còn lại theo thứ tự, các file liên quan nằm ở đâu, và các quyết định đã chốt kèm lý do. Viết sao cho phiên mới đọc xong là làm tiếp được ngay, và đặt cả lời nhắn trong một khung để mình chép một lần."*

---

## PHẦN 3: VIỆC LỚN, SUB-AGENT & EVAL (Bài 11 → Bài 16)
*Mục tiêu: Giao những việc lớn, để AI tự kiểm tra và phối hợp nhiều Agent.*

### Bài 11 (`L11`): Lên kế hoạch bằng model to, thực thi bằng model nhỏ
- **Cốt lõi:** Phần khó nhất là chia bước và định nghĩa "thế nào là xong" → dùng model lớn (Plan mode) lưu vào `ke-hoach.md`. Thực thi từng bước theo file kế hoạch → dùng model nhỏ/nhanh ở phiên mới (không đổi model giữa chừng trong cùng 1 phiên).
- **Lời nhắn mẫu (`P11` & `P11B`):**
  > *"Hãy lên kế hoạch chi tiết cho [việc], chia thành các bước nhỏ, mỗi bước ghi rõ làm gì, ở file nào, và thế nào là xong. Lưu vào ke-hoach.md để một phiên khác làm theo được."*
  > *"Đọc ke-hoach.md và làm lần lượt từng bước. Xong bước nào thì đánh dấu bước đó trong file, rồi mới sang bước tiếp theo."*

### Bài 12 (`L12`): Dùng model nhỏ cho Sub-agent
- **Cốt lõi:** Sub-agent chủ yếu đọc tài liệu dài, tìm thông tin và tóm tắt → cho sub-agent dùng model nhỏ/nhanh (`flash` / `haiku`), giữ phần suy nghĩ và quyết định ở phiên chính.

### Bài 13 (`L13`): Giao việc kèm điều kiện hoàn thành (`/goal`)
- **Cốt lõi:** Với việc lớn không xong trong 1 lượt, dùng `/goal` kèm: (1) Điều kiện cụ thể kiểm tra được, (2) Bắt đưa bằng chứng ngay trong chat, (3) Giới hạn số lượt (VD: dừng sau 30 lượt).
- **Lời nhắn mẫu (`P13`):**
  > *"`/goal` [Mục tiêu cần đạt]: [Điều kiện 1], [Điều kiện 2], và một sub-agent soát lỗi đọc lại toàn bộ mà không tìm ra lỗi nghiêm trọng nào. Sau mỗi lượt, cho mình xem trong chat điều kiện nào đã đạt, kèm bằng chứng. Dừng sau 30 lượt."*

### Bài 14 (`L14`): Eval — Luôn kiểm tra kết quả của AI (4 nấc Eval)
- **Cốt lõi:** Khi AI làm được gần như mọi thứ, kỹ năng quan trọng nhất là **Eval (đánh giá/kiểm tra kết quả theo tiêu chí rõ ràng)**.
- **4 Nấc Eval thực chiến:**
  1. **Nấc 1:** Dặn AI tự kiểm tra ngay trong lời nhắn theo tiêu chí cụ thể (`P14`).
  2. **Nấc 2:** Khi AI báo xong, hỏi thêm: *"Kiểm tra lại và xác nhận là đã xong hết chưa?"*
  3. **Nấc 3:** Đặt điều kiện bằng `/goal` để AI làm tiếp cho tới khi đạt.
  4. **Nấc 4:** Dùng một **Sub-agent thứ hai chưa tham gia làm việc đó** để soát lại kết quả (`P14B` — chính là dây chuyền `bug_hunter` → `qa_tester` → `dev_fixer` đã tích hợp trong dự án!).
- **Lời nhắn mẫu (`P14` & `P14B`):**
  > *"Trước khi báo xong, hãy kiểm tra lại kết quả theo [tiêu chí], liệt kê những gì bạn đã kiểm tra, và những chỗ bạn chưa kiểm tra được."*
  > *"Dùng một sub-agent chưa tham gia làm việc này để soát lại [kết quả] theo [mục tiêu và tiêu chí]. Chỉ báo những lỗi làm sai yêu cầu hoặc ảnh hưởng tới mục tiêu; những góp ý khác thì ghi riêng là tuỳ chọn."*

### Bài 15 (`L15`): Đưa Agent lên VPS để chạy 24/7
- **Cốt lõi:** Chạy trên VPS Linux (≥ 4GB RAM) trong `tmux` + bật Remote Control (`/rc`) hoặc Telegram để giao việc từ điện thoại cả khi gập laptop (chỉ cấp quyền tối thiểu cho Agent).

### Bài 16 (`L16`): Lưu "Bộ não" trên GitHub & Đa nền tảng với `AGENTS.md`
- **Cốt lõi:** Toàn bộ quy tắc (`AGENTS.md`), ghi chú (`docs/bo-nho/`), skill (`.agents/skills/`), kế hoạch đều là **file chữ** lưu trên GitHub:
  - Có lịch sử mọi thay đổi, lỡ sai quay lại được ngay.
  - Đồng bộ tự động giữa nhiều máy.
  - Không bị khóa vào 1 công cụ: nhờ chuẩn `AGENTS.md`, cả Antigravity (Gemini), Claude Code, Codex đều đọc hiểu ngay lập tức!

---

## ⚡ BẢNG LỆNH NHANH KHI DÙNG EM (ANTIGRAVITY & CLAUDE CODE)

| Lệnh / Cú pháp | Tác dụng | Bài học |
| :--- | :--- | :---: |
| `/plan` | Lên kế hoạch từng bước chi tiết trước khi bắt tay vào sửa code | `L02`, `L11` |
| `/grill-me` | Phỏng vấn từng câu một kèm phương án đề xuất để chốt quyết định thiết kế | `L05` |
| `/learn` | Lưu lại quy tắc sau khi anh nhắc/sửa lỗi để các phiên sau không lặp lại | `L06` |
| `/compact` | Tóm tắt gọn cuộc trò chuyện khi context dài để giữ độ chính xác cao | `L09` |
| `/goal` | Chạy tác vụ dài hơi liên tục cho tới khi đạt đủ mọi điều kiện hoàn thành | `L13`, `L14` |
| `/boost` | Kích hoạt suy luận sâu, nhiều góc nhìn và kiểm chứng nghiêm ngặt | `L11`, `L14` |
| *"Chạy đội săn lỗi 3 agent"* | Kích hoạt `bug_hunter` → `qa_tester` → `dev_fixer` tự động soi lỗi, viết test & sửa | `L14` (Nấc 4) |
| *"Viết lời nhắn bàn giao"* | Xuất khung bàn giao 4 mục (Đã xong / Còn lại / File / Quyết định) để mở phiên mới | `L10` |
