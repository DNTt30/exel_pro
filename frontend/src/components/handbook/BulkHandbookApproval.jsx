import { useEffect, useRef, useState } from 'react';
import { handbookApi } from '../../services/api';
import Modal from '../modals/Modal';
import Button from '../ui/Button';
import { handbookScopeLabel } from '../../utils/handbookKnowledge';
import { renderMarkdown } from '../ui/MarkdownText';

export default function BulkHandbookApproval({ changes, onClose, onComplete }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [result, setResult] = useState(null);
  const live = useRef(true);
  const running = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  async function approve() {
    if (!confirmed || running.current || result) return;
    running.current = true; setBusy(true);
    const approved = [], failed = [];
    // Reuse Admin-only RPC, revision guard and per-document audit transaction.
    // Partial completion is reported explicitly; this is not an atomic batch.
    for (const change of changes) {
      if (!live.current) return;
      try {
        await handbookApi.review(change.id, true, { confirmed: true, note: '' });
        approved.push(change.id);
      } catch (error) {
        failed.push({ id: change.id, title: change.payload.title, message: error.message });
      }
      if (!live.current) return;
      setProcessed(approved.length + failed.length);
    }
    setResult({ approved: approved.length, failed });
    try { await onComplete(); }
    finally { if (live.current) { setBusy(false); running.current = false; } }
  }

  return <Modal isOpen onClose={onClose} closeDisabled={busy} title="Duyệt toàn bộ tài liệu" maxWidth="max-w-2xl">
    <div className="space-y-4">
      {!result ? <>
        <p className="text-sm text-slate-700">Công bố <strong>{changes.length} tài liệu thêm/sửa trong danh sách đang lọc</strong> cho nhân viên và TÚ mini theo phạm vi của từng tài liệu. Đề nghị gỡ cần duyệt riêng.</p>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {changes.map(change => <details key={change.id} className="text-sm">
            <summary className="cursor-pointer break-words font-medium">{change.payload.title} <span className="font-normal text-slate-500">· {handbookScopeLabel(change.payload)}</span></summary>
            {change.payload.source_doc && <p className="mt-2 text-slate-500">Nguồn: {change.payload.source_doc}</p>}
            <div className="mt-2 break-words leading-relaxed">{renderMarkdown(change.payload.content)}</div>
          </details>)}
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-slate-100 p-3 text-sm">
          <input type="checkbox" className="mt-1" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          Tôi đã kiểm tra nội dung, phạm vi và định lượng của toàn bộ {changes.length} tài liệu này, đồng ý công bố.
        </label>
        {busy && <p role="status" className="text-sm">Đang duyệt {processed}/{changes.length}…</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={onClose}>Hủy</Button>
          <Button variant="primary" disabled={!confirmed || busy || !changes.length} onClick={approve}>{busy ? 'Đang duyệt…' : `Xác nhận duyệt ${changes.length} tài liệu`}</Button>
        </div>
      </> : <>
        <p role="status" className="text-sm">Đã duyệt {result.approved}/{changes.length} tài liệu.</p>
        {result.failed.length > 0 && <div role="alert" className="space-y-2 text-sm text-red-700">
          <p>Chưa xác nhận duyệt được {result.failed.length} tài liệu. Hãy kiểm tra danh sách chờ duyệt sau khi tải lại trước khi thử lại.</p>
          <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5">{result.failed.map(item => <li key={item.id} className="break-words">{item.title}: {item.message}</li>)}</ul>
        </div>}
        <Button variant="primary" disabled={busy} onClick={onClose}>Đóng</Button>
      </>}
    </div>
  </Modal>;
}
