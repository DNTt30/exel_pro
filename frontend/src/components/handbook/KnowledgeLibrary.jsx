import { useEffect, useState } from 'react';
import { handbookApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import { appRoleOf, getUserDepts, isBuiltinStoreManager, isOpsManager } from '../../lib/authSession';
import { HANDBOOK_CATEGORIES, handbookDraftSchema, handbookScopeLabel, handbookReaderEntries } from '../../utils/handbookKnowledge';
import { stripVi } from '../../utils/textSearch';
import Modal from '../modals/Modal';
import Button from '../ui/Button';
import { renderMarkdown } from '../ui/MarkdownText';
import BulkHandbookApproval from './BulkHandbookApproval';

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-base text-slate-900';
const emptyDraft = { title: '', category: 'recipe', content: '', source_doc: '', store_id: null, images: [], aliases: [] };

function Attachment({ path }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    handbookApi.imageUrl(path).then(value => { if (live) setUrl(value); }).catch(() => { if (live) setError('Không tải được ảnh. Hãy đóng và mở lại tài liệu.'); });
    return () => { live = false; };
  }, [path]);
  return url ? <img src={url} alt="Ảnh tham khảo của tài liệu" className="max-h-80 max-w-full rounded-lg object-contain" /> : <p className="text-sm text-slate-500">{error || 'Đang tải ảnh…'}</p>;
}

export function KnowledgeContent({ entry }) {
  return <div className="space-y-3">
    <p className="text-sm text-slate-500">{handbookScopeLabel(entry)}{entry.source_doc ? ` · Nguồn: ${entry.source_doc}` : ''}</p>
    <div className="break-words text-sm leading-relaxed text-slate-800">{renderMarkdown(entry.content)}</div>
    {!!entry.images?.length && <div className="space-y-2">{entry.images.map(path => <Attachment key={path} path={path} />)}</div>}
  </div>;
}

export default function KnowledgeLibrary({ manage = false, recipesOnly = false }) {
  const user = useStore(s => s.user);
  // Remount on an identity/scope change; never retain another user's fetched drafts.
  return <Library key={`${user?.id}:${appRoleOf(user)}:${user?.dept}:${manage}:${recipesOnly}`} user={user} manage={manage} recipesOnly={recipesOnly} />;
}

