import { describe, it, expect } from 'vitest';
import {
  calculateRecipe,
  roundSmart,
  parseRecipeCalculationQuery,
  answerRecipeCalculationQuery,
} from '../utils/recipeCalculator';
import coffee from '../data/customRecipeExample.json';
import { sampleRecipeEntries } from '../sandbox/recipeFixture';
import { legacyRecipeSpec } from '../utils/recipeCatalog';
const DEFAULT_RECIPE_PRESETS = [{...coffee,id:'cafe-cot-phin'}, {...legacyRecipeSpec(sampleRecipeEntries[1]),id:'milo-binh-lon'}];

describe('Recipe Calculator & Quick Scaler', () => {
  it('uses the target at the end of the full example, and respects explicit source amounts', () => {
    const result = parseRecipeCalculationQuery('Pha cốt cà phê 20g-> 20ml lượt đầu + 45ml lượt sau . 80g -> ??');
    expect(result.targetAmount).toBe(80);
    expect(result.calculation.totalLiquid).toBe(260);
    expect(parseRecipeCalculationQuery('cà phê 10g -> 15ml + 30ml. 80g -> ?').calculation.totalLiquid).toBe(360);
    expect(answerRecipeCalculationQuery('pha cốt cà phê 80g')).toBeNull();
  });
  it('accepts decimal commas and kg, and never treats ml as grams', () => {
    expect(calculateRecipe(DEFAULT_RECIPE_PRESETS[0], '80,5').scaledComponents[1].scaledAmount).toBe(181.125);
    expect(parseRecipeCalculationQuery('pha cốt cà phê 0,08kg', [DEFAULT_RECIPE_PRESETS[0]]).targetAmount).toBe(80);
    expect(parseRecipeCalculationQuery('pha cốt cà phê 80ml')).toBeNull();
    expect(parseRecipeCalculationQuery('pha cốt cà phê -80g')).toBeNull();
    expect(parseRecipeCalculationQuery('pha cốt cà phê 80g bảo quản bao lâu')).toBeNull();
    expect(parseRecipeCalculationQuery('milo 800g')).toBeNull();
  });
  it('rejects nonfinite, malformed base/component amounts', () => {
    expect(calculateRecipe(DEFAULT_RECIPE_PRESETS[0], Infinity).isValid).toBe(false);
    expect(() => calculateRecipe({...DEFAULT_RECIPE_PRESETS[0],baseAmount:Infinity},80)).toThrow();
    expect(() => calculateRecipe({...DEFAULT_RECIPE_PRESETS[0],components:[{amount:-2,unit:'ml'}]},80)).toThrow();
  });
  it('correctly calculates coffee 20g -> 80g exactly as user requested', () => {
    const coffeeRecipe = DEFAULT_RECIPE_PRESETS.find(r => r.id === 'cafe-cot-phin');
    expect(coffeeRecipe).toBeDefined();

    // 20g cà phê -> 20ml lượt 1 + 45ml lượt 2.
    // Nếu pha 80g -> hệ số nhân là 4 lần.
    const result = calculateRecipe(coffeeRecipe, 80);

    expect(result.isValid).toBe(true);
    expect(result.multiplier).toBe(4);
    expect(result.targetAmount).toBe(80);

    // Lượt 1: 20 * 4 = 80ml
    expect(result.scaledComponents[0].name).toContain('lượt 1');
    expect(result.scaledComponents[0].scaledAmount).toBe(80);
    expect(result.scaledComponents[0].unit).toBe('ml');

    // Lượt 2: 45 * 4 = 180ml
    expect(result.scaledComponents[1].name).toContain('lượt 2');
    expect(result.scaledComponents[1].scaledAmount).toBe(180);
    expect(result.scaledComponents[1].unit).toBe('ml');

    // Tổng lượng nước: 80 + 180 = 260ml
    expect(result.totalLiquid).toBe(260);
  });

  it('correctly calculates fractional multipliers (e.g. 50g cà phê)', () => {
    const coffeeRecipe = DEFAULT_RECIPE_PRESETS.find(r => r.id === 'cafe-cot-phin');
    const result = calculateRecipe(coffeeRecipe, 50);

    // 50 / 20 = 2.5
    expect(result.multiplier).toBe(2.5);
    // 20 * 2.5 = 50ml
    expect(result.scaledComponents[0].scaledAmount).toBe(50);
    // 45 * 2.5 = 112.5ml
    expect(result.scaledComponents[1].scaledAmount).toBe(112.5);
    expect(result.totalLiquid).toBe(162.5);
  });

  it('correctly calculates Milo scaling (e.g. 1200g bột)', () => {
    const miloRecipe = DEFAULT_RECIPE_PRESETS.find(r => r.id === 'milo-binh-lon');
    const result = calculateRecipe(miloRecipe, 1200);

    // 1200 / 600 = 2
    expect(result.multiplier).toBe(2);
    // 800ml * 2 = 1600ml
    expect(result.scaledComponents[0].scaledAmount).toBe(1600);
    // 1000ml * 2 = 2000ml
    expect(result.scaledComponents[1].scaledAmount).toBe(2000);
    expect(result.totalLiquid).toBe(3600);
  });

  it('correctly scales custom recipes with user-defined ingredients', () => {
    const customRecipe = {
      id: 'custom-tea',
      name: 'Trà hoa quả đặc biệt',
      baseAmount: 100,
      baseUnit: 'g',
      baseIngredientName: 'Cốt trà',
      components: [
        { name: 'Nước đường', amount: 50, unit: 'ml' },
        { name: 'Mứt xoài', amount: 30, unit: 'g' },
        { name: 'Nước cốt chanh', amount: 15, unit: 'ml' },
      ],
    };

    const result = calculateRecipe(customRecipe, 300);
    expect(result.multiplier).toBe(3);
    expect(result.scaledComponents[0].scaledAmount).toBe(150);
    expect(result.scaledComponents[1].scaledAmount).toBe(90);
    expect(result.scaledComponents[2].scaledAmount).toBe(45);
  });

  it('handles invalid or zero target amounts gracefully', () => {
    const coffeeRecipe = DEFAULT_RECIPE_PRESETS[0];
    const resZero = calculateRecipe(coffeeRecipe, 0);
    expect(resZero.isValid).toBe(false);
    expect(resZero.scaledComponents).toHaveLength(0);

    const resNeg = calculateRecipe(coffeeRecipe, -10);
    expect(resNeg.isValid).toBe(false);

    const resNaN = calculateRecipe(coffeeRecipe, 'abc');
    expect(resNaN.isValid).toBe(false);
  });

  it('parses natural language queries for coffee base calculation', () => {
    const parsed = parseRecipeCalculationQuery('pha cốt cà phê 80g', [DEFAULT_RECIPE_PRESETS[0]]);
    expect(parsed).not.toBeNull();
    expect(parsed.preset.id).toBe('cafe-cot-phin');
    expect(parsed.targetAmount).toBe(80);
    expect(parsed.calculation.scaledComponents[0].scaledAmount).toBe(80);
    expect(parsed.calculation.scaledComponents[1].scaledAmount).toBe(180);
  });

  it('roundSmart rounds to specified decimal places cleanly', () => {
    expect(roundSmart(33.333333, 1)).toBe(33.3);
    expect(roundSmart(20.000000, 1)).toBe(20);
    expect(roundSmart(45.56, 1)).toBe(45.6);
  });
});
