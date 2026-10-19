# TÚ mini — RAG gọn và phân quyền (11/10/2026)

## Bổ sung kho công thức FF — 17/10/2026

- Sửa lỗi “Trà cóc xí muội” có trong `ffOnsiteRecipes.js` nhưng không nằm trong chỉ mục RAG. Đưa đủ 57 mục từ `FF_RECIPE_GROUPS` vào cùng chỉ mục với Sổ tay vận hành; mỗi công thức là một trích đoạn đầy đủ, không sao chép sang kho dữ liệu khác.
- Chuẩn hóa tên có/không dấu và dấu câu, tăng điểm tên/alias trong dữ liệu. Tên món chính xác chỉ lấy công thức đó; câu hỏi có tên rõ loại bỏ món tương tự không được hỏi, tránh lẫn trà cóc với trà lài/trà me. Câu tiếp nối về ml hoặc size dùng chủ đề người dùng gần nhất.
- Giữ giới hạn 4 trích đoạn/6.000 ký tự và bộ lọc quyền. Công thức vẫn qua Gemini với nguồn tra cứu; không khôi phục bộ trả lời đoán theo từ khóa và không thêm lượt gọi phân loại/embedding.
- Ví dụ “trà cóc xí muội”: lấy đúng nguồn size L, 250ml trà cóc + đá đầy cốc, dài 156 ký tự trích đoạn. Size khác không có trong nguồn phải được nói rõ, không suy ra từ món khác.
- 56 tests RAG/phân quyền/service/Drawer đạt, gồm kiểm tra đủ nội dung 57 công thức và các bài Sổ tay vận hành trước đó. Browser desktop/mobile xác nhận câu hỏi có/không dấu gửi đúng nguồn và scope `handbook`, mỗi câu một request. Provider được giả lập; chưa kiểm chứng câu trả lời Google thật. Lint không lỗi, còn 6 cảnh báo ngoài phần sửa.
- Đã `Published`; trang công khai HTTP 200 khớp bản `index-B9qW6kzz.js`, HTML SHA-256 `2dd1820c56b9fb3333e43747ad68053e0725a67c5b9c24aa9ba7d5dce67b4778`. Không cần migration hoặc deploy lại Edge Function.

## Thay đổi

- Bỏ prompt yêu cầu trả lời dài và việc đính kèm toàn bộ Sổ tay. Tìm kiếm BM25 cục bộ trên cùng nguồn `gs25HandbookData.js`; gửi tối đa 4 trích đoạn, tổng tối đa 6.000 ký tự. Bỏ thuộc tính giao diện/ảnh scan; giữ nguyên các bước, định lượng và cảnh báo của từng quy trình.
- Mặc định yêu cầu 1–3 câu hoặc tối đa 3 gạch đầu dòng, khoảng 80 từ. Chỉ mở rộng khoảng 250 từ khi người dùng yêu cầu chi tiết. Không cắt chuỗi câu trả lời sau khi model sinh để tránh mất lưu ý an toàn.
- Giới hạn đầu ra mặc định 1.024 token, tối đa 2.048 token khi cần chi tiết; áp dụng cả service và proxy. Lịch sử gửi đi tối đa 4 tin/2.400 ký tự, bỏ tin lỗi, làm sạch secret. Câu tiếp nối lấy chủ đề từ câu hỏi trước, không dùng câu trả lời cũ làm nguồn Sổ tay.
- Câu hỏi nghiệp vụ không kèm danh sách nhân viên, lịch, hồ sơ hay lý do bù công. Câu hỏi dữ liệu vẫn dùng định tuyến cá nhân/agent tại chỗ nếu khớp; phần cần LLM chỉ có dữ liệu đã lọc quyền và giới hạn kích thước.
- Không tạo embedding, vector DB hay lượt gọi LLM phân loại riêng. Cách diễn đạt quá khác nội dung nguồn vẫn có thể tìm thiếu; prompt phải hỏi rõ, không tự bịa quy trình hoặc khẳng định Sổ tay không có.

## Phân quyền

| Vai trò | Dữ liệu trợ lý được dùng |
| --- | --- |
| STPT/STFT/CSR, nhân viên | Sổ tay chung; lịch và đơn của chính mình; kệ được giao trong cửa hàng được phép |
| SM | Sổ tay; nhân sự/lịch/đơn/kệ trong các cửa hàng được gán; bộ chọn cửa hàng chỉ thu hẹp phạm vi |
| OFC/AM | Theo quyền toàn chuỗi hiện có của DB `my_managed_stores`; vẫn thu hẹp theo cửa hàng đang chọn |
| Admin | Phạm vi quản trị; duy nhất được nhập/thay Gemini API key |

