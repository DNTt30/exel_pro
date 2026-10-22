import { useState, lazy, Suspense } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
const EmployeeSchedule = lazy(() => import('../pages/employee/EmployeeSchedule')); 
const EmployeeHome = lazy(() => import('../pages/employee/EmployeeHome'));
const EmployeeSupport = lazy(() => import('../pages/shared/EmployeeSupport'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard')); 
import { useStore } from '../store/useStore';
import { WEEK_DAYS } from '../data/constants';
import { normalizeShift } from '../utils/shiftHelper';
import { isAgentSandbox } from '../lib/agentSandbox';
import AISchedulerModal from '../components/modals/AISchedulerModal';
import Button from '../components/ui/Button';
import StaffingMatrixFields from '../components/StaffingMatrixFields';
import RecipeCalculator from '../components/handbook/RecipeCalculator';
import { sampleRecipeEntries } from './recipeFixture';
import { createAgentFixture, createSandboxDraftRepository, SAMPLE_WEEK, NEXT_WEEK } from './fixture';

const fixture = createAgentFixture();
const preview = isAgentSandbox ? new URLSearchParams(location.search).get('preview') : null;
if (isAgentSandbox) {
  if (preview) {
    fixture.ensureWeeksLoaded = async () => { if (new URLSearchParams(location.search).has('failSchedule')) throw new Error('Lỗi thử nghiệm'); };
    fixture.loadAttendanceRange = async () => {};
    fixture.setCurrentWeek = async week => useStore.setState({ currentWeek: week });
    if (preview === 'home') fixture.schedule[NEXT_WEEK][fixture.employees[0].id] = { T2: { shift: '6-14', registered: true }, T3: { shift: '6-14', registered: true }, T4: { shift: '6-14', registered: true }, T5: '6-14', T6: '', T7: 'off', CN: 'off' };
    fixture.user = { ...fixture.employees[0], role: preview === 'dashboard' ? 'admin' : 'employee' };
    if (preview === 'support-admin') fixture.user = { ...fixture.employees[4], role: 'SM', isManager: true };
    fixture.schedule[SAMPLE_WEEK][fixture.employees[1].id].T2 = '14-22';
    fixture.schedule[SAMPLE_WEEK][fixture.employees[2].id].T2 = '22-6';
  }
  useStore.setState(fixture);
}
const loadAdjacent = async weeks => Object.fromEntries(weeks.map(week => [week, fixture.schedule[week] || {}]));

export default function AgentSandbox() {
  const stores = useStore(s => s.stores);
  const [open, setOpen] = useState(false);
  const [repository] = useState(() => createSandboxDraftRepository(localStorage));
  if (!isAgentSandbox) return null;
  if (preview?.startsWith('support')) return <MemoryRouter><div className="h-[100dvh] overflow-auto"><Suspense fallback={<p role="status">Đang tải màn hình thử…</p>}><EmployeeSupport /></Suspense></div></MemoryRouter>;
  if (preview) return <MemoryRouter initialEntries={[preview === 'home' ? '/employee/home' : '/']}><div className="h-[100dvh] flex flex-col overflow-hidden"><header className="shrink-0 h-12 bg-white border-b p-3">Lịch Ca · Dữ liệu thử</header><main className="flex-1 min-h-0 min-w-0 overflow-auto"><Suspense fallback={<p role="status">Đang tải màn hình thử…</p>}>{preview === 'home' ? <Routes><Route path="/employee/home" element={<EmployeeHome />} /><Route path="/employee/schedule" element={<EmployeeSchedule />} /></Routes> : preview === 'employee' ? <EmployeeSchedule /> : <Dashboard />}</Suspense></main><nav className="shrink-0 h-16 border-t bg-white p-3">Thanh điều hướng mẫu</nav></div></MemoryRouter>;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header><h1 className="text-2xl font-bold">Lịch Ca · Môi trường thử cho bot</h1>
      <p role="status" className="my-3 rounded border border-amber-300 bg-amber-50 p-3">Dữ liệu mẫu trên máy này. Không kết nối Supabase. Chỉ tạo bản nháp, không có thao tác công bố.</p></header>
    <section aria-labelledby="sample-employees"><h2 id="sample-employees" className="text-lg font-semibold">Danh sách nhân viên mẫu</h2>
      <div className="overflow-x-auto"><table data-testid="employee-list" className="w-full text-left"><caption className="sr-only">5 nhân viên mẫu</caption>
        <thead><tr>{['Mã nhân viên', 'Họ và tên', 'Cửa hàng', 'Loại'].map(text => <th scope="col" key={text} className="p-2">{text}</th>)}</tr></thead>
        <tbody>{fixture.employees.map(emp => <tr key={emp.id} data-testid={`employee-${emp.id}`}><th scope="row" className="p-2">{emp.id}</th><td>{emp.name}</td><td>{emp.dept}</td><td>{emp.type}</td></tr>)}</tbody>
      </table></div></section>
    <section aria-labelledby="sample-schedule"><h2 id="sample-schedule" className="text-lg font-semibold">Lịch hiện có · Tuần {SAMPLE_WEEK}</h2>
      <div className="overflow-x-auto"><table data-testid="current-schedule" className="w-full text-left"><caption className="sr-only">Lịch tuần mẫu hiện có</caption>
        <thead><tr><th scope="col" className="p-2">Nhân viên</th>{WEEK_DAYS.map(day => <th scope="col" key={day} className="p-2">{day}</th>)}</tr></thead>
        <tbody>{fixture.employees.map(emp => <tr key={emp.id}><th scope="row" className="p-2">{emp.name}</th>{WEEK_DAYS.map(day => <td key={day} className="p-2">{normalizeShift(fixture.schedule[SAMPLE_WEEK][emp.id][day]).shift}</td>)}</tr>)}</tbody>
      </table></div></section>
    <p>Tuần tiếp theo {NEXT_WEEK}: 5 nhân viên đã đăng ký ca 6–14. Cần 4 người/ngày trong tuần và 5 người/ngày cuối tuần; tối đa 6 ca/người.</p>
    <details><summary>Cấu hình cửa hàng thử</summary><StaffingMatrixFields staffing={stores[0]?.staffing} onChange={staffing => useStore.setState({ stores: [{ ...stores[0], staffing }] })} /></details>
    <Button data-testid="open-scheduler" variant="primary" onClick={() => setOpen(true)}>Tạo hoặc xem lịch nháp tuần tiếp theo</Button>
    <section className="rounded-xl border bg-white p-4"><h2 className="mb-4 text-lg font-semibold">Tính nhanh tỷ lệ</h2><RecipeCalculator entries={sampleRecipeEntries} identity="sandbox" /></section>
    <AISchedulerModal isOpen={open} onClose={() => setOpen(false)} currentWeek={NEXT_WEEK} storeId="TEST01" draftRepository={repository} loadAdjacent={loadAdjacent} draftOnly />
  </main>;
}
