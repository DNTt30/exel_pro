import Button from '../ui/Button';

const input = 'mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-600';

export default function RecipeSpecFields({ value, onChange, disabled = false }) {
  const edit = (index, field, next) =>
    onChange({
      ...value,
      components: value.components.map((c, i) => (i === index ? { ...c, [field]: next } : c))
    });
  const number = text => text;

  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
      <legend className="px-1.5 text-xs sm:text-sm font-bold text-slate-700">
        Định lượng công thức gốc
      </legend>
      <label className="block text-xs sm:text-sm font-medium text-slate-700">
        Nguyên liệu chính
        <input
          className={input}
          maxLength={100}
          value={value.baseIngredientName}
          onChange={e => onChange({ ...value, baseIngredientName: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs sm:text-sm font-medium text-slate-700">
          Lượng {value.baseIngredientName || 'nguyên liệu'} gốc
          <input
            data-testid="recipe-base"
            className={input}
            inputMode="decimal"
            value={value.baseAmount}
            onChange={e => onChange({ ...value, baseAmount: number(e.target.value) })}
          />
        </label>
        <label className="text-xs sm:text-sm font-medium text-slate-700">
          Đơn vị lượng gốc
          <input
            className={input}
            maxLength={24}
            value={value.baseUnit}
            onChange={e => onChange({ ...value, baseUnit: e.target.value })}
          />
        </label>
      </div>
      <div className="space-y-2">
        {value.components.map((c, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_5rem_4rem_auto] items-end gap-2 rounded-xl bg-white p-2.5 border border-slate-200/80"
          >
            <label className="min-w-0 text-xs sm:text-sm font-medium text-slate-700">
              Thành phần {index + 1}
              <input
                className={input}
                maxLength={100}
                value={c.name}
                onChange={e => edit(index, 'name', e.target.value)}
              />
            </label>
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Lượng {index + 1}
              <input
                className={input}
                inputMode="decimal"
                value={c.amount}
                onChange={e => edit(index, 'amount', number(e.target.value))}
              />
            </label>
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Đơn vị {index + 1}
              <input
                className={input}
                maxLength={24}
                value={c.unit}
                onChange={e => edit(index, 'unit', e.target.value)}
              />
            </label>
            {!disabled && (
              <button
                type="button"
                className="min-h-10 px-2.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 font-bold cursor-pointer"
                aria-label={`Bỏ thành phần ${index + 1}`}
                disabled={value.components.length === 1}
                onClick={() =>
                  onChange({
                    ...value,
                    components: value.components.filter((_, i) => i !== index)
                  })
                }
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <Button
          disabled={value.components.length >= 30}
          onClick={() =>
            onChange({
              ...value,
              components: [...value.components, { name: '', amount: 0, unit: 'ml' }]
            })
          }
        >
          Thêm thành phần
        </Button>
      )}
      <label className="block text-xs sm:text-sm font-medium text-slate-700">
        Ghi chú công thức
        <textarea
          className={input}
          maxLength={500}
          rows={2}
          value={value.notes || ''}
          onChange={e => onChange({ ...value, notes: e.target.value })}
        />
      </label>
    </fieldset>
  );
}
