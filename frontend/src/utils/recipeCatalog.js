import { z } from 'zod';
import { stripVi } from './textSearch';

const amount = z.preprocess(v => typeof v === 'string' && /^\d+(?:[.,]\d+)?$/.test(v.trim()) ? Number(v.replace(',', '.')) : v, z.number().finite().min(0).max(1e9));
const unit = z.string().trim().min(1).max(24);
export const recipeSpecSchema = z.object({
  baseIngredientName: z.string().trim().min(1).max(100),
  baseAmount: amount.refine(n => n > 0, 'Lượng gốc phải lớn hơn 0.'), baseUnit: unit,
  components: z.array(z.object({ name: z.string().trim().min(1).max(100), amount, unit })).min(1).max(30),
  notes: z.string().trim().max(500).default(''),
});

// Read a single explicitly named mixing line from older approved documents.
// Serving sizes and hot-drink variants on other lines are never mixed into a batch.
export function legacyRecipeSpec(entry) {
  const lines = (entry.content || '').replace(/\*\*/g, '').split('\n').filter(line => /^\s*[•*-]?\s*Pha(?: Nestea)?:/i.test(line));
  if (lines.length !== 1) return null;
  const parts = lines[0].split(':').slice(1).join(':').trim().split(/\s*\+\s*/);
  if (parts.length < 2) return null;
  const base = parts[0].match(/^(?:1 gói\s*\()?([\d.,]+)g\)?\s*(?:bột)?$/i);
  const components = parts.slice(1).map(part => part.match(/^([\d.,]+)ml\s+(.+)$/i));
  if (!base || components.some(c => !c)) return null;
  const ingredient = stripVi(entry.title).includes('nestea') ? 'bột Nestea' : `bột ${entry.title}`;
  const spec = { baseIngredientName: ingredient, baseAmount: Number(base[1].replace(',', '.')), baseUnit: 'g',
    components: components.map(c => ({ name: c[2], amount: Number(c[1].replace(',', '.')), unit: 'ml' })), notes: '' };
  return recipeSpecSchema.safeParse(spec).success ? spec : null;
}

export function recipeFromEntry(entry) {
  if (entry.category !== 'recipe' || !entry.is_active || !entry.published_at) return null;
  const parsed = recipeSpecSchema.safeParse(entry.recipe_spec ?? legacyRecipeSpec(entry));
  return parsed.success ? { ...parsed.data, id: entry.id, name: entry.title, revision: entry.revision,
    publishedAt: entry.published_at, storeId: entry.store_id, source: entry } : null;
}
export const recipeCatalog = entries => entries.map(recipeFromEntry).filter(Boolean);
export const withoutLegacyMixingLine = content => content.split('\n').filter(line => !/^\s*[•*-]?\s*Pha(?: Nestea)?:/i.test(line.replace(/\*\*/g,''))).join('\n');
export const recipeSpecText = spec => spec ? `Định lượng gốc: ${spec.baseAmount} ${spec.baseUnit} ${spec.baseIngredientName}\n${spec.components.map(c => `${c.name}: ${c.amount} ${c.unit}`).join('\n')}\n${spec.notes || ''}` : '';

export function recipePreferenceKey(identity) { return `recipe-choice-v1:${identity || 'anonymous'}`; }
export function readRecipePreferences(identity) {
  try {
    const p = JSON.parse(localStorage.getItem(recipePreferenceKey(identity)) || '{}');
    return { selected: typeof p.selected === 'string' ? p.selected : '', counts: p.counts && typeof p.counts === 'object' ? p.counts : {} };
  } catch { return { selected: '', counts: {} }; }
}
export function rememberRecipe(identity, id, previous) {
  const next = { selected: id, counts: { ...previous.counts, [id]: Math.min(1e6, (Number(previous.counts[id]) || 0) + 1) } };
  try { localStorage.setItem(recipePreferenceKey(identity), JSON.stringify(next)); } catch { /* Calculator works without storage. */ }
  return next;
}
