# Copilot Sổ tay GS25 — 2026-09-29

## Thay đổi

- Khóa frontend và Edge Function vào `gemini-3.6-flash` theo lựa chọn của chủ dự án. Bỏ bộ chọn model, badge model và ảnh hưởng của lựa chọn cũ trong localStorage.
- Đưa toàn bộ `GS25_HANDBOOK_DATA` vào system prompt, yêu cầu TÚ mini giải thích từng bước theo tài liệu, nói rõ khi thiếu hoặc mâu thuẫn thông tin.
- Bỏ trả lời nghiệp vụ bằng từ khóa. Giữ tra cứu dữ liệu cá nhân và các lệnh kiểm tra lịch/hạn sử dụng rõ ràng. Câu hỏi hội thoại và câu hỏi tiếp nối được gửi đến Gemini.
- Lỗi Gemini được hiển thị để người dùng thử lại hoặc mở Sổ tay; không thay bằng câu trả lời nghiệp vụ từ bộ từ khóa cũ.
- Sửa proxy: xác thực phiên Supabase và nhân viên còn hoạt động, hỗ trợ key cá nhân hoặc secret máy chủ, khóa model ở server, chuyển tiếp SSE đúng định dạng. Không đưa key vào URL hoặc thông báo lỗi.

## Cấu hình

`GEMINI_API_KEY` chưa có trong Supabase Secrets tại thời điểm kiểm tra. Người dùng có thể nhập key cá nhân trong **Cài đặt AI**. Key cá nhân được lưu trong trình duyệt và gửi qua proxy khi gọi Gemini; tránh lưu trên máy dùng chung. Có thể cấu hình secret máy chủ để người dùng không cần nhập key cá nhân. Không đưa key vào git hay chat.

Không cần migration DB. Deploy proxy trước frontend:

```powershell
npx.cmd --yes supabase functions deploy chat-proxy --project-ref plitfdjzuealjxbylwxy --no-verify-jwt --use-api
cd frontend
npm.cmd run deploy
```

`verify_jwt=false` chỉ tắt kiểm tra JWT của gateway; handler vẫn kiểm tra bằng `auth.getUser()` và từ chối người dùng không hợp lệ trước khi gọi Google.

## Kiểm chứng

- Các test nghiệp vụ dựa trên câu trả lời từ khóa cũ được thay bằng test kiểm tra định tuyến hội thoại, toàn bộ nội dung Sổ tay, persona, lịch sử và quyền riêng tư.
- Test service/proxy kiểm tra khóa model, header xác thực, key không nằm trong URL, SSE bị chia chunk, lỗi nhà cung cấp và yêu cầu chưa đăng nhập.
- Script `scripts/check_copilot_ui.mjs` kiểm tra desktop/mobile, bộ chọn model đã bỏ và câu hỏi tiếp nối gửi đủ Sổ tay. Ảnh nằm trong `artifacts/copilot-ui/` (không commit).
- Kiểm tra trình duyệt dùng phản hồi SSE giả lập; chưa kiểm chứng câu trả lời thật của Google vì chưa có key khả dụng trong phiên làm việc. Prompt không bảo đảm tuyệt đối mô hình không bịa thông tin.

## Kết quả phát hành

- `node scripts/agent_eval_loop.mjs`: 685 test đạt, 7 test bỏ qua; lint không lỗi/cảnh báo; build, kiểm tra kiến trúc và guardrails đạt. Mã nguồn không thay đổi trong lúc chạy kiểm thử.
- Edge Function `chat-proxy` đã deploy. Kiểm tra endpoint thật: OPTIONS trả 204, POST chưa đăng nhập trả 401.
- Frontend đã Published. Website trả HTTP 200 và sử dụng đúng `/exel_pro/assets/index-GoOKsBAC.js`, khớp bản build cục bộ.
- Việc còn cần kiểm chứng: hội thoại thật với Google sau khi người dùng nhập Gemini API key hợp lệ hoặc quản trị cấu hình `GEMINI_API_KEY`.
