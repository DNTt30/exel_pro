import React from 'react';
import { X, Download, Share2, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { usePWAInstall } from '../../utils/pwaHelper';

export default function PWAInstallModal({ isOpen, onClose }) {
  const { isIOS, installApp, isStandalone } = usePWAInstall();

  const handleInstallClick = async () => {
    const res = await installApp();
    if (res.outcome === 'accepted') {
      onClose();
    }
  };

  if (isStandalone) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-md">
      <div className="text-center pt-2 pb-4">
        {/* App Icon */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 p-1 shadow-xl shadow-blue-500/25 flex items-center justify-center border-2 border-white/40">
          <img 
            src={`${import.meta.env.BASE_URL || './'}icon-192.png`} 
            alt="DNTgs25 Icon" 
            className="w-full h-full rounded-xl object-cover"
            onError={(e) => {
              e.target.src = `${import.meta.env.BASE_URL || './'}favicon.svg`;
            }}
          />
        </div>

        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          Cài đặt App DNTgs25
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Thêm ứng dụng vào màn hình chính để mở toàn màn hình, tải siêu tốc và thao tác ca kíp mượt mà như app thật.
        </p>

        {isIOS ? (
          /* Hướng dẫn cài đặt trên iOS Safari */
          <div className="mt-5 text-left bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Smartphone size={15} className="text-blue-600" />
              Cách cài trên iPhone / iPad (Safari):
            </p>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chạm vào nút <strong>Chia sẻ</strong> <Share2 size={13} className="inline text-blue-600 mx-0.5 -mt-0.5" /> ở thanh công cụ dưới đáy Safari.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cuộn xuống và chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen) <PlusSquare size={13} className="inline text-slate-700 mx-0.5 -mt-0.5" />.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bấm <strong>"Thêm"</strong> ở góc phải trên cùng. App <strong>DNTgs25</strong> sẽ xuất hiện ngay trên màn hình điện thoại của bạn!
              </p>
            </div>
          </div>
        ) : (
          /* Cài đặt 1 chạm trên Android / Chrome */
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-95"
            >
              <Download size={18} /> Cài đặt App ngay (1 chạm)
            </button>
            <p className="text-[11px] text-slate-400">
              ✓ Hoàn toàn miễn phí · Không tốn dung lượng · Tự động cập nhật
            </p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
          >
            Để sau
          </button>
        </div>
      </div>
    </Modal>
  );
}
