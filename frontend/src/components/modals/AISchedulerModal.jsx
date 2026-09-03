import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Sparkles, X, Loader2, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, buildStaffingByDay, suggestStaffingFromDemand, normalizeStoreDemand } from '../../data/constants';
import { generateAISchedule, auditSchedule } from '../../utils/aiSchedulerEngine';
import { demandToMatrices } from '../../utils/revenueDemand';
import { analyzeSalesImages } from '../../utils/salesImageAnalyzer';
import { useShallow } from 'zustand/react/shallow';

function fmtVnd(n) {
  const v = Number(n) || 0;
  if (!v) return '';
  if (v >= 1_000_000) {
    const tr = v / 1_000_000;
    return `${tr % 1 === 0 ? tr : tr.toFixed(1)}tr`;
  }
  return v.toLocaleString('vi-VN');
}

function DemandField({ label, customers, sales, onCustomers, onSales }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-2 items-center">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <input
        type="number"
        min="0"
        placeholder="Lượt khách"
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono"
        value={customers || ''}
        onChange={e => onCustomers(e.target.value)}
      />
      <input
        type="number"
        min="0"
        placeholder="Doanh số (đ)"
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono"
        value={sales || ''}
        onChange={e => onSales(e.target.value)}
      />
    </div>
  );
}

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

