import { useEffect, useState } from 'react';
import { Save, RefreshCw, Upload, ImagePlus, Check, Loader2, CircleHelp, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { BRAND_COLORS, brandingDraft, brandingSchema, canConfigureWorkspace, readBrandLogo } from '../../utils/workspaceBranding';
import WorkspaceSettingsLayout, { SettingsSection, SettingsHelp, settingsInput, settingsButton } from '../../components/workspace/WorkspaceSettingsLayout';
import BrandingPreview from '../../components/workspace/BrandingPreview';

const steps = [
  { title: 'Thông tin đơn vị', text: 'Đặt tên ứng dụng, tên đơn vị và email hỗ trợ nếu cần.' },
  { title: 'Chọn nhận diện', text: 'Tải logo, chọn màu và xem thử ở giao diện ứng dụng hoặc trang đăng nhập.' },
  { title: 'Lưu để áp dụng', text: 'Bấm Lưu cài đặt để áp dụng cho mọi người. Muốn hủy bản nháp, chọn Bỏ thay đổi và tải lại.' },
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
  const discard = () => { const next = brandingDraft(branding); setDraft(next); setBaseline(next); setRevision(branding.revision); setError(''); setMessage(''); void load(); };
  return <WorkspaceSettingsLayout title="Cài đặt đơn vị" description="Đổi tên, nhận diện và thông tin hỗ trợ. Thay đổi áp dụng cho toàn đơn vị sau khi lưu." steps={steps}>
    {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{loadError}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Thử tải lại</button></div>}
    <form onSubmit={submit}>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <fieldset disabled={saving || imageBusy || status !== 'ready'} className="min-w-0 space-y-4 disabled:opacity-60">
          <legend className="sr-only">Thông tin nhận diện đơn vị</legend>
          <SettingsSection number="01" title="Thông tin đơn vị" description="Tên và email hỗ trợ hiển thị cho quản lý, nhân viên.">
            <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="workspace-app-name">Tên ứng dụng <span className="text-rose-500">*</span>
              <input id="workspace-app-name" aria-describedby="workspace-app-name-help" className={settingsInput} value={draft.appName} maxLength={40} required minLength={2} placeholder="Ví dụ: Lịch Ca, Lịch làm việc An Tâm" onChange={e => update('appName', e.target.value)} />
              <span id="workspace-app-name-help" className="mt-2 block text-xs font-normal leading-relaxed text-slate-500">Tên trên menu, đăng nhập và trình duyệt · 2–40 ký tự.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="workspace-organization">Tên đơn vị <span className="ml-1 text-xs font-normal text-slate-400">Không bắt buộc</span>
              <input id="workspace-organization" className={settingsInput} value={draft.organizationName} maxLength={100} placeholder="Ví dụ: Chuỗi cửa hàng An Tâm" onChange={e => update('organizationName', e.target.value)} />
              <span className="mt-2 block text-xs font-normal leading-relaxed text-slate-500">Tên công ty hoặc chuỗi. Tên cửa hàng sửa ở mục Cửa hàng.</span>
            </label>
            </div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="workspace-contact">Email liên hệ công khai <span className="ml-1 text-xs font-normal text-slate-400">Không bắt buộc</span>
              <input id="workspace-contact" aria-describedby="workspace-contact-help" className={settingsInput} type="email" value={draft.contactEmail} maxLength={254} placeholder="hotro@donvi.vn" onChange={e => update('contactEmail', e.target.value)} />
              <span id="workspace-contact-help" className="mt-2 block text-xs font-normal leading-relaxed text-slate-500">Hiển thị ở trang đăng nhập. Dùng email hỗ trợ chung của đơn vị.</span>
            </label>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><CircleHelp size={15} className="mt-0.5 shrink-0" />Email này chỉ là thông tin liên hệ. Email nhận OTP của từng nhân viên được cập nhật trong hồ sơ của họ.</p>
          </SettingsSection>
          <SettingsSection number="02" title="Logo & màu nhận diện" description="Mở Xem trước để kiểm tra giao diện trước khi lưu.">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">{draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Logo đang chọn" className="h-full w-full object-contain" /> : <ImagePlus size={26} className="text-slate-300" />}</div>
              <div className="min-w-0 flex-1"><label className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500"><Upload size={15} />{draft.logoDataUrl ? 'Thay logo' : 'Tải logo lên'}<input aria-label="Chọn logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="sr-only" /></label><p className="mt-2 text-xs leading-relaxed text-slate-500">PNG, JPG hoặc WebP · Tối đa 2 MB.<br />Ảnh vuông, nền trong suốt sẽ hiển thị rõ hơn.</p></div>
              {draft.logoDataUrl && <button type="button" onClick={() => update('logoDataUrl', '')} className="flex min-h-10 items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-700"><Trash2 size={14} />Bỏ logo</button>}
            </div>
            <div><p id="brand-color-label" className="text-sm font-medium text-slate-700">Màu nhận diện</p><div role="radiogroup" aria-labelledby="brand-color-label" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{BRAND_COLORS.map(color => <label key={color.value} className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition focus-within:ring-2 focus-within:ring-indigo-500 ${draft.primaryColor === color.value ? 'border-slate-400 bg-slate-50 font-semibold text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><input className="sr-only" type="radio" name="brand-color" aria-label={color.label} value={color.value} checked={draft.primaryColor === color.value} onChange={() => update('primaryColor', color.value)} /><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: color.value }}>{draft.primaryColor === color.value && <Check size={12} strokeWidth={3} />}</span>{color.label}</label>)}</div></div>
            <SettingsHelp title="Logo và màu được áp dụng ở đâu?"><p>Logo xuất hiện ở trang đăng nhập và thanh điều hướng. Màu nhận diện dùng cho các phần chính của ứng dụng; màu cảnh báo và trạng thái ca giữ nguyên.</p><p>Nếu bỏ logo, app dùng biểu tượng mặc định. Chỉ tải logo đơn vị có quyền sử dụng.</p><p>Tên và biểu tượng app đã cài trên màn hình điện thoại hiện vẫn là Lịch Ca.</p></SettingsHelp>
          </SettingsSection>

        </fieldset>
        <BrandingPreview draft={draft} dirty={dirty} />
      </div>
      <div data-settings-save-bar className={`${dirty || saving || imageBusy || error ? 'sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-3' : ''} mt-4 rounded-xl border border-slate-300 bg-white p-4 shadow-sm`}>
        {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="flex items-center gap-2 text-xs text-slate-500">{imageBusy || saving || status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : dirty ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : <Check size={15} className="text-emerald-600" />}{imageBusy ? 'Đang xử lý logo…' : saving ? 'Đang lưu cài đặt…' : status === 'loading' ? 'Đang tải cài đặt…' : status === 'error' ? 'Chưa tải được cài đặt' : dirty ? 'Có thay đổi chưa lưu' : message || 'Cài đặt đã đồng bộ'}</p>
          <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            {dirty ? <button type="button" disabled={saving || imageBusy} onClick={discard} className="min-h-11 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40">Bỏ thay đổi và tải lại</button> : <button type="button" disabled={saving || imageBusy || status === 'loading'} onClick={() => { setError(''); setMessage(''); void load(); }} className="flex min-h-11 items-center gap-1.5 text-xs font-medium text-slate-500 disabled:opacity-40"><RefreshCw size={14} />Tải lại cài đặt</button>}
            <button type="submit" disabled={!dirty || saving || imageBusy || status !== 'ready'} className={settingsButton}><Save size={16} />{saving ? 'Đang lưu…' : 'Lưu cài đặt'}</button>
          </div>
        </div>
      </div>
    </form>
  </WorkspaceSettingsLayout>;
}
