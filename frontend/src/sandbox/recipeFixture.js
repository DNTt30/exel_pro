import coffee from '../data/customRecipeExample.json';
export const sampleRecipeEntries = [
  { id:'sample-coffee', title:'Cà phê (mẫu thử)', category:'recipe', content:'Dữ liệu thử từ ví dụ người dùng, không phải tài liệu production.', recipe_spec:coffee },
  { id:'sample-milo', title:'Milo', category:'recipe', content:'• **Pha:** 1 gói **(600g)** + **800ml** nước nóng + **1000ml** nước Satori\n• **Bán hàng:** cho đá đầy cốc + **250ml** milo\n• **Milo nóng (gói nhỏ):** **2 gói + 160ml** nước nóng' },
  { id:'sample-nestea', title:'Trà chanh Nestea', category:'recipe', content:'• **Pha Nestea:** **400g** bột + **1000ml** nước nóng + **2000ml** nước Satori\n• **Bán hàng:** cho đá đầy cốc + **250ml** trà chanh' },
].map(e => ({ ...e,is_active:true,published_at:'2026-10-19T07:33:00Z',revision:2,store_id:null }));
