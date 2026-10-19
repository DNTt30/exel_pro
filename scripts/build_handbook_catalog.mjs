// Offline, one-time import snapshot. Never imported by the production app.
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { FF_RECIPE_GROUPS } from './data/legacy-handbook/ffOnsiteRecipes.mjs';
import { GS25_HANDBOOK_DATA as data } from './data/legacy-handbook/gs25HandbookData.mjs';
import { GS25_LABOR_RULES_KNOWLEDGE as policies } from './data/legacy-handbook/legacyPolicies.mjs';

const ignored = new Set(['badgeColor', 'colorClass', 'dotColor', 'icon', 'highlight', 'originalScans']);
const labels = { title:'Tiêu đề', slogan:'Nguyên tắc', hours:'Giờ', period:'Khung giờ', category:'Nhóm', items:'Danh mục', note:'Lưu ý', rule:'Quy tắc', rules:'Quy tắc', name:'Tên', temperature:'Nhiệt độ', temp:'Nhiệt độ', action:'Thao tác', detail:'Chi tiết', details:'Chi tiết', time:'Thời gian', process:'Cách thực hiện', ingredients:'Nguyên liệu', equipment:'Thiết bị', power:'Công suất', product:'Sản phẩm', type:'Loại', container:'Dụng cụ đựng', soupPortion:'Định lượng súp', microwave:'Lò vi sóng', home:'Gia dụng', commercial:'Công nghiệp', utensil:'Dụng cụ ăn', chaoTrungBay:'Chảo trưng bày', tuDongBTP:'Tủ đông bán thành phẩm', steps:'Các bước', step:'Bước', missedAreas:'Vị trí hay sót', mandatoryMoments:'Thời điểm bắt buộc', provider:'Nhà cung cấp', code:'Mã', color:'Màu', usage:'Cách dùng', dilution:'Tỷ lệ pha', warning:'Cảnh báo', dailyNotice:'Lưu ý hàng ngày', tasks:'Công việc', timeline:'Trình tự', destination:'Nơi gửi', cameraApp:'Ứng dụng chụp ảnh', ffPhotoItems:'Góc chụp FF', urgent:'Ưu tiên', storage:'Bảo quản' };
function prose(value, depth = 0) {
  if (Array.isArray(value)) return value.map(v => `${'  '.repeat(depth)}- ${typeof v === 'object' ? '\n'+prose(v,depth+1) : v}`).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).filter(([k]) => !ignored.has(k)).map(([k,v]) => `${'  '.repeat(depth)}${labels[k] || k}: ${typeof v === 'object' ? '\n'+prose(v,depth+1) : v}`).join('\n');
  return String(value ?? '');
}
const catalog = [];
function add(key,title,content,category,source_doc,aliases=[]) {
  const body = typeof content === 'string' ? content : prose(content);
  if (body.length > 4000) throw new Error(`Split oversized source ${key}: ${body.length}`);
  const hash = createHash('sha256').update('handbook-catalog-v1:'+key).digest('hex').slice(0,32);
  const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}`;
  catalog.push({ key, id, title, content: body, category, source_doc, aliases, images: [], store_id: null });
}
for (const group of FF_RECIPE_GROUPS) for (const item of group.items)
  add(`recipe.${item.id}`,item.name,item.body,'recipe',`Tài liệu quầy FF Onsite — ${group.title}`,item.aliases);
const hotpot = data.hotpotSOP;
hotpot.recipes.forEach((r,i) => add(`hotpot.recipe.${i}`,r.product,{...r,...hotpot.storageAndHold},'recipe',hotpot.code,[r.product.replace(/^Nước /,'')]));
hotpot.servingSOP.forEach((r,i) => add(`hotpot.serving.${i}`,r.type,{...r,...hotpot.storageAndHold},'recipe',hotpot.code,i===0 ? ['ly chả cá','ly chả cá cay'] : ['tô mì chả cá']));
add('hotpot.storage','Bảo quản và trưng bày lẩu',hotpot.storageAndHold,'quality',hotpot.code);
const q=data.qualityAndExpiry;
q.ffSchedules.forEach((r,i) => add(`expiry.ff.${i}`,`${q.title} — ${r.category}`,{...r,rule:q.slogan},'quality','Sổ tay chất lượng'));
add('expiry.gm',`${q.title} — Hàng GM`,q.gmSchedules,'quality','Sổ tay chất lượng');
q.temperatures.forEach((r,i) => add(`temperature.${i}`,`Nhiệt độ bảo quản — ${r.name}`,r,'quality','Sổ tay chất lượng'));
add('expiry.rules','Kiểm tra date, FIFO và hủy hàng',{rule:q.slogan,rules:q.coreRules},'quality','Sổ tay chất lượng');
for (const [shift,r] of Object.entries(data.cleaningRoster.shifts)) add(`cleaning.${shift}`,`${data.cleaningRoster.title} — ${r.name}`,{...r,note:data.cleaningRoster.note,dailyNotice:data.cleaningRoster.dailyNotice},'ops','Lịch vệ sinh');
data.chemicals.systems.forEach((system,i) => {
  // Keep whole chemical entries together; split systems only if they exceed the form limit.
  if(prose(system).length<=4000) add(`chemicals.${i}`,`${data.chemicals.title} — ${system.provider}`,system,'ops','Hướng dẫn hóa chất');
  else for(const [key,value] of Object.entries(system)) if(Array.isArray(value)) value.forEach((r,j)=>add(`chemicals.${i}.${j}`,`${system.provider} — ${r.name || r.code || j+1}`,r,'ops','Hướng dẫn hóa chất'));
});
data.counterCleaning.items.forEach((r,i) => add(`counter.${i}`,`${data.counterCleaning.title} — ${r.name}`,r,'ops','Vệ sinh quầy'));
add('handHygiene',data.handHygiene.title,data.handHygiene,'ops','Hướng dẫn vệ sinh tay');
for(const [shift,r] of Object.entries(data.shiftReports.shifts)) add(`reports.${shift}`,`${data.shiftReports.title} — ${r.name}`,{...r,destination:data.shiftReports.destination,cameraApp:data.shiftReports.cameraApp,ffPhotoItems:data.shiftReports.ffPhotoItems},'ops','Báo cáo ca');
// Preserve older policy text as drafts for human verification, not legal advice.
for(const [key,r] of Object.entries(policies)) if(!key.startsWith('handbook')) add(`policy.${key}`,r.title,r.details.join('\n'),'labor',r.lawRef);
await writeFile(new URL('./data/handbook-catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log(`Prepared ${catalog.length} draft sources (${catalog.filter(c=>c.category==='recipe').length} recipes).`);
