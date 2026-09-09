import React, { useState, useEffect } from 'react';
import { 
  X, Send, Clock, Bot, Webhook, CheckCircle2, 
  AlertCircle, Play, History, Loader2, Sparkles, DatabaseBackup 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { 
  getAutoBackupConfig, saveAutoBackupConfig, getAutoBackupHistory, 
  executeAutoBackup 
} from '../../utils/autoBackupService';
import { toast } from '../ui/toastStore';

export default function AutoBackupModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(getAutoBackupConfig);
  const [history, setHistory] = useState(getAutoBackupHistory);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getAutoBackupConfig());
      setHistory(getAutoBackupHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAutoBackupConfig(config);
    toast.success('Đã lưu cấu hình tự động sao lưu!');
  };

  const handleRunNow = async () => {
    setIsSending(true);
    toast.loading('Đang khởi tạo và gửi bản sao lưu...', { id: 'manual-backup' });
    try {
      const state = useStore.getState();
      const res = await executeAutoBackup(state, config);
      toast.success(`Đã sao lưu & gửi thành công: ${res.fileName}`, { id: 'manual-backup' });
      setHistory(getAutoBackupHistory());
      setConfig(getAutoBackupConfig());
    } catch (err) {
      toast.error(`Thất bại: ${err.message}`, { id: 'manual-backup' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <DatabaseBackup size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Tự Động Hóa Sao Lưu & Gửi Dữ Liệu</h2>
              <p className="text-xs text-emerald-100 font-medium">Bảo vệ 100% dữ liệu nhân sự, lịch trực & date kệ hàng</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">

          {/* Switch Enable */}
          <div className="flex items-center justify-between p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="font-extrabold text-slate-800">Kích hoạt sao lưu ngầm định kỳ</div>
                <div className="text-xs text-slate-500">Hệ thống sẽ tự xuất file .xlsx và gửi theo lịch đã chọn</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.enabled}
                onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Tần suất & Kênh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-600" /> Tần Suất Gửi
              </label>
              <select
                value={config.frequency}
                onChange={e => setConfig({ ...config, frequency: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              >
                <option value="daily">📅 Hàng ngày (Mỗi 24 giờ)</option>
                <option value="weekly">📆 Hàng tuần (Chủ Nhật 23:59)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Send size={14} className="text-emerald-600" /> Kênh Nhận Dữ Liệu
              </label>
              <select
                value={config.channel}
                onChange={e => setConfig({ ...config, channel: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
              >
                <option value="telegram">📱 Telegram Bot (Khuyên dùng)</option>
                <option value="webhook">🌐 Webhook URL (Make / Zapier)</option>
                <option value="both">🚀 Cả Telegram & Webhook</option>
              </select>
            </div>
          </div>

          {/* Telegram Settings */}
          {(config.channel === 'telegram' || config.channel === 'both') && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Bot size={15} className="text-blue-600" /> Cấu hình Telegram Bot
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Telegram Bot Token</label>
                  <input
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={config.telegramToken}
                    onChange={e => setConfig({ ...config, telegramToken: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono bg-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Telegram Chat ID / Group ID</label>
                  <input
                    type="text"
                    placeholder="-100123456789 hoặc @group"
                    value={config.telegramChatId}
                    onChange={e => setConfig({ ...config, telegramChatId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                File Excel chứa trọn vẹn 7 sheet sẽ được bot gửi trực tiếp vào group/chat này.
              </p>
            </div>
          )}

          {/* Webhook Settings */}
          {(config.channel === 'webhook' || config.channel === 'both') && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Webhook size={15} className="text-indigo-600" /> Cấu hình Webhook URL
              </div>
              <input
                type="url"
                placeholder="https://hook.make.com/... hoặc Zapier"
                value={config.webhookUrl}
                onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono bg-white outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Nút Chạy Thử Ngay */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              onClick={handleRunNow}
              disabled={isSending}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Play size={14} />}
              Sao Lưu & Gửi Ngay Bây Giờ
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lưu Cấu Hình
            </button>
          </div>

          {/* Lịch sử Backup gần đây */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 uppercase">
              <History size={14} className="text-slate-500" /> Lịch sử sao lưu gần nhất
            </div>
            {history.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">Chưa có lịch sử sao lưu tự động nào.</div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {history.slice(0, 5).map(h => (
                  <div key={h.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {h.status === 'success' ? (
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="text-rose-500 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-700 truncate max-w-[240px]">
                          {h.fileName || h.error}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(h.timestamp).toLocaleString('vi-VN')} • {h.sizeKb ? `${h.sizeKb} KB` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {h.channels?.join(', ') || h.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
