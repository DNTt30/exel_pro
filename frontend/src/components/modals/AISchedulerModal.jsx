import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Users, 
  RefreshCw, 
  ArrowRight, 
  Wand2 
} from 'lucide-react';
import { WEEK_DAYS, DAY_FULL_NAMES, buildStaffingByDay, DEFAULT_STAFFING_MATRIX } from '../../data/constants';
import { generateAISchedule, auditSchedule } from '../../utils/aiSchedulerEngine';
import { getShiftHours, normalizeShift } from '../../utils/shiftHelper';

export default function AISchedulerModal({ isOpen, onClose, currentWeek, storeId }) {
  const { employees, schedule, applyAiSchedule, user, stores } = useStore();
  const weekSched = schedule[currentWeek] || {};
  const activeStoreId = storeId === 'ALL' ? (user?.dept || stores[0]?.id || 'VN0485') : storeId;
  const activeStore = stores.find(s => s.id === activeStoreId);

  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'audit'
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  // Danh sách nhân viên cửa hàng
  const storeEmps = useMemo(() => {
    return employees.filter(e => e.dept === activeStoreId);
  }, [employees, activeStoreId]);

  // Kiểm toán lịch tuần hiện tại
  const auditResult = useMemo(() => {
    return auditSchedule(employees, weekSched, activeStoreId);
  }, [employees, weekSched, activeStoreId]);

  // Hàm kích hoạt AI sinh lịch
  const handleRunAIScheduler = () => {
    setIsGenerating(true);
    try {
      // Giả lập xử lý AI trong 400ms để tạo hiệu ứng phân tích mượt mà
      setTimeout(() => {
        const result = generateAISchedule(employees, activeStoreId, {
          requiredMatrix: DEFAULT_STAFFING_MATRIX.weekday,
          requiredMatrixByDay: buildStaffingByDay(activeStore)
        });
        setAiResult(result);
        setIsGenerating(false);
      }, 400);
    } catch (err) {
      alert('Lỗi khi sinh lịch AI: ' + err.message);
      setIsGenerating(false);
    }
  };

  // Hàm áp dụng kết quả AI vào bảng lịch
  const handleApplyAISchedule = async () => {
    if (!aiResult) return;
    if (!window.confirm(`Xác nhận áp dụng lịch do AI đề xuất cho cửa hàng ${activeStoreId} trong tuần ${currentWeek}?`)) {
      return;
    }

    setIsApplying(true);
    try {
      await applyAiSchedule(currentWeek, aiResult.schedule, activeStoreId);
      alert('Đã áp dụng lịch AI (giữ nguyên ca chi viện sang cửa hàng khác).');
      onClose();
    } catch (err) {
      alert('Lỗi khi lưu lịch AI: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal title="AI Trợ Lý Xếp Lịch & Kiểm Toán Thông Minh" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 max-h-[85vh] flex flex-col">
        {/* Top Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'generate' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={14} className="text-indigo-600" />
              <span>✨ AI Xếp Lịch Tự Động</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'audit' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={14} className="text-amber-600" />
              <span>🔍 AI Kiểm Toán Lịch Tuần</span>
              {auditResult.totalIssues > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          </div>

          <span className="text-xs font-bold text-slate-500">
            Cửa hàng: <strong className="text-blue-700 font-mono">{activeStoreId}</strong>
          </span>
        </div>

        {/* Tab 1: AI XẾP LỊCH TỰ ĐỘNG */}
        {activeTab === 'generate' && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {/* Banner Header */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                  <Wand2 size={16} className="text-indigo-600" />
                  <span>Thuật Toán Phân Bổ Ca Tối Ưu Đa Mục Tiêu</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Tự động cân bằng giờ Full-Time (48h), Part-Time (16h-23h) và đảm bảo thời gian nghỉ hồi phục ≥ 8 tiếng.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunAIScheduler}
                disabled={isGenerating}
                className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang tính toán...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>⚡ AI Sinh Lịch Ngay</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Insights & Stats (Khi đã có kết quả) */}
            {aiResult && (
              <div className="space-y-3 animate-fade-in">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Tổng Ca Phân Bổ</span>
                    <strong className="text-slate-900 font-mono text-base">{aiResult.stats.totalShifts} ca</strong>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-[10px] text-purple-600 uppercase font-bold block">Tổng Giờ Công</span>
                    <strong className="text-purple-700 font-mono text-base">{aiResult.stats.totalHours}h</strong>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[10px] text-blue-600 uppercase font-bold block">Chuẩn Full-Time</span>
                    <strong className="text-blue-700 font-mono text-base">{aiResult.stats.compliantFTPercent}%</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] text-emerald-600 uppercase font-bold block">Chuẩn Part-Time</span>
                    <strong className="text-emerald-700 font-mono text-base">{aiResult.stats.compliantPTPercent}%</strong>
                  </div>
                </div>

                {/* AI Insights Explanation */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                  <strong className="text-emerald-950 block font-black">💡 Đánh Giá Chiến Lược Của AI:</strong>
                  {aiResult.insights.map((ins, idx) => (
                    <div key={idx} className="text-[11px] leading-relaxed">{ins}</div>
                  ))}
                </div>

                {/* Schedule Table Preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                    <span>Xem Trước Bảng Lịch AI Đề Xuất ({storeEmps.length} nhân sự)</span>
                    <span className="text-[10px] text-slate-500 font-normal">Tuần: {currentWeek}</span>
                  </div>

                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-2 font-bold min-w-[130px]">Nhân viên</th>
                          <th className="p-2 text-center font-bold">Loại</th>
                          {WEEK_DAYS.map(d => (
                            <th key={d} className="p-1.5 text-center font-bold font-mono">{d}</th>
                          ))}
                          <th className="p-2 text-center font-bold text-blue-700">Tổng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {storeEmps.map(emp => {
                          const sched = aiResult.schedule[emp.id] || {};
                          const totalH = aiResult.employeeHours[emp.id] || 0;
                          const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME';

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/80">
                              <td className="p-2 font-semibold text-slate-800">
                                <div>{emp.name}</div>
                                <span className="text-[10px] text-slate-400 font-mono">{emp.id}</span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isPT ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {emp.type || 'STPT'}
                                </span>
                              </td>
                              {WEEK_DAYS.map(d => {
                                const shift = sched[d] || 'off';
                                const isOff = shift === 'off';
                                return (
                                  <td key={d} className="p-1 text-center font-mono">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold inline-block min-w-[38px] ${
                                      isOff ? 'text-slate-400 bg-slate-100' : 'bg-blue-50 text-blue-800 border border-blue-200'
                                    }`}>
                                      {shift}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="p-2 text-center font-mono font-black text-blue-700">
                                {totalH}h
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!aiResult && !isGenerating && (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                <Sparkles size={32} className="mx-auto text-indigo-400" />
                <div className="text-xs font-bold text-slate-600">Sẵn sàng lập lịch tuần mới</div>
                <p className="text-[11px] max-w-sm mx-auto">
                  Bấm nút <strong>"⚡ AI Sinh Lịch Ngay"</strong> để hệ thống tự động phân bổ ca cho toàn bộ {storeEmps.length} nhân sự.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AI KIỂM TOÁN LỊCH TUẦN */}
        {activeTab === 'audit' && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {/* Audit Summary Box */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              auditResult.totalIssues === 0 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2">
                {auditResult.totalIssues === 0 ? (
                  <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <strong className="text-xs block font-bold">{auditResult.summary}</strong>
                  <span className="text-[11px] opacity-80">Kiểm toán tự động dựa trên quy chuẩn C&B và luật lao động</span>
                </div>
              </div>

              {auditResult.totalIssues > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('generate');
                    handleRunAIScheduler();
                  }}
                  className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 size={12} />
                  <span>AI Tự Động Sửa Lỗi</span>
                </button>
              )}
            </div>

            {/* Issues List */}
            {auditResult.issues.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Chi Tiết Các Điểm Cần Khắc Phục:</div>
                {auditResult.issues.map((issue) => (
                  <div 
                    key={issue.id} 
                    className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>{issue.title}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{issue.desc}</p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 flex-shrink-0">
                      NV: {issue.empName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Hệ thống AI Assistant OFC v2.5
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-xs px-4 py-2 cursor-pointer"
            >
              Đóng
            </button>

            {activeTab === 'generate' && aiResult && (
              <button
                type="button"
                onClick={handleApplyAISchedule}
                disabled={isApplying}
                className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={13} />
                <span>{isApplying ? 'Đang cập nhật lịch...' : '✓ Áp Dụng Lịch Này Vào Tuần'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
