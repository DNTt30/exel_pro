import { z } from 'zod';
import { recipeSpecSchema } from './recipeCatalog';


export const HANDBOOK_CATEGORIES = [
  { value: 'recipe', label: 'Công thức pha chế / chế biến' },
  { value: 'quality', label: 'Chất lượng & hạn dùng' },
  { value: 'ops', label: 'Quy trình vận hành' },
  { value: 'labor', label: 'Quy định nhân sự' },
  { value: 'general', label: 'Quy định chung' },
];
export const handbookDraftSchema = z.object({
  title: z.string().trim().min(2, 'Tên tài liệu cần ít nhất 2 ký tự.').max(160),
  content: z.string().trim().min(5, 'Hãy nhập nội dung đầy đủ.').max(4000, 'Tối đa 4.000 ký tự; hãy tách thành từng quy trình.'),
  category: z.enum(['recipe', 'quality', 'ops', 'labor', 'general']),
  source_doc: z.string().trim().max(300).nullable().optional(),
  aliases: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  store_id: z.string().trim().min(1).nullable(),
  images: z.array(z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/)).max(3).default([]),
  recipe_spec: recipeSpecSchema.nullable().optional(),
}).refine(d => !d.recipe_spec || d.category === 'recipe', { message: 'Bảng định lượng chỉ dùng cho tài liệu công thức.', path:['recipe_spec'] });
export const handbookScopeLabel = entry => entry.store_id ? `Cửa hàng ${entry.store_id}` : 'Toàn đơn vị';
// Only approved current text enters retrieval. Images are visual references, not OCR input.
export function publishedKnowledge(entries = [], storeIds = []) {
  const stores = new Set(storeIds);
  return entries.filter(e => e.is_active === true && e.published_at && (!e.store_id || stores.has(e.store_id)));
}

/** Only server-approved records; no bundled fallback after rename/archive or fetch failure. */
export function handbookReaderEntries(entries = []) {
  return entries.filter(e => e.is_active === true && e.published_at);
}