Không thay đổi quyền OFC toàn chuỗi của dự án trong bản sửa này. Nếu muốn OFC chỉ quản lý một khu vực, cần bổ sung quyền khu vực ở DB và các màn hình liên quan một cách thống nhất.

`scopeCopilotContext` áp dụng cho cả context hội thoại và các agent đọc dữ liệu. Lịch sử chat dùng khóa mới theo tài khoản + vai trò + cửa hàng được gán + bộ chọn cửa hàng; đổi quyền sẽ tạo lại phiên component, hủy nhận kết quả cũ. Không nạp lại lịch sử trước bản RAG vì có thể chứa dữ liệu từ phạm vi rộng hơn.

Proxy xác minh tài khoản Auth, trạng thái hoạt động, chức danh từ bảng employees và phạm vi quản lý từ RPC chạy với JWT người dùng. Không tin `isAdmin`, `isManager`, role hoặc user_metadata do trình duyệt gửi. Scope gồm loại yêu cầu, danh sách cửa hàng và mã nhân viên; mã ngoài quyền hoặc ngoài cửa hàng chọn trả 403 trước khi gọi Google. Yêu cầu thiếu scope phải tải lại app. Phân tích chỉ dẫn xếp lịch chỉ dành cho quản lý. Không truyền scope nội bộ hoặc key sang nội dung model.

Trợ lý vẫn chỉ đọc/gợi ý. Không thêm công cụ ghi/duyệt vào LLM. Kiểm tra scope là hàng rào ứng dụng; dữ liệu văn bản người dùng tự nhập không trở thành dữ liệu DB đáng tin cậy. RLS hiện có vẫn là hàng rào cho việc đọc/ghi dữ liệu thật. Prompt không phải cơ chế cấp quyền hoặc bảo đảm mô hình không suy diễn.

## Kiểm chứng

Toàn bộ frontend: **742 tests đạt, 7 bỏ qua**. Test riêng RAG/phân quyền/service/proxy/agent/drawer: **77 đạt**. Build thành công; lint không lỗi, còn 14 cảnh báo có sẵn ngoài phần sửa. Trình duyệt desktop 1440px và mobile 390px đạt với SSE giả lập: admin cấu hình được, nhân viên không có cài đặt, payload dùng RAG và giới hạn đầu ra. Không dùng key thật, không gọi Google để kiểm tra câu trả lời thực tế.

So sánh ký tự Sổ tay trong payload, cùng nguồn 32.592 ký tự trước đây:

| Câu hỏi thử | Trích đoạn sau RAG | Giảm ký tự Sổ tay |
| --- | ---: | ---: |
| Burger hủy lúc mấy giờ? | 1.966 | 94,0% |
| Công thức nấu súp chả cá cay | 2.732 | 91,6% |
| Lịch vệ sinh ca đêm | 4.994 | 84,7% |

Đây là số ký tự phần tài liệu, không phải số token/quota Google đo được hoặc tỷ lệ giảm toàn bộ payload. Mỗi câu gửi Gemini vẫn tính một request; rút ngắn đầu vào/đầu ra không tự tăng hạn mức lượt gọi. Google phân biệt hạn mức requests và tokens: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

## Phát hành

**Đã phát hành ngày 13/10/2026:** frontend GitHub Pages và `chat-proxy` trên project `plitfdjzuealjxbylwxy`. Trang công khai trả HTTP 200, HTML và các entry asset khớp bản build; proxy trả HTTP 401 cho yêu cầu chưa đăng nhập. Proxy mới yêu cầu scope nên tab frontend cũ phải tải lại. Chưa kiểm chứng câu trả lời bằng Gemini thật hoặc đo token tại provider trong đợt phát hành này.

RAG không cần migration riêng, nhưng frontend hiện tại còn có thay đổi vận hành: ba migration workspace branding/roles/operational hardening đã được áp dụng trước frontend. Xem [ghi nhận phát hành](RELEASE_20261013.md).

```powershell
# Từ thư mục gốc, sau khi sẵn sàng phát hành:
npx.cmd --yes supabase functions deploy chat-proxy --project-ref plitfdjzuealjxbylwxy --no-verify-jwt --use-api
cd frontend
npm.cmd run deploy
```

`--no-verify-jwt` chỉ tắt gateway; handler vẫn xác minh bằng `auth.getUser`. Sau phát hành, tải lại trình duyệt và thử staff/SM/OFC/admin: hỏi giờ hủy, câu tiếp nối, yêu cầu chi tiết, lịch cá nhân và truy vấn cửa hàng ngoài quyền. Xác nhận Google trả lời ngắn/có nguồn với key hiện tại; chưa có số đo token thực tế từ provider trong phiên này.
