import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  Clock, Calendar, CheckCircle2, 
  Lock, Unlock, Sparkles, RotateCcw 
} from 'lucide-react';
import { 
  DEADLINE_DAY_OPTIONS, 
  calculateWeekDeadline, 
  getStoreDeadlineConfig, 
  saveStoreDeadlineConfig,
  extendDeadlineHours,
  DEFAULT_DEADLINE_CONFIG
} from '../../utils/deadlineHelper';
import { toast } from '../ui/toastStore';

export default function RegistrationDeadlineModal({ isOpen, onClose, storeId, weekDate }) {
  const { stores, updateStore } = useStore(useShallow((s) => ({
    stores: s.stores,
    updateStore: s.updateStore
  })));

  const storeInfo = useMemo(() => {
    return stores.find(s => s.id === storeId) || { id: storeId, name: storeId };
  }, [stores, storeId]);

  const [config, setConfig] = useState(DEFAULT_DEADLINE_CONFIG);
  const [applyScope, setApplyScope] = useState('week'); // 'week' | 'all'
  const [saving, setSaving] = useState(false);

  // Load config when modal opens or storeId/weekDate changes
  useEffect(() => {
    if (isOpen && storeId) {
      const existing = getStoreDeadlineConfig(storeId, weekDate, stores);
      setConfig(existing);
      // Mặc định: nếu có weekDate thì cho phép chỉnh tuần này trước
      setApplyScope('week');
    }
  }, [isOpen, storeId, weekDate, stores]);

  // Live preview calculation
  const preview = useMemo(() => {
    return calculateWeekDeadline(weekDate, config);
  }, [weekDate, config]);

  const handleQuickExtend = (hours) => {
    const updated = extendDeadlineHours(preview, hours);
    setConfig(updated);
    toast.success(`Đã cộng thêm ${hours} giờ vào hạn chót tuần này!`);
  };

  const handleForceLock = () => {
    setConfig(prev => ({ ...prev, isForceClosed: true, isForceOpen: false }));
    toast.info('Đã chuyển sang trạng thái: Khóa đăng ký ngay lập tức');
  };

  const handleForceOpen = () => {
    setConfig(prev => ({ ...prev, isForceOpen: true, isForceClosed: false }));
    toast.success('Đã chuyển sang trạng thái: Mở lại đăng ký (cho nộp bù)');
  };

  const handleResetDefault = () => {
    setConfig({
      ...DEFAULT_DEADLINE_CONFIG,
      customDeadline: null,
      isForceClosed: false,
      isForceOpen: false
    });
    toast.info('Đã khôi phục cài đặt chuẩn (Thứ 5, 18:00)');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveStoreDeadlineConfig({
        storeId,
        weekDate,
        config,
        applyToAllWeeks: applyScope === 'all',
        updateStore
      });
      toast.success(
        applyScope === 'all'
          ? 'Đã lưu hạn đăng ký mặc định cho toàn cửa hàng!'
          : `Đã lưu hạn đăng ký riêng cho tuần ${weekDate}!`
      );
      onClose();
    } catch (err) {
      toast.error('Lỗi khi lưu cài đặt: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      title="Thiết Lập Hạn Đăng Ký Lịch Tuần" 
      isOpen={isOpen} 
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        {/* Info header */}
        <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-extrabold text-blue-900 text-sm">{storeInfo.name || storeId}</span>
            <div className="text-[11px] text-blue-700 font-medium">
              Tuần làm việc: <span className="font-bold">{weekDate}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-all"
            title="Khôi phục chuẩn mặc định: Thứ 5 lúc 18:00"
          >
            <RotateCcw size={12} />
            Mặc định (T5 18h)
          </button>
        </div>

        {/* 1. Toggle Bật/Tắt hạn chót */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <div>
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock size={16} className="text-indigo-600" />
              Kích hoạt hạn chót nộp lịch
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tự động khóa đăng ký khi hết hạn để Cửa hàng trưởng chốt ca và xếp người.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {config.enabled && (
          <>
            {/* 2. Chọn thứ và giờ nộp lịch */}
            <div className="space-y-3 p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
              <label className="block font-bold text-slate-700">
                Thứ trong tuần nộp lịch (tuần trước khi làm việc):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEADLINE_DAY_OPTIONS.map((opt) => {
                  const isSelected = config.dayKey === opt.key && !config.customDeadline;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setConfig({
                        ...config,
                        dayKey: opt.key,
                        customDeadline: null,
                        isForceClosed: false,
                        isForceOpen: false
                      })}
                      className={`p-2 rounded-xl text-left border font-semibold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{opt.label}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        Trước {opt.offset} ngày
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Giờ chót */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Giờ chốt hạn trong ngày:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={config.time || '18:00'}
                    onChange={(e) => setConfig({
                      ...config,
                      time: e.target.value,
                      customDeadline: null,
                      isForceClosed: false,
                      isForceOpen: false
                    })}
                    className="p-2 border border-slate-300 rounded-lg font-mono font-bold text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    {['12:00', '18:00', '21:00', '23:59'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setConfig({
                          ...config,
                          time: t,
                          customDeadline: null,
                          isForceClosed: false,
                          isForceOpen: false
                        })}
                        className={`px-2.5 py-1.5 rounded-lg font-mono font-bold border transition-all ${
                          config.time === t && !config.customDeadline
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Live Preview Card */}
            <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
              preview.status === 'expired' || preview.status === 'force_closed'
                ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                : preview.status === 'warning'
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} />
                  Thời hạn thực tế cho tuần {weekDate}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  preview.isExpired ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {preview.isExpired ? 'ĐÃ HẾT HẠN' : 'ĐANG MỞ ĐĂNG KÝ'}
                </span>
              </div>
              <div className="text-sm font-black mt-0.5">
                {preview.formattedDeadline}
              </div>
              <div className="text-[11px] font-semibold opacity-85">
                Trạng thái: <span className="underline">{preview.remainingText}</span>
              </div>
            </div>

            {/* 4. Thao tác nhanh cho tuần này (Emergency Actions) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" />
                Thao tác nhanh cho tuần này:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickExtend(24)}
                  className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg transition-all shadow-2xs active:scale-95"
                  title="Gia hạn thêm 24 tiếng cho nhân viên"
                >
                  <span>+24 Giờ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExtend(2)}
                  className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg transition-all shadow-2xs active:scale-95"
                  title="Gia hạn thêm 2 tiếng khẩn cấp"
                >
                  <span>+2 Giờ</span>
                </button>
                <button
                  type="button"
                  onClick={handleForceOpen}
                  className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold rounded-lg transition-all shadow-2xs active:scale-95"
                  title="Mở lại đăng ký ngay lập tức"
                >
                  <Unlock size={12} />
                  <span>Mở lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleForceLock}
                  className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold rounded-lg transition-all shadow-2xs active:scale-95"
                  title="Khóa đăng ký ngay bây giờ"
                >
                  <Lock size={12} />
                  <span>Khóa ngay</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* 5. Phạm vi áp dụng */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
          <label className="block font-bold text-slate-700">Phạm vi lưu cài đặt:</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="applyScope"
                value="week"
                checked={applyScope === 'week'}
                onChange={() => setApplyScope('week')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700">
                Chỉ áp dụng riêng cho tuần này ({weekDate})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="applyScope"
                value="all"
                checked={applyScope === 'all'}
                onChange={() => setApplyScope('all')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700">
                Lưu làm mặc định cho tất cả các tuần của cửa hàng
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            <span>{saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
