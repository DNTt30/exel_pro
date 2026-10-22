import { useState } from 'react';
import { calculateRecipe, roundSmart, parseRecipeAmount } from '../../utils/recipeCalculator';
import { recipeCatalog, readRecipePreferences, rememberRecipe } from '../../utils/recipeCatalog';
import { stripVi } from '../../utils/textSearch';
import customExample from '../../data/customRecipeExample.json';
import { renderMarkdown } from '../ui/MarkdownText';
import Button from '../ui/Button';
import RecipeSpecFields from './RecipeSpecFields';

const input = 'mt-1.5 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all';
const format = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
const QUICK_MULTIPLIERS = [0.5, 1, 1.5, 2, 3, 4];

export default function RecipeCalculator({ entries = [], identity = 'anonymous', loading = false, error = '' }) {
  const [preferences, setPreferences] = useState(() => readRecipePreferences(identity));
  const [choice, setChoice] = useState(preferences.selected);
  const [search, setSearch] = useState('');
  const catalog = recipeCatalog(entries).sort(
    (a, b) => (Number(preferences.counts[b.id]) || 0) - (Number(preferences.counts[a.id]) || 0) || a.name.localeCompare(b.name, 'vi')
  );
  const selected = choice ? catalog.find(r => r.id === choice) : catalog[0];
  const unavailable = choice && choice !== 'custom' && !selected;
  const filtered = catalog.filter(
    r => r.id === selected?.id || stripVi(`${r.name} ${r.baseIngredientName}`).includes(stripVi(search))
  );

  return (
    <section aria-label="Tính nhanh tỷ lệ công thức" data-testid="recipe-calculator" className="space-y-4">
      {loading ? (
        <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 text-center">
          Đang tải công thức đã duyệt…
        </p>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
          Không tải được công thức mẫu. Hãy tải lại Sổ tay; không dùng bản cũ để tính.
        </p>
      ) : (
        <>
          {catalog.length > 5 && (
            <label className="block text-sm font-medium text-slate-700">
              Tìm công thức
              <input
                className={input}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tên món hoặc nguyên liệu…"
              />
            </label>
          )}
          <label className="block text-sm font-bold text-slate-800">
            Công thức áp dụng
            <select
              data-testid="recipe-choice"
              className={input}
              value={selected?.id || 'custom'}
              onChange={e => {
                setChoice(e.target.value);
                setPreferences(rememberRecipe(identity, e.target.value, preferences));
              }}
            >
              {filtered.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.storeId || 'Toàn đơn vị'} · v{r.revision}
                </option>
              ))}
              <option value="custom">Tùy chỉnh</option>
            </select>
          </label>
          {!catalog.length && (
            <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              Chưa có công thức đã duyệt đủ định lượng để tính. Quản lý có thể bổ sung trong Sổ tay.
            </p>
          )}
          {unavailable && (
            <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Công thức lần trước không còn khả dụng; hãy chọn lại.
            </p>
          )}
          {!unavailable && (
            <Calculation
              key={`${selected?.id || 'custom'}:${selected?.revision || 0}`}
              original={selected || customExample}
              approved={!!selected}
            />
          )}
        </>
      )}
    </section>
  );
}

