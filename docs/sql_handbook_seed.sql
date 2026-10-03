-- ============================================================
-- SEED: Migrate GS25 Handbook static data → handbook_entries
-- Chạy file này SAU khi đã chạy sql_handbook_entries.sql
-- ============================================================

INSERT INTO handbook_entries (category, title, content, source_doc, created_by) VALUES

-- 1. CHẤT LƯỢNG & GIỜ HỦY HÀNG
('quality', 'Quy định giờ hủy hàng Fast Food (FF)', 
$$⚠️ TÔN CHỈ: Dù sản phẩm còn hạn nhưng chất lượng không đảm bảo thì TUYỆT ĐỐI KHÔNG BÁN.

**Đợt 1: 11:00 và 22:00** — FF Off-site Nhóm rau & thức ăn nhanh:
- Sandwich có rau
- Burger các loại
- Gimbap (cơm cuộn)
- Soup các loại
→ Hủy trước giờ quy định. Xé rách bao bì trước khi bỏ vào túi rác.

**Đợt 2: 19:00** — FF Off-site Nhóm cơm, mì & sushi:
- Cơm nắm (Onigiri)
- Sandwich không rau
- Cơm hộp (Bento)
- Mì hộp các loại
- Sushi

**Theo HSD trên tem BTP/Onsite** — FF Onsite, Dessert & Bakery:
- FF Onsite: Tất cả nguyên liệu và thành phẩm đã đến hạn
- FF Off-site khác: Salad, bánh mì que
- Dessert: Chè, trái cây, đồ tráng miệng trên tủ OSC
- Bakery: Bánh ngắn hạn trên kệ, Tủ bánh tươi Patachou$$,
'Quy định Chất lượng & Giờ Hủy Hàng GS25', 'Admin'),

('quality', 'Quy định giờ hủy hàng Bách Hóa (GM)',
$$**Bảng thời gian hủy GM theo HSD in trên bao bì:**

| HSD sản phẩm | Thời gian phải hủy trước |
|---|---|
| HSD ≤ 7 ngày hoặc có giờ hủy | Hủy trước 2 giờ |
| 7 ngày < HSD < 1 tháng | Hủy trước 1 ngày |
| 1 tháng ≤ HSD < 6 tháng | Hủy trước 3 ngày |
| 6 tháng ≤ HSD < 1 năm | Hủy trước 5 ngày |
| 1 năm ≤ HSD < 3 năm | Hủy trước 7 ngày |
| HSD ≥ 3 năm | Hủy trước 1 tháng |$$,
'Quy định Chất lượng & Giờ Hủy Hàng GS25', 'Admin'),

('quality', 'Quy tắc cốt lõi kiểm date & hủy hàng',
$$1. **FIFO** (First In First Out): Hàng nhập trước / HSD ngắn hơn xếp ra ngoài, hàng nhập sau xếp vào trong.
2. **Kiểm tra toàn bộ**: Khi kiểm hàng hủy, phải kiểm tra toàn bộ sản phẩm cùng loại trên kệ/tủ — TUYỆT ĐỐI không kiểm ngẫu nhiên.
3. **Hủy rách bao bì**: Bắt buộc xé rách hoặc làm biến dạng bao bì trước khi cho vào túi rác để tránh thất thoát.
4. **Cách ly ngay**: Sản phẩm cận date phải đưa ra khỏi quầy kệ ngay, không để khách với tới.
5. **Chụp ảnh báo cáo**: Gửi ảnh hủy hàng vào group Gapo theo khung giờ từng ca (chụp rõ số lượng và HSD).$$,
'Quy định Chất lượng & Giờ Hủy Hàng GS25', 'Admin'),

('quality', 'Tiêu chuẩn nhiệt độ bảo quản tại cửa hàng',
$$- **Tủ mát / Kho mát**: 0°C - 5°C — Bảo quản thực phẩm tươi, sữa, nước, sandwich
- **Tủ đông / Kho đông**: < -18°C — Bảo quản kem, đá viên, chả cá, nguyên liệu đông lạnh
- **Nồi súp lẩu**: 70°C (Sôi 110°C) — Duy trì giữ nóng chảo lẩu, công suất 200W khi trưng bày
- **Tủ hấp bánh bao**: 90°C — Hấp ít nhất 30 phút trước khi bán. HSD 12 tiếng. CẤM hâm lò vi sóng!
- **Tủ giữ nóng Warmer**: Mặc định hãng — Không tự ý điều chỉnh nhiệt độ$$,
'Quy định Chất lượng & Giờ Hủy Hàng GS25', 'Admin'),

