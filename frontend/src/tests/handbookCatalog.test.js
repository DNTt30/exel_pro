import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import catalog from '../../../scripts/data/handbook-catalog.json';
import { FF_RECIPE_GROUPS } from '../../../scripts/data/legacy-handbook/ffOnsiteRecipes.mjs';
import { GS25_HANDBOOK_DATA } from '../../../scripts/data/legacy-handbook/gs25HandbookData.mjs';
import { handbookDraftSchema, handbookReaderEntries } from '../utils/handbookKnowledge';
import { retrieveHandbook } from '../utils/copilotRetrieval';
import { askAICopilot } from '../utils/aiSchedulerEngine';

it('preserves every original recipe and quantity as an import draft, including hotpot', () => {
  for (const item of FF_RECIPE_GROUPS.flatMap(g => g.items)) {
    const doc = catalog.find(c => c.key === `recipe.${item.id}`);
    expect(doc.content).toBe(item.body); expect(doc.aliases).toEqual(item.aliases);
  }
  GS25_HANDBOOK_DATA.hotpotSOP.recipes.forEach((r,i) => {
    const text = catalog.find(c => c.key === `hotpot.recipe.${i}`).content;
    for (const v of [...r.ingredients,r.process,r.time,r.power]) expect(text).toContain(v);
  });
  for(const doc of catalog) expect(handbookDraftSchema.safeParse(doc).success, doc.title).toBe(true);
  expect(new Set(catalog.map(c=>c.id)).size).toBe(catalog.length);
});
it('empty/draft database means no recipe for employees, quick lookup or AI; never static fallback', () => {
  expect(handbookReaderEntries(catalog)).toEqual([]);
  expect(retrieveHandbook('trà cóc xí muội').chunks).toEqual([]);
  expect(askAICopilot('trà cóc xí muội')).not.toContain('250ml');
});
it('rename, quantities and archive follow the same stable record without reviving a legacy copy', () => {
  const base = catalog.find(c=>c.key==='recipe.tra-coc');
  const updated = { ...base, title:'Trà cóc mới', aliases:['tra coc xi muoi'], content:'Size L: 220ml.', is_active:true,published_at:'2026-10-18' };
  expect(handbookReaderEntries([updated])).toEqual([updated]);
  const result = retrieveHandbook('tra coc xi muoi', [], { entries:[updated] });
  expect(result.text).toContain('220ml'); expect(result.text).not.toContain('250ml');
  const archived = { ...updated,is_active:false };
  expect(handbookReaderEntries([archived])).toEqual([]);
  expect(retrieveHandbook('tra coc xi muoi',[],{ entries:[archived] }).chunks).toEqual([]);
  expect(retrieveHandbook('tra coc xi muoi',[],{ entries:[archived] }).text).toContain('đã được Admin gỡ');
});
it('production JS has no imports of legacy handbook snapshots or seed data', () => {
  function walk(dir) {
    for(const entry of readdirSync(dir,{ withFileTypes:true })) {
      if(entry.name==='tests') continue;
      const file=resolve(dir,entry.name);
      if(entry.isDirectory()) walk(file);
      else if(/\.(js|jsx)$/.test(file)) expect(readFileSync(file,'utf8'),file).not.toMatch(/(?:from|import\()\s*['"][^'"]*(?:ffOnsiteRecipes|gs25HandbookData|handbook-catalog|legacy-handbook)/);
    }
  }
  walk(resolve('src'));
});
