# Xử lý lỗi Gemini 503

Thông báo cũ do `chat-proxy` trả khi Google vẫn trả HTTP 503 sau tối đa 3 lần gọi (lần đầu và 2 lần thử lại). Không có bằng chứng từ thông báo này rằng API key sai hoặc hết quota. Tài liệu Google: https://ai.google.dev/gemini-api/docs/troubleshooting

## Thay đổi

- Giữ HTTP status trên lỗi client, kể cả gateway trả HTML thay JSON; không đưa nội dung gateway lên giao diện.
- Thông báo 503 ngắn, có nút **Thử lại câu hỏi** cho lỗi tạm thời và **Mở Sổ tay**. Không thêm vòng retry tự động hoặc đổi model.
- Thử lại thay câu trả lời lỗi, giữ câu hỏi ban đầu, không nhân đôi câu hỏi trong ngữ cảnh gửi Gemini. Lỗi và lịch sử chat vẫn nằm trong phạm vi tài khoản hiện tại.
- Lỗi quyền 403/cấu hình được giữ rõ, không thay bằng câu trả lời đoán hay nút thử lại liên tục. Sổ tay mở qua route có bảo vệ hiện có, không cung cấp thêm dữ liệu nhân viên.

## Kiểm tra và giới hạn

51 tests của service, proxy, Drawer và phân quyền; browser fixture desktop/mobile mô phỏng 503 → người dùng bấm thử lại → SSE thành công. Không gọi Google bằng key thật hoặc thay đổi cấu hình key trong kiểm thử.

Thay đổi này cải thiện xử lý lỗi trong app; không khắc phục tình trạng quá tải tại Google và không chứng minh dịch vụ Google đã phục hồi. Không cần migration hay deploy Edge Function vì retry phía server giữ nguyên.