-- 2. LỊCH VỆ SINH
('ops', 'Lịch phân công vệ sinh Ca 1 (Sáng 6h-14h)',
$$**Ca 1 (Sáng: 6h - 14h)** — Lịch theo thứ:
- **T2**: Vệ sinh ngóc ngách thanh nẹp trong CH; Vệ sinh quạt hút; Vệ sinh 1/2 kệ Counter
- **T3**: Dọn WH nếu còn tồn; Vệ sinh tủ mát kho bãi; Lau kệ Khuyến Mãi, kệ YouUs, kệ Bánh Mì
- **T4**: Lau tầng cuối tủ mát OSC; Lau 2 kệ rượu cạnh tủ OSC; Lau kệ khăn giấy, mỹ phẩm nữ; Vệ sinh gầm kho bãi
- **T5**: Dọn WH nếu còn hàng; Lau kệ bánh ngọt + kệ café; Quét toàn bộ mạng nhện trong CH
- **T6**: Lau kệ mì tô + kệ rượu; Vệ sinh mâm tủ OSC
- **T7**: Dọn WH nếu còn hàng; Lau kệ Bento + hạt khô + snack; Đập đá tủ đông, tủ đá viên
- **CN**: Lau tầng cuối tủ OSC; Lau 2 kệ rượu cạnh tủ OSC; Vệ sinh bình chữa cháy; Dọn dẹp tổng thể khu vực máy POS

**Hằng ngày**: Check tổng quan máy POS, Counter, bụi thiết bị; Lau bề mặt tủ kem - tủ đá; Lau sạch tất cả mặt kính$$,
'Lịch Phân công Vệ sinh Ca & Thứ GS25', 'Admin'),

('ops', 'Lịch phân công vệ sinh Ca 2 (Chiều 14h-22h)',
$$**Ca 2 (Chiều: 14h - 22h)** — Lịch theo thứ:
- **T2**: Vệ sinh chân bàn + chân ghế khu ăn uống; Vệ sinh rổ mua sắm; Vệ sinh 1/2 kệ Counter
- **T3**: Lau kệ hóa mỹ phẩm nam, kệ văn phòng phẩm; Đập đá tủ đông; Vệ sinh tủ đông + tủ mát Counter
- **T4**: Vệ sinh chân bàn ghế, khu vực bình chữa cháy; Lau kệ kẹo + socola
- **T5**: Lau kệ gia vị + kệ mì ly; Lau tất cả mặt gương trong CH; Vệ sinh hộc counter và tủ dụng cụ Back counter
- **T6**: Lau 2 kệ snack; Vệ sinh gầm thiết bị trong quầy Counter
- **T7**: Vệ sinh tủ nước giải khát; Lau tất cả gầm của tất cả kệ trong CH
- **CN**: Dọn kho hàng; Lau kệ áo mưa + kệ treo, viền - vách chân tường; Vệ sinh tất cả sọt rác, xô lau nhà$$,
'Lịch Phân công Vệ sinh Ca & Thứ GS25', 'Admin'),

('ops', 'Lịch phân công vệ sinh Ca 3 (Đêm 22h-6h)',
$$**Ca 3 (Đêm: 22h - 6h)** — Lịch theo thứ:
- **T2**: Lau 1/2 kệ Counter; Vệ sinh gầm quầy Counter; Vệ sinh chân bàn + chân ghế
- **T3**: Vệ sinh gầm quầy Counter; **THAY DẦU BẾP CHIÊN (Bắt buộc)**; Chà vệ sinh bồn cầu toilet
- **T4**: Lau kệ kẹo + socola; Vệ sinh gầm Counter
- **T5**: Vệ sinh hộc Counter và tủ dụng cụ Back Counter; Chà nền gạch xám toàn bộ CH; Vệ sinh gầm tủ đông, tủ đá, phía sau quầy chế biến
- **T6**: Lau kệ snack; Chà vệ sinh toilet
- **T7**: Vệ sinh gầm Counter; Làm vệ sinh chuyên sâu theo yêu cầu SM
- **CN**: Dọn bệ mỡ bếp chiên/counter; Chà vệ sinh toilet; Vệ sinh chân bàn ghế$$,
'Lịch Phân công Vệ sinh Ca & Thứ GS25', 'Admin'),

