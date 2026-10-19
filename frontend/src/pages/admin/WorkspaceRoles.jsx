import { useRef, useState } from 'react';
import { Users, ShieldCheck, UserRoundPlus, RefreshCw, Pencil, Pause, Play, ArrowRight, Search, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { canConfigureWorkspace } from '../../utils/workspaceBranding';
import { ROLE_GROUPS, workspaceRoleSchema, customRoleName } from '../../utils/workspaceRoles';
import WorkspaceSettingsLayout, { SettingsSection, SettingsHelp, settingsInput, settingsButton } from '../../components/workspace/WorkspaceSettingsLayout';

const emptyDraft = { name: '', permissionGroup: 'staff', isActive: true };
const steps = [
  { title: 'Tạo tên vai trò', text: 'Đặt tên chức danh theo đơn vị, ví dụ Trưởng ca. Chọn nhóm quyền phù hợp với công việc.' },
  { title: 'Gán cho nhân viên', text: 'Tìm người cần gán, chọn vai trò và kiểm tra phạm vi quyền trước khi áp dụng.' },
  { title: 'Cập nhật khi thay đổi', text: 'Đổi vai trò khi công việc thay đổi. Ngưng gán mới chỉ dừng dùng vai trò cho người khác.' },
];

export default function WorkspaceRoles() {
  const user = useStore(s => s.user);
  const roles = useStore(s => s.workspaceRoles);
  const employees = useStore(s => s.employees);
  const status = useStore(s => s.rolesStatus);
  const loadError = useStore(s => s.rolesError);
  const load = useStore(s => s.loadWorkspaceRoles);
  const save = useStore(s => s.saveWorkspaceRole);
  const assign = useStore(s => s.assignWorkspaceRole);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const formRef = useRef(null);
  const employee = employees.find(e => e.id === employeeId);
  const selectedRole = roles.find(r => r.id === roleId);
  const selectedGroup = ROLE_GROUPS.find(g => g.id === selectedRole?.permissionGroup);
  const draftGroup = ROLE_GROUPS.find(g => g.id === draft.permissionGroup);
  const filtered = employees.filter(e => e.id !== 'admin' && e.isActive !== false &&
    (`${e.id} ${e.name} ${e.dept}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) || e.id === employeeId));
  if (!canConfigureWorkspace(user)) return <p className="p-6">Chỉ Admin đơn vị được quản lý vai trò.</p>;
  const run = async (operation, success) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await operation(); setMessage(success); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const submit = event => {
    event.preventDefault();
    const checked = workspaceRoleSchema.safeParse(draft);
    if (!checked.success) { setError(checked.error.issues[0].message); return; }
    void run(async () => { await save(checked.data, editing); setEditing(null); setDraft(emptyDraft); }, 'Đã lưu vai trò.');
  };
  const beginEdit = role => {
    setEditing(role); setDraft({ name: role.name, permissionGroup: role.permissionGroup, isActive: role.isActive });
    setError(''); setMessage(''); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  return <WorkspaceSettingsLayout title="Vai trò & quyền truy cập" description="Đặt tên chức danh theo cách đơn vị vận hành và giao đúng quyền cho từng người." steps={steps}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} />Chỉ Admin được tạo và gán vai trò.</p>
      <button type="button" disabled={busy || status === 'loading'} onClick={() => { setError(''); void load(); void useStore.getState().initializeData(); }} className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40"><RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />{status === 'loading' ? 'Đang tải…' : 'Tải lại danh sách'}</button>
    </div>
    {(loadError || error) && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error || loadError}</p>}
    {message && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <form ref={formRef} onSubmit={submit} className="min-w-0 scroll-mt-5">
        <fieldset disabled={busy || status !== 'ready'} className="min-w-0 disabled:opacity-50">
          <SettingsSection number="01" title={editing ? 'Đổi tên vai trò' : 'Tạo vai trò'} description={editing ? 'Tên mới sẽ hiển thị cho những người đang dùng vai trò này.' : 'Tạo một tên gọi riêng, sử dụng một trong ba nhóm quyền có sẵn.'}>
            <label className="block text-sm font-medium text-slate-700">Tên vai trò<input aria-label="Tên vai trò" className={settingsInput} value={draft.name} maxLength={60} minLength={2} required placeholder="Ví dụ: Trưởng ca, Cộng tác viên" onChange={e => { setDraft({ ...draft, name: e.target.value }); setError(''); setMessage(''); }} /><span className="mt-2 block text-xs font-normal text-slate-500">Dùng tên ngắn, dễ nhận biết. Từ 2–60 ký tự.</span></label>
            <label className="block text-sm font-medium text-slate-700">Nhóm quyền<select aria-label="Nhóm quyền" className={settingsInput} value={draft.permissionGroup} disabled={Boolean(editing)} onChange={e => setDraft({ ...draft, permissionGroup: e.target.value })}>{ROLE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
            <div className={`rounded-xl border p-4 text-sm leading-relaxed ${draft.permissionGroup === 'am' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><p className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck size={16} />{draftGroup?.label}</p><p>{draftGroup?.description}</p>{draft.permissionGroup === 'am' && <p className="mt-2 text-xs">Nhóm này hiện có quyền toàn đơn vị, chưa giới hạn theo từng khu vực.</p>}</div>
            {editing && <p className="text-xs leading-relaxed text-slate-500">Nhóm quyền được giữ nguyên khi đổi tên. Để đổi quyền, tạo vai trò khác rồi gán lại cho nhân viên.</p>}
            <div className="flex flex-wrap items-center gap-3"><button type="submit" className={settingsButton}><UserRoundPlus size={16} />{busy ? 'Đang lưu…' : 'Lưu vai trò'}</button>{editing && <button type="button" className="min-h-11 px-2 text-sm text-slate-500" onClick={() => { setEditing(null); setDraft(emptyDraft); setError(''); }}>Hủy sửa</button>}</div>
            <SettingsHelp title="Nên chọn nhóm quyền nào?"><p><strong>Nhân viên:</strong> dành cho người đăng ký và xem lịch cá nhân, gửi yêu cầu đổi ca hoặc bù công.</p><p><strong>Quản lý cửa hàng:</strong> dành cho người xếp lịch, quản lý công và nhân sự tại cửa hàng được giao.</p><p><strong>Quản lý khu vực:</strong> dùng quyền OFC hiện tại, truy cập toàn bộ cửa hàng trong đơn vị.</p><p>Ví dụ: đặt tên “Trưởng ca” và chọn nhóm Quản lý cửa hàng nếu người đó thực sự cần quyền quản lý. Tên gọi tự nó không cấp quyền.</p></SettingsHelp>
          </SettingsSection>
        </fieldset>
      </form>
      <form onSubmit={event => { event.preventDefault(); if (employee) void run(() => assign(employee, roleId), 'Đã cập nhật vai trò. Quyền dữ liệu áp dụng ngay; nhân viên đăng nhập lại để cập nhật menu.'); }} className="min-w-0">
        <fieldset disabled={busy || status !== 'ready'} className="min-w-0 disabled:opacity-50">
          <SettingsSection number="02" title="Gán cho nhân viên" description="Chọn người và xem quyền sẽ áp dụng trước khi lưu.">
            <label className="block text-sm font-medium text-slate-700">Tìm nhân viên<div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" /><input aria-label="Tìm nhân viên" className={`${settingsInput} pl-10`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, mã NV hoặc cửa hàng" /></div></label>
            <label className="block text-sm font-medium text-slate-700">Nhân viên<select aria-label="Nhân viên" required className={settingsInput} value={employeeId} onChange={e => { setEmployeeId(e.target.value); setRoleId(employees.find(x => x.id === e.target.value)?.workspaceRoleId || ''); setMessage(''); setError(''); }}><option value="">Chọn nhân viên</option>{filtered.map(e => <option key={e.id} value={e.id}>{e.name} · {e.id} · {e.dept}</option>)}</select></label>
            {filtered.length === 0 && <p className="text-xs text-slate-500">{search ? 'Không tìm thấy người phù hợp. Thử tìm bằng mã nhân viên.' : 'Chưa có nhân viên đang hoạt động. Thêm hồ sơ tại mục Nhân viên trước khi gán vai trò.'}</p>}
            <label className="block text-sm font-medium text-slate-700">Vai trò mới<select aria-label="Vai trò mới" disabled={!employee} className={settingsInput} value={roleId} onChange={e => { setRoleId(e.target.value); setMessage(''); }}><option value="">Bỏ vai trò tùy chỉnh — về Nhân viên</option>{roles.filter(r => r.isActive || r.id === employee?.workspaceRoleId).map(r => <option disabled={!r.isActive} key={r.id} value={r.id}>{r.name} · {ROLE_GROUPS.find(g => g.id === r.permissionGroup)?.label}{r.isActive ? '' : ' (đã ngưng)'}</option>)}</select></label>
            {employee ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center gap-2"><span className="break-words text-slate-500">{customRoleName(employee, roles) || employee.jobTitle || employee.role}</span><ArrowRight size={15} className="shrink-0 text-slate-400" /><span className="break-words font-semibold text-slate-800">{selectedRole?.name || 'Nhân viên'}</span></div><p className="mt-3 leading-relaxed text-slate-600">{selectedGroup?.description || 'Chỉ dùng quyền nhân viên; bỏ quyền quản lý của vai trò tùy chỉnh.'}</p><p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">Cửa hàng: {employee.dept || 'Chưa gán'} · Hợp đồng: {employee.type}. Giữ nguyên cửa hàng gốc và định mức giờ.</p></div> : <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500"><Users size={18} className="mt-0.5 shrink-0" />Chọn một nhân viên để xem vai trò hiện tại và quyền sau khi thay đổi.</div>}
            <button type="submit" className={settingsButton} disabled={!employee || employee.isActive === false || (employee.workspaceRoleId || '') === roleId || (selectedRole && !selectedRole.isActive)}><ShieldCheck size={16} />Áp dụng vai trò</button>
            <SettingsHelp title="Sau khi gán, nhân viên cần làm gì?"><p>Quyền truy cập dữ liệu có hiệu lực ngay sau khi lưu. Nhân viên đăng xuất rồi đăng nhập lại để cập nhật các mục trên menu.</p><p>Với quản lý cửa hàng, phạm vi truy cập dựa trên cửa hàng đang được gán trong hồ sơ. Đổi tên vai trò không đổi cửa hàng, loại hợp đồng hay số giờ làm.</p><p>Muốn thu hồi vai trò quản lý tùy chỉnh, chọn người đó, chọn “Bỏ vai trò tùy chỉnh — về Nhân viên”, rồi bấm Áp dụng vai trò.</p></SettingsHelp>
          </SettingsSection>
        </fieldset>
      </form>
    </div>
    <section aria-label="Danh sách vai trò" className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="font-semibold text-slate-900">Vai trò đã tạo</h2><p className="mt-1 text-sm text-slate-500">{roles.filter(r => r.isActive).length} vai trò đang mở để gán cho nhân viên.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Users size={20} /></span></div>
      {status === 'ready' && roles.length === 0 && <div className="px-5 py-10 text-center"><ShieldCheck size={30} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold text-slate-700">Bắt đầu với vai trò đầu tiên</p><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">Đặt tên và chọn nhóm quyền ở bước 1. Các vai trò mặc định của nhân viên vẫn hoạt động bình thường.</p></div>}
      <div className="divide-y divide-slate-100">{roles.map(role => <div key={role.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3"><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${role.isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'}`}><ShieldCheck size={17} /></div><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{role.name}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{ROLE_GROUPS.find(g => g.id === role.permissionGroup)?.label} · {employees.filter(e => e.workspaceRoleId === role.id && e.isActive !== false).length} nhân viên đang hoạt động</p>{!role.isActive && <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">Đã ngưng gán mới</span>}</div></div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy || status !== 'ready'} onClick={() => beginEdit(role)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"><Pencil size={13} />Đổi tên</button><button type="button" disabled={busy || status !== 'ready'} onClick={() => void run(() => save({ name: role.name, permissionGroup: role.permissionGroup, isActive: !role.isActive }, role), role.isActive ? 'Đã ngưng gán mới. Nhân viên đang dùng vai trò này giữ nguyên quyền.' : 'Đã mở lại vai trò.')} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">{role.isActive ? <Pause size={13} /> : <Play size={13} />}{role.isActive ? 'Ngưng gán mới' : 'Mở lại'}</button></div>
      </div>)}</div>
      <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-xs leading-relaxed text-slate-500 sm:px-6"><Info size={15} className="mt-0.5 shrink-0" /><p>Ngưng gán mới vẫn giữ quyền của người đang dùng vai trò. Muốn thu hồi, hãy đổi vai trò của từng nhân viên. Quyền Admin hệ thống không được tạo từ danh sách này.</p></div>
    </section>
  </WorkspaceSettingsLayout>;
}
