// ==============================================================================
// DỮ LIỆU SỔ TAY NGHIỆP VỤ & VẬN HÀNH GS25 (GS25 HANDBOOK KNOWLEDGE BASE)
// Trích xuất & chuẩn hóa trực tiếp từ 8 tài liệu quy trình thực tế tại cửa hàng
// ==============================================================================

export const GS25_HANDBOOK_DATA = {
  // 1. QUY ĐỊNH CHẤT LƯỢNG & GIỜ HỦY HÀNG
  qualityAndExpiry: {
    title: "Đảm bảo chất lượng sản phẩm & Quy định giờ hủy hàng",
    slogan: "Dù sản phẩm còn hạn nhưng chất lượng không đảm bảo thì TUYỆT ĐỐI KHÔNG BÁN",
    ffSchedules: [
      {
        hours: ["11:00", "22:00"],
        period: "11h trưa & 22h tối",
        category: "FF Off-site - Nhóm rau & thức ăn nhanh tươi",
        items: [
          "Sandwich có rau",
          "Burger các loại",
          "Gimbap (cơm cuộn)",
          "Soup các loại"
        ],
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        note: "Hủy trước giờ quy định và xé bao bì trước khi cho vào túi rác"
      },
      {
        hours: ["19:00"],
        period: "19h tối",
        category: "FF Off-site - Nhóm cơm, mì & sushi",
        items: [
          "Cơm nắm (Onigiri)",
          "Sandwich không rau",
          "Cơm hộp (Bento)",
          "Mì hộp các loại",
          "Sushi"
        ],
        badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
        note: "Đợt hủy cao điểm trong ca chiều"
      },
      {
        hours: ["HSD"],
        period: "Theo hạn trên tem BTP / Onsite",
        category: "FF Onsite, Dessert & Bakery",
        items: [
          "FF Onsite: Tất cả nguyên liệu và thành phẩm đã đến hạn",
          "FF Off-site khác: Salad, bánh mì que",
          "Dessert: Chè, trái cây, đồ tráng miệng trên tủ OSC",
          "Bakery: Bánh ngắn hạn trên kệ, Tủ bánh tươi Patachou"
        ],
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
        note: "Kiểm tra tem nhãn nguyên liệu và thành phẩm tại quầy chế biến mỗi ca"
      }
    ],

    gmSchedules: [
      { lifeRange: "Hàng có giờ hủy hoặc HSD ≤ 7 ngày", discardBefore: "Hủy trước 2 giờ" },
      { lifeRange: "7 ngày < HSD < 1 tháng", discardBefore: "Hủy trước 1 ngày" },
      { lifeRange: "1 tháng ≤ HSD < 6 tháng", discardBefore: "Hủy trước 3 ngày" },
      { lifeRange: "6 tháng ≤ HSD < 1 năm", discardBefore: "Hủy trước 5 ngày" },
      { lifeRange: "1 năm ≤ HSD < 3 năm", discardBefore: "Hủy trước 7 ngày" },
      { lifeRange: "HSD ≥ 3 năm", discardBefore: "Hủy trước 1 tháng" }
    ],

    temperatures: [
      { name: "Tủ mát / Kho mát", standard: "0°C - 5°C", icon: "ThermometerSnowflake", note: "Bảo quản thực phẩm tươi, sữa, nước, sandwich" },
      { name: "Tủ đông / Kho đông", standard: "< -18°C", icon: "Snowflake", note: "Bảo quản kem, đá viên, chả cá, nguyên liệu đông lạnh" },
      { name: "Nồi súp lẩu", standard: "70°C (Sôi 110°C)", icon: "Soup", note: "Duy trì giữ nóng chảo lẩu, công suất 200W khi trưng bày" },
      { name: "Tủ hấp bánh bao", standard: "90°C", icon: "Flame", note: "Hấp ít nhất 30 phút trước khi bán. HSD 12 tiếng. CẤM hâm lò vi sóng!" },
      { name: "Tủ giữ nóng Warmer", standard: "Mặc định hãng", icon: "ShieldAlert", note: "Không tự ý điều chỉnh nhiệt độ tủ warmer" }
    ],

    coreRules: [
      { title: "Quy tắc FIFO (First In First Out)", desc: "Hàng nhập trước / HSD ngắn hơn xếp ra ngoài, hàng nhập sau xếp vào trong." },
      { title: "Kiểm tra toàn bộ khi check date", desc: "Khi kiểm tra hàng hủy, phải kiểm toàn bộ sản phẩm cùng loại trên kệ/tủ, tuyệt đối không kiểm ngẫu nhiên." },
      { title: "Hủy rách bao bì trước khi vứt", desc: "Khi hủy hàng, bắt buộc phải xé rách hoặc làm biến dạng bao bì trước khi cho vào túi rác, tránh thất thoát hoặc sử dụng lại." },
      { title: "Không để hàng hết hạn ở nơi khách với tới", desc: "Sản phẩm cận date hủy phải cách ly ngay khỏi quầy kệ khách hàng." },
      { title: "Tủ hấp bánh bao nghiêm ngặt", desc: "Bánh bao rã đông tủ mát ít nhất 5 tiếng trước khi hấp. Xôi: Cắt bao nilon, quay vi sóng 1 phút. Bắt buộc kiểm tra thời gian hấp trước khi bán." }
    ]
  },

  // 2. LỊCH PHÂN CÔNG VỆ SINH THEO CA & THEO THỨ
  cleaningRoster: {
    title: "Lịch phân công vệ sinh theo Ca & Thứ trong tuần",
    note: "Áp dụng định kỳ hằng ngày tại cửa hàng GS25. Nhân viên vào ca kiểm tra các đầu việc cần làm.",
    shifts: {
      ca1: {
        name: "Ca 1 (Sáng: 6h - 14h)",
        days: {
          T2: [
            "Vệ sinh các ngóc ngách thanh nẹp trong CH",
            "Vệ sinh các quạt hút trong CH",
            "Vệ sinh 1/2 kệ Counter"
          ],
          T3: [
            "Dọn WH (Warehouse / Kho) nếu còn tồn",
            "Vệ sinh tủ mát kho bãi",
            "Lau kệ Khuyến Mãi (KM), kệ YouUs, kệ Bánh Mì"
          ],
          T4: [
            "Lau tầng cuối tủ mát OSC",
            "Lau 2 kệ rượu cạnh tủ OSC",
            "Lau kệ khăn giấy, mỹ phẩm nữ",
            "Vệ sinh gầm kho bãi"
          ],
          T5: [
            "Dọn WH nếu còn hàng",
            "Lau kệ bánh ngọt + kệ café",
            "Quét toàn bộ mạng nhện trong toàn bộ cửa hàng"
          ],
          T6: [
            "Lau kệ mì tô + kệ rượu",
            "Vệ sinh mâm tủ OSC"
          ],
          T7: [
            "Dọn WH nếu còn hàng",
            "Lau kệ Bento + hạt khô + snack",
            "Đập đá tủ đông, tủ đá viên"
          ],
          CN: [
            "Lau tầng cuối tủ OSC",
            "Lau 2 kệ rượu cạnh tủ OSC",
            "Vệ sinh bình chữa cháy (PCCC)",
            "Dọn dẹp tổng thể khu vực máy POS"
          ]
        }
      },

      ca2: {
        name: "Ca 2 (Chiều: 14h - 22h)",
        days: {
          T2: [
            "Vệ sinh chân bàn + chân ghế khu vực ăn uống",
            "Vệ sinh rổ mua sắm cho khách",
            "Vệ sinh 1/2 kệ Counter (nếu WH về trễ)"
          ],
          T3: [
            "Lau kệ hóa mỹ phẩm nam, kệ văn phòng phẩm (VVP)",
            "Đập đá tủ đông",
            "Vệ sinh tủ đông + tủ mát Counter"
          ],
          T4: [
            "Vệ sinh chân bàn ghế, khu vực bình chữa cháy",
            "Lau kệ kẹo + socola (nếu WH về trễ)"
          ],
          T5: [
            "Lau kệ gia vị + kệ mì ly",
            "Lau tất cả mặt gương trong CH",
            "Vệ sinh hộc counter và các tủ dụng cụ Back counter"
          ],
          T6: [
            "Lau 2 kệ snack (nếu WH về trễ)",
            "Vệ sinh gầm thiết bị trong quầy Counter"
          ],
          T7: [
            "Vệ sinh tủ nước giải khát",
            "Lau tất cả gầm của tất cả các kệ trong CH"
          ],
          CN: [
            "Dọn kho hàng (KH)",
            "Lau kệ áo mưa + kệ treo, viền - vách chân tường",
            "Vệ sinh tất cả sọt rác, xô lau nhà"
          ]
        }
      },

      ca3: {
        name: "Ca 3 (Đêm: 22h - 6h)",
        days: {
          T2: [
            "Lau 1/2 kệ Counter (nếu WH về sớm)",
            "Vệ sinh gầm quầy Counter",
            "Vệ sinh chân bàn + chân ghế"
          ],
          T3: [
            "Vệ sinh gầm quầy Counter",
            "THAY DẦU BẾP CHIÊN (Bắt buộc)",
            "Chà vệ sinh bồn cầu toilet"
          ],
          T4: [
            "Lau kệ kẹo + socola (nếu WH về trễ)",
            "Vệ sinh gầm Counter"
          ],
          T5: [
            "Vệ sinh hộc Counter và tủ dụng cụ Back Counter",
            "Chà nền gạch xám toàn bộ cửa hàng",
            "Vệ sinh gầm tủ đông, tủ đá, phía sau quầy chế biến"
          ],
          T6: [
            "Lau kệ snack (nếu WH về trễ)",
            "Chà vệ sinh toilet"
          ],
          T7: [
            "Vệ sinh gầm Counter",
            "Làm vệ sinh chuyên sâu theo yêu cầu của Store Manager (SM)"
          ],
          CN: [
            "Dọn bệ mỡ bếp chiên/counter",
            "Chà vệ sinh toilet",
            "Vệ sinh chân bàn ghế"
          ]
        }
      }
    },

    dailyNotice: [
      "Mỗi ngày check tổng quan máy POS, Counter, vệ sinh bụi các đầu thiết bị",
      "Lau bề mặt tủ kem - tủ đá, lau các viền tủ (Báo cáo trước ca LOH sáng)",
      "Lau sạch tất cả các mặt kính trong cửa hàng"
    ]
  },

  // 3. DANH MỤC HÓA CHẤT VỆ SINH (SARAYA & ECOLAB)
  chemicals: {
    title: "Danh mục Hóa chất Vệ sinh GS25",
    systems: [
      {
        provider: "SARAYA Greentek",
        version: "Chuẩn GS25 - 27/08/2025",
        items: [
          {
            category: "Rửa tay",
            colorName: "Màu Trắng",
            colorClass: "bg-white text-slate-800 border-slate-300 ring-1 ring-slate-200",
            dotColor: "bg-slate-300",
            bottle: "Bình 5kg Smart San Hand Soap H-1",
            tool: "Hộp nhấn GMD-500FG",
            dilution: "Sử dụng NGUYÊN CHẤT, không pha loãng",
            target: "Rửa tay nhân viên trước và trong ca",
            warning: "Không nuốt, rửa mắt nếu dính phải"
          },
          {
            category: "Sanitizer Cồn sát khuẩn",
            colorName: "Màu Đỏ Đô",
            colorClass: "bg-rose-900 text-white border-rose-950",
            dotColor: "bg-rose-800",
            bottle: "Bình 5kg Smart San Alcohol Sanitizer S-4",
            tool: "Hộp nhấn GMD-500A hoặc Bình xịt phun sương 500ml",
            dilution: "Sử dụng NGUYÊN CHẤT, không pha loãng",
            target: "Sát khuẩn tay nhân viên, sát khuẩn CCDC, dao thớt",
            warning: "🔥 GIỮ XA VỚI LỬA & NGUỒN NHIỆT"
          },
          {
            category: "Rửa dụng cụ thường",
            colorName: "Màu Xanh Lá",
            colorClass: "bg-emerald-600 text-white border-emerald-700",
            dotColor: "bg-emerald-500",
            bottle: "Bình 5kg Sara Wash N-12",
            tool: "Bình xịt chuyên dụng / Chậu rửa",
            dilution: "• Rửa CCDC: Nhấn 6 lần (180ml) + thêm nước đầy bình.\n• Lau bàn ghế: Nhấn 1 lần (30ml) + thêm nước đầy bình.",
            target: "Rửa công cụ dụng cụ, lau bàn ghế ăn uống của khách",
            warning: "Pha đúng tỷ lệ, không lạm dụng dung dịch đậm đặc"
          },
          {
            category: "Rửa dụng cụ vết bẩn khó tẩy rửa",
            colorName: "Màu Nâu",
            colorClass: "bg-amber-900 text-amber-100 border-amber-950",
            dotColor: "bg-amber-800",
            bottle: "Bình 5kg Smart San Degreaser G-2",
            tool: "Bình xịt / Miếng bọt biển cọ rửa",
            dilution: "Sử dụng NGUYÊN CHẤT, không pha loãng",
            target: "Tẩy dầu mỡ cháy khét ở nồi chiên, tủ hút, bếp nướng",
            warning: "⚠️ BẮT BUỘC mang găng tay cao su & tránh tiếp xúc vào mắt"
          },
          {
            category: "WC (Nhà vệ sinh)",
            colorName: "Màu Đỏ",
            colorClass: "bg-red-600 text-white border-red-700",
            dotColor: "bg-red-500",
            bottle: "Bình 5kg 211 Pro WC",
            tool: "Bình xịt + Cây chà bồn cầu",
            dilution: "Nhấn 4 lần (120ml), sau đó pha thêm nước đầy bình",
            target: "Tẩy rửa bồn cầu, sàn toilet",
            warning: "⚠️ BẮT BUỘC mang găng tay và tránh tiếp xúc vào mắt"
          },
          {
            category: "Kính và Sàn",
            colorName: "Màu Xanh Dương + Vàng",
            colorClass: "bg-gradient-to-r from-blue-600 to-amber-500 text-white border-blue-700",
            dotColor: "bg-blue-600",
            bottle: "Bình 5kg 311 Multi Floor & Glass",
            tool: "Bình xịt tạo bọt + Cây lau kính/sàn",
            dilution: "Nhấn 1 lần (30ml), sau đó pha thêm nước đầy bình",
            target: "Lau kính mặt tiền, lau và tẩy điểm sàn gạch",
            warning: "⚠️ Mang găng tay khi tiếp xúc lâu dài"
          }
        ]
      },
      {
        provider: "ECOLAB (KAY QSR)",
        version: "Dòng sản phẩm Kay Chemical Company",
        items: [
          { category: "Vệ sinh bồn rửa & CCDC", bottle: "KAY QSR Heavy Duty Multi-Purpose Sink Detergent", dilution: "Đổ nước vào bình chứa đến vạch, đổ nước tẩy rửa đa năng", target: "Ngâm và cọ rửa bồn rửa chén, dụng cụ counter" },
          { category: "Tẩy trùng / Diệt khuẩn", bottle: "Cồn 70 độ", dilution: "Nguyên chất", target: "Xịt trực tiếp vào dụng cụ hoặc rót vào bình xịt khử trùng tay" },
          { category: "Sàn nhà", bottle: "KAY QSR Heavy Duty Multi-Purpose Sink Detergent", dilution: "Pha mỗi lần bơm cho 15L nước (nước nóng 43-49°C)", target: "Thấm vào xô lau sàn và chà sàn nhà bếp/sảnh" },
          { category: "Kính / Gương / Đa bề mặt", bottle: "KAY QSR Glass & Multi-Surface Cleaner", dilution: "Cho 700ml nước + 1 gói chùi kính", target: "Xịt lên bề mặt kính và lau bằng khăn giấy khô" },
          { category: "Rửa tay", bottle: "KAY QSR Lotion Hand Soap", dilution: "Nguyên chất vào dispenser", target: "Xoa xà bông 20s dưới vòi nước ấm" },
          { category: "Nồi chiên không dầu / Bếp chiên", bottle: "KAY QSR Super Contact Cleaner", dilution: "Gắn vòi xịt dùng trực tiếp", target: "Xịt lên khay, thành, lòng nồi chiên, ủ 5 phút rồi cọ sạch" },
          { category: "Nhà vệ sinh", bottle: "QSR Restroom Cleaner", dilution: "Gắn vòi xịt và lắc đều", target: "Bồn cầu, bồn tiểu, bồn rửa sứ" }
        ]
      }
    ]
  },

  // 4. HƯỚNG DẪN VỆ SINH DỤNG CỤ & THIẾT BỊ COUNTER (QUẦY SƠ CHẾ)
  counterCleaning: {
    title: "Hướng dẫn Vệ sinh Dụng cụ & Thiết bị Chế biến (Counter)",
    items: [
      {
        name: "Thớt",
        timing: "Khi cần & Khi kết thúc ca làm",
        steps: [
          "1. Loại bỏ thức ăn thừa bằng khăn sạch hoặc miếng cạo",
          "2. Chà thớt bằng bàn chải và dung dịch N-12 (pha loãng 3 lần)",
          "3. Xả lại thật sạch bằng nước",
          "4. Lau khô bằng khăn lau sạch",
          "5. Phun cồn sát khuẩn S-4 trước khi sử dụng hoặc cất vào nơi quy định"
        ]
      },
      {
        name: "Dao",
        timing: "Khi cần & Cuối ca",
        steps: [
          "1. Rửa dao bằng miếng bọt biển và dung dịch N-12",
          "2. Rửa lại thật sạch dưới vòi nước chảy",
          "3. Lau khô bằng khăn lau sạch",
          "4. Phun cồn sát khuẩn dao và cất vào khay cắm dao theo quy định"
        ]
      },
      {
        name: "Khăn lau",
        timing: "Khi kết thúc công việc mỗi ca",
        steps: [
          "1. Vò khăn bằng tay với dung dịch N-12",
          "2. Giặt lại bằng nước sạch",
          "3. LƯU Ý: Phải ngâm giặt riêng khăn trắng (lau CCDC thực phẩm) và khăn màu (lau bàn ghế, lau sàn)"
        ]
      },
      {
        name: "Bồn rửa",
        timing: "Cuối mỗi ca làm việc",
        steps: [
          "1. Đổ rác từ phễu thu rác trong bồn vào thùng rác",
          "2. Dùng miếng bọt biển và dd N-12 chà rửa sạch cả bên trong lẫn bên ngoài bồn",
          "3. Chà rửa phễu thu rác và tay vặn van nước",
          "4. Xả nước rửa sạch",
          "5. Lau khô toàn bộ bồn bằng khăn và phun cồn lên tay vặn van nước"
        ]
      },
      {
        name: "Bàn chế biến & Kệ",
        timing: "Khi cần & Cuối ca",
        steps: [
          "1. Dời tất cả dụng cụ, vật liệu ra khỏi bàn chế biến và tủ kệ",
          "2. Dùng dd N-12 và miếng bọt biển chà rửa sạch mặt bàn",
          "3. Lau lại 2 lần bằng khăn ướt (nhúng nước, vắt ráo)",
          "4. Phun cồn sát khuẩn lên toàn bộ mặt bàn"
        ]
      },
      {
        name: "Tủ lạnh & Tủ đông",
        timing: "Cuối ngày",
        steps: [
          "1. Dời thực phẩm ra khỏi tủ lạnh / tủ đông sang tủ bảo quản tạm thời",
          "2. Dùng dd N-12 và miếng bọt biển chà rửa toàn bộ bên trong, bên ngoài và gioăng cánh cửa (không lấy quá nhiều nước)",
          "3. Dùng khăn ướt lau lại 2 lần, lau khô bằng khăn sạch",
          "4. Phun cồn sát khuẩn toàn bộ tủ và để khô tự nhiên"
        ]
      },
      {
        name: "Tủ hút mùi (Khói)",
        timing: "Cuối ngày & 1 lần/tuần",
        steps: [
          "Hằng ngày: Xịt G-2 lên miếng bọt biển, cọ rửa kỹ bên ngoài tủ hút, lau lại 2 lần bằng khăn ướt, lau khô",
          "1 lần/tuần: Tháo các tấm lọc mỡ ra, phun G-2 cọ rửa sạch bằng miếng bọt biển, xả nước, lau khô rồi lắp lại"
        ]
      },
      {
        name: "Thiết bị chiên (Bếp chiên nhúng)",
        timing: "Khi kết thúc công việc (Ca 3)",
        steps: [
          "1. Tắt nguồn điện hoặc khóa van gas. Để dầu nguội hoàn toàn rồi tháo dầu ra",
          "2. Xịt dung dịch Degreaser G-2 đậm đặc lên toàn bộ bề mặt trong - ngoài thiết bị",
          "3. Những phần tháo rời được thì tháo ra cho vào bồn rửa, dùng miếng bọt biển cọ sạch toàn bộ chi tiết",
          "4. Dùng khăn nhúng nước lau sạch hoàn toàn hóa chất trên toàn bộ thiết bị"
        ]
      },
      {
        name: "Sàn nhà khu chế biến",
        timing: "Khi kết thúc công việc",
        steps: [
          "1. Gom rác bằng chổi nhựa vào đồ hốt rác",
          "2. Pha dung dịch 311 vào bình xịt và phun tạo bọt đều lên sàn",
          "3. Dùng cây lau nhà chà sạch và lau khô bề mặt sàn"
        ]
      }
    ]
  },

  // 5. SOP CHẾ BIẾN & BÁN HÀNG LẨU - MIỀN BẮC
  hotpotSOP: {
    title: "SOP Chế biến & Bán hàng Nhóm Lẩu (Súp chả cá cay & Mì chả cá)",
    code: "BM: SOP-FFONSITE-CB-LAU-HN V.06",
    recipes: [
      {
        product: "Nước súp chả cá cay",
        ingredients: [
          "Nước lọc (chưa đun sôi): 2000 ml",
          "RM HC Bột súp chả cá cay: 1 gói (120g)"
        ],
        equipment: "Bếp điện từ + Chảo nấu chả cá cay",
        power: "2000W",
        time: "15 phút",
        process: "Đong 2000ml nước, cho gói bột súp vào, khuấy đều 1 lần trong lúc đun, đun sôi trong 15 phút."
      },
      {
        product: "Chả cá xoắn xiên",
        ingredients: [
          "RM Chả cá xoắn 20 xiên x Gói: lấy 10 xiên (1/2 gói hoặc 1 gói)"
        ],
        equipment: "Chảo súp chả cá đang sôi",
        power: "1200W",
        time: "Tổng 10 phút (sau 5 phút lật mặt chả cá 1 lần)",
        process: "Thả xiên chả cá ngập sâu trong nước súp. Nấu tổng 10 phút, sau 5 phút trở mặt chả cá 1 lần. Chả cá sau nấu mềm, dai nhẹ, không bở nát. Nhiệt độ tâm sau chế biến ≥ 75°C."
      },
      {
        product: "Mì chả cá cay (Mì trụng)",
        ingredients: [
          "Mì Koreno Jumbo vị kim chi 1kg: 1 vắt mì"
        ],
        equipment: "Nồi trụng mì",
        power: "Nước sôi ≥ 95°C",
        time: "2 phút 30 giây",
        process: "Trụng mì trong nước sôi đúng 2p30s, sợi mì chín dai nhẹ, không bở hoặc nát."
      }
    ],

    servingSOP: [
      {
        type: "Chả cá cay x xiên (Bán theo xiên)",
        container: "1 Ly lẩu giấy GS25",
        soupPortion: "Số vá súp (~30g/vá) = Số lượng xiên + 1 vá",
        process: "Cho topping vào ly (THÁO XIÊN chả cá trước khi cho vào ly). Đong đủ số vá súp tương ứng.",
        microwave: {
          home: "Lò vi sóng gia dụng: 30 giây",
          commercial: "Lò vi sóng công nghiệp: BẤM SỐ 3"
        },
        utensil: "1 đôi đũa",
        note: "Dùng ngon nhất trong vòng 30 phút sau khi mua."
      },
      {
        type: "Mì chả cá cay x Tô",
        container: "1 Tô giấy size L",
        soupPortion: "1 phần mì đã trụng + 1 xiên chả cá + 4 VÁ NƯỚC SÚP (~30g/vá)",
        process: "Cho mì đã trụng vào tô, đặt xiên chả cá lên trên (THÁO XIÊN trước khi cho vào tô), múc 4 vá nước súp nóng rưới đều.",
        microwave: {
          home: "Lò vi sóng gia dụng: 2 phút",
          commercial: "Lò vi sóng công nghiệp: BẤM SỐ 5"
        },
        utensil: "1 đôi đũa",
        note: "Dùng ngon nhất trong vòng 10 phút sau khi chế biến."
      }
    ],

    storageAndHold: {
      chaoTrungBay: "Trưng bày chảo chả cá: tối đa 2 TIẾNG, duy trì công suất 200W",
      tuDongBTP: "Bảo quản túi zip tủ đông: tối đa 15 NGÀY ở nhiệt độ (-23°C đến -18°C)"
    }
  },

  // 6. QUY TRÌNH VỆ SINH TAY 12 BƯỚC (SARAYA 60 GIÂY)
  handHygiene: {
    title: "Hướng dẫn Vệ sinh tay Nhân viên (Chuẩn Saraya 60 giây)",
    equipment: "Bồn rửa, Hộp xà phòng H-1, Hộp cồn S-4, Hộp khăn giấy, Thùng rác đạp chân",
    missedAreas: [
      "Móng tay & đầu ngón tay",
      "Ngón tay cái",
      "Kẽ giữa các ngón tay",
      "Mu bàn tay & cổ tay"
    ],
    steps: [
      { step: 1, action: "Rửa tay bằng nước sạch dưới vòi nước" },
      { step: 2, action: "Lấy xà phòng Smart San H-1 (nhấn 2 lần)" },
      { step: 3, action: "Chà hai lòng bàn tay vào nhau (chà 5 lần) - Bắt đầu đếm 60 giây" },
      { step: 4, action: "Cọ xát hai lòng bàn tay vào nhau với các ngón tay đan vào nhau (5 lần)" },
      { step: 5, action: "Cọ lòng bàn tay này lên mu bàn tay kia với các ngón tay đan vào nhau (5 lần)" },
      { step: 6, action: "Cọ các đầu ngón tay vào lòng bàn tay kia (5 lần)" },
      { step: 7, action: "Vặn và chà quanh ngón tay cái (5 lần)" },
      { step: 8, action: "Vặn cổ tay và cọ rửa lên đến khuỷu tay (5 lần)" },
      { step: 9, action: "Chà móng tay bằng bàn chải móng chuyên dụng (5 lần)" },
      { step: 10, action: "Rửa sạch tay dưới vòi nước chảy (toàn bộ quá trình từ bước 3-10 ít nhất 60s)" },
      { step: 11, action: "Lau khô tay hoàn toàn bằng khăn giấy sạch" },
      { step: 12, action: "Phun cồn sát khuẩn S-4 lên đầu ngón tay và lòng bàn tay, xoa đều cho cồn tự bay hơi" }
    ],
    mandatoryMoments: [
      "Trước khi bắt đầu vào ca làm việc",
      "Sau khi đi vệ sinh",
      "Sau khi ăn uống hoặc nghỉ giải lao",
      "Sau khi đổ rác, đếm tiền mặt, vệ sinh thiết bị",
      "Khi chạm vào bất kỳ bề mặt bẩn nào",
      "Khi chuyển từ sơ chế thực phẩm tươi sống sang thực phẩm ăn ngay",
      "Khi di chuyển từ khu vực bẩn sang khu vực sạch"
    ]
  },

  // 7. CÁC MỤC BÁO CÁO MỖI CA TRONG NGÀY - NHÂN VIÊN
  shiftReports: {
    title: "Các Mục Báo Cáo Mỗi Ca Trong Ngày (NV)",
    destination: "Group Zalo Cửa Hàng",
    cameraApp: "App TIMES (Chụp hình có watermark giờ & địa điểm)",
    ffPhotoItems: [
      "Nguyên tủ OSC (1-2 tấm)",
      "Kệ bakery",
      "Tủ bánh bao",
      "Tủ warmer",
      "Kệ khuyến mãi",
      "Máy Nestea (mở nắp ra chụp)"
    ],
    shifts: {
      ca1: {
        name: "Ca 1 (Sáng: 6h - 14h)",
        timeline: [
          {
            time: "Khi vô ca",
            action: "Check in, hình tác phong đồng phục",
            detail: "Đồng phục chuẩn, sơ vin, thẻ tên ngực trái",
            urgent: false
          },
          {
            time: "6h - 7h",
            action: "Hình FF (Trước khi chụp phải chỉnh tem giá, check lại trưng bày, POSM, thứ tự sắp xếp của Ca 3)",
            detail: "Gồm 6 mục: Nguyên tủ OSC (1-2 tấm), Kệ bakery, Tủ bánh bao, Tủ warmer, Kệ khuyến mãi, Máy nestea (mở nắp ra chụp)",
            urgent: true
          },
          {
            time: "6h - 7h (Quan trọng)",
            action: "CHECK VÀ XÁC NHẬN KO CÓ HÀNG HẾT DATE TRÊN TỦ OSC VÀ KỆ BÁNH MÌ + NVL TRONG COUNTER",
            detail: "Check date toàn bộ quầy kệ, cách ly hàng hết hạn",
            urgent: true,
            highlight: "bg-amber-100 border-amber-300 text-amber-900"
          },
          {
            time: "7h - 8h",
            action: "Kiểm tra vệ sinh khu vực mặt tiền, lau bề mặt kính, cạo đá sơ tủ đông kem + lau tầng cuối tủ OSC",
            detail: "Giữ mặt tiền sáng sủa, sạch sẽ đón khách sáng",
            urgent: false
          },
          {
            time: "Trong ca",
            action: "Fill hàng + Vệ sinh theo lịch SM giao",
            detail: "Châm đầy kệ hàng vơi và làm theo lịch phân công",
            urgent: false
          },
          {
            time: "11:00",
            action: "GỬI HÌNH HỦY HÀNG (Chụp thấy được số lượng và hạn sử dụng)",
            detail: "Đợt hủy FF trưa. Bắt buộc xé rách bao bì trước khi vứt rác",
            urgent: true,
            highlight: "bg-rose-100 border-rose-300 text-rose-900"
          },
          {
            time: "Trong ca",
            action: "Fill hàng + Vệ sinh theo lịch SM giao + Kiểm tra khu vực ăn uống, thay bao rác 2 tiếng/lần",
            detail: "Khu vực ăn uống luôn sạch, không để thùng rác tràn",
            urgent: false
          },
          {
            time: "13:30",
            action: "Dọn bên trong quầy Counter + Chụp hình gửi báo cáo",
            detail: "Dọn sạch quầy sơ chế chuẩn bị giao ca cho Ca 2",
            urgent: false
          },
          {
            time: "14:00",
            action: "Báo cáo kết ca + Hình tổng quan WC, bàn ăn, thùng rác",
            detail: "Xác nhận: ĐÃ DỌN DẸP, THAY RÁC, VỆ SINH",
            urgent: true
          }
        ]
      },
      ca2: {
        name: "Ca 2 (Chiều: 14h - 22h)",
        timeline: [
          {
            time: "Khi vô ca",
            action: "Check in, hình tác phong đồng phục",
            detail: "Kiểm tra thẻ tên, đồng phục, tạp dề",
            urgent: false
          },
          {
            time: "14h - 14h30",
            action: "Hình FF (Bổ sung chế biến nếu còn số lượng ít)",
            detail: "Gồm 6 mục: Nguyên tủ OSC (1-2 tấm), Kệ bakery, Tủ bánh bao, Tủ warmer, Kệ khuyến mãi, Máy nestea (mở nắp ra chụp)",
            urgent: true
          },
          {
            time: "14h - 15h (Quan trọng)",
            action: "CHECK VÀ XÁC NHẬN KO CÓ HÀNG HẾT DATE TRÊN TỦ OSC VÀ KỆ BÁNH MÌ + NVL TRONG COUNTER",
            detail: "Rà soát toàn diện date đầu ca chiều",
            urgent: true,
            highlight: "bg-amber-100 border-amber-300 text-amber-900"
          },
          {
            time: "15h - 17h",
            action: "CHECK tem giá quầy kệ + Hình tất cả quầy kệ, tủ trong cửa hàng",
            detail: "Chỉnh tem giá ngay ngắn, đúng vị trí sản phẩm",
            urgent: false
          },
          {
            time: "17:00",
            action: "BÁO CÁO FF 17H + CHỤP BÁO CÁO ĐÈN BẢNG HIỆU",
            detail: "Bật đèn bảng hiệu mặt tiền đón khách tối và chụp báo cáo",
            urgent: true
          },
          {
            time: "19:00",
            action: "Xác nhận rút date theo khung giờ + GỬI HÌNH HỦY HÀNG (chụp thấy rõ số lượng và HSD)",
            detail: "Đợt hủy FF chiều (Cơm nắm onigiri, bento, mì, sushi). Xé bao bì.",
            urgent: true,
            highlight: "bg-rose-100 border-rose-300 text-rose-900"
          },
          {
            time: "19h - 21h",
            action: "Fill hàng + Vệ sinh theo lịch SM giao + Kiểm tra khu vực ăn uống, thay bao rác 2 tiếng/lần",
            detail: "Duy trì quầy kệ đầy đặn và bàn ăn sạch sẽ",
            urgent: false
          },
          {
            time: "22:00",
            action: "Báo cáo kết ca + Hình tổng quan WC, bàn ăn, thùng rác",
            detail: "Xác nhận: ĐÃ DỌN DẸP, THAY RÁC, VỆ SINH",
            urgent: true
          }
        ]
      },
      ca3: {
        name: "Ca 3 (Đêm: 22h - 6h)",
        timeline: [
          {
            time: "Khi vô ca",
            action: "Check in, hình tác phong đồng phục",
            detail: "Đồng phục chỉn chu ca đêm",
            urgent: false
          },
          {
            time: "22h - 23h (Quan trọng)",
            action: "CHECK VÀ XÁC NHẬN KO CÓ HÀNG HẾT DATE TRÊN TỦ OSC VÀ KỆ BÁNH MÌ + NVL TRONG COUNTER",
            detail: "Xác nhận rút date khung 22h + Gửi hình hủy hàng (thấy rõ số lượng & HSD)",
            urgent: true,
            highlight: "bg-rose-100 border-rose-300 text-rose-900"
          },
          {
            time: "24:00",
            action: "BÁO CÁO KẾT NGÀY",
            detail: "Tổng kết doanh thu và tình hình cửa hàng cuối ngày",
            urgent: true
          },
          {
            time: "24h - 1h sáng",
            action: "Hình vệ sinh toàn bộ thiết bị",
            detail: "Chụp ảnh lò vi sóng, bếp chiên, máy móc sau vệ sinh",
            urgent: false
          },
          {
            time: "4h - 5h sáng",
            action: "Hình tất cả quầy kệ, tủ trong cửa hàng",
            detail: "Hàng hóa đã fill đầy đặn, mặt tiền kệ thẳng tắp",
            urgent: false
          },
          {
            time: "5h - 6h sáng",
            action: "HÌNH FF CHẾ BIẾN",
            detail: "Gồm 6 mục: Nguyên tủ OSC (1-2 tấm), Kệ bakery, Tủ bánh bao, Tủ warmer, Kệ khuyến mãi, Máy nestea (mở nắp ra chụp)",
            urgent: true
          },
          {
            time: "6h sáng",
            action: "Hình in tem HSD, số lượng của FF chế biến",
            detail: "Dán tem BTP chuẩn xác vào khay thành phẩm",
            urgent: true
          },
          {
            time: "6h sáng (Giao ca)",
            action: "BÁO CÁO KẾT CA + Hình tổng quan WC, bàn ăn, thùng rác",
            detail: "Xác nhận: ĐÃ DỌN DẸP, THAY RÁC, VỆ SINH",
            urgent: true
          }
        ]
      }
    }
  },

  // 8. DANH MỤC ẢNH GỐC ĐÍNH KÈM TẠI CỬA HÀNG
  originalScans: [
    {
      id: "bao_cao_moi_ca",
      title: "Các Mục Báo Cáo Mỗi Ca Trong Ngày (NV)",
      filename: "bao_cao_moi_ca.png",
      url: "handbook/bao_cao_moi_ca.png",
      category: "Báo cáo & Vận hành",
      desc: "Mốc thời gian và danh mục chụp ảnh báo cáo Zalo bằng App Times cho Ca 1, Ca 2, Ca 3"
    },
    {
      id: "sop_che_bien_lau",
      title: "SOP Chế biến Nhóm Lẩu - Miền Bắc",
      filename: "sop_che_bien_lau.jpg",
      url: "handbook/sop_che_bien_lau.jpg",
      category: "SOP Chế biến",
      desc: "Quy trình nấu súp chả cá cay, mì chả cá, nhiệt độ, công suất và bảo quản BTP"
    },
    {
      id: "sop_ban_hang_lau",
      title: "SOP Bán hàng Nhóm Lẩu - Miền Bắc",
      filename: "sop_ban_hang_lau.jpg",
      url: "handbook/sop_ban_hang_lau.jpg",
      category: "SOP Bán hàng",
      desc: "Quy cách đóng ly chả cá, tô mì, số vá súp, nút bấm lò vi sóng số 3 và số 5"
    },
    {
      id: "chat_luong_gio_huy",
      title: "Đảm bảo Chất lượng & Giờ Hủy Hàng",
      filename: "chat_luong_gio_huy.jpg",
      url: "handbook/chat_luong_gio_huy.jpg",
      category: "Chất lượng & Hủy",
      desc: "Khung giờ hủy FF 11h-19h-22h, thời gian hủy GM, nhiệt độ tủ đông, mát, lẩu, bánh bao"
    },
    {
      id: "lich_ve_sinh_ca",
      title: "Lịch Phân công Vệ sinh theo Ca & Thứ",
      filename: "lich_ve_sinh_ca.jpg",
      url: "handbook/lich_ve_sinh_ca.jpg",
      category: "Vệ sinh & Checklist",
      desc: "Lịch phân chia đầu việc Ca 1, Ca 2, Ca 3 từ Thứ 2 đến Chủ nhật tại cửa hàng"
    },
    {
      id: "hoa_chat_saraya",
      title: "Danh mục Hóa chất Vệ sinh (Saraya)",
      filename: "hoa_chat_saraya.jpg",
      url: "handbook/hoa_chat_saraya.jpg",
      category: "Hóa chất",
      desc: "Hệ mã màu GS25: H-1 trắng, S-4 đỏ đô, N-12 xanh lá, G-2 nâu, 211 đỏ, 311 xanh/vàng"
    },
    {
      id: "hoa_chat_ecolab",
      title: "Bảng Sử dụng Hóa chất (Ecolab)",
      filename: "hoa_chat_ecolab.jpg",
      url: "handbook/hoa_chat_ecolab.jpg",
      category: "Hóa chất",
      desc: "Hướng dẫn tỷ lệ pha và công dụng các loại hóa chất Ecolab QSR tại cửa hàng"
    },
    {
      id: "ve_sinh_counter",
      title: "Hướng dẫn Vệ sinh CCDC & Thiết bị Counter",
      filename: "ve_sinh_counter.jpg",
      url: "handbook/ve_sinh_counter.jpg",
      category: "Vệ sinh & Checklist",
      desc: "Chi tiết quy trình vệ sinh thớt, dao, khăn, bồn rửa, tủ hút, bếp chiên, sàn nhà"
    },
    {
      id: "ve_sinh_tay",
      title: "Hướng dẫn Vệ sinh tay Nhân viên (12 bước)",
      filename: "ve_sinh_tay.jpg",
      url: "handbook/ve_sinh_tay.jpg",
      category: "Vệ sinh & Checklist",
      desc: "Quy trình rửa tay 12 bước 60 giây, các vị trí hay sót và thời điểm bắt buộc"
    }
  ]
};
