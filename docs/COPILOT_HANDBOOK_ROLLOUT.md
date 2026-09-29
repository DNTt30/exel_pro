# Copilot Sổ tay GS25 — 2026-09-29

## Thay đổi

- Khóa frontend và Edge Function vào `gemini-3.6-flash` theo lựa chọn của chủ dự án. Bỏ bộ chọn model, badge model và ảnh hưởng của lựa chọn cũ trong localStorage.
- Đưa toàn bộ `GS25_HANDBOOK_DATA` vào system prompt, yêu cầu TÚ mini giải thích từng bước theo tài liệu, nói rõ khi thiếu hoặc mâu thuẫn thông tin.
- Bỏ trả lời nghiệp vụ bằng từ khóa. Giữ tra cứu dữ liệu cá nhân và các lệnh kiểm tra lịch/hạn sử dụng rõ ràng. Câu hỏi hội thoại và câu hỏi tiếp nối được gửi đến Gemini.
- Lỗi Gemini được hiển thị để người dùng thử lại hoặc mở Sổ tay; không thay bằng câu trả lời nghiệp vụ từ bộ từ khóa cũ.
- Sửa proxy: xác thực phiên Supabase và nhân viên còn hoạt động, dùng key chung ở máy chủ, khóa model ở server, chuyển tiếp SSE đúng định dạng. Không đưa key vào URL hoặc thông báo lỗi.

## Cấu hình

Chỉ tài khoản `admin` được mở **Cài đặt AI** và lưu key chung. Nhân viên, SM và AM không có bộ nhập key; server trả 403 nếu họ gọi API cấu hình trực tiếp. Admin lưu một lần để mọi nhân viên đang hoạt động dùng chung.

Key được lưu mã hóa bằng [Supabase Vault](https://supabase.com/docs/guides/database/vault). Trình duyệt chỉ nhận trạng thái `configured`, không đọc lại key; không lưu localStorage, key cũ trên trình duyệt bị xóa khi mở Copilot. Header key cá nhân cũ bị bỏ qua. Secret `GEMINI_API_KEY` vẫn được dùng khi Vault chưa có key. Key Vault được ưu tiên để admin có thể thay cấu hình ngay trong app.

Migration `supabase/migrations/20260929000000_copilot_shared_key.sql` tạo hai RPC chỉ service role được gọi. Không đưa key thật vào SQL, git hoặc chat. Chạy migration trước proxy và frontend:

```powershell
npx.cmd --yes supabase db query --linked --project-ref plitfdjzuealjxbylwxy --file supabase/migrations/20260929000000_copilot_shared_key.sql
npx.cmd --yes supabase functions deploy chat-proxy --project-ref plitfdjzuealjxbylwxy --no-verify-jwt --use-api
cd frontend
npm.cmd run deploy
```

`verify_jwt=false` chỉ tắt kiểm tra JWT của gateway; handler vẫn kiểm tra bằng `auth.getUser()` và từ chối người dùng không hợp lệ trước khi gọi Google.

## Kiểm chứng

- Các test nghiệp vụ dựa trên câu trả lời từ khóa cũ được thay bằng test kiểm tra định tuyến hội thoại, toàn bộ nội dung Sổ tay, persona, lịch sử và quyền riêng tư.
- Test service/proxy kiểm tra khóa model, header xác thực, từ chối nhân viên cấu hình, bỏ qua key cá nhân, phản hồi không chứa key, SSE bị chia chunk, lỗi nhà cung cấp và yêu cầu chưa đăng nhập.
- Script `scripts/check_copilot_ui.mjs` kiểm tra desktop/mobile, bộ chọn model đã bỏ và câu hỏi tiếp nối gửi đủ Sổ tay. Ảnh nằm trong `artifacts/copilot-ui/` (không commit).
- Kiểm tra trình duyệt dùng phản hồi SSE giả lập; chưa kiểm chứng câu trả lời thật của Google vì chưa có key khả dụng trong phiên làm việc. Prompt không bảo đảm tuyệt đối mô hình không bịa thông tin.

## Kết quả phát hành ban đầu

- `node scripts/agent_eval_loop.mjs`: 685 test đạt, 7 test bỏ qua; lint không lỗi/cảnh báo; build, kiểm tra kiến trúc và guardrails đạt. Mã nguồn không thay đổi trong lúc chạy kiểm thử.
- Edge Function `chat-proxy` đã deploy. Kiểm tra endpoint thật: OPTIONS trả 204, POST chưa đăng nhập trả 401.
- Frontend đã Published. Website trả HTTP 200 và sử dụng đúng `/exel_pro/assets/index-GoOKsBAC.js`, khớp bản build cục bộ.
- Việc còn cần kiểm chứng: hội thoại thật với Google sau khi admin nhập Gemini API key hợp lệ hoặc quản trị cấu hình `GEMINI_API_KEY`.

## Điều chỉnh quyền cấu hình

Chỉ admin nhập key. `scripts/check_copilot_key_permissions.sql` đã kiểm tra quyền và vòng lưu/đọc/thay key trong transaction rollback trên Supabase Vault; không giữ key thử. UI test kiểm tra admin lưu dùng chung và nhân viên không có mục cài đặt trên desktop/mobile. Việc lưu xác nhận cấu hình và định dạng, chưa khẳng định key có quota/quyền model; kiểm chứng bằng hội thoại thật sau khi admin nhập key hợp lệ.

Đã áp dụng migration và deploy proxy/frontend ngày 29/09/2026. Bộ kiểm tra cuối: **692 passed, 7 skipped**, lint/build/kiến trúc/guardrails đạt. Browser desktop/mobile đạt cho admin và nhân viên. Website trả HTTP 200, bundle `/exel_pro/assets/index-DXGj7_jO.js` khớp bản phát hành mới. Không cấu hình key thật trong phiên triển khai này.
