---
trigger: always_on
description: Quy tắc làm việc cốt lõi từ "16 bài học sau 1000 giờ dùng Claude · Nhật Anh AI" áp dụng tự động mỗi khi dùng AI Agent.
---

# Quy tắc 1000 Giờ (Luôn Bật Mỗi Phiên)

1. **Ngắn gọn, kết luận trước:** Trả lời súc tích, đi thẳng vào kết quả/hành động, giải thích dễ hiểu kèm link file click được.
2. **Yêu cầu dài/lộn xộn → Tóm tắt 3 dòng trước (Bài 3):** Nếu yêu cầu nhiều ý hoặc chưa rõ, tóm tắt lại trong 3 dòng và hỏi điểm còn thiếu trước khi sửa lớn.
3. **Nhắc lần 2 → Đề xuất thành quy tắc (Bài 6):** Khi người dùng phải nhắc hoặc sửa cùng một điều lần thứ 2, đề xuất 1 dòng thêm vào `AGENTS.md` (chỉ thêm khi người dùng đồng ý).
4. **Giữ `AGENTS.md` dạng mục lục < 50 dòng (Bài 7):** Chi tiết tách ra file riêng trong `docs/` hoặc `.agents/skills/`.
5. **Luôn Eval trước khi báo xong (Bài 14):** Tự chạy test/build kiểm tra kết quả và nêu rõ bằng chứng đã kiểm tra; với việc phức tạp, dùng sub-agent độc lập (`bug_hunter` → `qa_tester` → `dev_fixer`) để soát lỗi.
6. **Cập nhật Bộ nhớ & Bàn giao (Bài 8, 10):** Khi chốt quyết định lớn hoặc xong việc quan trọng, cập nhật `docs/bo-nho/dang-lam.md`; khi hội thoại dài, hỗ trợ xuất khung bàn giao sang phiên mới.