-- 3. HÓA CHẤT VỆ SINH
('ops', 'Danh mục hóa chất vệ sinh SARAYA (Hệ mã màu GS25)',
$$**Hệ mã màu GS25 - SARAYA Greentek (Chuẩn 27/08/2025):**

🔘 **Màu Trắng** — H-1 Smart San Hand Soap: Rửa tay nhân viên. Dùng nguyên chất.
🔴 **Màu Đỏ Đô** — S-4 Alcohol Sanitizer: Sát khuẩn tay, dụng cụ, dao thớt. Dùng nguyên chất. ⚠️ GIỮ XA LỬA!
🟢 **Màu Xanh Lá** — N-12 Sara Wash: Rửa CCDC và lau bàn ghế. Pha loãng: CCDC nhấn 6 lần (180ml) + nước đầy bình; Bàn ghế nhấn 1 lần (30ml) + nước đầy bình.
🟫 **Màu Nâu** — G-2 Degreaser: Tẩy dầu mỡ bếp chiên, tủ hút. Dùng nguyên chất. ⚠️ BẮT BUỘC mang găng tay cao su!
🔴 **Màu Đỏ** — 211 Pro WC: Tẩy rửa bồn cầu, sàn toilet. Nhấn 4 lần (120ml) + nước đầy bình. ⚠️ Mang găng tay!
🔵🟡 **Màu Xanh Dương + Vàng** — 311 Multi Floor & Glass: Lau kính mặt tiền, sàn gạch. Nhấn 1 lần (30ml) + nước đầy bình.$$,
'Danh mục Hóa chất Vệ sinh GS25 - SARAYA', 'Admin'),

-- 4. VỆ SINH COUNTER
('ops', 'Quy trình vệ sinh dụng cụ & thiết bị Counter',
$$**Thớt** (Khi cần & cuối ca): Loại bỏ thức ăn thừa → Chà bằng N-12 → Xả sạch nước → Lau khô → Phun cồn S-4.

**Dao** (Khi cần & cuối ca): Rửa bằng N-12 → Xả sạch dưới vòi chảy → Lau khô → Phun cồn S-4 → Cắm vào khay quy định.

**Khăn lau** (Cuối ca): Vò tay bằng N-12 → Giặt lại nước sạch. LƯU Ý: Giặt riêng khăn trắng (lau CCDC thực phẩm) và khăn màu (lau bàn ghế, sàn).

**Bồn rửa** (Cuối ca): Đổ rác từ phễu → Chà trong ngoài bằng N-12 → Chà phễu thu rác và tay vặn → Xả sạch → Lau khô → Phun cồn lên tay vặn van nước.

**Bàn chế biến & Kệ** (Khi cần & cuối ca): Dời dụng cụ ra → Chà bằng N-12 → Lau lại 2 lần khăn ướt → Phun cồn S-4.

**Tủ lạnh & Tủ đông** (Cuối ngày): Dời thực phẩm sang tủ tạm → Chà trong ngoài và gioăng cửa bằng N-12 → Lau lại 2 lần → Lau khô → Phun cồn S-4.

**Bếp chiên** (Ca 3 — Cuối ca): Tắt điện/khóa gas, để dầu nguội → Tháo dầu ra → Xịt G-2 toàn bộ trong ngoài → Tháo chi tiết rời vào bồn cọ → Lau sạch hoàn toàn hóa chất.$$,
'Hướng dẫn Vệ sinh CCDC & Thiết bị Counter GS25', 'Admin'),

-- 5. SOP LẨU
('recipe', 'SOP chế biến Nước súp chả cá cay',
$$**Mã tài liệu**: BM: SOP-FFONSITE-CB-LAU-HN V.06

**Nguyên liệu**: 2000ml nước lọc chưa đun sôi + 1 gói bột súp chả cá cay (120g)
**Thiết bị**: Bếp điện từ + Chảo nấu chả cá cay (2000W)
**Thời gian**: 15 phút

**Quy trình**: Đong 2000ml nước → cho gói bột súp vào → khuấy đều 1 lần trong lúc đun → đun sôi đúng 15 phút.

**Bảo quản**: Trưng bày chảo tối đa 2 TIẾNG, duy trì công suất 200W.$$,
'SOP-FFONSITE-CB-LAU-HN V.06', 'Admin'),