function Calculation({ original, approved }) {
  const [recipe, setRecipe] = useState(() => structuredClone(original));
  const [target, setTarget] = useState(approved ? String(original.baseAmount) : '80');
  const [editing, setEditing] = useState(!approved);
  const dirty = JSON.stringify(recipe) !== JSON.stringify(original);
  let result, error;
  try {
    result = calculateRecipe(recipe, target);
    if (!result.isValid) error = result.error;
  } catch (e) {
    error = e.message;
  }

  const baseAmt = parseRecipeAmount(recipe.baseAmount);

  return (
    <div className="space-y-4">
      {approved ? (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm text-slate-600">
          <p>
            Sổ tay: <b className="text-slate-900">{original.name}</b> · {original.storeId || 'Toàn đơn vị'} · Phiên bản{' '}
            {original.revision} · Công bố {new Date(original.publishedAt).toLocaleDateString('vi-VN')}
          </p>
          <details className="rounded-lg bg-white border border-slate-200/80 p-2.5">
            <summary className="cursor-pointer font-semibold text-blue-700 text-xs sm:text-sm">
              Xem tài liệu Sổ tay gốc
            </summary>
            <div className="mt-2 text-slate-800">{renderMarkdown(original.source.content)}</div>
          </details>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button onClick={() => setEditing(v => !v)}>
              {editing ? 'Thu gọn chỉnh sửa' : 'Điều chỉnh cho lần pha này'}
            </Button>
            {(dirty || editing) && (
              <Button
                onClick={() => {
                  setRecipe(structuredClone(original));
                  setEditing(false);
                }}
              >
                Khôi phục công thức gốc
              </Button>
            )}
          </div>
          {dirty && (
            <p role="status" className="font-semibold text-amber-800 text-xs sm:text-sm">
              Đã chỉnh so với công thức gốc — chỉ áp dụng lần pha này.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-3">
          Tùy chỉnh: bắt đầu từ ví dụ cà phê bạn cung cấp. Đây không phải công thức mẫu đã duyệt.
        </p>
      )}

      {/* Nhập lượng muốn pha + Chọn nhanh hệ số */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 space-y-2.5">
        <label className="block text-sm font-bold text-slate-800">
          Lượng {recipe.baseIngredientName || 'nguyên liệu'} muốn pha ({recipe.baseUnit})
          <input
            className={input}
            data-testid="recipe-target"
            inputMode="decimal"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
        </label>

        {Number.isFinite(baseAmt) && baseAmt > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Chọn nhanh:</span>
            {QUICK_MULTIPLIERS.map(mult => {
              const quickVal = roundSmart(baseAmt * mult, 2);
              const isSelected = Number(String(target).replace(',', '.')) === quickVal;
              return (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setTarget(String(quickVal))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  ×{mult} ({format(quickVal)} {recipe.baseUnit})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <RecipeSpecFields value={recipe} onChange={setRecipe} disabled={!editing} />

      {/* Bảng kết quả tính tỉ lệ trực quan */}
      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-800">
          {error}
        </p>
      ) : (
        <div
          role="status"
          aria-live="polite"
          data-testid="recipe-result"
          className="space-y-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 text-emerald-950 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
            <p className="text-sm font-bold text-emerald-900">
              {format(result.targetAmount)} {recipe.baseUnit} ÷ {format(result.baseAmount)} {recipe.baseUnit} = gấp{' '}
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold">
                {format(result.multiplierExact)} lần
              </span>
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {result.scaledComponents.map((c, i) => (
              <li
                key={i}
                className="rounded-xl bg-white/90 border border-emerald-200/80 p-3 flex items-center justify-between gap-2 shadow-2xs"
              >
                <span className="text-xs sm:text-sm font-semibold text-slate-700">
                  {c.name || `Thành phần ${i + 1}`}:
                </span>
                <strong className="text-base sm:text-lg font-extrabold text-emerald-700">
                  {format(c.scaledAmount)} {c.unit}
                </strong>
              </li>
            ))}
          </ul>

          <div className="pt-1 flex items-center justify-between text-sm font-semibold text-emerald-900">
            <span>Tổng chất lỏng thêm vào:</span>
            <strong className="text-base font-black text-emerald-800">{format(result.totalLiquid)} ml</strong>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed">
        Lượng gốc và lượng muốn pha dùng cùng đơn vị. Làm tròn tối đa 3 chữ số thập phân. Chỉ nhân định lượng, không tự đổi thời gian, nhiệt độ hay tính lượng thành phẩm. Phép tính không sửa công thức Sổ tay đã duyệt.
      </p>
    </div>
  );
}
