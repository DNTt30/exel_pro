import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import * as api from '../../services/api';
import { EMPLOYEE_START_STEPS } from '../../data/employeeStart';
import { understoodStepCount } from '../../utils/employeeSupport';
import { homeWeek } from '../../utils/employeeHome';

export default function EmployeeStartGuide({ record, onChange }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const save = async (step, value, openStep) => {
    setBusy(step); setError('');
    try {
      if (openStep?.id === 'registration') {
        const week = homeWeek(new Date(), 1);
        await useStore.getState().setCurrentWeek(week);
        if (useStore.getState().currentWeek !== week) throw new Error('Không mở được tuần sau.');
      }
      const result = await api.saveMyOnboarding(step, value);
      onChange({ ...record, steps: result.steps, dismissed: result.dismissed });
      if (openStep) navigate(openStep.path);
    } catch { setError('Chưa lưu được tiến độ hoặc mở trang. Hãy thử lại.'); }
    finally { setBusy(''); }
  };
  const count = understoodStepCount(record.steps);
  return <section className="rounded-xl border bg-white p-4 space-y-3" data-testid="employee-start-guide">
    <h2 className="font-bold">Bắt đầu tại đây · {count}/{EMPLOYEE_START_STEPS.length} mục tự xác nhận đã hiểu</h2>
    <p className="text-sm">Người hướng dẫn: {record.mentorName || 'Chưa được phân công — hãy gửi yêu cầu cho quản lý.'}</p>
    <p className="text-xs text-slate-600">Mở trang không đồng nghĩa đã hoàn thành công việc. Việc đánh dấu “đã hiểu” do bạn tự xác nhận và không phải đánh giá năng lực.</p>
    <button type="button" disabled={!!busy} className="min-h-11 text-sm text-blue-700 underline" onClick={() => save('dismissed', !record.dismissed)}>{record.dismissed ? 'Mở lại hướng dẫn' : 'Thu gọn hướng dẫn'}</button>
    {!record.dismissed && <ol className="space-y-3">{EMPLOYEE_START_STEPS.map((step, i) => <li key={step.id} className="rounded-lg border p-3">
      <h3 className="font-semibold text-sm">{i + 1}. {step.label}</h3><p className="my-2 text-sm text-slate-600">{step.hint}</p>
      <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={!!busy} onClick={() => save(`${step.id}_viewed`, true, step)} className="min-h-11 rounded border px-3 text-sm text-blue-700">{record.steps?.[`${step.id}_viewed`] ? 'Mở lại' : 'Mở hướng dẫn'}: {step.label}</button>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={!!busy} checked={record.steps?.[`${step.id}_understood`] === true} onChange={e => save(`${step.id}_understood`, e.target.checked)} />Tôi đã hiểu: {step.label}</label></div>
      <p className="text-xs text-slate-500">{record.steps?.[`${step.id}_viewed`] ? 'Đã mở trang từ hướng dẫn' : 'Chưa mở trang từ hướng dẫn'}</p>
    </li>)}</ol>}
    {busy && <p role="status">Đang lưu…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    <details><summary className="cursor-pointer text-sm font-semibold">Sổ tay cho những ca đầu tiên</summary>
      <p className="my-2 text-xs">Các liên kết mở tài liệu đã duyệt trong Sổ tay hiện có; tài liệu còn thiếu cần quản lý bổ sung và duyệt.</p>
      <nav aria-label="Nhóm Sổ tay cho nhân viên mới" className="flex flex-wrap gap-2">{[['recipe', 'Pha chế / chế biến'], ['ops', 'Mở ca, đóng ca và vận hành'], ['quality', 'Chất lượng, vệ sinh và hạn dùng'], ['labor', 'Quy định nhân sự']].map(([category, label]) => <Link key={category} className="inline-flex min-h-11 items-center rounded border px-3 text-sm text-blue-700" to={`/employee/handbook?category=${category}`}>{label}</Link>)}</nav>
    </details>
  </section>;
}
