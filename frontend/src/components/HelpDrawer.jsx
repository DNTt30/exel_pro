import { X, HelpCircle, BookOpen } from 'lucide-react';

const ADMIN_GUIDE = [
  {
    title: 'Xếp lịch tuần',
    steps: [
      'Vào Xếp lịch làm việc, chọn cửa hàng và tuần.',
      'Chọn ca từng ô. OFF = nghỉ, ô trống = chưa xếp.',
      'SM gửi duyệt tuần (Nháp → Chờ duyệt). AM/Admin duyệt hoặc từ chối. Tuần đã duyệt khóa sửa ô.',
      'Chọn tuần trên thanh công cụ: 8 tuần lịch sử + tuần này + 4 tuần tới. Copy tuần trước vẫn dùng được.',
      'Chi viện: dùng Điều chuyển — không đổi cửa hàng gốc của NV.',
      'Thiếu người: mở Định biên ca. Cuối tuần chỉnh T7–CN riêng.',
      'AI xếp lịch: gửi ảnh Direct/doanh số → đọc lượt khách & DS → xếp ca. Có thể nhập tay nếu ảnh không đọc được.'
    ]
  },
  {
    title: 'Định biên theo Direct',
    steps: [
      'Quản lý Cửa hàng → Sửa CH.',
      'Nhập lượt khách TB và doanh số TB (T2–T6 / T7–CN) từ GS25 Direct.',
      'Bấm Gợi ý định biên, kiểm tra rồi Lưu.',
      'AI xếp lịch sẽ theo định biên này.'
    ]
  },
  {
    title: 'Nhân sự & tài khoản',
    steps: [
      'SM thêm NV mã 9 số. Mật khẩu mặc định là 1.',
      'Cửa hàng trưởng (SM) dùng đủ menu quản lý cửa hàng: lịch, NV, kệ, CH.',
      'OFC = quản lý khu vực (không gọi nhầm SM).'
    ]
  },
  {
    title: 'Duyệt việc hàng ngày',
    steps: [
      'Dashboard: PT vượt 23h/91h.',
      'Đơn đổi ca: NV đồng ý xong SM duyệt — lịch tự hoán.',
      'Kệ & date: giao kệ cho NV, theo dõi hàng gần hết hạn.',
      'Feedback C&B: duyệt báo bù công.',
      'Nhật ký quản lý: xem ai làm thao tác gì.'
    ]
  }
];

const EMPLOYEE_GUIDE = [
  {
    title: 'Xem lịch & đăng ký ca',
    steps: [
      'Trang chủ: ca hôm nay và giờ tuần.',
      'Màn Lịch ca: cả tuần, hỗ trợ CH, đổi ca.',
      'Ngày đi hỗ trợ: thẻ vàng “Hỗ trợ VN0xxx · tên CH”.',
      'Ngày đổi ca: badge “Đổi ca với …” hoặc “Chờ đổi”.',
      'Chỉ đăng ký/sửa được tuần sau (tuần hiện tại khóa).',
      'Đăng ký nhanh 6-14 hoặc 14-22 từ T2–T7, CN nghỉ.'
    ]
  },
  {
    title: 'Đổi ca',
    steps: [
      'Bấm Đổi ca, chọn ngày mình làm và ca của đồng nghiệp.',
      'Đồng nghiệp đồng ý → chuyển SM duyệt.',
      'Duyệt xong lịch hai bên tự cập nhật.'
    ]
  },
  {
    title: 'Công thức FF Onsite',
    steps: [
      'Hỏi TÚ mini đúng tên món: “công thức trà tắc”, “pha milo”, “xốt tok”.',
      'Có size thì nói size (M / XL). Có loại thì nói loại (Hoshi, School, signature).',
      'Gõ “công thức” để xem danh mục 6 nhóm: nước, đồ chiên, bánh, lẩu, tteobokki, mì.'
    ]
  },
  {
    title: 'Kệ & date',
    steps: [
      'SM giao từng kệ cho NV.',
      'NV vào Kệ của tôi, ghi STT / Tên SP / Mã SP / SL / HSD (2 hạn khác nhau thì điền HSD 1 và HSD 2), bấm Lưu.',
      'Hàng còn ≤ số ngày báo trước (mặc định 3) sẽ hiện chuông cho NV quản lý kệ đó.'
    ]
  },
  {
    title: 'Báo bù công',
    steps: [
      'Vào Báo bù công C&B khi quên chấm / sai ca.',
      'Ghi rõ ngày, ca, lý do. SM/C&B sẽ duyệt.',
      'Part-time vượt 91h: giải trình trong form PT overtime.'
    ]
  }
];

export default function HelpDrawer({ isOpen, onClose, isAdmin }) {
  if (!isOpen) return null;
  const sections = isAdmin ? ADMIN_GUIDE : EMPLOYEE_GUIDE;

  return (
    <div className="fixed inset-0 z-50 print:hidden">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl flex flex-col border-l border-slate-200">
        <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} />
            <div>
              <div className="font-black text-sm">Hướng dẫn sử dụng</div>
              <div className="text-[11px] text-indigo-100">{isAdmin ? 'Dành cho SM / OFC' : 'Dành cho nhân viên'}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sections.map(sec => (
            <div key={sec.title} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <h3 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-600" />
                {sec.title}
              </h3>
              <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-600 leading-relaxed">
                {sec.steps.map(s => <li key={s}>{s}</li>)}
              </ol>
            </div>
          ))}
          <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/60">
            <h3 className="text-sm font-black text-slate-800 mb-2">Dữ liệu lưu ở đâu?</h3>
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 leading-relaxed">
              <li>Cloud Supabase: cửa hàng, nhân viên, lịch ca, đổi ca, bù công, kệ/date, nhật ký.</li>
              <li>Bấm Lưu / Giao việc / Duyệt là ghi ngay lên cloud — máy khác đăng nhập sẽ thấy.</li>
              <li>Nhật ký: activity / audit JSONB / AI chat (sql_app_logs.sql). Duyệt tuần: sql_schedule_weeks.sql.</li>
              <li>Máy chỉ giữ phiên đăng nhập (user + tuần đang xem), không phải nguồn dữ liệu chính.</li>
            </ul>
          </div>
          <p className="text-[11px] text-slate-400 px-1">
            Mật khẩu mọi tài khoản: 1. Hỏi TÚ mini (nút AI) nếu cần tra lịch hoặc quy định ca.
          </p>
        </div>
      </aside>
    </div>
  );
}
