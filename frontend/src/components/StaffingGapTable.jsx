import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { WEEK_DAYS, getStaffingMatrix, normalizeStaffingConfig } from '../data/constants';
import { calculateStaffingGap } from '../utils/shiftHelper';
import { useStore } from '../store/useStore';
import StaffingMatrixFields from './StaffingMatrixFields';
import { isOpsManager } from '../lib/authSession';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../components/ui/toastStore';

export default function StaffingGapTable({ employees, weekSchedule, filterDept }) {
  const { stores, user, updateStore } = useStore(useShallow((s) => ({ stores: s.stores, user: s.user, updateStore: s.updateStore })));
  const isAdmin = isOpsManager(user);

  const storeOptions = stores.length ? stores : [{ id: filterDept && filterDept !== 'ALL' ? filterDept : 'VN0485', name: filterDept }];
  const defaultStoreId = filterDept && filterDept !== 'ALL'
    ? filterDept
    : (user?.dept || storeOptions[0]?.id);

  const [selectedDay, setSelectedDay] = useState('T2');
  const [isExpanded, setIsExpanded] = useState(false);
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [draftStaffing, setDraftStaffing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (filterDept && filterDept !== 'ALL') setStoreId(filterDept);
  }, [filterDept]);

  // Memo để tham chiếu `store` ổn định giữa các render
  const store = useMemo(
    () => stores.find(s => s.id === storeId) || { id: storeId, staffing: null },
    [stores, storeId]
  );
  const requiredMatrix = useMemo(
    () => getStaffingMatrix({ staffing: draftStaffing || store.staffing }, selectedDay),
    [store, selectedDay, draftStaffing]
  );

  const gapData = calculateStaffingGap(employees, weekSchedule, selectedDay, storeId, requiredMatrix);
  const totalDeficits = Object.values(gapData).filter(d => d.gap < 0).length;

  const handleSaveStaffing = async () => {
    if (!draftStaffing) return;
    setSaving(true);
    try {
      await updateStore(storeId, { staffing: normalizeStaffingConfig(draftStaffing) });
      setDraftStaffing(null);
    } catch (err) {
      toast.error('Không lưu được định biên: ' + (err.message || 'Lỗi kết nối. Chạy sql_stores_staffing.sql nếu chưa có cột staffing.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Users size={15} className="text-blue-600" />
            <span>Phân Tích Định Biên Ca:</span>
            <span className="font-mono text-blue-700 font-extrabold">{storeId}</span>
          </div>

          {totalDeficits > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
              <AlertTriangle size={11} /> Có {totalDeficits} ca đang thiếu nhân sự!
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} /> Đủ định biên nhân sự các ca
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết định biên'}</span>
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(filterDept === 'ALL' || stores.length > 1) && (
              <select
                className="px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white"
                value={storeId}
                onClick={e => e.stopPropagation()}
                onChange={e => { setStoreId(e.target.value); setDraftStaffing(null); }}
              >
                {storeOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.id} {s.name ? `· ${s.name}` : ''}</option>
                ))}
              </select>
            )}
            <span className="text-xs font-bold text-slate-500 mr-1">Ngày:</span>
            {WEEK_DAYS.map(dayKey => (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDay(dayKey)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDay === dayKey
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dayKey}
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600">Định biên cửa hàng {storeId}</span>
                {draftStaffing && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveStaffing}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white disabled:opacity-60"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu định biên'}
                  </button>
                )}
              </div>
              <StaffingMatrixFields
                staffing={draftStaffing || store.staffing}
                onChange={setDraftStaffing}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(gapData).map(([shiftCode, data]) => {
              const isDeficit = data.gap < 0;
              const isBalanced = data.gap === 0;

              return (
                <div
                  key={shiftCode}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isDeficit
                      ? 'bg-red-50/70 border-red-200'
                      : isBalanced
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-indigo-50/70 border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-sm text-slate-900">Ca {shiftCode}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isDeficit
                          ? 'bg-red-200 text-red-800'
                          : isBalanced
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-indigo-200 text-indigo-800'
                      }`}
                    >
                      {isDeficit
                        ? `Thiếu ${Math.abs(data.gap)} NV`
                        : isBalanced
                        ? 'Chuẩn định biên'
                        : `Dư ${data.gap} NV`}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center bg-white/80 p-2 rounded-lg border border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Cần</span>
                      <strong className="font-mono text-slate-800">{data.required}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Tại chỗ</span>
                      <strong className="font-mono text-blue-700">{data.actual}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Chi viện</span>
                      <strong className="font-mono text-orange-600">+{data.support}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Hiện có</span>
                      <strong className={`font-mono ${isDeficit ? 'text-red-700' : 'text-emerald-700'}`}>
                        {data.total}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
