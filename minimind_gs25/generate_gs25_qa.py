#!/usr/bin/env python3
"""
Script sinh dữ liệu huấn luyện (SFT Dataset) cho mô hình AI trợ lý GS25.
Tạo file gs25_qa.jsonl dạng instruction-response từ toàn bộ kiến thức nghiệp vụ dự án.
"""

import json
import random

# ============================================================
# KNOWLEDGE BASE — trích xuất từ dự án GS25
# ============================================================

QA_PAIRS = [
    # === CA LÀM VIỆC ===
    {
        "instruction": "Các ca làm việc tiêu chuẩn tại GS25 là gì?",
        "output": "GS25 có 3 nhóm ca chính:\n• Ca 8 tiếng (Full-time): Ca Sáng 6:00–14:00, Ca Chiều 14:00–22:00, Ca Đêm 22:00–6:00, Ca Hành chính 10:00–18:00.\n• Ca 4 tiếng (Part-time linh hoạt): 6-10, 10-14, 14-18, 18-22. Phù hợp sinh viên xoay ca theo lịch học.\n• Ca Đêm 22-6: Luôn cần ít nhất 1 nhân sự cứng (STFT) trực quầy POS và nhận hàng Fresh Food.",
    },
    {
        "instruction": "Ca sáng tại GS25 bắt đầu lúc mấy giờ?",
        "output": "Ca sáng (Ca 8 tiếng chuẩn) tại GS25 bắt đầu lúc 6:00 sáng và kết thúc lúc 14:00 chiều. Đây là ca đông khách và cần ít nhất 2 nhân sự.",
    },
    {
        "instruction": "Ca chiều GS25 từ mấy giờ đến mấy giờ?",
        "output": "Ca chiều tại GS25 từ 14:00 đến 22:00. Đây là khoảng thời gian đông khách buổi chiều và tối, thường cần 2-3 nhân sự tùy doanh thu dự kiến.",
    },
    {
        "instruction": "Ca đêm GS25 là mấy giờ?",
        "output": "Ca đêm tại GS25 là từ 22:00 tối đến 06:00 sáng hôm sau (ca 22-6). Ca này cần ít nhất 1 nhân viên cứng (Full-time/STFT) vì yêu cầu trực POS, an ninh và nhận hàng fresh food giờ khuya.",
    },
    {
        "instruction": "Ca 4 tiếng dành cho ai?",
        "output": "Ca 4 tiếng (Part-time linh hoạt) phù hợp nhất cho:\n• Sinh viên có lịch học ban ngày\n• Nhân viên STPT chỉ đăng ký bán thời gian\n• Bổ sung nhân lực vào khung giờ vàng (rush hours) như sáng 6-10 và chiều 14-18.",
    },
    {
        "instruction": "Nhân viên mới (CSR_NEW) có được trực ca đêm một mình không?",
        "output": "Không. Nhân viên mới (CSR_NEW) dưới 1 tháng kinh nghiệm bắt buộc phải có ít nhất 1 Bạn Cứng (STFT, SM, hoặc nhân viên trên 1 tháng kinh nghiệm) kèm cặp cùng ca. Tuyệt đối không để nhân viên mới trực solo bất kỳ ca nào.",
    },

    # === ĐỊNH MỨC GIỜ CÔNG ===
    {
        "instruction": "Part-time tối đa được làm bao nhiêu giờ mỗi tuần?",
        "output": "Part-time tại GS25 (loại STPT) bị giới hạn tối đa 23 giờ/tuần. Định mức an toàn từ 16h đến 23h/tuần. Ngoài ra, giới hạn tổng tháng không vượt quá 91 giờ/tháng theo hợp đồng thời vụ. Nếu vượt quá, hệ thống sẽ tự động cảnh báo màu đỏ.",
    },
    {
        "instruction": "Full-time GS25 phải làm bao nhiêu giờ một tuần?",
        "output": "Nhân viên Full-time (STFT) chuẩn 48 giờ/tuần, tương đương 6 ca 8 tiếng và 1 ngày nghỉ OFF so le. Hệ thống AI xếp lịch tự động đảm bảo STFT luôn có đúng 1 ngày nghỉ mỗi tuần.",
    },
    {
        "instruction": "Giới hạn giờ làm của Part-time theo tháng là bao nhiêu?",
        "output": "Part-time (STPT) tại GS25 không được làm vượt 91 giờ/tháng theo quy định hợp đồng thời vụ. Hệ thống theo dõi và cảnh báo ⚠️ khi nhân viên tiếp cận ngưỡng này.",
    },
    {
        "instruction": "CSR_NEW là gì?",
        "output": "CSR_NEW là nhân viên mới tại GS25, có kinh nghiệm dưới 1 tháng. Quy định bắt buộc: phải có Bạn Cứng (senior staff) kèm cặp cùng ca, không được trực solo. Sau 1 tháng và được SM đánh giá đạt, sẽ được chuyển lên loại STPT hoặc STFT.",
    },

    # === QUY ĐỊNH NGHỈ NGƠI ===
    {
        "instruction": "Giữa 2 ca liên tiếp nhân viên cần nghỉ bao lâu?",
        "output": "Theo quy định lao động, nhân viên phải được nghỉ ít nhất 12 giờ (tối thiểu 11 giờ) giữa 2 ca liên tiếp. Ví dụ: kết thúc ca chiều lúc 22:00, không được xếp ca sáng 6:00 hôm sau (chỉ nghỉ 8 tiếng - vi phạm). Phải xếp ca chiều 14:00 trở đi.",
    },
    {
        "instruction": "Sau ca đêm 22-6 nhân viên được nghỉ bao lâu?",
        "output": "Sau ca đêm (22:00–06:00 sáng), nhân viên phải được nghỉ cả ngày hôm sau hoặc chỉ được xếp ca từ 18:00 trở đi. Quy định tối thiểu 12 giờ nghỉ trước ca tiếp theo.",
    },
    {
        "instruction": "Nhân viên được nghỉ ca chiều 14-22 thì sáng hôm sau có xếp ca được không?",
        "output": "Không. Ca chiều kết thúc lúc 22:00, muốn xếp ca hôm sau phải sau 10:00 sáng (đảm bảo ≥ 12 giờ nghỉ). Nếu xếp ca sáng 6:00-14:00 thì vi phạm quy định nghỉ tối thiểu 11 giờ.",
    },
    {
        "instruction": "Mỗi tuần nhân viên được nghỉ mấy ngày?",
        "output": "Theo luật lao động, mỗi tuần nhân viên được nghỉ ít nhất 24 giờ liên tục (1 ngày OFF trọn vẹn). Full-time (STFT) làm tối đa 6 ca/tuần = 48h, AI xếp lịch tự đảm bảo có 1 ngày OFF không xếp ca.",
    },

    # === LƯƠNG & PHỤ CẤP ===
    {
        "instruction": "Ca đêm tại GS25 có phụ cấp không?",
        "output": "Có. Theo Điều 98 Bộ luật Lao động 2019, làm việc ban đêm (22:00–06:00) được trả thêm ít nhất 30% tiền lương so với ca ngày. Trong hệ thống, ca đêm 22-6 được tính hệ số x1.3 khi tính lương ước tính.",
    },
    {
        "instruction": "Tăng ca (OT) tại GS25 được tính thế nào?",
        "output": "Chế độ tăng ca (OT) tại GS25:\n• Ngày thường: ≥ 150% lương\n• Ngày nghỉ tuần (OFF): ≥ 200% lương\n• Ngày Lễ, Tết: ≥ 300% lương (chưa kể lương ngày lễ)\n• Tăng ca đêm: ≥ 200–210% theo công thức luật định.",
    },
    {
        "instruction": "Chu kỳ tính lương của GS25 là từ ngày mấy?",
        "output": "Chu kỳ lương GS25 tính từ ngày 26 tháng trước đến ngày 25 tháng hiện tại (chu kỳ 26-25). Ngày 25 hàng tháng, nhân viên cần xác nhận công trên app, SM xuất bảng lương gửi C&B.",
    },
    {
        "instruction": "Ngày 25 nhân viên cần làm gì?",
        "output": "Ngày 25 hàng tháng là ngày chốt chu kỳ lương:\n1. Nhân viên nhận thông báo vàng trên app và bấm 'Xác nhận đúng & đủ công'.\n2. Nếu phát hiện sai lệch, bấm 'Báo chênh lệch' → tạo yêu cầu C&B gửi SM.\n3. SM xem tiến độ xác nhận công trên Dashboard và đôn đốc NV chưa xác nhận.\n4. SM xuất bảng công lương C&B gửi bộ phận tính lương.",
    },

    # === ĐỔI CA & BÙ CÔNG ===
    {
        "instruction": "Nhân viên muốn đổi ca thì làm thế nào?",
        "output": "Luồng đổi ca tại GS25:\n1. NV vào trang 'Lịch ca' → bấm nút 'Đổi ca' → chọn ngày muốn đổi và đồng nghiệp muốn đổi sang.\n2. Đồng nghiệp nhận thông báo và xác nhận đồng ý.\n3. SM nhận yêu cầu đổi ca đã được 2 bên đồng ý và duyệt cuối cùng.\n4. Sau khi SM duyệt, lịch tự cập nhật.",
    },
    {
        "instruction": "SM duyệt yêu cầu C&B và đổi ca ở đâu?",
        "output": "SM duyệt yêu cầu tại trang 'Yêu cầu C&B / Đổi ca'. Các yêu cầu NV gửi lên hiển thị ngay theo thời gian thực. SM có thể duyệt hoặc từ chối kèm ghi chú lý do.",
    },
    {
        "instruction": "Ai có quyền duyệt đơn đổi ca?",
        "output": "Quyền duyệt đổi ca theo phân cấp:\n• SM (Cửa hàng trưởng): Duyệt đổi ca trong phạm vi cửa hàng mình phụ trách.\n• Admin: Duyệt tất cả yêu cầu trong toàn bộ chuỗi.\n• Lưu ý: Không ai được tự duyệt yêu cầu của chính mình (hệ thống chặn tự động).",
    },
    {
        "instruction": "Bù công là gì và khi nào cần dùng?",
        "output": "Bù công (C&B - Compensation & Benefits) là quy trình điều chỉnh giờ công khi có sai lệch giữa lịch xếp và thực tế làm việc. Nhân viên dùng khi:\n• Làm thêm giờ không có trong lịch\n• Nghỉ do bệnh có phiếu chứng nhận\n• Lịch app sai với thực tế ezHR\nNhân viên gửi → SM xem xét → Duyệt/Từ chối kèm lý do.",
    },

    # === PHÂN QUYỀN ===
    {
        "instruction": "Tài khoản Admin có quyền gì trong hệ thống GS25?",
        "output": "Admin có toàn quyền trong hệ thống:\n• Thấy tất cả cửa hàng và có bộ lọc 'Tất cả cửa hàng'\n• Thêm/sửa/khóa mã nhân viên (is_active)\n• Gán SM cho cửa hàng\n• Xem toàn bộ nhật ký lịch sử hệ thống\n• Xếp lịch, nhập xuất ezHR, duyệt tất cả yêu cầu C&B và đổi ca\n• Quản lý kệ date toàn chuỗi",
    },
    {
        "instruction": "SM có quyền gì trong hệ thống?",
        "output": "SM (Cửa hàng trưởng) có quyền trong phạm vi cửa hàng được gán sm_id:\n• Xem/sửa lịch ca các CH phụ trách\n• Sửa công thực tế và xuất bảng lương C&B\n• Duyệt yêu cầu C&B và đổi ca của NV trong phạm vi\n• Quản lý kệ date CH mình\n• KHÔNG có: Trang Nhân viên, Trang Cửa hàng, Nhật ký, khóa mã NV.",
    },
    {
        "instruction": "Nhân viên thường có thể xem những gì trên app?",
        "output": "Nhân viên thường có thể xem và dùng:\n• Trang chủ: Xác nhận công ngày 25\n• Lịch ca cá nhân theo tuần\n• Chấm công cá nhân\n• Gửi yêu cầu bù công (C&B) và đổi ca\n• Xem kệ date được giao\nNhân viên không thể xem thông tin của người khác hay thao tác quản lý.",
    },
    {
        "instruction": "Cách đăng nhập vào hệ thống GS25 Management?",
        "output": "Đăng nhập tại: https://dntt30.github.io/exel_pro/\n• Tài khoản Admin: Nhập 'admin' và mật khẩu cài đặt riêng\n• Tài khoản SM/NV: Nhập mã nhân viên 9 số và mật khẩu '1' (mặc định) hoặc mật khẩu đã đổi\nApp chạy tốt trên điện thoại, không cần cài ứng dụng.",
    },
    {
        "instruction": "Làm sao gán SM cho cửa hàng?",
        "output": "Admin gán SM cho cửa hàng bằng 2 bước:\n1. Vào Supabase SQL Editor chạy:\n   UPDATE employees SET job_title = 'Cửa hàng trưởng' WHERE id = 'mã_NV';\n2. Gán phạm vi cửa hàng:\n   UPDATE stores SET sm_id = 'mã_NV' WHERE id IN ('VN0485', 'VN0497');\nHoặc thực hiện qua giao diện Admin trong app.",
    },
    {
        "instruction": "SM có thể phụ trách nhiều cửa hàng không?",
        "output": "Có. Một SM có thể phụ trách nhiều cửa hàng cùng lúc. Hệ thống hỗ trợ mô hình 1 SM quản lý 2-5 cửa hàng (chuỗi nhỏ). Khi đó SM thấy tất cả CH mình phụ trách trong bộ lọc, mỗi CH được phân tách rõ ràng.",
    },

    # === KỆ DATE / HSD ===
    {
        "instruction": "Kệ date là gì?",
        "output": "Kệ date (Shelf Date Board) là tính năng quản lý hạn sử dụng (HSD) hàng hóa tại GS25, đặc biệt cho Fresh Food và FMCG. SM và nhân viên được giao quản lý từng kệ hàng, theo dõi ngày hết hạn và nhận cảnh báo trước khi hàng quá date.",
    },
    {
        "instruction": "Làm thế nào để nhận cảnh báo kệ date sắp hết hạn?",
        "output": "Trong trang Kệ Date, bạn có thể cấu hình số ngày cảnh báo trước (notifyDays). Ví dụ:\n• notifyDays = 0: Cảnh báo ngay trong ngày hết hạn\n• notifyDays = 1: Cảnh báo trước 1 ngày\n• notifyDays = 3: Cảnh báo trước 3 ngày\nHệ thống tự động highlight và thông báo những mặt hàng sắp quá date.",
    },
    {
        "instruction": "Một kệ hàng có thể giao cho nhiều nhân viên quản lý không?",
        "output": "Có. Một kệ hàng có thể được giao cho nhiều nhân viên cùng quản lý (chế độ multi-assignee). Tất cả nhân viên được giao đều thấy kệ hàng đó trong danh sách của mình.",
    },

    # === IMPORT LỊCH / AI XẾP LỊCH ===
    {
        "instruction": "Nhập lịch từ file Excel ezHR như thế nào?",
        "output": "SM nhập lịch từ ezHR qua trang 'Nhập lịch':\n1. Vào menu Lịch ca → chọn 'Nhập từ Excel ezHR'\n2. Kéo thả hoặc chọn file Excel xuất từ phần mềm ezHR\n3. Hệ thống tự nhận dạng định dạng ca (kể cả '6h-18h', '22-6 VN0497')\n4. Kiểm tra preview và bấm xác nhận nhập",
    },
    {
        "instruction": "AI xếp lịch tự động hoạt động như thế nào?",
        "output": "AI xếp lịch (AI Scheduler) hoạt động dựa trên:\n1. SM nhập doanh số dự kiến từ T2-CN (riêng T2-T6 và T7-CN)\n2. AI phân tích nhu cầu nhân sự theo từng khung giờ\n3. Tự phân bổ: Part-time vào ca ngắn khung giờ vàng, Full-time giữ xương sống ca\n4. Đảm bảo: không vi phạm giờ nghỉ, không vượt định mức PT, NV mới có bạn kèm\n5. SM review và điều chỉnh tay nếu cần",
    },
    {
        "instruction": "Xuất bảng công lương C&B như thế nào?",
        "output": "Xuất công lương C&B tại trang 'Chấm công':\n1. Chọn tháng muốn xuất (chu kỳ 26-25)\n2. Bấm nút 📗 'Xuất Công Lương C&B'\n3. File Excel xuất ra đúng mẫu 31 ngày theo chu kỳ 26→25\n4. Gửi file này cho bộ phận C&B để tính lương",
    },

    # === ĐỒNG PHỤC & VĂN HÓA ===
    {
        "instruction": "Câu chào khách chuẩn của GS25 là gì?",
        "output": "Tiêu chuẩn chào khách GS25:\n• Khi khách bước vào: Tất cả nhân viên trong ca tươi cười và chào to rõ ràng: 'GS25 xin chào!'\n• Khi khách thanh toán xong và ra về: 'GS25 cảm ơn và hẹn gặp lại quý khách!'",
    },
    {
        "instruction": "Đồng phục chuẩn của nhân viên GS25 là gì?",
        "output": "Tiêu chuẩn đồng phục GS25:\n• Áo đồng phục GS25 phẳng phiu, sơ vin gọn gàng\n• Đeo bảng tên bên ngực trái\n• Mang giày đen/tối màu kín mũi\n• Khi đứng quầy Fresh Food: bắt buộc đeo tạp dề sạch và đội mũ GS25\n• Tuyệt đối không bấm điện thoại cá nhân trong giờ làm",
    },

    # === KỸ THUẬT & HỆ THỐNG ===
    {
        "instruction": "Dữ liệu lịch làm việc có bị mất khi máy tính hỏng không?",
        "output": "Không. Toàn bộ dữ liệu lịch, công, nhân viên đều lưu trên Supabase Cloud (PostgreSQL). Máy tính hỏng, đổi máy hay dùng điện thoại khác đều không mất dữ liệu. Chỉ cần đăng nhập lại là xem được ngay.",
    },
    {
        "instruction": "Khi gặp lỗi trên app GS25 thì xử lý thế nào?",
        "output": "Xử lý lỗi theo thứ tự:\n1. Bấm F5 (tải lại trang) - giải quyết 80% lỗi thường gặp\n2. Xóa cache trình duyệt và thử lại\n3. Nếu vẫn lỗi: Chụp màn hình + ghi rõ mô tả lỗi → gửi vào Zalo nhóm dự án để được hỗ trợ",
    },
    {
        "instruction": "Mã nhân viên GS25 có định dạng như thế nào?",
        "output": "Mã nhân viên GS25 là dãy số gồm đúng 9 chữ số, ví dụ: 260512008, 260716009. Mã này dùng để đăng nhập vào hệ thống và là khóa chính trong cơ sở dữ liệu. Không được dùng mã dưới 9 số hoặc có ký tự chữ.",
    },
    {
        "instruction": "Làm thế nào để khóa tài khoản nhân viên nghỉ việc?",
        "output": "Admin khóa tài khoản nhân viên nghỉ việc:\n• Qua giao diện: Vào trang Nhân viên → tìm NV → bấm nút Khóa tài khoản\n• Qua SQL: UPDATE employees SET is_active = false WHERE id = 'mã_NV';\nSau khi khóa, nhân viên đó không thể đăng nhập nhưng dữ liệu lịch/công vẫn được giữ lại.",
    },
    {
        "instruction": "Cửa hàng VN0485 là gì?",
        "output": "VN0485 là mã định danh của một cửa hàng trong chuỗi GS25. Mỗi cửa hàng có mã dạng 'VN' + số (ví dụ VN0485, VN0497). Mã này dùng để phân tách dữ liệu nhân sự, lịch ca và kệ hàng giữa các cửa hàng trong hệ thống.",
    },
    {
        "instruction": "Real-time sync hoạt động như thế nào trong hệ thống?",
        "output": "Hệ thống sử dụng Supabase Realtime Channels (WebSockets). Khi một SM cập nhật lịch làm việc hoặc bảng kệ hàng, màn hình của tất cả quản lý khác đang mở cùng dữ liệu đó sẽ tự động cập nhật ngay lập tức mà không cần tải lại trang.",
    },
    {
        "instruction": "Xuất lịch làm việc ra PDF được không?",
        "output": "Có. Tại trang Lịch ca, bấm nút 'Xuất PDF' để xuất bảng lịch tuần dạng PDF nằm ngang (landscape), tối ưu để in và dán tại phòng kho cửa hàng. File sẽ tự tải về máy tính với tên 'Lich_Lam_Viec_[tuần].pdf'.",
    },
    {
        "instruction": "Nhân viên hỗ trợ (chi viện) cửa hàng khác được hiển thị thế nào?",
        "output": "Khi SM xếp lịch cho nhân viên đi hỗ trợ (chi viện) cửa hàng khác, ô ca sẽ hiển thị thông tin cửa hàng đích màu cam với chú thích '(Hỗ trợ VN0497)'. SM bên CH nhận cũng thấy nhân viên chi viện đó trong bảng lịch của mình.",
    },
    {
        "instruction": "AI Copilot trong hệ thống hỗ trợ gì?",
        "output": "AI Copilot trong hệ thống GS25 Management hỗ trợ:\n• Trả lời câu hỏi về quy định lao động, luật GS25\n• Tra cứu lịch làm việc của từng nhân viên\n• Thống kê giờ công, cảnh báo PT vượt định mức\n• Tư vấn xếp lịch tối ưu dựa trên doanh số dự kiến\n• Giải thích các quy trình C&B, đổi ca",
    },
    {
        "instruction": "Chính sách SM tự duyệt yêu cầu của mình có được không?",
        "output": "Không. Hệ thống tự động chặn trường hợp người duyệt trùng người gửi yêu cầu. Nếu SM là người gửi yêu cầu C&B, yêu cầu đó phải được Admin duyệt, không tự duyệt được.",
    },
    {
        "instruction": "Khi SM bị khóa mà vẫn đứng tên cửa hàng thì sao?",
        "output": "Khi Admin bấm khóa một SM đang phụ trách ≥1 cửa hàng, hệ thống sẽ hiện popup cảnh báo liệt kê rõ các cửa hàng đó và yêu cầu gán SM mới trước khi khóa. Điều này đảm bảo không có cửa hàng nào bị bỏ trống SM.",
    },
    # Thêm Q&A về tính năng mới
    {
        "instruction": "Lương ước tính Part-time được tính như thế nào trong bảng chấm công?",
        "output": "Trong bảng Chấm công, cột 'Lương (Ước tính)' tính lương PT theo công thức:\n• Giờ ca thường × 25.000đ\n• Giờ ca đêm (22-6) × 25.000đ × 1.3 (hệ số phụ cấp đêm)\nĐây là ước tính, chưa tính các khoản bảo hiểm và phụ cấp đặc biệt khác.",
    },
    {
        "instruction": "Zod validation trong hệ thống hoạt động thế nào?",
        "output": "Hệ thống dùng thư viện Zod để kiểm tra dữ liệu nhập vào tại các form quan trọng:\n• Form thêm nhân viên: Kiểm tra mã NV đúng 9 số, tên không rỗng, cửa hàng hợp lệ\n• Form đổi ca: Kiểm tra đủ thông tin ca nguồn, ca đích, lý do\nKhi nhập sai, thông báo lỗi cụ thể hiện ngay bên dưới field.",
    },
]

# Thêm các biến thể câu hỏi (augmentation)
AUGMENTED = []
for pair in QA_PAIRS:
    AUGMENTED.append(pair)
    # Tạo biến thể đảo câu hỏi
    variants = [
        {"instruction": pair["instruction"].replace("là gì", "là gì vậy"), "output": pair["output"]},
        {"instruction": "Cho tôi biết: " + pair["instruction"].lower(), "output": pair["output"]},
    ]
    AUGMENTED.extend(variants)

random.shuffle(AUGMENTED)

# ============================================================
# GHI FILE JSONL
# ============================================================

output_file = "gs25_qa.jsonl"
with open(output_file, "w", encoding="utf-8") as f:
    for item in AUGMENTED:
        # Format theo chuẩn SFT của MiniMind
        record = {
            "instruction": item["instruction"],
            "input": "",
            "output": item["output"]
        }
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

print(f"✅ Đã tạo {len(AUGMENTED)} cặp Q&A → {output_file}")
print(f"📊 Thống kê: {len(QA_PAIRS)} câu gốc × ~3 biến thể = {len(AUGMENTED)} tổng")