export default function AISchedulerModal({ isOpen, onClose, currentWeek, storeId }) {
  const { employees, schedule, applyAiSchedule, user, stores } = useStore(useShallow((s) => ({ employees: s.employees, schedule: s.schedule, applyAiSchedule: s.applyAiSchedule, user: s.user, stores: s.stores })));
  const weekSched = schedule[currentWeek] || EMPTY_SCHED;
  const defaultStoreId = storeId === 'ALL' ? (user?.dept || stores[0]?.id || '') : storeId;

  const [selectedStoreId, setSelectedStoreId] = useState(defaultStoreId);

  const activeStoreId = selectedStoreId;
  const activeStore = stores.find(s => s.id === activeStoreId);
  const fileRef = useRef(null);

  const [demand, setDemand] = useState(() => normalizeStoreDemand(activeStore?.demand));
  const [previews, setPreviews] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reading, setReading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [error, setError] = useState('');

  const storeEmps = useMemo(
    () => employees.filter(e => e.dept === activeStoreId),
    [employees, activeStoreId]
  );

  const auditResult = useMemo(
    () => auditSchedule(employees, weekSched, activeStoreId),
    [employees, weekSched, activeStoreId]
  );

  const staffing = useMemo(() => suggestStaffingFromDemand(demand), [demand]);
  const hasDemand = !!(demand.weekday.sales || demand.weekday.customers || demand.weekend.sales || demand.weekend.customers);

  const weekDayDates = useMemo(() => {
    if (!currentWeek) return {};
    const parts = currentWeek.split('-').map(Number);
    if (parts.length !== 3) return {};
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    const map = {};
    WEEK_DAYS.forEach((d, idx) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + idx);
      map[d] = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    });
    return map;
  }, [currentWeek]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedStoreId(defaultStoreId);
    setDemand(normalizeStoreDemand(stores.find(s => s.id === defaultStoreId)?.demand));
    setPreviews([]);
    setNotes([]);
    setAiResult(null);
    setError('');
    setShowAudit(false);
  }, [isOpen, defaultStoreId, stores]);

  // Khi đổi cửa hàng → reset demand
  useEffect(() => {
    setDemand(normalizeStoreDemand(activeStore?.demand));
    setAiResult(null);
    setError('');
  }, [selectedStoreId, activeStore?.demand]);

  const patchDemand = (bucket, field, value) => {
    const n = Math.max(0, Number(String(value).replace(/[^\d]/g, '')) || 0);
    setDemand(d => ({ ...d, [bucket]: { ...d[bucket], [field]: n } }));
    setAiResult(null);
  };

  const handleFiles = async (fileList) => {
    const files = [...(fileList || [])].filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|heic)$/i.test(f.name));
    if (!files.length) return;
    setReading(true);
    setError('');
    try {
      const result = await analyzeSalesImages(files);
      setPreviews(result.previews);
      setNotes(result.notes);
      if (result.found) {
        setDemand(result.demand);
        setAiResult(null);
      } else if (!result.model) {
        setError('Đã nhận ảnh. Nhập lượt khách / doanh số bên dưới rồi xếp lịch (hoặc cài model vision Ollama để đọc tự động).');
      } else {
        setError('Không đọc được số trên ảnh. Nhập tay T2–T6 / T7–CN rồi xếp lịch.');
      }
    } catch (e) {
      setError(e.message || 'Không phân tích được ảnh.');
    } finally {
      setReading(false);
    }
  };

  const handleRun = () => {
    setGenerating(true);
    setError('');
    try {
      let opts;
      if (hasDemand) {
        // Doanh thu -> nhu cau theo gio -> ma tran ca (co ca ngan cho PT gio vang)
        const { weekday, weekend } = demandToMatrices(demand);
        const byDay = {};
        WEEK_DAYS.forEach(d => { byDay[d] = (d === 'T7' || d === 'CN') ? weekend : weekday; });
        opts = { requiredMatrixByDay: byDay };
      } else {
        opts = { requiredMatrixByDay: buildStaffingByDay(activeStore) };
      }
      const result = generateAISchedule(employees, activeStoreId, opts);
      if (hasDemand) {
        const wdM = demandToMatrices(demand).weekday;
        const weM = demandToMatrices(demand).weekend;
        const fmtM = m => Object.keys(m).map(c => `${c}x${m[c]}`).join(' + ');
        result.insights = [
          `Theo doanh số ${fmtVnd(demand.weekday.sales) || '—'} (T2–T6) / ${fmtVnd(demand.weekend.sales) || '—'} (T7–CN). FT gánh khung xương ca dài; PT lấp giờ vàng bằng ca ngắn.`,
          `🧮 Định biên sinh tự động — thường: ${fmtM(wdM)} · cuối tuần: ${fmtM(weM)}.`,
          ...result.insights.slice(1, 3)
        ];
      }
      setAiResult(result);
    } catch (e) {
      setError(e.message || 'Không sinh được lịch.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!aiResult) return;
    setApplying(true);
    try {
      await applyAiSchedule(currentWeek, aiResult.schedule, activeStoreId);
      onClose();
    } catch (e) {
      setError(e.message || 'Không lưu được lịch.');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex-1 min-w-0 mr-2">
            <div className="text-sm font-black text-slate-800">AI xếp lịch</div>
            <div className="text-[11px] text-slate-500">tuần {currentWeek} · {storeEmps.length} NV</div>
          </div>

          {/* Dropdown chọn cửa hàng */}
          {(storeId === 'ALL' || stores.length > 1) && (
            <select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              className="mr-2 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.id} — {s.name || s.id}</option>
              ))}
            </select>
          )}

          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <label
            className="block border border-dashed border-slate-300 rounded-xl p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40"
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            {reading ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                <Loader2 size={14} className="animate-spin" /> Đang đọc ảnh doanh số…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <ImagePlus size={14} /> Ảnh Direct / doanh số — thả hoặc chọn
              </span>
            )}
            <div className="text-[10px] text-slate-400 mt-1">PNG, JPG. Có thể gửi 2 ảnh T2–T6 và T7–CN.</div>
          </label>

          {previews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {previews.map(p => (
                <div key={p.url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <button type="button" className="text-slate-400 hover:text-red-600 px-1" onClick={() => { setPreviews([]); setNotes([]); }} title="Xóa ảnh">
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {notes.map((n, i) => (
            <p key={i} className="text-[11px] text-slate-500">{n}</p>
          ))}
          {error && <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">{error}</p>}

          <DemandField
            label="T2–T6"
            customers={demand.weekday.customers}
            sales={demand.weekday.sales}
            onCustomers={v => patchDemand('weekday', 'customers', v)}
            onSales={v => patchDemand('weekday', 'sales', v)}
          />
          <DemandField
            label="T7–CN"
            customers={demand.weekend.customers}
            sales={demand.weekend.sales}
            onCustomers={v => patchDemand('weekend', 'customers', v)}
            onSales={v => patchDemand('weekend', 'sales', v)}
          />

          <div className="text-[11px] text-slate-500">
            Định biên {hasDemand ? 'theo ảnh/số liệu' : 'theo cửa hàng'}:
            {' '}sáng {staffing.weekday['6-14']} · chiều {staffing.weekday['14-22']} · đêm {staffing.weekday['22-6']}
            {' '}(cuối tuần {staffing.weekend['6-14']}/{staffing.weekend['14-22']}/{staffing.weekend['22-6']})
          </div>

          {auditResult.totalIssues > 0 && (
            <button type="button" onClick={() => setShowAudit(v => !v)} className="text-[11px] font-semibold text-amber-800">
              <AlertTriangle size={12} className="inline mr-1" />
              Lịch hiện tại {auditResult.totalIssues} lỗi {showAudit ? '▴' : '▾'}
            </button>
          )}
          {showAudit && auditResult.issues.slice(0, 6).map(issue => (
            <div key={issue.id} className="text-[11px] text-slate-600 pl-2 border-l-2 border-amber-300">
              {issue.title} · {issue.empName}
            </div>
          ))}

          {aiResult && (
            <div className="space-y-2">
              <div className="flex gap-3 text-[11px] text-slate-600">
                <span><b className="text-slate-900">{aiResult.stats.totalShifts}</b> ca</span>
                <span><b className="text-slate-900">{aiResult.stats.totalHours}</b>h</span>
                <span>FT {aiResult.stats.compliantFTPercent}%</span>
                <span>PT {aiResult.stats.compliantPTPercent}%</span>
              </div>
              <p className="text-[11px] text-slate-500">{aiResult.insights[0]}</p>
              {Array.isArray(aiResult.warnings) && aiResult.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 space-y-0.5">
                  <p className="text-[11px] font-bold text-amber-800">⚠️ Cần SM bổ sung tay ({aiResult.warnings.length}):</p>
                  {aiResult.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-amber-700">• {w}</p>
                  ))}
                </div>
              )}
              <div className="overflow-auto max-h-48 border border-slate-200 rounded-xl">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-1.5 font-semibold">NV</th>
                      {WEEK_DAYS.map(d => (
                        <th key={d} className="p-1 text-center font-mono">
                          <div className="font-bold">{d}</div>
                          {weekDayDates[d] && <div className="text-[9px] font-normal text-slate-400">{weekDayDates[d]}</div>}
                        </th>
                      ))}
                      <th className="p-1.5">h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeEmps.map(emp => {
                      const sched = aiResult.schedule[emp.id] || {};
                      return (
                        <tr key={emp.id} className="border-t border-slate-100">
                          <td className="p-1.5 font-semibold text-slate-800 whitespace-nowrap">{emp.name}</td>
                          {WEEK_DAYS.map(d => {
                            const shift = sched[d] || 'off';
                            return (
                              <td key={d} className={`p-1 text-center font-mono ${shift === 'off' ? 'text-slate-300' : 'text-blue-700'}`}>
                                {shift === 'off' ? '—' : shift}
                              </td>
                            );
                          })}
                          <td className="p-1.5 text-center font-bold">{aiResult.employeeHours[emp.id] || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-bold text-slate-600">Hủy</button>
          <button
            type="button"
            onClick={handleRun}
            disabled={generating || !storeEmps.length}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Xếp lịch
          </button>
          {aiResult && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {applying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Áp dụng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}