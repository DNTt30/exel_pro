import { describe, it, expect } from 'vitest';
import { lookupFfOnsiteRecipe } from '../data/ffOnsiteRecipes';
import { askAICopilot, askOllamaCopilot } from '../utils/aiSchedulerEngine';

const ctx = { employees: [], weekSchedule: {}, storeId: 'VN0485', currentWeek: '2026-08-17' };

describe('FF Onsite recipes from giấy quầy counter', () => {
  it('returns trà tắc sizes from the paper', () => {
    const r = lookupFfOnsiteRecipe('công thức trà tắc');
    expect(r).toContain('140ml');
    expect(r).toContain('2 trái tắc');
    expect(r).toContain('280ml');
    expect(r).toContain('4 trái tắc');
  });

  it('returns milo mix ratios', () => {
    const r = lookupFfOnsiteRecipe('pha milo như nào');
    expect(r).toContain('600g');
    expect(r).toContain('800ml');
    expect(r).toContain('1000ml');
    expect(r).toContain('250ml');
  });

  it('picks Đại hồng bào over generic trà sữa', () => {
    const r = lookupFfOnsiteRecipe('trà sữa đại hồng bào size XL');
    expect(r).toContain('280ml');
    expect(r).not.toContain('HongKong');
  });

  it('picks HongKong/socola when named', () => {
    const r = lookupFfOnsiteRecipe('trà sữa socola nóng');
    expect(r).toContain('150ml');
    expect(r).toContain('2 gói');
  });

  it('picks specific xúc xích over generic', () => {
    const r = lookupFfOnsiteRecipe('xúc xích hoshi chiên bao lâu');
    expect(r).toContain('2p–2p30');
    expect(r).not.toContain('School');
  });

  it('returns hotdog 25 vs 28 correctly', () => {
    expect(lookupFfOnsiteRecipe('hotdog 25')).toContain('10g ngô');
    expect(lookupFfOnsiteRecipe('hotdog 25')).toContain('School');
    expect(lookupFfOnsiteRecipe('công thức hotdog 28')).toContain('Hoshi');
    expect(lookupFfOnsiteRecipe('công thức hotdog 28')).not.toContain('ngô');
  });

  it('returns xốt tok and xốt rose from paper', () => {
    expect(lookupFfOnsiteRecipe('xốt tok')).toContain('400g');
    expect(lookupFfOnsiteRecipe('xốt tok')).toContain('1200ml');
    expect(lookupFfOnsiteRecipe('công thức xốt rose')).toContain('200g');
    expect(lookupFfOnsiteRecipe('công thức xốt rose')).toContain('1000ml');
  });

  it('returns tteobokki signature phô mai, not the version without cheese', () => {
    const r = lookupFfOnsiteRecipe('tteobokki signature phô mai');
    expect(r).toContain('1 lát phô mai');
    expect(r).toContain('1 trứng');
  });

  it('returns raboki koreno time', () => {
    const r = lookupFfOnsiteRecipe('raboki');
    expect(r).toContain('Koreno');
    expect(r).toContain('4–5p');
    expect(r).toContain('5 tok');
  });

  it('returns both chicken recipes for công thức gà, not the catalog', () => {
    const r = lookupFfOnsiteRecipe('công thức gà');
    expect(r).toContain('nugget');
    expect(r).toContain('2p');
    expect(r).toContain('lá chanh');
    expect(r).toContain('số 2 — 2 lần');
    expect(r.toLowerCase()).not.toContain('nhóm nước');
    expect(lookupFfOnsiteRecipe('gà nugget')).toContain('nugget');
    expect(lookupFfOnsiteRecipe('gà nugget')).not.toContain('lá chanh');
    expect(lookupFfOnsiteRecipe('gà nướng')).toContain('lá chanh');
  });

  it('does not treat schedule questions as recipes', () => {
    expect(lookupFfOnsiteRecipe('Tú mai làm ca mấy giờ?')).toBeNull();
    expect(lookupFfOnsiteRecipe('đổi ca với đồng nghiệp')).toBeNull();
    expect(lookupFfOnsiteRecipe('Hôm nay ngày mấy?')).toBeNull();
    expect(lookupFfOnsiteRecipe('Fulltime một tuần được nghỉ mấy ngày?')).toBeNull();
  });

  it('askAICopilot serves recipe before the GS25 uniform catch-all', () => {
    const r = askAICopilot('công thức trà tắc GS25', ctx);
    expect(r).toContain('140ml');
    expect(r).not.toContain('Đồng phục');
  });

  it('matches quick-prompt with emoji and skips Ollama', async () => {
    const r = askAICopilot('🍊 Công thức trà tắc', ctx);
    expect(r).toContain('140ml');
    expect(r).toContain('2 trái tắc');
    const viaOllama = await askOllamaCopilot('🍊 Công thức trà tắc', ctx);
    expect(viaOllama).toContain('140ml');
    expect(viaOllama).not.toContain('Trợ lý AI Cửa hàng');
  });

  it('askAICopilot still answers schedule after recipe wiring', () => {
    const r = askAICopilot('Tú mai làm ca mấy giờ?', {
      ...ctx,
      employees: [{ id: '260716009', name: 'DƯƠNG NGỌC TÚ', dept: 'VN0485', type: 'STFT' }],
      weekSchedule: { '260716009': { T2: 'off', T3: '6-14', T4: '14-22', T5: '14-22', T6: '6-14', T7: '6-14', CN: '6-14' } }
    });
    expect(r).toContain('TÚ');
  });
});
