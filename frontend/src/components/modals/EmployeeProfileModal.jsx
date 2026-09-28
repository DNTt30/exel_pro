import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getEmployeeProfiles } from '../../services/api';
import { workPlanReminder } from '../../utils/employeeProfile';
export default function EmployeeProfileModal({ employeeId, onClose }) {
  const [profile, setProfile] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setProfile(null); setError('');
    getEmployeeProfiles(employeeId).then(rows => {
      if (!current) return;
      if (!rows[0]) throw new Error('Không có quyền xem hoặc hồ sơ không tồn tại.');
      setProfile(rows[0]);
    }).catch(e => { if (current) setError(e.message || 'Không tải được hồ sơ.'); });
    return () => { current = false; };
  }, [employeeId]);
  const reminder = profile && workPlanReminder(profile.workPlanUntil);
  return <Modal title="Hồ sơ nhân viên" isOpen onClose={onClose} maxWidth="max-w-xl">
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : !profile ? <p role="status">Đang tải hồ sơ…</p> : <>
      {reminder && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{reminder}. SM nên trao đổi lại dự định và chuẩn bị nhân sự.</p>}
      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        {[['Họ và tên', profile.name], ['Mã nhân viên', profile.id], ['Vai trò', profile.jobTitle || profile.role || profile.type], ['Cửa hàng', profile.dept], ['Email khôi phục', profile.recoveryEmail], ['Ngày sinh', profile.dob ? profile.dob.split('-').reverse().join('/') : ''], ['Trường học', profile.university], ['Ngành học', profile.major], ['Dự định làm đến', profile.workPlanUntil]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-800">{value || 'Chưa cung cấp'}</dd></div>)}
      </dl>
    </>}
  </Modal>;
}