function Library({ user, manage, recipesOnly }) {
  const stores = useStore(s => s.stores);
  const admin = isBuiltinStoreManager(user);
  const canEdit = manage && isOpsManager(user);
  const depts = getUserDepts(user);
  const storeOptions = (stores || []).filter(s => s.isActive !== false && s.is_active !== false
    && (admin || appRoleOf(user) === 'am' || depts.includes(s.id)));
  const [entries, setEntries] = useState([]);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('published');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const [category, setCategory] = useState(recipesOnly ? 'recipe' : 'all');
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [preview, setPreview] = useState(false);
  const [decision, setDecision] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [bulkChanges, setBulkChanges] = useState(null);

  async function refresh() {
    setLoading(true); setError('');
    try {
      const [docs, requests] = await Promise.all([canEdit ? handbookApi.getAll() : handbookApi.getKnowledge(), canEdit ? handbookApi.getChanges() : []]);
      setEntries(docs); setChanges(requests);
    } catch (e) { setEntries([]); setChanges([]); setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []); // Scope changes remount Library.
  function edit(entry = null, value = null) {
    setEditor({ existing: entry });
    setDraft(value || (entry ? { ...entry, images: entry.images || [] } : { ...emptyDraft, store_id: !admin && depts.length === 1 ? depts[0] : null }));
    setPreview(false); setConfirmed(false); setDialogError('');
  }
  function review(change, approve) {
    setDecision({ change, approve }); setNote(''); setConfirmed(false); setDialogError('');
  }
  function archive(entry) {
    setDecision({ entry, archive: true }); setNote(''); setConfirmed(false); setDialogError('');
  }
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setDialogError('');
    try { const path = await handbookApi.uploadImage(file); setDraft(d => ({ ...d, images: [...d.images, path] })); }
    catch (e) { setDialogError(e.message); }
    finally { setBusy(false); }
  }
  function showPreview(event) {
    event.preventDefault();
    const result = handbookDraftSchema.safeParse({ ...draft, aliases: (draft.aliases || []).map(a => a.trim()).filter(Boolean) });
    if (!result.success) { setDialogError(result.error.issues[0].message); return; }
    setDraft(result.data); setDialogError(''); setConfirmed(false); setPreview(true);
  }
  async function submit() {
    setBusy(true); setDialogError('');
    try {
      // Admin also reviews the saved immutable snapshot, rather than a mutable form.
      const request = await handbookApi.submit(draft, editor.existing, { confirmed });
      setEditor(null); setTab('pending');
      setNotice('Đã gửi bản đã xác nhận vào danh sách chờ Admin duyệt. Bản đang công bố chưa thay đổi.');
      await refresh();
      if (admin) review(request, true);
    } catch (e) { setDialogError(e.message); }
    finally { setBusy(false); }
  }
  async function decide() {
    setBusy(true); setDialogError('');
    try {
      if (decision.archive) {
        const request = await handbookApi.submit(null, decision.entry, { operation: 'archive', confirmed, reason: note });
        setNotice('Đã gửi đề nghị gỡ. Nhân viên vẫn đọc bản hiện tại cho đến khi Admin duyệt.');
        setDecision(null); setTab('pending'); await refresh();
        if (admin) review(request, true);
      } else {
        await handbookApi.review(decision.change.id, decision.approve, { confirmed, note });
        setNotice(decision.approve ? 'Đã duyệt. Sổ tay và câu hỏi tiếp theo của TÚ mini sẽ dùng dữ liệu đã cập nhật.' : 'Đã từ chối và lưu lý do.');
        setDecision(null); await refresh();
      }
    } catch (e) { setDialogError(e.message); }
    finally { setBusy(false); }
  }
  const published = canEdit ? entries.filter(e => e.is_active && e.published_at) : handbookReaderEntries(entries);
  const items = tab === 'published' ? published : tab === 'archived' ? entries.filter(e => !e.is_active && e.published_at) : changes.filter(c => tab === 'pending' ? c.status === 'pending' : c.status !== 'pending');
  const filtered = items.filter(item => {
    const doc = item.payload || item;
    return (category === 'all' || doc.category === category) && (scope === 'all' || (scope === 'global' ? !doc.store_id : !doc.store_id || doc.store_id === scope))
      && stripVi(`${doc.title} ${doc.content} ${(doc.aliases || []).join(' ')}`).includes(stripVi(search));
  });
  const approvable = filtered.filter(item => item.status === 'pending' && item.operation === 'upsert');
  return <section className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold text-slate-900">{canEdit ? 'Quản lý kiến thức' : recipesOnly ? 'Tra công thức' : 'Tra cứu Sổ tay'}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{canEdit ? 'Nhập nội dung → kiểm tra định lượng → Admin duyệt → nhân viên và TÚ mini tra cứu. Thêm, sửa và gỡ đều cần duyệt.' : 'Chỉ hiển thị tài liệu Admin đã công bố, dùng chung với tra nhanh và TÚ mini. Bấm Tải lại để lấy bản mới nhất.'}</p></div>
      <div className="flex gap-2"><Button onClick={refresh} disabled={loading || busy}>Tải lại</Button>
        {canEdit && <Button variant="primary" onClick={() => edit()}>Thêm tài liệu</Button>}</div>
    </div>
    {notice && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {canEdit && <div className="flex flex-wrap gap-2" aria-label="Trạng thái tài liệu">
      {[['published', 'Đã công bố'], ['pending', `Chờ duyệt (${changes.filter(c => c.status === 'pending').length})`], ['history', 'Lịch sử duyệt'], ['archived', 'Đã gỡ']].map(([id, label]) =>
        <Button key={id} variant={tab === id ? 'primary' : 'secondary'} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</Button>)}
    </div>}
    <div className="flex flex-col gap-2 sm:flex-row">
      <input aria-label="Tìm tài liệu đã duyệt hoặc đề nghị" className={input} placeholder="Tìm tên món, quy trình…" value={search} onChange={e => setSearch(e.target.value)} />
      {!recipesOnly && <select aria-label="Loại tài liệu" className={`${input} sm:!w-56`} value={category} onChange={e => setCategory(e.target.value)}><option value="all">Tất cả loại tài liệu</option>{HANDBOOK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>}
      <select aria-label="Phạm vi tài liệu" className={`${input} sm:!w-56`} value={scope} onChange={e => setScope(e.target.value)}>
        <option value="all">Mọi phạm vi được phép</option><option value="global">Toàn đơn vị</option>{storeOptions.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
      </select>
    </div>
    {canEdit && admin && tab === 'pending' && <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" disabled={loading || busy || !!error || !approvable.length} onClick={() => setBulkChanges([...approvable])}>Duyệt toàn bộ ({approvable.length})</Button>
      <p className="text-xs text-slate-500">Áp dụng cho tài liệu thêm/sửa đang lọc. Đề nghị gỡ duyệt riêng.</p>
    </div>}
    {loading ? <p role="status">Đang tải tài liệu…</p> : !error && !filtered.length ? <p className="py-4 text-sm text-slate-500">{tab === 'published' && !search ? 'Chưa có tài liệu đã công bố phù hợp. Quản lý cần gửi và Admin duyệt trước khi nhân viên tra cứu.' : 'Chưa có tài liệu phù hợp.'}</p> : null}
    {!loading && !error && filtered.map(item => {
      const doc = item.payload || item;
      const pending = changes.some(c => c.entry_id === item.id && c.status === 'pending');
      const editable = admin || !doc.store_id || storeOptions.some(s => s.id === doc.store_id);
      return <details key={item.id} className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer break-words font-medium text-slate-800">{doc.title}
          {!canEdit && <span className="ml-2 text-xs font-normal text-slate-500">Admin đã duyệt</span>}
          <span className="ml-2 text-xs font-normal text-slate-500">{handbookScopeLabel(doc)}{item.operation === 'archive' ? ' · Đề nghị gỡ' : ''}{item.status === 'rejected' ? ' · Đã từ chối' : item.status === 'approved' ? ' · Đã duyệt' : ''}</span></summary>
        <div className="mt-3 space-y-3"><KnowledgeContent entry={doc} />
          {doc.reason && <p className="text-sm">Lý do gỡ: {doc.reason}</p>}
          {item.submitted_by && <p className="text-xs text-slate-500">Gửi bởi {item.submitted_by} · {new Date(item.submitted_at).toLocaleString('vi-VN')}</p>}
          {item.review_note && <p className="text-sm">Phản hồi Admin: {item.review_note}</p>}
          {canEdit && ['published', 'archived'].includes(tab) && editable && <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => edit(item)}>{tab === 'archived' ? 'Sửa và đề nghị khôi phục' : 'Sửa'}</Button>{tab === 'published' && <Button disabled={pending} onClick={() => archive(item)}>Đề nghị gỡ</Button>}
            {pending && <span className="p-2 text-sm text-slate-500">Đang có thay đổi chờ duyệt</span>}</div>}
          {admin && item.status === 'pending' && <div className="flex gap-2"><Button variant="primary" onClick={() => review(item, true)}>Xem và duyệt</Button><Button onClick={() => review(item, false)}>Từ chối</Button></div>}
          {canEdit && item.status === 'rejected' && item.operation === 'upsert' && <Button onClick={() => edit(entries.find(e => e.id === item.entry_id), doc)}>Sửa và gửi lại</Button>}
        </div>
      </details>;
    })}
    {bulkChanges && <BulkHandbookApproval changes={bulkChanges} onClose={() => setBulkChanges(null)} onComplete={refresh} />}
    <Modal isOpen={!!editor} onClose={() => setEditor(null)} closeDisabled={busy} title={preview ? 'Kiểm tra nội dung trước khi gửi duyệt' : editor?.existing ? 'Sửa tài liệu' : 'Thêm tài liệu'} maxWidth="max-w-2xl">
      {dialogError && <p role="alert" className="mb-3 text-sm text-red-700">{dialogError}</p>}
      {!preview ? <form onSubmit={showPreview} className="space-y-4">
        <label className="block text-sm">Tên tài liệu<input required maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={input} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Loại tài liệu<select className={input} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{HANDBOOK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <label className="text-sm">Áp dụng cho<select className={input} value={draft.store_id || ''} onChange={e => setDraft({ ...draft, store_id: e.target.value || null })}><option value="">Toàn đơn vị</option>{storeOptions.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}</select></label></div>
        <label className="block text-sm">Nội dung / định lượng<textarea required rows={10} maxLength={4000} className={input} value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} placeholder="Ghi rõ size, nguyên liệu, định lượng (ml/g…), các bước và lưu ý. Với quy định, ghi ngày bắt đầu áp dụng." /></label>
        <p className="text-xs text-slate-500">{draft.content.length}/4.000 ký tự. TÚ mini đọc phần văn bản; hãy ghi đầy đủ nội dung quan trọng trong ảnh vào đây.</p>
        <label className="block text-sm">Nguồn / số văn bản (nếu có)<input className={input} maxLength={300} value={draft.source_doc || ''} onChange={e => setDraft({ ...draft, source_doc: e.target.value })} /></label>
        <label className="block text-sm">Tên gọi khác để tìm kiếm (mỗi dòng một tên, tối đa 20)<textarea rows={2} className={input} value={(draft.aliases || []).join('\n')} onChange={e => setDraft({ ...draft, aliases: e.target.value.split('\n') })} /></label>
        <label className="block text-sm">Ảnh minh họa (không bắt buộc, tối đa 3 ảnh, 5 MB/ảnh)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || draft.images.length >= 3} onChange={upload} className="mt-2 block max-w-full text-sm" /></label>
        <div className="space-y-2">{draft.images.map((path, i) => <div key={path}><Attachment path={path} /><Button type="button" disabled={busy} onClick={() => setDraft(d => ({ ...d, images: d.images.filter(p => p !== path) }))}>Bỏ ảnh {i + 1}</Button></div>)}</div>
        <Button variant="primary" disabled={busy} type="submit">{busy ? 'Đang tải ảnh…' : 'Kiểm tra trước khi gửi'}</Button>
      </form> : <div className="space-y-4"><h3 className="font-semibold">{draft.title}</h3><KnowledgeContent entry={draft} />
        <Confirmation checked={confirmed} onChange={setConfirmed} />
        <div className="flex gap-2"><Button disabled={busy} onClick={() => setPreview(false)}>Quay lại sửa</Button><Button variant="primary" disabled={busy || !confirmed} onClick={submit}>{busy ? 'Đang gửi…' : 'Gửi Admin duyệt'}</Button></div>
      </div>}
    </Modal>
    <Modal isOpen={!!decision} onClose={() => setDecision(null)} closeDisabled={busy} title={decision?.archive ? 'Đề nghị gỡ tài liệu' : decision?.approve ? 'Admin kiểm tra trước khi duyệt' : 'Từ chối đề nghị'} maxWidth="max-w-2xl">
      {decision && <div className="space-y-4">
        <h3 className="font-semibold">{(decision.entry || decision.change.payload).title}</h3>
        <KnowledgeContent entry={decision.entry || decision.change.payload} />
        {decision.change?.operation === 'archive' && <p className="text-sm text-red-700">Duyệt sẽ gỡ tài liệu khỏi Sổ tay và nguồn tra cứu mới của TÚ mini. Lý do: {decision.change.payload.reason}</p>}
        {decision.change?.entry_id && decision.change.operation === 'upsert' && <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Đối chiếu bản trước</summary><p className="mt-2 whitespace-pre-wrap text-sm">{entries.find(e => e.id === decision.change.entry_id)?.content || 'Không còn bản trước; tải lại để kiểm tra.'}</p></details>}
        {(decision.archive || !decision.approve) && <label className="block text-sm">Lý do (ít nhất 5 ký tự)<textarea className={input} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>}
        <Confirmation checked={confirmed} onChange={setConfirmed} />
        {dialogError && <p role="alert" className="text-sm text-red-700">{dialogError}</p>}
        <Button variant="primary" disabled={busy || !confirmed || ((decision.archive || !decision.approve) && note.trim().length < 5)} onClick={decide}>{busy ? 'Đang xử lý…' : decision.archive ? 'Gửi đề nghị gỡ' : decision.approve ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}</Button>
      </div>}
    </Modal>
  </section>;
}

function Confirmation({ checked, onChange }) {
  return <label className="flex items-start gap-3 rounded-lg bg-slate-100 p-3 text-sm"><input type="checkbox" className="mt-1" checked={checked} onChange={e => onChange(e.target.checked)} />Tôi đã kiểm tra nội dung, phạm vi áp dụng và định lượng/đơn vị đo (nếu có); xác nhận thông tin chính xác trước khi gửi hoặc duyệt.</label>;
}
