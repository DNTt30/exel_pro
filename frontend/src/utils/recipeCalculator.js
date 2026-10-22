/**
 * Công cụ tính nhanh tỉ lệ công thức pha chế / chế biến (Recipe Quick Scaler)
 * Hỗ trợ tam suất đơn, chia tỉ lệ nhiều thành phần / nhiều lượt nước, làm tròn thông minh.
 */

/**
 * Làm tròn số thông minh (tránh 33.3333333333)
 */
export function roundSmart(val, precision = 1) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
  const factor = Math.pow(10, precision);
  if (!Number.isFinite(val * factor)) return val;
  const rounded = Math.round(val * factor) / factor;
  return rounded;
}

/**
 * Tính toán định lượng công thức theo lượng mong muốn
 * @param {Object} recipe Công thức mẫu hoặc tùy chỉnh
 * @param {number} targetAmount Lượng mong muốn
 * @returns {Object} Kết quả tính toán chi tiết
 */
export function calculateRecipe(recipe, targetAmount) {
  const baseAmount = parseRecipeAmount(recipe?.baseAmount);
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    throw new Error('Định lượng gốc phải lớn hơn 0');
  }

  const target = parseRecipeAmount(targetAmount);
  if (!Number.isFinite(target) || target <= 0) {
    return {
      isValid: false,
      multiplier: 0,
      targetAmount: 0,
      scaledComponents: [],
      totalLiquid: 0,
      error: 'Vui lòng nhập định lượng hợp lệ lớn hơn 0',
    };
  }

  const multiplier = target / baseAmount;
  if (!Number.isFinite(multiplier)) throw new Error('Định lượng quá lớn để tính.');
  if (!recipe.components?.length) throw new Error('Cần ít nhất một thành phần.');

  let totalLiquid = 0;
  const scaledComponents = (recipe.components || []).map(comp => {
    const amount = parseRecipeAmount(comp.amount);
    const rawScaled = amount * multiplier;
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rawScaled)) throw new Error('Lượng thành phần phải là số hữu hạn không âm.');
    const scaled = roundSmart(rawScaled, 3);
    
    // Chỉ cộng các đơn vị thể tích; không tự đổi khối lượng sang thể tích.
    const unitLower = String(comp.unit || '').toLowerCase();
    if (unitLower === 'ml' || unitLower === 'l' || unitLower === 'lit') {
      const ml = unitLower === 'l' || unitLower === 'lit' ? scaled * 1000 : scaled;
      totalLiquid += ml;
      if (!Number.isFinite(totalLiquid)) throw new Error('Tổng thể tích quá lớn để tính.');
    }

    return {
      name: comp.name,
      baseAmount: comp.amount,
      unit: comp.unit,
      scaledAmount: scaled,
      formattedText: `${scaled} ${comp.unit}`,
    };
  });

  return {
    isValid: true,
    recipeId: recipe.id,
    recipeName: recipe.name,
    baseAmount,
    baseUnit: recipe.baseUnit,
    baseIngredientName: recipe.baseIngredientName,
    targetAmount: target,
    multiplier: roundSmart(multiplier, 2),
    multiplierExact: multiplier,
    scaledComponents,
    totalLiquid: roundSmart(totalLiquid, 3),
    notes: recipe.notes || '',
  };
}

/**
 * Phân tích câu hỏi tự nhiên về pha chế / tính nhanh định lượng
 * Vd: "pha cốt cà phê 80g", "tính 80g cà phê bao nhiêu nước"
 */
export function parseRecipeCalculationQuery(query, presets = []) {
  if (typeof query !== 'string') return null;
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  // Never infer default quantities: use an explicit input ratio or a supplied approved recipe.
  if (!/ca phe|cafe|cot phin/.test(q) || /nhiet|bao quan|han dung|huy|bao lau|calo|caffeine|cafein|gia tien/.test(q)) return null;
  if (!/pha|tinh|ty le|dinh luong|bao nhieu nuoc|->|→/.test(q)) return null;
  const grams = [...q.matchAll(/(-?\d+(?:[.,]\d+)?)\s*(kg|gram|g)\b/g)];
  if (!grams.length || grams.length > 2) return null;
  const inGrams = match => parseRecipeAmount(match[1]) * (match[2] === 'kg' ? 1000 : 1);
  const target = inGrams(grams.at(-1));
  if (!(target > 0) || !Number.isFinite(target)) return null;
  let preset = presets.length === 1 ? presets[0] : null;
  if (grams.length === 2) {
    const base = inGrams(grams[0]);
    const between = q.slice(grams[0].index + grams[0][0].length, grams[1].index);
    const waters = [...between.matchAll(/(-?\d+(?:[.,]\d+)?)\s*ml\b/g)];
    if (!(base > 0) || waters.length !== 2 || waters.some(w => parseRecipeAmount(w[1]) < 0)) return null;
    preset = { baseAmount: base, baseUnit: 'g', baseIngredientName: 'cà phê', components: waters.map((w, i) => ({ name: `Nước lượt ${i + 1}`, amount: parseRecipeAmount(w[1]), unit: 'ml' })) };
  } else if (/\d\s*ml\b/.test(q)) return null;
  if (!preset) return null;
  try { return { preset, targetAmount: target, calculation: calculateRecipe(preset, target) }; }
  catch { return null; }
}

export function parseRecipeAmount(value) {
  const text = String(value ?? '').trim();
  return /^-?\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
}

export function answerRecipeCalculationQuery(query) {
  const parsed = parseRecipeCalculationQuery(query);
  if (!parsed) return null;
  const r = parsed.calculation;
  return `Tính theo tỷ lệ ${r.baseAmount}g → ${r.scaledComponents.map(c => `${c.baseAmount}${c.unit}`).join(' + ')}:\n\n`
    + `**${r.targetAmount}g / ${r.baseAmount}g = ×${r.multiplierExact}**\n\n`
    + r.scaledComponents.map(c => `- ${c.name}: **${c.scaledAmount} ${c.unit}**`).join('\n')
    + `\n\nTổng nước thêm vào: **${r.totalLiquid} ml**. Đây là phép tính từ tỷ lệ ví dụ bạn cung cấp; không phải lượng cốt thu được.`;
}
