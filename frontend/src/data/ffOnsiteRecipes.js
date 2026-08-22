/**
 * Công thức FF Onsite GS25 — nguồn: giấy "Danh sách sản phẩm FF Onsite / Onsite trong quầy counter".
 * AI tra cứu theo alias (có/không dấu) và ưu tiên alias dài hơn = đúng món hơn.
 */

export function stripVi(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const FF_RECIPE_GROUPS = [
  {
    id: 'nuoc',
    title: 'Nhóm nước',
    emoji: '☕',
    catalog: 'Trà tắc, Cà phê phin (đen/sữa), Trà cóc xí muội, Trà me muối ớt, Trà lài tắc xí muội, Sữa đậu, Trà sữa Đại hồng bào, Trà chanh Nestea, Milo, Trà nóng, Trà sữa HongKong/Socola',
    items: [
      {
        id: 'tra-tac',
        name: 'Trà tắc',
        aliases: ['tra tac', 'tratac', 'tra tac size', 'tra duong', 'ly tra tac', 'coc tra tac'],
        body:
          '🍊 **Trà tắc**\n' +
          '• **Size M:** Đổ trà đường **140ml** + **2 trái tắc** + đá đầy ly\n' +
          '• **Size XL:** Đổ trà đường **280ml** + **4 trái tắc** + đá đầy cốc'
      },
      {
        id: 'ca-phe-den',
        name: 'Cà phê đen',
        aliases: ['ca phe den', 'cafe den', 'ca phe phin den'],
        body:
          '☕ **Cà phê phin — Cà phê đen**\n' +
          'Cà phê đen đến **vạch 1 (140ml)** + **3 viên đường** + thêm đá đầy ly'
      },
      {
        id: 'ca-phe-sua',
        name: 'Cà phê sữa',
        aliases: ['ca phe sua', 'cafe sua', 'ca phe phin sua'],
        body:
          '☕ **Cà phê phin — Cà phê sữa**\n' +
          '**5 pump sữa đặc** + đổ cà phê đến **vạch 1** + thêm đá đầy ly'
      },
      {
        id: 'ca-phe-phin',
        name: 'Cà phê phin',
        aliases: ['ca phe phin', 'ca phe', 'cafe', 'phin'],
        body:
          '☕ **Cà phê phin**\n' +
          '• **Cà phê đen:** cà phê đen đến **vạch 1 (140ml)** + **3 viên đường** + thêm đá đầy ly\n' +
          '• **Cà phê sữa:** **5 pump sữa đặc** + đổ cà phê đến **vạch 1** + thêm đá đầy ly'
      },
      {
        id: 'tra-coc',
        name: 'Trà cóc xí muội',
        aliases: ['tra coc', 'tra coc xi muoi', 'xi muoi'],
        body: '🥤 **Trà cóc xí muội (Size L)**\nTrà cóc **250ml** + thêm đá đầy cốc'
      },
      {
        id: 'tra-me',
        name: 'Trà me muối ớt',
        aliases: ['tra me', 'tra me muoi ot', 'muoi ot'],
        body: '🥤 **Trà me muối ớt (Size L)**\nTrà me **250ml** + **1 viên muối ớt** + thêm đá đầy cốc'
      },
      {
        id: 'tra-lai',
        name: 'Trà lài tắc xí muội',
        aliases: ['tra lai', 'tra lai tac', 'tra lai xi muoi'],
        body: '🥤 **Trà lài tắc xí muội (Size L)**\nTrà lài **250ml** + **1 trái tắc** + thêm đá đầy cốc'
      },
      {
        id: 'sua-dau',
        name: 'Sữa đậu',
        aliases: ['sua dau'],
        body: '🥛 **Sữa đậu (Size L)**\nĐổ sữa đậu **250ml** + thêm đá đầy cốc'
      },
      {
        id: 'tra-sua-dhb',
        name: 'Trà sữa Đại hồng bào',
        aliases: ['dai hong bao', 'tra sua dai hong bao', 'hong bao'],
        body:
          '🧋 **Trà sữa Đại hồng bào**\n' +
          '• **Size L:** lấy **250ml** trà sữa + đá đầy ly\n' +
          '• **Size XL:** lấy **280ml** trà sữa + đá đầy ly'
      },
      {
        id: 'nestea',
        name: 'Trà chanh Nestea',
        aliases: ['tra chanh', 'nestea', 'tra nestea', 'tra chanh nestea'],
        body:
          '🍋 **Trà chanh Nestea**\n' +
          '• **Pha Nestea:** **400g** bột + **1000ml** nước nóng + **2000ml** nước Satori\n' +
          '• **Bán hàng:** cho đá đầy cốc + **250ml** trà chanh'
      },
      {
        id: 'milo',
        name: 'Milo',
        aliases: ['milo'],
        body:
          '🍫 **Milo**\n' +
          '• **Pha:** 1 gói **(600g)** + **800ml** nước nóng + **1000ml** nước Satori\n' +
          '• **Bán hàng:** cho đá đầy cốc + **250ml** milo\n' +
          '• **Milo nóng (gói nhỏ):** **2 gói + 160ml** nước nóng'
      },
      {
        id: 'tra-nong',
        name: 'Trà nóng (hoa cúc / cam quế / gừng / tắc mật ong)',
        aliases: ['tra hoa cuc', 'tra cam que', 'tra gung', 'tra mat ong', 'tra tac mat ong', 'tra nong'],
        body:
          '🌸 **Trà nóng (hoa cúc, cam quế, gừng, tắc mật ong)**\n' +
          'Đổ trà vào ly giấy → làm nóng trà trong vòng **1 phút** → thêm topping (nếu có)'
      },
      {
        id: 'tra-sua-hk',
        name: 'Trà sữa HongKong / Socola',
        aliases: ['tra sua hongkong', 'tra sua hong kong', 'hongkong', 'hong kong', 'tra sua socola', 'socola', 'so co la', 'tra sua hk'],
        body:
          '🧋 **Trà sữa HongKong, trà sữa Socola**\n' +
          '• **Nóng:** **2 gói + 150ml** nước nóng\n' +
          '• **Lạnh:** **2 gói + 50ml–80ml** nước + đá\n' +
          '• **Milo nóng:** **2 gói + 160ml**'
      },
      {
        id: 'tra-sua',
        name: 'Trà sữa',
        aliases: ['tra sua'],
        body:
          '🧋 **Trà sữa (chọn đúng loại)**\n\n' +
          '**HongKong / Socola**\n' +
          '• Nóng: 2 gói + 150ml nước nóng\n' +
          '• Lạnh: 2 gói + 50ml–80ml + đá\n' +
          '• Milo nóng: 2 gói + 160ml\n\n' +
          '**Đại hồng bào**\n' +
          '• Size L: 250ml trà sữa + đá đầy ly\n' +
          '• Size XL: 280ml trà sữa + đá đầy ly'
      }
    ]
  },
  {
    id: 'chien',
    title: 'Nhóm đồ chiên',
    emoji: '🍳',
    catalog: 'Xúc xích (heo/bò phô mai, School, Hoshi), Lạp xưởng, Heo chiên xù, Bánh tôm, Bánh xếp rau củ, Gà nugget, Chả cá, Rong biển, Gà nướng lá chanh, Nem nướng',
    items: [
      {
        id: 'xx-heo',
        name: 'Xúc xích heo phô mai',
        aliases: ['xuc xich heo', 'xuc xich heo pho mai'],
        body: '🌭 **Xúc xích heo phô mai (5 cái)**\nRã đông → chiên **1 phút 30 giây (1p30)** → đo nhiệt độ tâm'
      },
      {
        id: 'xx-bo',
        name: 'Xúc xích bò phô mai',
        aliases: ['xuc xich bo', 'xuc xich bo pho mai'],
        body: '🌭 **Xúc xích bò phô mai (5 cái)**\nRã đông → chiên **1 phút 30 giây (1p30)** → đo nhiệt độ tâm'
      },
      {
        id: 'xx-school',
        name: 'Xúc xích School',
        aliases: ['xuc xich school', 'school'],
        body: '🌭 **Xúc xích School (5 cái)**\nRã đông → chiên **1 phút 30 giây (1p30)** → đo nhiệt độ tâm'
      },
      {
        id: 'xx-hoshi',
        name: 'Xúc xích Hoshi',
        aliases: ['xuc xich hoshi', 'hoshi'],
        body: '🌭 **Xúc xích Hoshi (5 cái)**\nRã đông → chiên **2 phút – 2 phút 30 giây (2p–2p30)** → đo nhiệt độ tâm'
      },
      {
        id: 'lap-xuong',
        name: 'Lạp xưởng',
        aliases: ['lap xuong'],
        body: '🌭 **Lạp xưởng (5 cái)**\nRã đông → chiên **2 phút – 2 phút 30 giây (2p–2p30)** → đo nhiệt độ tâm'
      },
      {
        id: 'heo-chien-xu',
        name: 'Heo chiên xù',
        aliases: ['heo chien xu', 'heo chien'],
        body: '🍖 **Heo chiên xù**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'banh-tom',
        name: 'Bánh tôm',
        aliases: ['banh tom'],
        body: '🍤 **Bánh tôm**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'banh-xep',
        name: 'Bánh xếp rau củ',
        aliases: ['banh xep', 'banh xep rau cu', 'rau cu'],
        body: '🥟 **Bánh xếp rau củ (3 cái / 1 xiên)**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'nugget',
        name: 'Gà nugget',
        aliases: ['nugget', 'ga nugget'],
        body: '🍗 **Gà nugget (4 cái / 1 xiên)**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'cha-ca-thanh-cua',
        name: 'Chả cá thanh cua (chiên)',
        aliases: ['cha ca thanh cua'],
        body: '🦀 **Chả cá thanh cua**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'cha-ca-bap',
        name: 'Chả cá hạt bắp',
        aliases: ['cha ca hat bap', 'cha ca bap', 'hat bap'],
        body: '🌽 **Chả cá hạt bắp**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'rong-bien',
        name: 'Rong biển cuộn',
        aliases: ['rong bien', 'rong bien cuon'],
        body: '🌿 **Rong biển cuộn**\nRã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm'
      },
      {
        id: 'cha-ca-tim',
        name: 'Chả cá trái tim',
        aliases: ['cha ca trai tim', 'ca trai tim', 'trai tim'],
        body: '❤️ **Chả cá trái tim (4 cái / 1 xiên)**\nRã đông → chiên **1 phút (1p)** → đo nhiệt độ tâm'
      },
      {
        id: 'ga-la-chanh',
        name: 'Gà nướng lá chanh',
        aliases: ['ga nuong la chanh', 'ga la chanh', 'la chanh', 'ga nuong'],
        body: '🍋 **Gà nướng lá chanh**\nQuay lò vi sóng **số 2 — 2 lần**'
      },
      {
        id: 'ga',
        name: 'Gà (nugget / nướng lá chanh)',
        aliases: ['ga'],
        body:
          '🍗 **Gà — công thức FF Onsite**\n\n' +
          '**Gà nugget (4 cái / 1 xiên):** rã đông → chiên **2 phút (2p)** → đo nhiệt độ tâm\n\n' +
          '**Gà nướng lá chanh:** quay lò vi sóng **số 2 — 2 lần**\n\n' +
          '👉 Gõ *gà nugget* hoặc *gà nướng lá chanh* nếu chỉ cần 1 món.'
      },
      {
        id: 'nem-nuong',
        name: 'Nem nướng',
        aliases: ['nem nuong'],
        body: '🥢 **Nem nướng**\nQuay lò vi sóng **số 2 — 1 lần**'
      },
      {
        id: 'cha-ca',
        name: 'Chả cá (chọn loại)',
        aliases: ['cha ca'],
        body:
          '🐟 **Chả cá — chọn đúng loại**\n' +
          '**Chiên:** thanh cua / hạt bắp / rã đông + chiên **2p**; trái tim chiên **1p** (4 cái/xiên)\n' +
          '**Lẩu:** xoắn/xoắn cay trần **45s–1p**; cuộn thanh cua trần **1p–1p30**\n' +
          '**Xốt chả cá cay:** 1 gói bột + 1000ml nước chưa đun sôi + 10 xiên chả cá xoắn'
      },
      {
        id: 'xuc-xich',
        name: 'Xúc xích (chọn loại)',
        aliases: ['xuc xich'],
        body:
          '🌭 **Xúc xích — chọn đúng loại**\n' +
          '• **Heo phô mai (5 cái):** rã đông + chiên **1p30** + đo nhiệt độ tâm\n' +
          '• **Bò phô mai (5 cái):** rã đông + chiên **1p30** + đo nhiệt độ tâm\n' +
          '• **School (5 cái):** rã đông + chiên **1p30** + đo nhiệt độ tâm\n' +
          '• **Hoshi (5 cái):** rã đông + chiên **2p–2p30** + đo nhiệt độ tâm'
      }
    ]
  },
  {
    id: 'banh',
    title: 'Nhóm bánh',
    emoji: '🥖',
    catalog: 'Bánh mì truyền thống/matcha/đậu đỏ, Hottok phô mai, Hotdog 28 Signature, Hotdog 25',
    items: [
      {
        id: 'bm-tt',
        name: 'Bánh mì truyền thống',
        aliases: ['banh mi truyen thong', 'banh me truyen thong'],
        body: '🥖 **Bánh mì truyền thống**\nRã đông → nướng **2 phút 30 giây – 3 phút (2p30–3p)**'
      },
      {
        id: 'bm-matcha',
        name: 'Bánh mì matcha',
        aliases: ['banh mi matcha', 'banh me match', 'matcha'],
        body: '🥖 **Bánh mì matcha**\nRã đông → nướng **2 phút 30 giây – 3 phút (2p30–3p)**'
      },
      {
        id: 'bm-dau-do',
        name: 'Bánh mì nhân đậu đỏ',
        aliases: ['banh mi dau do', 'banh me nhan dau do', 'dau do'],
        body: '🥖 **Bánh mì nhân đậu đỏ**\nRã đông → nướng **3 phút – 3 phút 30 giây (3p–3p30)**'
      },
      {
        id: 'hottok',
        name: 'Bánh hottok phô mai',
        aliases: ['hottok', 'hot tok', 'banh hottok', 'hottok pho mai'],
        body: '🥞 **Bánh hottok phô mai**\nRã đông → nướng **3 phút 30 giây – 4 phút (3p30–4p)**'
      },
      {
        id: 'hotdog-28',
        name: 'Hotdog 28 Signature',
        aliases: ['hotdog 28', 'hot dog 28', 'hotdog signature'],
        body: '🌭 **Hotdog 28 Signature**\n**1 vỏ bánh + 1 xúc xích Hoshi**'
      },
      {
        id: 'hotdog-25',
        name: 'Hotdog 25',
        aliases: ['hotdog 25', 'hot dog 25'],
        body: '🌭 **Hotdog 25**\n**10g ngô đã trần qua + 1 vỏ bánh + 1 xúc xích School**'
      },
      {
        id: 'banh-mi',
        name: 'Bánh mì',
        aliases: ['banh mi', 'banh me'],
        body:
          '🥖 **Bánh mì — chọn đúng loại**\n' +
          '• **Truyền thống:** rã đông + nướng **2p30–3p**\n' +
          '• **Matcha:** rã đông + nướng **2p30–3p**\n' +
          '• **Nhân đậu đỏ:** rã đông + nướng **3p–3p30**'
      },
      {
        id: 'hotdog',
        name: 'Hotdog',
        aliases: ['hotdog', 'hot dog'],
        body:
          '🌭 **Hotdog — chọn đúng loại**\n' +
          '• **28 Signature:** 1 vỏ bánh + 1 xúc xích Hoshi\n' +
          '• **25:** 10g ngô đã trần qua + 1 vỏ bánh + 1 xúc xích School'
      }
    ]
  },
  {
    id: 'lau',
    title: 'Nhóm lẩu',
    emoji: '🍲',
    catalog: 'Chả cá xoắn / xoắn cay, Chả cá cuộn thanh cua',
    items: [
      {
        id: 'cha-xoan',
        name: 'Chả cá xoắn / xoắn cay',
        aliases: ['cha ca xoan', 'cha ca xoan cay', 'xoan cay'],
        body: '🍲 **Chả cá xoắn, chả cá xoắn cay**\nTrần qua với nước đang đun sôi **45 giây – 1 phút (45s–1p)**'
      },
      {
        id: 'cha-cuon-cua',
        name: 'Chả cá cuộn thanh cua',
        aliases: ['cha ca cuon thanh cua', 'cuon thanh cua'],
        body: '🦀 **Chả cá cuộn thanh cua**\nTrần qua với nước đang đun sôi **1 phút – 1 phút 30 giây (1p–1p30)**'
      }
    ]
  },
  {
    id: 'tteobokki',
    title: 'Nhóm Tteobokki',
    emoji: '🍢',
    catalog: 'Xốt Tok, Xốt Rose, Chả cá cay, Tteobokki truyền thống / chả cá / signature / phô mai, Rose chả cá / xúc xích',
    items: [
      {
        id: 'che-bien-tok',
        name: 'Chế biến Tteobokki (luộc)',
        aliases: ['luoc tok', 'che bien tteobokki', 'che bien tok', 'luoc cha ca tam giac'],
        body:
          '⏱️ **Chế biến Tteobokki**\n' +
          '• Luộc tok **4 phút** ở **100°C**\n' +
          '• Luộc chả cá tam giác **1 phút 30 giây – 2 phút (1p30–2p)**'
      },
      {
        id: 'xot-tok',
        name: 'Xốt Tok',
        aliases: ['xot tok', 'sot tok', 'xot tteobokki'],
        body: '🥣 **Xốt Tok**\n**400g xốt + 1200ml nước**'
      },
      {
        id: 'xot-rose',
        name: 'Xốt Rose',
        aliases: ['xot rose', 'sot rose'],
        body: '🥣 **Xốt Rose**\n**200g bột + 1000ml nước nóng**'
      },
      {
        id: 'cha-ca-cay',
        name: 'Xốt chả cá cay',
        aliases: ['cha ca cay', 'xot cha ca cay'],
        body: '🌶️ **Chả cá cay (xốt)**\n**1 gói bột + 1000ml nước chưa đun sôi + 10 xiên chả cá xoắn**'
      },
      {
        id: 'tok-tt',
        name: 'Tteobokki truyền thống',
        aliases: ['tteobokki truyen thong', 'tok truyen thong', 'teobokki truyen thong'],
        body: '🍢 **Tteobokki truyền thống**\n**10 tok + 4 chả cá tam giác + 4 vá xốt**'
      },
      {
        id: 'tok-cha',
        name: 'Tteobokki chả cá',
        aliases: ['tteobokki cha ca', 'tok cha ca', 'teobokki cha ca'],
        body: '🍢 **Tteobokki chả cá**\n**10 tok + 4 chả cá tam giác + 4 vá xốt + 1 chả cá xoắn**'
      },
      {
        id: 'tok-sig-pm',
        name: 'Tteobokki signature phô mai',
        aliases: ['tteobokki signature pho mai', 'signature pho mai', 'tok signature pho mai'],
        body: '🍢 **Tteobokki signature phô mai**\n**10 tok + 4 chả cá tam giác + 1 trứng + 4 vá xốt + 1 lát phô mai**'
      },
      {
        id: 'tok-sig',
        name: 'Tteobokki signature',
        aliases: ['tteobokki signature', 'tok signature', 'signature'],
        body: '🍢 **Tteobokki signature**\n**10 tok + 4 chả cá tam giác + 1 trứng + 4 vá xốt**'
      },
      {
        id: 'rose-xx',
        name: 'Rose Tteobokki xúc xích',
        aliases: ['rose tteobokki xuc xich', 'rose tok xuc xich', 'rose xuc xich'],
        body: '🌹 **Rose Tteobokki xúc xích**\n**10 tok + 3 xúc xích cocktail + 4 vá xốt**'
      },
      {
        id: 'rose-cha',
        name: 'Rose Tteobokki chả cá',
        aliases: ['rose tteobokki cha ca', 'rose tok cha ca', 'rose tteobokki', 'rose tok'],
        body: '🌹 **Rose Tteobokki chả cá**\n**10 tok + 4 chả cá tam giác + 4 vá xốt**'
      }
    ]
  },
  {
    id: 'mi',
    title: 'Nhóm mì',
    emoji: '🍜',
    catalog: 'Mì trộn, Mì trộn xúc xích, Mì trộn Indomie, Raboki',
    items: [
      {
        id: 'mi-xx',
        name: 'Mì trộn xúc xích',
        aliases: ['mi tron xuc xich', 'mi xuc xich'],
        body: '🍜 **Mì trộn xúc xích**\nTrụng **1 vắt mì Hảo Hảo** + **1/3 gói rau cải** + gói gia vị của gói mì + **1 xúc xích School**'
      },
      {
        id: 'mi-indomie',
        name: 'Mì trộn Indomie',
        aliases: ['indomie', 'mi tron indomie', 'mi indomie'],
        body: '🍜 **Mì trộn Indomie**\nTrụng **1 vắt mì Indomie** + **1/3 gói rau cải** + gói gia vị của gói mì'
      },
      {
        id: 'mi-tron',
        name: 'Mì trộn',
        aliases: ['mi tron', 'mi hao hao'],
        body: '🍜 **Mì trộn**\nTrụng **1 vắt mì Hảo Hảo** + **1/3 gói rau cải** + gói gia vị của gói mì'
      },
      {
        id: 'raboki',
        name: 'Raboki',
        aliases: ['raboki', 'ra boki'],
        body: '🍜 **Raboki**\nTrụng mì **Koreno 4–5 phút (4–5p)** + **5 tok + 1 trứng + 4 vá xốt + 1 lát phô mai**'
      }
    ]
  }
];

const RECIPE_INTENT = [
  'cong thuc',
  'ff onsite',
  'onsite',
  'nguyen lieu',
  'recipe',
  'pha che',
  'ban hang',
  'lam the nao',
  'lam sao',
  'pha sao',
  'pha nhu',
  'cach pha',
  'cach lam',
  'cach chien',
  'cach nuong',
  'cach nau'
];

const GROUP_ALIASES = {
  nuoc: ['nhom nuoc', 'do uong'],
  chien: ['nhom do chien', 'do chien', 'mon chien'],
  banh: ['nhom banh'],
  lau: ['nhom lau'],
  tteobokki: ['nhom tteobokki', 'nhom teobokki', 'nhom tok', 'tteobokki', 'teobokki', 'tteokbokki', 'tokbokki'],
  mi: ['nhom mi']
};

function hasWord(q, word) {
  return new RegExp(`(?:^| )${word}(?: |$)`).test(` ${q} `);
}

function allItems() {
  const list = [];
  FF_RECIPE_GROUPS.forEach(g => {
    g.items.forEach(item => list.push({ ...item, groupId: g.id, groupTitle: g.title, emoji: g.emoji }));
  });
  return list;
}

function formatCatalog() {
  const lines = FF_RECIPE_GROUPS.map(g => `${g.emoji} **${g.title}:** ${g.catalog}`);
  return (
    'Công thức FF — gõ tên món:\n' +
    lines.join('\n')
  );
}

function formatGroup(group) {
  const itemLines = group.items
    .filter(i => !['tra-sua', 'xuc-xich', 'banh-mi', 'hotdog', 'ca-phe-phin', 'cha-ca', 'ga'].includes(i.id))
    .map(i => `• **${i.name}**`)
    .join('\n');
  return `${group.emoji} **${group.title}**\n${itemLines}\n\n👉 Gõ đúng tên món để xem định lượng / thời gian chiên-nướng.`;
}

/**
 * Trả về câu trả lời công thức nếu câu hỏi khớp món FF Onsite. Null nếu không phải hỏi công thức.
 */
export function lookupFfOnsiteRecipe(question) {
  const raw = String(question || '').toLowerCase().trim();
  if (!raw) return null;
  const q = stripVi(raw);

  const intent = RECIPE_INTENT.some(k => q.includes(k))
    || /\b(pha|nau|chien|nuong|trung|luoc)\b/.test(q)
    || q.includes('cong thuc');

  const items = allItems();
  const hits = [];
  for (const item of items) {
    let best = 0;
    for (const alias of item.aliases) {
      const a = stripVi(alias);
      if (!a) continue;
      const hit = a.length <= 3 ? hasWord(q, a) : q.includes(a);
      if (hit && a.length > best) best = a.length;
    }
    if (best > 0) hits.push({ item, score: best });
  }

  hits.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'vi'));

  if (!hits.length && hasWord(q, 'tra') && hasWord(q, 'tac')) {
    const traTac = items.find(i => i.id === 'tra-tac');
    if (traTac) return traTac.body;
  }

  if (hits.length) {
    const top = hits[0].score;
    const chosen = hits.filter(h => h.score === top);
    // Alias dài hơn = đúng món hơn (vd. "tra sua dai hong bao" thắng "tra sua")
    if (chosen.length === 1) return chosen[0].item.body;
    return chosen.map(h => h.item.body).join('\n\n');
  }

  for (const group of FF_RECIPE_GROUPS) {
    const aliases = GROUP_ALIASES[group.id] || [];
    if (
      aliases.some(a => q.includes(stripVi(a))) ||
      (group.id === 'tteobokki' && hasWord(q, 'tok')) ||
      (group.id === 'mi' && hasWord(q, 'mi'))
    ) {
      return formatGroup(group);
    }
  }

  if (intent) return formatCatalog();
  return null;
}
