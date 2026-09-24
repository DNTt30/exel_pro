import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { WEEK_DAYS, getStaffingMatrix, normalizeStaffingConfig } from '../data/constants';
import { calculateStaffingGap } from '../utils/shiftHelper';
import { rankGapCandidates, requiredDecisionWeeks } from '../utils/aiDecisionEngine';
import ConfirmModal from './modals/ConfirmModal';
import { useStore } from '../store/useStore';
import StaffingMatrixFields from './StaffingMatrixFields';
import { isOpsManager } from '../lib/authSession';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../components/ui/toastStore';
import { suggestGapCandidates, inviteGapCandidate, telegramConfigured } from '../services/api';

export default function StaffingGapTable({ employees, weekSchedule, filterDept }) {
  const { stores, user, updateStore, updateShift, currentWeek, schedule } = useStore(useShallow((s) => ({ schedule: s.schedule, stores: s.stores, user: s.user, updateStore: s.updateStore, updateShift: s.updateShift, currentWeek: s.currentWeek })));
  const isAdmin = isOpsManager(user);

  const [jevLoading, setJevLoading] = useState('');
  const [jevResults, setJevResults] = useState({});
  const [assignment, setAssignment] = useState(null);
  const [sending, setSending] = useState(false);

  const dayDatesMap = useMemo(() => {
    if (!currentWeek) return {};
    const parts = currentWeek.split('-').map(Number);
    if (parts.length !== 3) return {};
    const weekStartDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const map = {};
    WEEK_DAYS.forEach((dayKey, idx) => {
      const d = new Date(weekStartDate);
      d.setDate(weekStartDate.getDate() + idx);
      map[dayKey] = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    return map;
  }, [currentWeek]);

  const storeOptions = stores.length ? stores : [{ id: filterDept && filterDept !== 'ALL' ? filterDept : 'VN0485', name: filterDept }];
  const defaultStoreId = filterDept && filterDept !== 'ALL'
    ? filterDept
    : (user?.dept || storeOptions[0]?.id);

  const [selectedDay, setSelectedDay] = useState('T2');
  const [isExpanded, setIsExpanded] = useState(false);
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [draftStaffing, setDraftStaffing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suggestOpenShift, setSuggestOpenShift] = useState(null);

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

  const contextKey = JSON.stringify([currentWeek, selectedDay, storeId, schedule, employees]);
  const gapContext = shift => ({ employees, schedule: { ...schedule, [currentWeek]: weekSchedule }, week: currentWeek, day: selectedDay, shift, storeId });
  const callJevForGap = async shift => {
    const key = contextKey, epoch = useStore.getState()._sessionEpoch;
    setSuggestOpenShift(shift);
    setJevLoading(key + shift);
    try {
      await useStore.getState().ensureWeeksLoaded(requiredDecisionWeeks(currentWeek));
      if (epoch !== useStore.getState()._sessionEpoch) return;
      const result = await suggestGapCandidates({ ...gapContext(shift), schedule: useStore.getState().schedule });
      setJevResults({ key: JSON.stringify([currentWeek, selectedDay, storeId, useStore.getState().schedule, employees]), shift, ...result });
    } catch { toast.info('Đang dùng danh sách kiểm tra cục bộ; chưa tải đủ lịch liên quan.'); }
    finally { setJevLoading(''); }
  };
  const handleAssignCandidate = (candidate, shift) => setAssignment({ candidate, shift, week: currentWeek, day: selectedDay, store: storeId });
  const confirmAssignment = async () => {
    if (!assignment || sending) return;
    setSending(true);
    try {
      const state = useStore.getState();
      const current = rankGapCandidates({ employees: state.employees, schedule: state.schedule, week: assignment.week, day: assignment.day, shift: assignment.shift, storeId: assignment.store }).find(c => c.emp.id === assignment.candidate.emp.id);
      if (!current) throw new Error('Lịch đã thay đổi; nhân viên không còn phù hợp.');
      await updateShift(assignment.week, current.emp.id, assignment.day, current.isLocal ? assignment.shift : { shift: assignment.shift, covering_store: assignment.store });
      toast.success('Đã lưu ca sau khi xác nhận nhân viên đồng ý.');
      setAssignment(null);
      setSuggestOpenShift(null);
    } catch (error) { toast.error(error.message || 'Không lưu được ca'); }
    finally { setSending(false); }
  };
  const invite = async (candidate, shift) => {
    if (sending) return;
    setSending(true);
    try {
      const state = useStore.getState();
      const current = rankGapCandidates({ ...gapContext(shift), schedule: state.schedule, employees: state.employees }).find(c => c.emp.id === candidate.emp.id);
      if (!current) throw new Error('Lịch đã thay đổi. Hãy tìm lại ứng viên.');
      await inviteGapCandidate({ candidate: current, storeId, week: currentWeek, day: selectedDay, shift });
      toast.success('Đã gửi lời mời vào nhóm Telegram được cấu hình.');
    } catch (error) { toast.error(error.message); }
    finally { setSending(false); }
  };

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
    <>
    <ConfirmModal isOpen={!!assignment} loading={sending} variant="info" onClose={() => !sending && setAssignment(null)} onConfirm={confirmAssignment} title="Xác nhận nhận ca" message={`${assignment?.candidate.emp.name || ''} đã đồng ý nhận ca ${assignment?.shift || ''}? ${assignment?.candidate.availability === 'off' ? 'Ca này sẽ thay thế ngày OFF.' : ''}`} confirmText={sending ? 'Đang lưu...' : 'Đã đồng ý · lưu ca'} />
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
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedDay === dayKey
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{dayKey}</span>
                {dayDatesMap[dayKey] && (
                  <span className={`text-[10px] font-mono ${selectedDay === dayKey ? 'text-blue-100' : 'text-slate-400'}`}>
                    ({dayDatesMap[dayKey]})
                  </span>
                )}
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
              const ranked = isDeficit ? rankGapCandidates(gapContext(shiftCode)) : [];
              const suggestion = jevResults.key === contextKey && jevResults.shift === shiftCode ? jevResults : null;
              const candidates = suggestion?.candidates || ranked;


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
                  <div>
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

                  {/* Hành động khi thiếu người: Gợi ý & Gán nhanh */}
                  {isDeficit && (
                    <div className="mt-2.5 pt-2 border-t border-red-200/80">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSuggestOpenShift(suggestOpenShift === shiftCode ? null : shiftCode)}
                          className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                          title="Bấm để xem danh sách nhân sự rảnh có thể xếp vào ca này"
                        >
                          <Sparkles size={11} className="text-amber-300" />
                          <span>Gợi ý ({candidates.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => callJevForGap(shiftCode)}
                          disabled={jevLoading === contextKey + shiftCode || candidates.length === 0}
                          className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Nhờ AI phân tích sâu để tìm người phù hợp nhất"
                        >
                          <Sparkles size={11} className="text-white" />
                          <span>{jevLoading === contextKey + shiftCode ? 'JEV Đang nghĩ...' : 'Tìm người thay thế'}</span>
                        </button>

                        {candidates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAssignCandidate(candidates[0], shiftCode)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-red-700 border border-red-300 hover:bg-red-100/80 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title={`Gán nhanh ${candidates[0].emp.name} (${candidates[0].badge})`}
                          >
                            <span>⚡ Gán nhanh</span>
                          </button>
                        )}
                      </div>

                      {/* Dropdown danh sách gợi ý nhân sự rảnh */}
                      {suggestOpenShift === shiftCode && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-red-200 shadow-sm space-y-1.5 text-xs animate-in fade-in duration-150">
                          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between pb-1 border-b border-slate-100">
                            <span>Nhân sự rảnh có thể lấp ca:</span>
                            <span className="text-blue-600 font-extrabold">{candidates.length} bạn</span>
                          </div>

                          {candidates.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-1 text-center">
                              Không có nhân sự nào rảnh phù hợp định mức.
                            </p>
                          ) : (
                            <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-100">
                              {candidates.slice(0, 2).map((cand) => {
                                const isJevChoice = suggestion?.source === 'jev' && suggestion.candidates[0]?.emp.id === cand.emp.id;
                                return (
                                <div key={cand.emp.id} className={`pt-1.5 flex items-center justify-between gap-1.5 ${isJevChoice ? 'bg-indigo-50 -mx-1 px-1 rounded border border-indigo-200' : ''}`}>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-800 text-[11px] truncate flex items-center gap-1">
                                      <span>{cand.emp.name}</span>
                                      {cand.hasRegisteredThisShift && (
                                        <span className="text-[8.5px] px-1 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                                          Đã ĐK ca này
                                        </span>
                                      )}
                                      {isJevChoice && (
                                        <span className="text-[8.5px] px-1 rounded bg-indigo-600 text-white font-bold shrink-0 shadow-sm animate-pulse">
                                          JEV Khuyên chọn
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <span className={cand.isLocal ? 'text-emerald-700 font-semibold' : 'text-blue-700 font-semibold'}>
                                        {cand.badge}
                                      </span>
                                      <span>• Tuần: {cand.currentWeeklyHours}h → {cand.hoursAfterAssign}h</span>
                                    </div>
                                    <div className="text-[10px] text-amber-700">{[...new Set(cand.issues.map(i => i.message))].join(' · ')}
                                    </div>
                                  </div>
                                  <button type="button" disabled={sending || !telegramConfigured()} onClick={() => invite(cand, shiftCode)} className="text-xs text-indigo-700 disabled:opacity-40" title="Gửi vào nhóm Telegram đã cấu hình">Mời Telegram</button>
                                  <button
                                    type="button"
                                    disabled={sending}
                                    onClick={() => handleAssignCandidate(cand, shiftCode)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors shrink-0 shadow-2xs ${
                                      cand.isLocal
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                                    }`}
                                  >
                                    + {cand.isLocal ? 'Gán ca' : 'Chi viện'}
                                  </button>
                                </div>
                              )})}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
