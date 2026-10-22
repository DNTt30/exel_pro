import { useState } from 'react';
import * as api from '../../services/api';
import HelpRequestForm from '../employee/HelpRequestForm';

export default function AnswerFeedback({ user, messageKey, question, answer, onClarify }) {
  const [rating, setRating] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(false);
  const store = user?.dept?.split(',')[0]?.trim();
  if (!store || user.id === 'admin') return null;
  const rate = async value => {
    setBusy(true); setError('');
    try { await api.saveEmployeeAnswerFeedback(messageKey, store, value); setRating(value); }
    catch { setError('Chưa lưu được phản hồi. Bạn có thể thử lại.'); }
    finally { setBusy(false); }
    if (value === 'unclear') onClarify?.(`Mình chưa rõ câu trả lời về: ${question}. Hãy giải thích từng bước và cho ví dụ.`);
  };
  return <div className="space-y-2 text-xs" data-testid="answer-feedback">
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} aria-pressed={rating === 'understood'} onClick={() => rate('understood')} className="min-h-11 rounded border px-2">Đã hiểu</button>
      <button type="button" disabled={busy} aria-pressed={rating === 'unclear'} onClick={() => rate('unclear')} className="min-h-11 rounded border px-2">Chưa rõ</button>
      <button type="button" onClick={() => setRequest(v => !v)} className="min-h-11 rounded border px-2">Cần người hỗ trợ</button></div>
    {rating && <p role="status">Đã lưu phản hồi của bạn. {rating === 'unclear' && 'Bạn có thể sửa câu hỏi gợi ý trước khi gửi lại cho Tú mini.'}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {request && <HelpRequestForm user={user} initialQuestion={question} initialContext={answer} onCancel={() => setRequest(false)} />}
  </div>;
}
