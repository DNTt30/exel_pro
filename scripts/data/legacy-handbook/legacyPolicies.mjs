export const GS25_LABOR_RULES_KNOWLEDGE = {
  // 1. Khung ca làm việc chuẩn tại hệ thống GS25 (Shift standard)
  shiftStandards: {
    title: 'Khung Ca Làm Việc Tiêu Chuẩn Chuỗi Cửa Hàng Tiện Lợi GS25',
    lawRef: 'Quy định Vận hành Tiện ích 24/7 GS25 Việt Nam',
    details: [
      '🕒 **Ca 8 tiếng (Ca chuẩn)**: Gồm ca Sáng (6:00 - 14:00), Chiều (14:00 - 22:00), Đêm (22:00 - 6:00) và ca Hành chính/Giao nhận (10:00 - 18:00). Phù hợp cho nhân viên Full-time (STFT) và Part-time đăng ký đủ ca.',
      '⏱️ **Ca 4 tiếng (Ca linh hoạt / Part-time)**: Gồm ca 6:00 - 10:00, 10:00 - 14:00, 14:00 - 18:00, 18:00 - 22:00. Tối ưu cho sinh viên xoay ca theo lịch học và bổ sung giờ cao điểm đông khách.',
      '🌙 **Ca đêm 8 tiếng (22:00 - 6:00)**: Phục vụ mô hình mở cửa xuyên suốt 24/7, luôn duy trì tối thiểu 1 nhân sự cứng trực quầy POS, trông coi an ninh và nhận hàng Fresh Food / Dry Food ca đêm.'
    ]
  },

  // 2. Nghỉ giữa ca (Break time)
  breakTime: {
    title: 'Quy định Thời gian Nghỉ giữa ca (Nghỉ ngơi, ăn uống)',
    lawRef: 'Điều 109 Bộ luật Lao động 2019 & Nội quy GS25',
    details: [
      '☕ **Ca ban ngày 8 tiếng (6-14, 14-22, 10-18)**: Được nghỉ giữa giờ ít nhất **30 phút** (thường chia thành 1 lần ăn chính 20-30 phút hoặc 2 lần nghỉ ngắn 15 phút).',
      '🌙 **Ca ban đêm (22-6)**: Được nghỉ giữa giờ ít nhất **45 phút liên tục**.',
      '⏳ **Ca ngắn 4 tiếng**: Được nghỉ giải lao linh động **10 - 15 phút** vào thời điểm lưu lượng khách thấp.',
      '⚡ **Làm thêm giờ (Tăng ca > 2 tiếng)**: Được nghỉ thêm ít nhất **30 phút** trước khi vào ca làm thêm.',
      '🏪 **Tại cửa hàng GS25**: Nhân viên luân phiên nghỉ ăn để luôn duy trì nhân sự trực quầy thu ngân (POS) và khu vực chế biến đồ ăn nhanh (Fresh Food).'
    ]
  },

  // 3. Nghỉ chuyển ca (Daily Rest)
  dailyRest: {
    title: 'Quy định Thời gian Nghỉ chuyển giữa 2 ca liên tiếp',
    lawRef: 'Điều 110 Bộ luật Lao động 2019',
    details: [
      `🛡️ Ứng dụng yêu cầu nghỉ **ít nhất 12 giờ** trước khi chuyển sang ca làm việc ngày khác.`,
      '❌ **Cấm tuyệt đối**: Hết ca chiều lúc 22:00 hôm nay mà 06:00 sáng hôm sau lại xếp ca sáng (chỉ nghỉ được 8 tiếng -> Vi phạm).',
      '🌙 **Sau ca đêm (22-6)**: Kết thúc lúc 06:00 sáng hôm sau, người lao động phải được nghỉ nguyên ngày hôm sau hoặc chỉ được làm ca tối muộn sau 18:00.'
    ]
  },

  // 4. Nghỉ hàng tuần (Weekly Rest)
  weeklyRest: {
    title: 'Quy định Ngày Nghỉ Hàng Tuần (OFF)',
    lawRef: 'Điều 111 Bộ luật Lao động 2019',
    details: [
      '📅 Mỗi tuần, người lao động được nghỉ **ít nhất 24 giờ liên tục** (tương đương 1 ngày OFF trọn vẹn).',
      '⚖️ Full-Time (STFT) làm tối đa **6 ca 8h = 48h/tuần**. AI chỉ chọn ca đã đăng ký và giữ ít nhất 1 ngày không xếp ca; không tự thêm ca để đủ giờ.'
    ]
  },

  // 5. Lương ca đêm & Làm thêm giờ (Overtime & Night Shift Pay)
  salaryRules: {
    title: 'Chế độ Tiền Lương Ca Đêm & Tăng Ca (OT)',
    lawRef: 'Điều 98 Bộ luật Lao động 2019',
    details: [
      '🌙 **Làm việc ban đêm (22:00 - 06:00)**: Được trả thêm ít nhất **30% tiền lương** tính theo đơn giá ca ngày.',
      '⏱️ **Làm thêm giờ (OT) ngày thường**: Trả ít nhất **150%** tiền lương.',
      '📅 **Làm thêm ngày nghỉ tuần (OFF)**: Trả ít nhất **200%** tiền lương.',
      '🎆 **Làm thêm ngày Lễ, Tết**: Trả ít nhất **300%** tiền lương (chưa kể lương ngày lễ).',
      '🔥 **Làm thêm ca đêm**: Trả ít nhất **200% - 210%** tiền lương theo công thức luật định.'
    ]
  },

  // 6. Định mức Part-Time & Full-Time GS25
  headcountRules: {
    title: 'Định Mức Giờ Công Chuỗi Cửa Hàng GS25',
    lawRef: 'Quy chế C&B Nội Bộ GS25',
    details: [
      '💼 **Full-Time (STFT)**: Chuẩn 48h/tuần (6 ca 8h + 1 OFF). AI chỉ chọn từ đăng ký hợp lệ; thiếu người thì báo quản lý, không tự bù ca ngoài đăng ký.',
      '⏳ **Part-Time (STPT)**: Định mức an toàn từ **16h đến 23h/tuần**, giới hạn tối đa không vượt quá **91h/tháng** để tuân thủ hợp đồng thời vụ GS25.',
      '👥 **Nhân viên mới (CSR_NEW)**: Dưới 1 tháng kinh nghiệm bắt buộc phải có 1 Bạn Cứng (STFT/SM/Kinh nghiệm >=1 tháng) kèm cặp trong ca, tuyệt đối không trực solo.'
    ]
  },

  // 7. Quy định Đồng phục & Văn hóa Chào khách GS25
  uniformAndServiceRules: {
    title: 'Tiêu Chuẩn Đồng Phục & Văn Hóa Chào Khách GS25',
    lawRef: 'Sổ tay Văn hóa Dịch vụ Khách hàng GS25',
    details: [
      '👕 **Đồng phục chuẩn**: Luôn mặc áo đồng phục GS25 phẳng phiu, sơ vin gọn gàng, đeo bảng tên bên ngực trái, mang giày đen/tối màu kín mũi.',
      '🧢 **Tạp dề & Mũ**: Bắt buộc đeo tạp dề sạch và đội mũ GS25 đúng quy cách khi đứng quầy Fresh Food và chuẩn bị thức ăn nhanh.',
      '🗣️ **Tiêu chuẩn câu chào khách**: Khi khách bước vào cửa hàng, tất cả nhân viên trong ca tươi cười và chào to rõ ràng: **"GS25 xin chào!"**. Khi khách thanh toán xong và ra về: **"GS25 cảm ơn và hẹn gặp lại quý khách!"**.',
      '📵 **Tác phong làm việc**: Tuyệt đối không bấm điện thoại cá nhân trong giờ làm, giữ gìn quầy thu ngân và khu vực ăn uống luôn sạch sẽ, ngăn nắp.'
    ]
  },

  // 8. Sổ tay Chất lượng & Quy định Giờ hủy hàng GS25
  handbookQualityExpiry: {
    title: 'Đảm Bảo Chất Lượng & Quy Định Giờ Hủy Hàng GS25',
    lawRef: 'Sổ tay Vận hành & ATVSTP GS25',
    details: [
      '🕒 **11:00 & 22:00**: Hủy thức ăn nhanh tươi & có rau (Sandwich có rau, burger, gimbap, soup).',
      '🕒 **19:00**: Hủy nhóm cơm, mì, sushi (Cơm nắm onigiri, bento, sandwich không rau, mì, sushi).',
      '🏷️ **Theo HSD / Tem**: FF Onsite, BTP, dessert trên tủ OSC, bánh tươi Patachou.',
      '📦 **Hàng bách hóa (GM)**: HSD ≤ 7 ngày hủy trước 2h; 7 ngày-1 tháng hủy trước 1 ngày; 1-6 tháng hủy trước 3 ngày; 6 tháng-1 năm hủy trước 5 ngày.',
      '⚠️ **Quy tắc bắt buộc**: Phải xé rách bao bì hoặc làm biến dạng sản phẩm trước khi cho vào túi rác, tránh thất thoát.',
      '🌡️ **Nhiệt độ chuẩn**: Tủ mát 0°C - 5°C; Tủ đông < -18°C; Nồi súp lẩu 70°C; Tủ hấp bánh bao 90°C (hấp ≥ 30 phút, CẤM lò vi sóng!).'
    ]
  },

  // 9. Danh mục Hóa chất SARAYA & ECOLAB GS25
  handbookChemicals: {
    title: 'Danh Mục Hóa Chất Vệ Sinh Cửa Hàng GS25',
    lawRef: 'Quy trình Vệ sinh & An toàn Hóa chất GS25 - Saraya Greentek',
    details: [
      '⚪ **Trắng (H-1 Smart San)**: Nước rửa tay nhân viên, dùng NGUYÊN CHẤT không pha loãng.',
      '🔴 **Đỏ đô (S-4 Alcohol Sanitizer)**: Cồn sát khuẩn tay & dao thớt, dùng NGUYÊN CHẤT (giữ xa lửa!).',
      '🟢 **Xanh lá (N-12 Sara Wash)**: Rửa CCDC (pha 6 lần nhấn 180ml + nước đầy bình); Lau bàn ghế (pha 1 lần nhấn 30ml + nước đầy bình).',
      '🟤 **Nâu (G-2 Smart San Degreaser)**: Tẩy dầu mỡ bếp chiên, tủ hút, dùng NGUYÊN CHẤT (bắt buộc mang găng tay cao su!).',
      '🔴 **Đỏ tươi (211 Pro WC)**: Tẩy bồn cầu & sàn toilet (pha 4 lần nhấn 120ml + nước đầy bình).',
      '🔵🟡 **Xanh + Vàng (311 Multi Floor & Glass)**: Lau kính mặt tiền và sàn gạch (pha 1 lần nhấn 30ml + nước đầy bình).'
    ]
  },

  // 10. SOP Chế biến & Bán hàng Lẩu - Miền Bắc
  handbookHotpotSOP: {
    title: 'SOP Chế Biến & Bán Hàng Lẩu Chả Cá Cay (BM: SOP-FFONSITE-CB-LAU-HN V.06)',
    lawRef: 'SOP Fresh Food Onsite GS25',
    details: [
      '🍲 **Nước súp chả cá cay**: 2000ml nước lọc + 1 gói bột súp (120g). Nấu bếp từ công suất **2000W** trong **15 phút**.',
      '🍢 **Chả cá xoắn xiên**: 10 xiên, nấu công suất **1200W** trong **10 phút** (sau 5 phút lật mặt). Nhiệt độ tâm sau nấu ≥ 75°C.',
      '🍜 **Mì chả cá cay**: Nước sôi ≥ 95°C, trụng mì đúng **2 phút 30 giây**.',
      '🥣 **Múc nước súp**: Ly lẩu = *Số xiên + 1 vá súp*. Tô mì = *4 vá nước súp* (~30g/vá). Luôn THÁO XIÊN trước khi cho vào ly hoặc tô.',
      '🔥 **Nút bấm lò vi sóng công nghiệp**: Ly chả cá **BẤM SỐ 3** (gia dụng 30s). Tô mì **BẤM SỐ 5** (gia dụng 2 phút).',
      '⏱️ **Thời gian trưng bày**: Tối đa 2 tiếng ở công suất 200W. Trữ đông BTP tối đa 15 ngày (-23°C đến -18°C).'
    ]
  },

  // 11. Phân công Vệ sinh 3 Ca & Quy trình Rửa tay 12 bước
  handbookCleaningAndHygiene: {
    title: 'Phân Công Vệ Sinh Ca & Quy Trình Rửa Tay Saraya 60s',
    lawRef: 'Lịch Vệ sinh Định kỳ & Chuẩn Vệ sinh Saraya GS25',
    details: [
      '☀️ **Ca 1 (6h - 14h)**: Vệ sinh quạt hút, thanh nẹp, dọn WH kho bãi, tủ mát kho, quét mạng nhện, lau kệ hàng.',
      '🌤️ **Ca 2 (14h - 22h)**: Vệ sinh chân bàn ghế, rổ mua sắm, tủ đông/mát counter, kệ snack, sọt rác, xô lau.',
      '🌙 **Ca 3 (22h - 6h)**: Chà sàn gạch xám, cọ rửa toilet, hộc counter, và **BẮT BUỘC THAY DẦU BẾP CHIÊN vào đêm Thứ 3**.',
      '🧼 **Rửa tay 12 bước Saraya (60 giây)**: Rửa nước -> 2 nhấn H-1 -> chà lòng tay, mu tay, kẽ ngón, đầu ngón, ngón cái, cổ tay đến khuỷu, chà móng tay -> xả nước (≥60s) -> lau khô -> xịt cồn S-4. 4 vùng hay bị sót: móng tay, ngón cái, kẽ ngón, mu bàn tay.'
    ]
  }
};
