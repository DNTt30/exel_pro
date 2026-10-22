import { WEEK_DAYS } from '../../data/constants';
import { normalizeShift } from '../../utils/shiftHelper';
import { draftCellEditable } from '../../utils/scheduleDraft';

export default function DraftEditor({ result, employees, onChange, disabled }) {
  return <section aria-label="Sửa lịch nháp" data-testid="draft-editor">
    <h3 className="font-semibold">Bản nháp · Chưa áp dụng vào lịch</h3>
    <p className="my-2 text-sm text-slate-600">Chọn hoặc bỏ ca đã đăng ký. Ca đã chốt, OFF và ngày trống được giữ nguyên.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <caption className="sr-only">Ca trong bản nháp</caption>
      <thead><tr><th scope="col">Nhân viên</th>{WEEK_DAYS.map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
      <tbody>{employees.map(emp => <tr key={emp.id} data-testid={`draft-employee-${emp.id}`}>
        <th scope="row" className="p-2 text-left">{emp.name}</th>
        {WEEK_DAYS.map(day => {
          const original = result.sourceSchedule[emp.id]?.[day];
          const cell = normalizeShift(result.schedule[emp.id]?.[day] ?? original);
          return <td key={day} className="p-1">{draftCellEditable(original)
            ? <select disabled={disabled} className="min-h-11 rounded border p-1" aria-label={`Ca nháp ${emp.id} ${day}`} data-testid={`draft-cell-${emp.id}-${day}`} value={cell.confirmed ? 'selected' : 'registered'} onChange={e => onChange(emp.id, day, e.target.value === 'selected' ? normalizeShift(original).shift : original)}>
              <option value="registered">Chưa chọn</option><option value="selected">{normalizeShift(original).shift}</option>
            </select>
            : <span>{cell.shift === 'off' ? 'OFF' : cell.shift || 'Chưa đăng ký'}{cell.covering_store ? ` ${cell.covering_store}` : ''}</span>}</td>;
        })}
      </tr>)}</tbody>
    </table></div>
    {!!result.findings?.length && <ul aria-label="Ràng buộc bản nháp" className="mt-3 text-sm text-amber-900">{result.findings.map((f, i) => <li key={i}>{f.message}</li>)}</ul>}
    <p role="status" data-testid="draft-validation" className="mt-3 text-sm">{result.blockers?.length ? `${result.blockers.length} lỗi cần sửa trước khi lưu.` : 'Không có lỗi trùng giờ hoặc vượt giới hạn ca/giờ.'} {result.shortages.length ? `Còn ${result.shortages.length} khung giờ thiếu người; xem chi tiết bên dưới.` : 'Đủ người theo nhu cầu.'}</p>
  </section>;
}
