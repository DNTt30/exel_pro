import { useEffect, useState } from 'react';
import { Save, RefreshCw, Upload, ImagePlus, Check, Loader2, CircleHelp, Trash2, Sparkles, Palette, Mail, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { BRAND_COLORS, brandingDraft, brandingSchema, canConfigureWorkspace, readBrandLogo } from '../../utils/workspaceBranding';
import WorkspaceSettingsLayout, { SettingsSection, SettingsHelp, settingsInput, settingsButton } from '../../components/workspace/WorkspaceSettingsLayout';
import BrandingPreview from '../../components/workspace/BrandingPreview';

const steps = [
  { title: 'Thông tin đơn vị', text: 'Đặt tên ứng dụng, tên đơn vị và email hỗ trợ nếu cần.' },
  { title: 'Chọn nhận diện', text: 'Tải logo cỡ lớn, chọn màu chủ đạo và xem thử trực tiếp.' },
  { title: 'Lưu để áp dụng', text: 'Bấm Lưu cài đặt để áp dụng cho mọi người trong toàn đơn vị.' },
];

export default function WorkspaceSettings() {
  const user = useStore(s => s.user);
  const branding = useStore(s => s.workspaceBranding);
  const status = useStore(s => s.brandingStatus);
  const loadError = useStore(s => s.brandingError);
  const load = useStore(s => s.loadWorkspaceBranding);
  const save = useStore(s => s.updateWorkspaceBranding);
  const saving = useStore(s => s.brandingSaving);
  const [draft, setDraft] = useState(() => brandingDraft(branding));
  const [baseline, setBaseline] = useState(() => brandingDraft(branding));
  const [revision, setRevision] = useState(branding.revision);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) { const next = brandingDraft(branding); setDraft(next); setBaseline(next); setRevision(branding.revision); }
  }, [branding, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!canConfigureWorkspace(user)) return <p className="p-6 text-slate-600">Chỉ Admin đơn vị được thay đổi cài đặt.</p>;

  const update = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setMessage(''); setError(''); };

  const submit = async event => {
    event.preventDefault(); if (saving || imageBusy || !dirty) return;
    setError(''); setMessage('');
    const checked = brandingSchema.safeParse(draft);
    if (!checked.success) { setError(checked.error.issues[0].message); return; }
    try {
      const saved = await save(checked.data, revision);
      const next = brandingDraft(saved); setDraft(next); setBaseline(next); setRevision(saved.revision);
      setMessage('Đã lưu cài đặt đơn vị.');
    } catch (e) { setError(e.message); }
  };

  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setImageBusy(true); setError('');
    try { update('logoDataUrl', await readBrandLogo(file)); }
    catch (e) { setError(e.message || 'Không đọc được ảnh.'); }
    finally { setImageBusy(false); }
  };

  const discard = () => {
    const next = brandingDraft(branding);
    setDraft(next); setBaseline(next); setRevision(branding.revision);
    setError(''); setMessage(''); void load();
  };

  return (
    <WorkspaceSettingsLayout
      title="Cài đặt đơn vị"
      description="Thiết lập bộ nhận diện thương hiệu, logo cỡ lớn và thông tin hỗ trợ cho toàn đơn vị."
      steps={steps}
    >
      {loadError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="font-bold underline cursor-pointer">Thử tải lại</button>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_370px]">
          <fieldset disabled={saving || imageBusy || status !== 'ready'} className="min-w-0 space-y-4 disabled:opacity-60">
            <legend className="sr-only">Thông tin nhận diện đơn vị</legend>

            {/* ── BƯỚC 01: THÔNG TIN ĐƠN VỊ ── */}
            <SettingsSection
              number="01"
              title="Thông tin đơn vị & Liên hệ"
              description="Tên ứng dụng, tên chuỗi/tổ chức và email hỗ trợ hiển thị cho toàn bộ nhân sự."
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-700" htmlFor="workspace-app-name">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>Tên ứng dụng <span className="text-rose-500">*</span></span>
                  </span>
                  <input
                    id="workspace-app-name"
                    aria-describedby="workspace-app-name-help"
                    className={settingsInput}
                    value={draft.appName}
                    maxLength={40}
                    required
                    minLength={2}
                    placeholder="Ví dụ: Lịch Ca, VN0485 Workspace"
                    onChange={e => update('appName', e.target.value)}
                  />
                  <span id="workspace-app-name-help" className="mt-1.5 block text-[11px] font-normal leading-relaxed text-slate-500">
                    Hiển thị trên thanh Header, trang Đăng nhập và tiêu đề trình duyệt (2–40 ký tự).
                  </span>
                </label>

                <label className="block text-xs sm:text-sm font-bold text-slate-700" htmlFor="workspace-organization">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600" />
                    <span>Tên đơn vị / Tổ chức</span>
                    <span className="text-[11px] font-normal text-slate-400">(Tùy chọn)</span>
                  </span>
                  <input
                    id="workspace-organization"
                    className={settingsInput}
                    value={draft.organizationName}
                    maxLength={100}
                    placeholder="Ví dụ: Hệ thống Cửa hàng Khu vực 1"
                    onChange={e => update('organizationName', e.target.value)}
                  />
                  <span className="mt-1.5 block text-[11px] font-normal leading-relaxed text-slate-500">
                    Hiển thị dòng phụ dưới tên ứng dụng trên Header, Sidebar và chân trang.
                  </span>
                </label>
              </div>

              <label className="block text-xs sm:text-sm font-bold text-slate-700" htmlFor="workspace-contact">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={14} className="text-indigo-600" />
                  <span>Email liên hệ công khai</span>
                  <span className="text-[11px] font-normal text-slate-400">(Tùy chọn)</span>
                </span>
                <input
                  id="workspace-contact"
                  aria-describedby="workspace-contact-help"
                  className={settingsInput}
                  type="email"
                  value={draft.contactEmail}
                  maxLength={254}
                  placeholder="hotro@donvi.vn"
                  onChange={e => update('contactEmail', e.target.value)}
                />
                <span id="workspace-contact-help" className="mt-1.5 block text-[11px] font-normal leading-relaxed text-slate-500">
                  Hiển thị ở cuối trang đăng nhập để nhân viên liên hệ khi cần hỗ trợ.
                </span>
              </label>

              <p className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs leading-relaxed text-slate-600">
                <CircleHelp size={15} className="mt-0.5 shrink-0 text-indigo-600" />
                <span>Email này là địa chỉ hỗ trợ chung của đơn vị. Email nhận mã OTP khôi phục mật khẩu của từng nhân viên được lưu riêng trong mục <strong>Hồ sơ của tôi</strong>.</span>
              </p>
            </SettingsSection>

            {/* ── BƯỚC 02: LOGO CỠ LỚN & BẢNG MÀU NHẬN DIỆN ── */}
            <SettingsSection
              number="02"
              title="Logo & Màu nhận diện thương hiệu"
              description="Tải lên logo đơn vị độ nét cao và chọn tông màu chủ đạo cho thanh điều hướng."
            >
              {/* Khung Studio tải Logo cỡ lớn (104x104px) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border-2 border-dashed border-indigo-200/90 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 p-4">
                <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-md ring-4 ring-indigo-500/5 mx-auto sm:mx-0">
                  {draft.logoDataUrl ? (
                    <img src={draft.logoDataUrl} alt="Logo đang chọn" className="h-full w-full object-contain rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <ImagePlus size={30} className="text-indigo-400" />
                      <span className="text-[10px] font-semibold">Chưa có logo</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition focus-within:ring-2 focus-within:ring-indigo-500">
                      <Upload size={15} />
                      <span>{draft.logoDataUrl ? 'Thay đổi logo khác' : 'Tải logo đơn vị lên'}</span>
                      <input aria-label="Chọn logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="sr-only" />
                    </label>

                    {draft.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => update('logoDataUrl', '')}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>Bỏ logo</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-slate-500">
                    Hỗ trợ <strong>PNG, JPG, WebP</strong> (tối đa 2 MB) · Tự động chuẩn hóa sắc nét <strong>192×192px</strong>.
                  </p>
                  {draft.logoDataUrl && (
                    <p className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <Check size={12} />
                      <span>Logo đã sẵn sàng hiển thị cỡ lớn trên Header, Banner & Trang đăng nhập</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Bảng chọn Màu nhận diện (Brand Color Swatches) */}
              <div>
                <p id="brand-color-label" className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700">
                  <Palette size={15} className="text-indigo-600" />
                  <span>Màu nhận diện chủ đạo</span>
                </p>
                <div role="radiogroup" aria-labelledby="brand-color-label" className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {BRAND_COLORS.map(color => {
                    const selected = draft.primaryColor === color.value;
                    return (
                      <label
                        key={color.value}
                        className={`relative flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-xs transition focus-within:ring-2 focus-within:ring-indigo-500 ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50/50 font-bold text-slate-900 shadow-xs ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="brand-color"
                          aria-label={color.label}
                          value={color.value}
                          checked={selected}
                          onChange={() => update('primaryColor', color.value)}
                        />
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-black/10"
                          style={{ backgroundColor: color.value }}
                        >
                          {selected && <Check size={15} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{color.label}</span>
                          <span className="block font-mono text-[10px] font-normal text-slate-400 uppercase">{color.value}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <SettingsHelp title="Logo và màu được áp dụng ở đâu?">
                <p>Logo hiển thị nổi bật ở thanh điều hướng trên cùng (Header), Banner Quản trị và màn hình Đăng nhập. Màu nhận diện áp dụng cho Sidebar, Header badge và các nút bấm chính.</p>
                <p>Màu ca làm việc (Sáng, Chiều, Đêm) và màu cảnh báo vẫn giữ chuẩn riêng để nhân viên không bị nhầm lẫn khi xem lịch.</p>
              </SettingsHelp>
            </SettingsSection>
          </fieldset>

          <BrandingPreview draft={draft} dirty={dirty} />
        </div>

        {/* ── Thanh Lưu Cài Đặt Nổi ── */}
        <div
          data-settings-save-bar
          className={`${
            dirty || saving || imageBusy || error ? 'sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-3' : ''
          } mt-4 rounded-2xl border border-slate-300 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 shadow-md`}
        >
          {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs sm:text-sm font-medium text-rose-800">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              {imageBusy || saving || status === 'loading' ? (
                <Loader2 size={15} className="animate-spin text-indigo-600" />
              ) : dirty ? (
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              ) : (
                <Check size={15} className="text-emerald-600" />
              )}
              <span>
                {imageBusy
                  ? 'Đang xử lý logo…'
                  : saving
                  ? 'Đang lưu cài đặt…'
                  : status === 'loading'
                  ? 'Đang tải cài đặt…'
                  : status === 'error'
                  ? 'Chưa tải được cài đặt'
                  : dirty
                  ? 'Có thay đổi chưa lưu'
                  : message || 'Cài đặt đã đồng bộ'}
              </span>
            </p>
            <div className="flex w-full flex-wrap items-center justify-end gap-2.5 sm:w-auto">
              {dirty ? (
                <button
                  type="button"
                  disabled={saving || imageBusy}
                  onClick={discard}
                  className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                >
                  Bỏ thay đổi và tải lại
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || imageBusy || status === 'loading'}
                  onClick={() => { setError(''); setMessage(''); void load(); }}
                  className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Tải lại cài đặt</span>
                </button>
              )}
              <button type="submit" disabled={!dirty || saving || imageBusy || status !== 'ready'} className={settingsButton}>
                <Save size={15} />
                <span>{saving ? 'Đang lưu…' : 'Lưu cài đặt'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </WorkspaceSettingsLayout>
  );
}