('recipe', 'SOP chế biến Chả cá xoắn xiên & Mì chả cá',
$$**Chả cá xoắn xiên:**
- Nguyên liệu: 10 xiên (1/2 gói) hoặc 1 gói chả cá xoắn
- Thả xiên ngập sâu trong nước súp đang sôi (1200W)
- Nấu tổng 10 phút, sau 5 phút lật mặt chả cá 1 lần
- Nhiệt độ tâm sau chế biến ≥ 75°C

**Mì chả cá cay (Mì trụng):**
- Nguyên liệu: 1 vắt mì Koreno Jumbo vị kim chi 1kg
- Trụng trong nước sôi ≥ 95°C đúng 2 phút 30 giây
- Sợi mì chín dai nhẹ, không bở hoặc nát$$,
'SOP-FFONSITE-CB-LAU-HN V.06', 'Admin'),

('recipe', 'SOP bán hàng Chả cá cay & Mì chả cá',
$$**Chả cá cay (Bán theo xiên):**
- Dụng cụ: 1 Ly lẩu giấy GS25 + 1 đôi đũa
- Số vá súp = số lượng xiên + 1 vá (~30g/vá). THÁO XIÊN trước khi cho vào ly.
- Lò vi sóng gia dụng: 30 giây | **Lò vi sóng công nghiệp: BẤM SỐ 3**
- Dùng ngon nhất trong 30 phút sau khi mua.

**Mì chả cá cay (Tô):**
- Dụng cụ: 1 Tô giấy size L + 1 đôi đũa
- 1 phần mì đã trụng + 1 xiên chả cá + 4 VÁ NƯỚC SÚP. THÁO XIÊN trước khi cho vào tô.
- Lò vi sóng gia dụng: 2 phút | **Lò vi sóng công nghiệp: BẤM SỐ 5**
- Dùng ngon nhất trong 10 phút sau chế biến.$$,
'SOP-FFONSITE-CB-LAU-HN V.06', 'Admin'),

-- 6. VỆ SINH TAY
('ops', 'Quy trình vệ sinh tay 12 bước (SARAYA 60 giây)',
$$**Thiết bị**: Bồn rửa + Hộp xà phòng H-1 + Hộp cồn S-4 + Hộp khăn giấy + Thùng rác đạp chân.

**12 bước (tổng ≥ 60 giây)**:
1. Rửa tay bằng nước sạch dưới vòi nước
2. Lấy xà phòng H-1 (nhấn 2 lần)
3. Chà hai lòng bàn tay vào nhau (5 lần) — Bắt đầu đếm 60 giây
4. Cọ xát hai lòng bàn tay với ngón tay đan vào nhau (5 lần)
5. Cọ lòng bàn tay lên mu bàn tay kia với ngón tay đan vào nhau (5 lần)
6. Cọ các đầu ngón tay vào lòng bàn tay kia (5 lần)
7. Vặn và chà quanh ngón tay cái (5 lần)
8. Vặn cổ tay và cọ rửa lên đến khuỷu tay (5 lần)
9. Chà móng tay bằng bàn chải móng chuyên dụng (5 lần)
10. Rửa sạch tay dưới vòi nước chảy
11. Lau khô tay hoàn toàn bằng khăn giấy sạch
12. Phun cồn S-4 lên đầu ngón tay và lòng bàn tay, xoa đều cho cồn tự bay hơi

**Thời điểm bắt buộc rửa tay**: Khi vào ca, sau khi đi vệ sinh, sau khi ăn uống/nghỉ giải lao, sau khi đổ rác/đếm tiền/vệ sinh thiết bị, khi chạm bề mặt bẩn, khi chuyển từ sơ chế sang thực phẩm ăn ngay, khi di chuyển từ khu bẩn sang khu sạch.$$,
'Hướng dẫn Vệ sinh tay Nhân viên - SARAYA 60 giây', 'Admin'),

