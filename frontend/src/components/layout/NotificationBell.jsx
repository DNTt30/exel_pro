import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  CalendarDays, 
  Sparkles, 
  ChevronRight, 
  CheckCheck,
  ArrowRightLeft
} from 'lucide-react';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { WEEK_DAYS } from '../../data/constants';
import { collectExpiryAlerts } from '../../utils/shelfExpiry';
import { canPickStore, isOpsManager } from '../../lib/authSession';

export default function NotificationBell() {
  const { user, feedbacks, schedule, currentWeek, employees, shiftSwaps, shelves, shelfItems } = useStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`read_notifs_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isAdmin = isOpsManager(user);
  const isManager = isAdmin;
  const pickStore = canPickStore(user);

  // Tính toán danh sách thông báo thông minh
  const notifications = useMemo(() => {
    const list = [];
    if (!user) return list;

    if (isAdmin || isManager) {
      // 1. Thông báo cho Admin / Manager: Feedbacks chờ duyệt
      const pendingFbs = feedbacks.filter(f => f.status === 'pending' && (pickStore || f.dept === user?.dept));
      pendingFbs.forEach(fb => {
        list.push({
          id: `pending_fb_${fb.id}`,
          type: 'feedback_pending',
          title: `Báo bù công: ${fb.empName || fb.name || fb.empId} 📋`,
          desc: `Ngày ${fb.date} (${fb.shift || 'Ca làm'}): "${fb.reason || fb.issue || 'Báo bù công'}" - Cần xác nhận.`,
          icon: <Clock size={16} className="text-amber-600" />,
          bgColor: 'bg-amber-50 border-amber-200',
          link: '/admin/feedback',
          time: 'Cần duyệt'
        });
      });

      // 2. Thông báo đơn đổi ca chờ Quản lý phê duyệt
      const pendingSwaps = (shiftSwaps || []).filter(s => s.status === 'pending_manager' && (pickStore || s.store === user?.dept));
      pendingSwaps.forEach(swap => {
        list.push({
          id: `pending_swap_${swap.id}`,
          type: 'swap_pending_mgr',
          title: `Đơn đổi ca: ${swap.fromEmpName} ⇄ ${swap.toEmpName} 🔄`,
          desc: `Đổi ca ${swap.fromDay} (${swap.fromShift}) lấy ca ${swap.toDay} (${swap.toShift}) tại CH ${swap.store}.`,
          icon: <ArrowRightLeft size={16} className="text-indigo-600" />,
          bgColor: 'bg-indigo-50 border-indigo-200',
          link: '/admin/schedule?openSwaps=true',
          time: 'Cần duyệt'
        });
      });

      // 3. Thông báo nhân sự PT vượt ngưỡng
      const weekSched = schedule[currentWeek] || {};
      let ptOverCount = 0;
      employees.forEach(emp => {
        if (!pickStore && user?.dept && emp.dept !== user.dept) return;
        const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME' || (emp.role && emp.role.includes('PT'));
        if (isPT) {
          const empSched = weekSched[emp.id] || {};
          let totalH = 0;
          WEEK_DAYS.forEach(d => {
            const raw = empSched[d];
            if (raw) {
              const { shift } = normalizeShift(raw);
              if (shift && shift !== 'off') totalH += getShiftHours(shift);
            }
          });
          if (totalH > 23) ptOverCount++;
        }
      });

      if (ptOverCount > 0) {
        list.push({
          id: `pt_over_${ptOverCount}_${currentWeek}`,
          type: 'pt_warning',
          title: `Có ${ptOverCount} nhân viên Part-Time vượt định mức 23h`,
          desc: `Tuần ${currentWeek} có nhân viên Part-time vượt quá 23h/tuần.`,
          icon: <AlertTriangle size={16} className="text-red-600" />,
          bgColor: 'bg-red-50 border-red-200',
          link: '/admin/schedule',
          time: 'Cảnh báo'
        });
      }
    }

    const visibleShelves = (shelves || []).filter(s =>
      (isAdmin || isManager)
        ? (pickStore || !user.dept || s.storeId === user.dept)
        : s.assigneeId === user.id
    );
    collectExpiryAlerts(visibleShelves, shelfItems).forEach(({ shelf, item, st }) => {
      list.push({
        id: `exp_${item.id}`,
        type: 'expiry',
        title: `${item.productName} · kệ ${shelf.code}`,
        desc: `${st.label}. Giao ${isAdmin || isManager ? (shelf.assigneeId || 'chưa giao') : 'bạn'}. Báo trước ${shelf.notifyDays} ngày.`,
        icon: <AlertTriangle size={16} className="text-amber-600" />,
        bgColor: st.key === 'ok' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200',
        link: isAdmin || isManager ? '/admin/shelves' : '/employee/shelves',
        time: st.label
      });
    });

    if (!isAdmin && !isManager) {
      // 4. Thông báo cho Nhân viên: Có đồng nghiệp gửi yêu cầu đổi ca cho bạn
      const pendingPartnerSwaps = (shiftSwaps || []).filter(s => s.toEmpId === user.id && s.status === 'pending_partner');
      pendingPartnerSwaps.forEach(swap => {
        list.push({
          id: `swap_partner_${swap.id}`,
          type: 'swap_partner_req',
          title: `Yêu cầu đổi ca từ ${swap.fromEmpName} 🔄`,
          desc: `${swap.fromEmpName} muốn đổi ca ${swap.fromDay} (${swap.fromShift}) lấy ca ${swap.toDay} (${swap.toShift}) của bạn.`,
          icon: <ArrowRightLeft size={16} className="text-indigo-600" />,
          bgColor: 'bg-indigo-50 border-indigo-200',
          link: '/employee/schedule',
          time: 'Cần xác nhận'
        });
      });

      // 5. Thông báo cho Nhân viên: Kết quả đổi ca
      const myApprovedSwaps = (shiftSwaps || []).filter(s => (s.fromEmpId === user.id || s.toEmpId === user.id) && s.status === 'approved');
      myApprovedSwaps.forEach(swap => {
        list.push({
          id: `swap_approved_${swap.id}`,
          type: 'swap_approved',
          title: `Đơn đổi ca của bạn đã được DUYỆT ✅`,
          desc: `Ca làm việc giữa bạn và ${swap.fromEmpId === user.id ? swap.toEmpName : swap.fromEmpName} đã được cập nhật.`,
          icon: <CheckCircle2 size={16} className="text-emerald-600" />,
          bgColor: 'bg-emerald-50 border-emerald-200',
          link: '/employee/schedule',
          time: 'Đã đổi ca'
        });
      });

      // 6. Thông báo cho Nhân viên: Kết quả phê duyệt Feedback của tôi
      const myFbs = feedbacks.filter(f => f.empId === user.id);
      myFbs.forEach(fb => {
        if (fb.status === 'approved') {
          list.push({
            id: `fb_approved_${fb.id}`,
            type: 'feedback_approved',
            title: `Báo bù công ngày ${fb.date} đã được DUYỆT ✅`,
            desc: fb.resolutionNote ? `Quản lý: "${fb.resolutionNote}"` : 'Yêu cầu của bạn đã được cập nhật vào lịch làm việc.',
            icon: <CheckCircle2 size={16} className="text-emerald-600" />,
            bgColor: 'bg-emerald-50 border-emerald-200',
            link: '/employee/feedback',
            time: 'Đã duyệt'
          });
        } else if (fb.status === 'rejected') {
          list.push({
            id: `fb_rejected_${fb.id}`,
            type: 'feedback_rejected',
            title: `Báo bù công ngày ${fb.date} bị TỪ CHỐI ❌`,
            desc: fb.resolutionNote ? `Lý do: "${fb.resolutionNote}"` : 'Vui lòng kiểm tra lại thông tin giải trình.',
            icon: <XCircle size={16} className="text-red-600" />,
            bgColor: 'bg-red-50 border-red-200',
            link: '/employee/feedback',
            time: 'Từ chối'
          });
        }
      });

      // 7. Thông báo lịch làm việc tuần này
      const myWeekSched = schedule[currentWeek]?.[user.id];
      if (myWeekSched && Object.keys(myWeekSched).length > 0) {
        list.push({
          id: `sched_update_${currentWeek}`,
          type: 'schedule_notice',
          title: `Lịch làm việc tuần ${currentWeek} đã sẵn sàng`,
          desc: 'Xem chi tiết các ca phân công của bạn trong tuần.',
          icon: <CalendarDays size={16} className="text-blue-600" />,
          bgColor: 'bg-blue-50 border-blue-200',
          link: '/employee/schedule',
          time: 'Lịch tuần'
        });
      }
    }

    return list;
  }, [user, isAdmin, isManager, pickStore, feedbacks, schedule, currentWeek, employees, shiftSwaps, shelves, shelfItems]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(`read_notifs_${user?.id}`, JSON.stringify(allIds));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleItemClick = (notif) => {
    if (!readIds.includes(notif.id)) {
      const updated = [...readIds, notif.id];
      setReadIds(updated);
      try {
        localStorage.setItem(`read_notifs_${user?.id}`, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-100"
        title="Thông báo hệ thống"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-600 text-white font-mono font-black text-[9px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Bell size={15} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-800">Thông Báo Hệ Thống</h3>
                <p className="text-[10px] text-slate-500">Cập nhật lịch, Feedback & Cảnh báo</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Sparkles size={24} className="mx-auto mb-2 text-slate-300" />
                <div className="text-xs font-bold text-slate-600">Bạn đã cập nhật mọi thông tin!</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Không có thông báo mới nào cần xử lý.</div>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = readIds.includes(notif.id);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      !isRead ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-3.5 left-1.5"></span>
                    )}

                    <div className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${notif.bgColor}`}>
                      {notif.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs ${!isRead ? 'font-black text-slate-900' : 'font-bold text-slate-700'} truncate`}>
                          {notif.title}
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.desc}
                      </p>
                    </div>

                    <ChevronRight size={14} className="text-slate-300 self-center flex-shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
