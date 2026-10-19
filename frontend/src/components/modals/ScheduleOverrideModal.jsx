import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { overrideReasonSchema } from '../../schemas/operationalSchemas';
import Modal from './Modal';
import Button from '../ui/Button';

export default function ScheduleOverrideModal() {
  const request = useStore(s => s.scheduleOverrideRequest);
  const user = useStore(s => s.user);
  const epoch = useStore(s => s._sessionEpoch);
  const finish = useStore(s => s.finishScheduleOverride);
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [request]);
  useEffect(() => { if (!user || (request && request.epoch !== epoch)) finish(null); }, [user, epoch, request, finish]);
  return <Modal isOpen={Boolean(request)} title="Lịch chưa đáp ứng quy chuẩn" onClose={() => finish(null)} footer={<>
    <Button onClick={() => finish(null)}>Quay lại sửa lịch</Button>
    <Button variant="primary" disabled={!overrideReasonSchema.safeParse(reason).success} onClick={() => finish(reason.trim())}>Lưu ngoại lệ có nhật ký</Button>
  </>}>
    <p className="text-sm text-slate-700">Admin có thể lưu ngoại lệ về giờ làm, thời gian nghỉ hoặc số đêm liên tiếp. Lý do và các vi phạm sẽ được ghi vào nhật ký hệ thống. Ca trùng giờ vẫn bị chặn.</p>
    <ul className="my-3 max-h-40 space-y-2 overflow-y-auto text-sm text-amber-800">{request?.violations.map((v, i) => <li key={i}>{v.employeeId}{v.date ? ` · ${v.date}` : ''}: {v.message || (v.code === 'CONSECUTIVE_NIGHTS' ? `${v.count} đêm liên tiếp, tối đa ${v.limit}` : v.code === 'MAX_WORK_DAYS' ? `${v.count} ngày làm, tối đa ${v.limit}/tuần` : v.code === 'OVER_MAX_HOURS' ? `Tổng ${v.hours}h, tối đa ${v.limit}h/tuần` : `Nghỉ ${Number(v.hours).toFixed(1)}h, cần ${v.limit}h`)}</li>)}</ul>
    <label className="block text-sm font-semibold">Lý do ngoại lệ<textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} minLength={10} maxLength={500} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3" placeholder="Ghi rõ lý do và phương án bố trí nhân sự" /></label>
    <p className="mt-1 text-xs text-slate-500">Nhập lý do từ 10–500 ký tự.</p>
  </Modal>;
}
