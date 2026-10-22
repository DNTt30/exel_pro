import { useRef, useState } from 'react';
import { Users, ShieldCheck, UserRoundPlus, RefreshCw, Pencil, Pause, Play, ArrowRight, Search, Info, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
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

const QUICK_ROLE_SUGGESTIONS = [
  { name: 'Trưởng ca', group: 'sm' },
  { name: 'Phó cửa hàng', group: 'sm' },
  { name: 'Giám sát khu vực', group: 'am' },
  { name: 'Nhân viên chính thức', group: 'staff' },
];

const GROUP_BADGE_STYLES = {
  staff: 'bg-sky-50 text-sky-700 border-sky-200',
  sm: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  am: 'bg-amber-50 text-amber-800 border-amber-200',
};

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
  const assignRef = useRef(null);

  const employee = employees.find(e => e.id === employeeId);
  const selectedRole = roles.find(r => r.id === roleId);
  const selectedGroup = ROLE_GROUPS.find(g => g.id === selectedRole?.permissionGroup);
  const draftGroup = ROLE_GROUPS.find(g => g.id === draft.permissionGroup);
  const activeStaff = employees.filter(e => e.id !== 'admin' && e.isActive !== false);
  const assignedStaff = activeStaff.filter(e => Boolean(e.workspaceRoleId));
  const managerRoleIds = new Set(roles.filter(r => r.permissionGroup === 'sm' || r.permissionGroup === 'am').map(r => r.id));
  const customManagerCount = activeStaff.filter(e => e.workspaceRoleId && managerRoleIds.has(e.workspaceRoleId)).length;

  const filtered = activeStaff.filter(e =>
    `${e.id} ${e.name} ${e.dept}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) || e.id === employeeId
  );

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

  const pickEmployeeForAssign = emp => {
    setEmployeeId(emp.id);
    setRoleId(emp.workspaceRoleId || '');
    setMessage('');
    setError('');
    assignRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <WorkspaceSettingsLayout
      title="Vai trò & quyền truy cập"
      description="Đặt tên chức danh theo cách đơn vị vận hành và giao đúng quyền cho từng người."
      steps={steps}
    >
      {/* ── 3 Thẻ Thống Kê Phân Quyền Trực Quan ── */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Vai trò đang mở</p>
            <p className="mt-1 text-lg sm:text-2xl font-extrabold text-slate-900 tabular-nums">
              {roles.filter(r => r.isActive).length}
              <span className="text-xs font-normal text-slate-400"> / {roles.length}</span>
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <ShieldCheck size={18} />
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">NV đã gán vai trò</p>
            <p className="mt-1 text-lg sm:text-2xl font-extrabold text-slate-900 tabular-nums">
              {assignedStaff.length}
              <span className="text-xs font-normal text-slate-400"> người</span>
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Users size={18} />
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Quyền Quản lý cấp thêm</p>
            <p className="mt-1 text-lg sm:text-2xl font-extrabold text-slate-900 tabular-nums">
              {customManagerCount}
              <span className="text-xs font-normal text-slate-400"> SM/AM</span>
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Sparkles size={18} />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <ShieldCheck size={15} className="text-indigo-600" />
          <span>Chỉ Admin được tạo và gán vai trò.</span>
        </p>
        <button
          type="button"
          disabled={busy || status === 'loading'}
          onClick={() => { setError(''); void load(); void useStore.getState().initializeData(); }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          <RefreshCw size={13} className={status === 'loading' ? 'animate-spin text-indigo-600' : ''} />
          <span>{status === 'loading' ? 'Đang tải…' : 'Tải lại danh sách'}</span>
        </button>
      </div>

      {(loadError || error) && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm font-medium text-rose-800">
          {error || loadError}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm font-medium text-emerald-800">
          {message}
        </p>
      )}

      {/* ── LƯỚI 2 CỘT: 01 TẠO VAI TRÒ & 02 GÁN CHO NHÂN VIÊN ── */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* CỘT 01: TẠO / SỬA VAI TRÒ */}
        <form ref={formRef} onSubmit={submit} className="min-w-0 scroll-mt-5">
          <fieldset disabled={busy || status !== 'ready'} className="min-w-0 disabled:opacity-50">
            <SettingsSection
              number="01"
              title={editing ? 'Đổi tên vai trò' : 'Tạo vai trò'}
              description={editing ? 'Tên mới sẽ hiển thị cho những người đang dùng vai trò này.' : 'Tạo một tên gọi riêng, sử dụng một trong ba nhóm quyền có sẵn.'}
            >
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700">
                  Tên vai trò
                  <input
                    aria-label="Tên vai trò"
                    className={settingsInput}
                    value={draft.name}
                    maxLength={60}
                    minLength={2}
                    required
                    placeholder="Ví dụ: Trưởng ca, Cộng tác viên"
                    onChange={e => { setDraft({ ...draft, name: e.target.value }); setError(''); setMessage(''); }}
                  />
                  <span className="mt-1.5 block text-[11px] font-normal text-slate-500">Dùng tên ngắn, dễ nhận biết. Từ 2–60 ký tự.</span>
                </label>

                {/* Gợi ý mẫu nhanh */}
                {!editing && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400">Mẫu nhanh:</span>
                    {QUICK_ROLE_SUGGESTIONS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setDraft({ ...draft, name: preset.name, permissionGroup: preset.group });
                          setError('');
                          setMessage('');
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/60 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 transition cursor-pointer"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Nhóm quyền
                <select
                  aria-label="Nhóm quyền"
                  className={settingsInput}
                  value={draft.permissionGroup}
                  disabled={Boolean(editing)}
                  onChange={e => setDraft({ ...draft, permissionGroup: e.target.value })}
                >
                  {ROLE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </label>

              {/* 3 Thẻ Chọn Nhanh Nhóm Quyền Trực Quan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ROLE_GROUPS.map(g => {
                  const active = draft.permissionGroup === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={Boolean(editing)}
                      onClick={() => setDraft({ ...draft, permissionGroup: g.id })}
                      className={`text-left rounded-xl border p-2.5 transition cursor-pointer disabled:cursor-not-allowed ${
                        active
                          ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${GROUP_BADGE_STYLES[g.id] || 'bg-slate-100 text-slate-700'}`}>
                          {g.label}
                        </span>
                        {active && <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-slate-600 line-clamp-2">{g.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className={`rounded-xl border p-3.5 text-xs sm:text-sm leading-relaxed ${draft.permissionGroup === 'am' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-indigo-100 bg-indigo-50/40 text-slate-700'}`}>
                <p className="mb-1 flex items-center gap-2 font-bold text-slate-900">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <span>{draftGroup?.label}</span>
                </p>
                <p>{draftGroup?.description}</p>
                {draft.permissionGroup === 'am' && <p className="mt-1.5 text-xs font-medium text-amber-800">⚠️ Nhóm này có quyền quản lý toàn đơn vị (tất cả cửa hàng).</p>}
              </div>

              {editing && (
                <p className="text-xs leading-relaxed text-slate-500">
                  Nhóm quyền được giữ nguyên khi đổi tên. Để đổi quyền, tạo vai trò khác rồi gán lại cho nhân viên.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className={settingsButton}>
                  <UserRoundPlus size={16} />
                  <span>{busy ? 'Đang lưu…' : 'Lưu vai trò'}</span>
                </button>
                {editing && (
                  <button
                    type="button"
                    className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    onClick={() => { setEditing(null); setDraft(emptyDraft); setError(''); }}
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <SettingsHelp title="Nên chọn nhóm quyền nào?">
                <p><strong>Nhân viên:</strong> dành cho người đăng ký và xem lịch cá nhân, gửi yêu cầu đổi ca hoặc bù công.</p>
                <p><strong>Quản lý cửa hàng:</strong> dành cho người xếp lịch, quản lý công và nhân sự tại cửa hàng được giao.</p>
                <p><strong>Quản lý khu vực:</strong> dùng quyền OFC hiện tại, truy cập toàn bộ cửa hàng trong đơn vị.</p>
              </SettingsHelp>
            </SettingsSection>
          </fieldset>
        </form>

        {/* CỘT 02: GÁN CHO NHÂN VIÊN */}
        <form
          ref={assignRef}
          onSubmit={event => {
            event.preventDefault();
            if (employee) void run(() => assign(employee, roleId), 'Đã cập nhật vai trò. Quyền dữ liệu áp dụng ngay; nhân viên đăng nhập lại để cập nhật menu.');
          }}
          className="min-w-0 scroll-mt-5"
        >
          <fieldset disabled={busy || status !== 'ready'} className="min-w-0 disabled:opacity-50">
            <SettingsSection number="02" title="Gán cho nhân viên" description="Chọn người và xem quyền sẽ áp dụng trước khi lưu.">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Tìm nhân viên
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                  <input
                    aria-label="Tìm nhân viên"
                    className={`${settingsInput} pl-10`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tên, mã NV hoặc cửa hàng"
                  />
                </div>
              </label>

              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Nhân viên
                <select
                  aria-label="Nhân viên"
                  required
                  className={settingsInput}
                  value={employeeId}
                  onChange={e => {
                    setEmployeeId(e.target.value);
                    setRoleId(employees.find(x => x.id === e.target.value)?.workspaceRoleId || '');
                    setMessage('');
                    setError('');
                  }}
                >
                  <option value="">Chọn nhân viên</option>
                  {filtered.map(e => <option key={e.id} value={e.id}>{e.name} · {e.id} · {e.dept}</option>)}
                </select>
              </label>

              {filtered.length === 0 && (
                <p className="text-xs text-slate-500">
                  {search ? 'Không tìm thấy người phù hợp. Thử tìm bằng mã nhân viên.' : 'Chưa có nhân viên đang hoạt động. Thêm hồ sơ tại mục Nhân viên trước khi gán vai trò.'}
                </p>
              )}

              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Vai trò mới
                <select
                  aria-label="Vai trò mới"
                  disabled={!employee}
                  className={settingsInput}
                  value={roleId}
                  onChange={e => { setRoleId(e.target.value); setMessage(''); }}
                >
                  <option value="">Bỏ vai trò tùy chỉnh — về Nhân viên</option>
                  {roles.filter(r => r.isActive || r.id === employee?.workspaceRoleId).map(r => (
                    <option disabled={!r.isActive} key={r.id} value={r.id}>
                      {r.name} · {ROLE_GROUPS.find(g => g.id === r.permissionGroup)?.label}{r.isActive ? '' : ' (đã ngưng)'}
                    </option>
                  ))}
                </select>
              </label>

              {/* Thẻ So sánh Nhân viên & Quyền Trước/Sau */}
              {employee ? (
                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-3.5 text-xs sm:text-sm shadow-2xs">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-xs">
                      {employee.name ? employee.name.charAt(0).toUpperCase() : 'NV'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-900 truncate">{employee.name}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        Mã: {employee.id} · CH: <strong className="text-indigo-700">{employee.dept || 'Chưa gán'}</strong> · HĐ: {employee.type}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {customRoleName(employee, roles) || employee.jobTitle || employee.role}
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-indigo-500" />
                    <span className="rounded-lg border border-indigo-200 bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                      {selectedRole?.name || 'Nhân viên'}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                    {selectedGroup?.description || 'Chỉ dùng quyền nhân viên; bỏ quyền quản lý của vai trò tùy chỉnh.'}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Giữ nguyên cửa hàng gốc ({employee.dept || 'Chưa gán'}) và định mức giờ hợp đồng ({employee.type}).
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs sm:text-sm leading-relaxed text-slate-500">
                  <Users size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                  <span>Chọn một nhân viên ở trên (hoặc bấm vào tên nhân viên ở bảng bên dưới) để xem và đổi vai trò.</span>
                </div>
              )}

              <button
                type="submit"
                className={settingsButton}
                disabled={!employee || employee.isActive === false || (employee.workspaceRoleId || '') === roleId || (selectedRole && !selectedRole.isActive)}
              >
                <ShieldCheck size={16} />
                <span>Áp dụng vai trò</span>
              </button>

              <SettingsHelp title="Sau khi gán, nhân viên cần làm gì?">
                <p>Quyền truy cập dữ liệu có hiệu lực ngay sau khi lưu. Nhân viên đăng xuất rồi đăng nhập lại để cập nhật các mục trên menu.</p>
                <p>Muốn thu hồi vai trò quản lý tùy chỉnh, chọn người đó, chọn “Bỏ vai trò tùy chỉnh — về Nhân viên”, rồi bấm Áp dụng vai trò.</p>
              </SettingsHelp>
            </SettingsSection>
          </fieldset>
        </form>
      </div>

      {/* ── DANH SÁCH VAI TRÒ & NHÂN SỰ ĐANG ĐẢM NHIỆM ── */}
      <section aria-label="Danh sách vai trò" className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Danh mục Vai trò đã tạo</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {roles.filter(r => r.isActive).length} vai trò đang mở · Bấm vào tên nhân viên để chuyển nhanh sang khung điều chỉnh quyền.
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Users size={20} />
          </span>
        </div>

        {status === 'ready' && roles.length === 0 && (
          <div className="px-5 py-10 text-center">
            <ShieldCheck size={32} className="mx-auto mb-2.5 text-indigo-300" />
            <p className="text-sm font-bold text-slate-800">Bắt đầu với vai trò tùy chỉnh đầu tiên</p>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm leading-relaxed text-slate-500">
              Chọn một mẫu nhanh ở khung <strong>01 Tạo vai trò</strong> (ví dụ: Trưởng ca, Phó cửa hàng) để phân quyền cho nhân sự.
            </p>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {roles.map(role => {
            const groupInfo = ROLE_GROUPS.find(g => g.id === role.permissionGroup);
            const members = activeStaff.filter(e => e.workspaceRoleId === role.id);
            return (
              <div key={role.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 px-5 py-4 sm:px-6 hover:bg-slate-50/60 transition-colors">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${role.isActive ? (GROUP_BADGE_STYLES[role.permissionGroup] || 'bg-indigo-50 text-indigo-600 border-indigo-200') : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-extrabold text-slate-900">{role.name}</p>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${GROUP_BADGE_STYLES[role.permissionGroup] || 'bg-slate-100 text-slate-600'}`}>
                        {groupInfo?.label}
                      </span>
                      {!role.isActive && (
                        <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Đã ngưng gán mới
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {members.length} nhân viên đang đảm nhiệm
                    </p>

                    {members.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {members.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => pickEmployeeForAssign(m)}
                            title="Bấm để chọn nhân viên này ở khung Gán vai trò"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 shadow-2xs transition cursor-pointer"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({m.dept || m.id})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={busy || status !== 'ready'}
                    onClick={() => beginEdit(role)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Đổi tên</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || status !== 'ready'}
                    onClick={() =>
                      void run(
                        () => save({ name: role.name, permissionGroup: role.permissionGroup, isActive: !role.isActive }, role),
                        role.isActive ? 'Đã ngưng gán mới. Nhân viên đang dùng vai trò này giữ nguyên quyền.' : 'Đã mở lại vai trò.'
                      )
                    }
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    {role.isActive ? <Pause size={13} /> : <Play size={13} />}
                    <span>{role.isActive ? 'Ngưng gán mới' : 'Mở lại'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 text-xs leading-relaxed text-slate-500 sm:px-6">
          <Info size={15} className="mt-0.5 shrink-0 text-indigo-500" />
          <p>Ngưng gán mới vẫn giữ quyền của người đang dùng vai trò. Muốn thu hồi, hãy bấm vào tên nhân viên rồi chọn “Bỏ vai trò tùy chỉnh — về Nhân viên”.</p>
        </div>
      </section>
    </WorkspaceSettingsLayout>
  );
}