-- 7. BÁO CÁO MỖI CA
('ops', 'Báo cáo mỗi ca — Ca 1 (Sáng 6h-14h)',
$$**Gửi báo cáo qua Group Gapo Cửa Hàng — App TIMES (có watermark giờ & địa điểm)**

**Danh mục ảnh FF cần chụp**: Nguyên tủ OSC (1-2 tấm), Kệ bakery, Tủ bánh bao, Tủ warmer, Kệ khuyến mãi, Máy Nestea (mở nắp ra chụp).

- **Khi vô ca**: Hình check in tác phong đồng phục (chuẩn, sơ vin, thẻ tên ngực trái)
- **6h-7h**: Hình FF (chỉnh tem giá, check trưng bày, POSM trước khi chụp)
- **6h-7h ⚠️**: CHECK & XÁC NHẬN KHÔNG CÓ HÀNG HẾT DATE trên tủ OSC, kệ bánh mì & NVL trong Counter
- **7h-8h**: Kiểm tra vệ sinh mặt tiền, lau kính, cạo đá sơ tủ đông kem + lau tầng cuối tủ OSC
- **Trong ca**: Fill hàng + Vệ sinh theo lịch SM giao
- **11:00 ⚠️**: GỬI HÌNH HỦY HÀNG (chụp thấy rõ số lượng và HSD). Xé rách bao bì trước khi vứt rác.
- **13:30**: Dọn bên trong quầy Counter + Chụp hình gửi báo cáo
- **14:00 ⚠️**: Báo cáo kết ca + Hình tổng quan WC, bàn ăn, thùng rác. Xác nhận: ĐÃ DỌN DẸP, THAY RÁC, VỆ SINH.$$,
'Các Mục Báo Cáo Mỗi Ca Trong Ngày - NV GS25', 'Admin'),

('ops', 'Báo cáo mỗi ca — Ca 2 (Chiều 14h-22h)',
$$**Gửi báo cáo qua Group Gapo Cửa Hàng — App TIMES**

- **Khi vô ca**: Hình check in tác phong đồng phục
- **14h-14h30 ⚠️**: Hình FF (6 mục: Nguyên tủ OSC, Kệ bakery, Tủ bánh bao, Tủ warmer, Kệ KM, Máy Nestea)
- **14h-15h ⚠️**: CHECK & XÁC NHẬN KHÔNG CÓ HÀNG HẾT DATE trên tủ OSC, kệ bánh mì & NVL Counter
- **15h-17h**: CHECK tem giá quầy kệ + Hình tất cả quầy kệ, tủ trong cửa hàng
- **17:00 ⚠️**: BÁO CÁO FF 17H + CHỤP BÁO CÁO ĐÈN BẢNG HIỆU (bật đèn mặt tiền đón khách tối)
- **19:00 ⚠️**: Xác nhận rút date + GỬI HÌNH HỦY HÀNG (thấy rõ số lượng & HSD). Đợt hủy chiều: Onigiri, bento, mì, sushi. Xé bao bì.
- **19h-21h**: Fill hàng + Vệ sinh theo lịch SM + Kiểm tra khu ăn uống, thay bao rác 2 tiếng/lần
- **22:00 ⚠️**: Báo cáo kết ca + Hình tổng quan WC, bàn ăn, thùng rác. Xác nhận: ĐÃ DỌN DẸP, THAY RÁC, VỆ SINH.$$,
'Các Mục Báo Cáo Mỗi Ca Trong Ngày - NV GS25', 'Admin'),

('ops', 'Báo cáo mỗi ca — Ca 3 (Đêm 22h-6h)',
$$**Gửi báo cáo qua Group Gapo Cửa Hàng — App TIMES**

- **Khi vô ca**: Hình check in tác phong đồng phục
- **22h-23h ⚠️**: CHECK & XÁC NHẬN KHÔNG CÓ HÀNG HẾT DATE + Gửi hình hủy hàng (rõ số lượng & HSD). Đợt hủy 22h.
- **24:00 ⚠️**: BÁO CÁO KẾT NGÀY — Tổng kết doanh thu và tình hình cửa hàng cuối ngày
- **24h-1h sáng**: Hình vệ sinh toàn bộ thiết bị (lò vi sóng, bếp chiên, máy móc)
- **4h-5h sáng**: Hình tất cả quầy kệ, tủ trong cửa hàng (hàng fill đầy đặn, mặt tiền kệ thẳng tắp)
- **5h-6h sáng ⚠️**: HÌNH FF CHẾ BIẾN (6 mục: Nguyên tủ OSC, Kệ bakery, Tủ bánh bao, Tủ warmer, Kệ KM, Máy Nestea)
- **6h sáng ⚠️**: Hình in tem HSD, số lượng FF chế biến. Dán tem BTP chuẩn xác vào khay thành phẩm.
- **6h sáng (Giao ca) ⚠️**: BÁO CÁO KẾT CA + Hình tổng quan WC, bàn ăn, thùng rác. Xác nhận: ĐÃ DỌN DẸP, THAY RÁC, VỆ SINH.$$,
'Các Mục Báo Cáo Mỗi Ca Trong Ngày - NV GS25', 'Admin');
