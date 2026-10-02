import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, User, Trash2, Settings, KeyRound, ChevronDown, Copy, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { askGeminiCopilot } from '../../utils/aiSchedulerEngine';
import { isOpsManager, canPickStore } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import { inferAiIntent } from '../../utils/appLogs';
import { isValidGeminiKey, DEFAULT_GEMINI_MODEL } from '../../services/geminiService';
import { getCopilotConfiguration, saveCopilotConfiguration } from '../../services/api';
import { useShallow } from 'zustand/react/shallow';
import { assistantAgentPlan, assistantStoreIds, runAssistantAgents } from '../../utils/assistantAgents';
import { requiredDecisionWeeks } from '../../utils/aiDecisionEngine';
import { decideAssistantAgent } from '../../services/api';
import { routePersonalQuery, answerPersonalQuery } from '../../utils/decisionRouting';
import RecipeQuickModal from '../modals/RecipeQuickModal';
import ConfirmModal from '../modals/ConfirmModal';

/**
 * Simple inline Markdown renderer — hỗ trợ **bold**, *italic*, `code`, bullet lists và newlines.
 * Không cần thư viện ngoài.
 */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bullet list line
    if (/^[-*•]\s/.test(trimmed)) {
      elements.push(
        <div key={key++} className="flex gap-1.5 items-start">
          <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
          <span>{inlineMarkdown(trimmed.replace(/^[-*•]\s/, ''))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={key++} className="flex gap-1.5 items-start">
          <span className="text-indigo-400 font-bold mt-0.5 flex-shrink-0 min-w-[14px]">{numMatch[1]}.</span>
          <span>{inlineMarkdown(numMatch[2])}</span>
        </div>
      );
    }
    // Empty line → spacer
    else if (trimmed === '') {
      if (elements.length > 0) elements.push(<div key={key++} className="h-1" />);
    }
    // Normal line
    else {
      elements.push(<div key={key++}>{inlineMarkdown(line)}</div>);
    }
  }
  return elements;
}

function inlineMarkdown(text) {
  // Parse **bold**, *italic*, `code` với React elements
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] !== undefined) {
      parts.push(<strong key={k++} className="font-bold">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={k++} className="italic">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(<code key={k++} className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-[11px] font-mono">{match[4]}</code>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 0 ? text : parts;
}



export default function AICopilotDrawer(props) {
  const userId = useStore(s => s.user?.id || 'anonymous');
  return <CopilotConversation key={`${userId}:${props.storeId || ''}`} {...props} />;
}

function CopilotConversation({ isOpen, onClose, currentWeek, storeId }) {
  const { employees, schedule, stores, shiftSwaps, feedbacks, user } = useStore(useShallow((s) => ({ employees: s.employees, schedule: s.schedule, stores: s.stores, shiftSwaps: s.shiftSwaps, feedbacks: s.feedbacks, user: s.user })));
  const weekSched = schedule[currentWeek] || {};
  const activeStoreId = storeId === 'ALL' ? '' : storeId;

  const userName = user?.name || user?.username || 'bạn';
  const firstName = userName.split(' ').pop();

  const initialWelcome = {
    id: 'welcome',
    sender: 'bot',
    text: `Chào ${firstName}! Mình là TÚ mini 🤖 — Trợ lý GS25.\nBạn có thể hỏi mình về ca làm việc, chấm công, hạn sử dụng món ăn, hoặc quy định OFC.`
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`ai_chat_history_${user?.id || 'anonymous'}_${activeStoreId}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn('[AICopilot] Không đọc được lịch sử chat — dùng mặc định:', err?.message);
    }
    return [initialWelcome];
  });

  useEffect(() => {
    try { localStorage.setItem(`ai_chat_history_${user?.id || 'anonymous'}_${activeStoreId}`, JSON.stringify(messages)); } catch { /* Chat remains usable when storage is unavailable. */ }
  }, [messages, activeStoreId, user?.id]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const canConfigureAi = user?.id === 'admin';
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [configStatus, setConfigStatus] = useState(null);
  const [configBusy, setConfigBusy] = useState(false);
  const [configError, setConfigError] = useState('');
  useEffect(() => {
    try { localStorage.removeItem('gemini_api_key'); } catch { /* Ignore unavailable storage. */ }
  }, []);
  const openAiSettings = async () => {
    if (!canConfigureAi) return;
    setShowSettings(true); setGeminiKeyDraft(''); setConfigError(''); setConfigStatus(null); setConfigBusy(true);
    try { setConfigStatus((await getCopilotConfiguration()).configured); }
    catch (error) { setConfigError(error.message); }
    finally { setConfigBusy(false); }
  };
  const saveAiSettings = async () => {
    if (!canConfigureAi || configBusy || !isValidGeminiKey(geminiKeyDraft)) return;
    setConfigBusy(true); setConfigError('');
    try {
      setConfigStatus((await saveCopilotConfiguration(geminiKeyDraft.trim())).configured);
      setGeminiKeyDraft('');
    } catch (error) { setConfigError(error.message); }
    finally { setConfigBusy(false); }
  };
  const agentRequestRef = useRef(null);
  useEffect(() => {
    setIsTyping(false);
    setIsStreaming(false);
    return () => agentRequestRef.current?.abort();
  }, [currentWeek, activeStoreId, user?.id]);
  const streamingMsgIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleCopyMsg = useCallback((msgId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1500);
    }).catch((err) => { console.warn('[AICopilot] Clipboard write failed:', err?.message); });
  }, []);



  const handleClearHistory = () => {
    setShowConfirmClear(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const isAdmin = isOpsManager(user);
  const quickPrompts = isAdmin ? [
    '🔍 Quét lỗi & vi phạm lịch tuần',
    '📋 Kiểm tra lịch và hạn sử dụng',
    '🕒 Giờ hủy hàng FF & GM GS25',
    '🔄 Có đơn đổi ca nào đang chờ?',
    '🧪 Hóa chất Saraya 6 mã màu'
  ] : [
    '📅 Hôm nay tôi làm ca mấy giờ?',
    '🕒 Khi nào hủy sandwich & cơm nắm?',
    '🔥 Lò vi sóng chả cá bấm số mấy?',
    '🍲 Công thức nấu súp chả cá cay'
  ];

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping || isStreaming) return;

    const sessionEpoch = useStore.getState()._sessionEpoch;
    agentRequestRef.current?.abort();
    const request = new AbortController();
    agentRequestRef.current = request;
    let startSnapshot = useStore.getState();
    const userMsg = { id: 'user_' + Date.now(), sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    const pickStore = canPickStore(user);
    const scopedEmployees = isAdmin
      ? (pickStore || !user?.dept ? employees : employees.filter(e => e.dept === user.dept))
      : employees.filter(e => e.dept === activeStoreId || e.id === user?.id);
    const scopedSchedule = {};
    scopedEmployees.forEach(e => {
      if (weekSched[e.id]) scopedSchedule[e.id] = weekSched[e.id];
    });
    const scopedFeedbacks = isAdmin
      ? feedbacks
      : feedbacks.filter(f => f.empId === user?.id || f.dept === user?.dept);
    const scopedSwaps = isAdmin
      ? shiftSwaps
      : (shiftSwaps || []).filter(s => s.fromEmpId === user?.id || s.toEmpId === user?.id || s.store === user?.dept);

    const shelfScope = new Set(visibleDeptIds(user, stores));
    const selectedStoreIds = assistantStoreIds(activeStoreId);
    const scopedShelves = (startSnapshot.shelves || []).filter(s =>
      shelfScope.has(s.storeId) && (!selectedStoreIds || selectedStoreIds.has(s.storeId)) &&
      (isAdmin || String(s.assigneeId).split(',').map(id => id.trim()).includes(user?.id)));
    const scopedShelfIds = new Set(scopedShelves.map(s => s.id));
    const contextData = {
      employees: scopedEmployees,
      weekSchedule: scopedSchedule,
      schedule: { [currentWeek]: scopedSchedule },
      stores: isAdmin ? stores : (() => { const ok = new Set(visibleDeptIds(user, stores)); if (activeStoreId) ok.add(activeStoreId); return stores.filter(s => ok.has(s.id)); })(),
      shiftSwaps: scopedSwaps,
      feedbacks: scopedFeedbacks,
      shelves: scopedShelves,
      shelfItems: (startSnapshot.shelfItems || []).filter(i => scopedShelfIds.has(i.shelfId)),
      storeId: activeStoreId,
      currentWeek,
      user
    };

    // Lọc lịch sử chat (bỏ tin nhắn chào mừng)
    const chatHistory = messages.filter(m => m.id !== 'welcome');

    const t0 = Date.now();
    let model = 'local-engine';
    let aiReply = '';
    let err = '';

    try {
      const route = routePersonalQuery(query);
      const agentEvents = [];
      const revision = `${sessionEpoch}:${user?.id}:${activeStoreId}:${currentWeek}:${t0}`;
      const plan = route ? null : assistantAgentPlan(query, contextData, revision);
      if (plan?.tasks.some(t => t.id === 'schedule_review')) {
        try { await useStore.getState().ensureWeeksLoaded(requiredDecisionWeeks(currentWeek)); } catch { /* Report provisional scores if loading fails. */ }
        if (request.signal.aborted || sessionEpoch !== useStore.getState()._sessionEpoch) return;
        // Loading adds weeks; only accept that snapshot change. A change in user,
        // assignment or other input still invalidates this request below.
        startSnapshot = { ...startSnapshot, schedule: useStore.getState().schedule };
      }
      const agentResult = route ? null : await runAssistantAgents(query, { ...contextData, schedule: startSnapshot.schedule }, {
        revision,
        decide: decideAssistantAgent, signal: request.signal,
        isCurrent: () => {
          const latest = useStore.getState();
          return latest._sessionEpoch === sessionEpoch && ['user', 'employees', 'stores', 'schedule', 'shelves', 'shelfItems'].every(key => latest[key] === startSnapshot[key]);
        },
        onEvent: event => agentEvents.push(event),
      });
      if (request.signal.aborted) return;
      if (agentResult) {
        aiReply = agentResult.text;
        model = agentEvents.some(e => e.decision?.source === 'jev') ? 'jev-agent-orchestrator' : 'rule-agent-orchestrator';
        setMessages(prev => [...prev, { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply }]);
      } else if (route) {
        const epoch = useStore.getState()._sessionEpoch;
        try { await useStore.getState().ensureWeeksLoaded([route.week]); } catch { /* answer reports missing data */ }
        if (request.signal.aborted || epoch !== useStore.getState()._sessionEpoch) return;
        aiReply = answerPersonalQuery(route, useStore.getState());
        model = 'local-intent-router';
        setMessages(prev => [...prev, { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply }]);
      } else {
        // Tạo placeholder message để stream vào
        const streamMsgId = 'ai_' + Date.now();
        streamingMsgIdRef.current = streamMsgId;
        setMessages(prev => [...prev, { id: streamMsgId, sender: 'ai', text: '' }]);
        setIsTyping(false);
        setIsStreaming(true);

        try {
          aiReply = await askGeminiCopilot(query, contextData, chatHistory, '', (delta) => {
            if (request.signal.aborted) return;
            // Stream: cập nhật tin nhắn theo từng chunk
            setMessages(prev => prev.map(m =>
              m.id === streamMsgId ? { ...m, text: m.text + delta } : m
            ));
          });
          if (request.signal.aborted) return;
          model = DEFAULT_GEMINI_MODEL;
        } catch (geminiErr) {
          if (request.signal.aborted) return;
          // Do not replace a failed handbook answer with a keyword-based guess.
          setMessages(prev => prev.filter(m => m.id !== streamMsgId));
          err = geminiErr.message || 'Không kết nối được trợ lý AI.';
          aiReply = `${err}\nAnh/chị có thể mở trang Sổ tay để tra cứu hoặc thử lại sau.`;
          model = 'gemini-error';
          const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply, isError: true };
          setMessages(prev => [...prev, aiMsg]);
        } finally {
          if (agentRequestRef.current === request) {
            setIsStreaming(false);
            streamingMsgIdRef.current = null;
          }
        }
      }
    } catch (error) {
      if (request.signal.aborted) return;
      console.warn('AI error:', error);
      err = error.message || 'ai-error';
      aiReply = 'Chưa hoàn tất yêu cầu. Anh/chị vui lòng thử lại hoặc mở trang Sổ tay để tra cứu.';
      const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply, isError: true };
      setMessages(prev => [...prev, aiMsg]);
      setIsStreaming(false);
    } finally {
      if (agentRequestRef.current === request) {
        setIsTyping(false);
      }
      if (!request.signal.aborted && sessionEpoch === useStore.getState()._sessionEpoch) useStore.getState().logAiTurn?.({
        conversationId: `ai_${user?.id || 'anon'}_${activeStoreId}`,
        storeId: activeStoreId,
        userMessage: query,
        assistantResponse: aiReply,
        intent: inferAiIntent(query),
        model,
        latencyMs: Date.now() - t0,
        contextUsed: { storeId: activeStoreId, currentWeek, empCount: scopedEmployees.length },
        error: err || null

      });
    }
  };

  const touchStartY = useRef(0);
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY.current > 50) {
      // Swiped down at least 50px
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay - tap outside to close */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Responsive Bottom Sheet / Drawer Container */}
      <div className="fixed inset-x-0 bottom-0 sm:bottom-6 sm:right-6 sm:inset-x-auto w-full sm:w-[400px] h-[82dvh] sm:h-[560px] max-h-[85dvh] sm:max-h-[600px] bg-white shadow-2xl shadow-slate-900/30 rounded-t-3xl sm:rounded-2xl overflow-hidden z-50 flex flex-col border border-slate-200/80 print:hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Mobile Pull Handle Bar */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
          className="sm:hidden pt-2.5 pb-1 flex justify-center cursor-pointer bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 active:opacity-75 transition-opacity"
          title="Nhấn hoặc vuốt xuống để đóng"
        >
          <div className="w-10 h-1 bg-white/40 rounded-full" />
        </div>

        {/* Header */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="px-4 py-3 sm:p-5 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white flex items-center justify-between shadow-md relative overflow-hidden flex-shrink-0"
        >
          {/* Glass effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20 overflow-hidden flex-shrink-0">
              <img src={`${import.meta.env.BASE_URL}tu_mini_avatar.jpg`} alt="Tú mini" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <span className="tracking-tight">TÚ mini</span>
                <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                  Trực chiến
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-indigo-100 font-medium mt-0.5 flex items-center gap-1.5">
                <span>Đệ tử ruột · {activeStoreId || '—'}</span>

              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 relative z-10">
            {canConfigureAi && <button
              type="button"
              onClick={openAiSettings}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white cursor-pointer"
              title="Cài đặt AI"
            >
              <Settings size={17} />
            </button>}
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white cursor-pointer"
              title="Xóa lịch sử"
            >
              <Trash2 size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-all text-white hover:text-white cursor-pointer flex items-center gap-1"
              title="Đóng trợ lý"
            >
              <ChevronDown size={22} className="sm:hidden" />
              <X size={19} className="hidden sm:block" />
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-slate-50/50">
          {messages.map((m) => {
            const isAI = m.sender === 'ai';
            const isStreamingThis = isStreaming && streamingMsgIdRef.current === m.id;
            return (
              <div key={m.id} className={`flex gap-2 sm:gap-3 ${isAI ? 'items-start' : 'items-end flex-row-reverse'}`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm overflow-hidden ${
                  isAI ? 'bg-indigo-50 border border-indigo-200 shadow-xs' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-xs'
                }`}>
                  {isAI ? <img src={`${import.meta.env.BASE_URL}tu_mini_avatar.jpg`} alt="Tú mini" className="w-full h-full object-cover" /> : <User size={15} />}
                </div>

                <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[82%]">
                  <div className={`p-2.5 sm:p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                    isAI ? (m.isError ? 'bg-red-50 border border-red-200 text-red-700 shadow-sm rounded-tl-xs' : 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-tl-xs')
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm rounded-tr-xs'
                  }`}>
                    {isAI ? (
                      <div className="space-y-0.5">
                        {renderMarkdown(m.text)}
                        {isStreamingThis && (
                          <span className="inline-block w-1.5 h-4 bg-indigo-400 rounded-sm animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    ) : (
                      <div className="font-normal">{m.text}</div>
                    )}
                  </div>
                  {/* Copy button for AI messages */}
                  {isAI && m.text && !isStreamingThis && (
                    <button
                      type="button"
                      onClick={() => handleCopyMsg(m.id, m.text)}
                      className="self-start flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedMsgId === m.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      {copiedMsgId === m.id ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 italic">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-xs animate-bounce border border-indigo-100">
                <img src={`${import.meta.env.BASE_URL}tu_mini_avatar.jpg`} alt="Tú mini" className="w-full h-full object-cover" />
              </div>
              <span className="bg-slate-200/50 px-2.5 py-1 rounded-full text-[11px] sm:text-xs">TÚ mini đang lục lọi dữ liệu...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>


        {/* Quick Prompts Chips */}
        <div className="p-2 sm:p-3 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-[11px] sm:text-xs no-scrollbar flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowRecipeModal(true)}
            className="whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 border border-transparent rounded-full font-bold text-white transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer flex-shrink-0"
          >
            🍳 Sổ tay Công Thức
          </button>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-full font-medium text-slate-700 hover:text-indigo-700 transition-all duration-200 shadow-2xs cursor-pointer flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Box with Ergonomic Mobile Close Button */}
        <div className="p-2.5 sm:p-3.5 bg-white border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] relative z-10 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-1.5 sm:gap-2.5"
          >
            {/* Quick-close button next to input - user NEVER has to scroll up to close! */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors cursor-pointer flex-shrink-0"
              title="Đóng / Thu nhỏ trợ lý"
            >
              <ChevronDown size={20} />
            </button>

            <input
              type="text"
              placeholder={isAdmin ? "Hỏi lịch, định biên, công thức FF..." : "Hỏi công thức, ca hôm nay, đổi ca..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 min-w-0 px-3.5 py-2 sm:py-2.5 text-sm sm:text-[13px] border border-slate-200 rounded-full bg-slate-50 hover:bg-white focus:bg-white focus:ring-3 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 sm:p-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-full disabled:opacity-40 transition-all cursor-pointer shadow-md hover:shadow-lg transform active:scale-95 group flex-shrink-0"
              title="Gửi câu hỏi"
            >
              <Send size={16} className="sm:w-[17px] sm:h-[17px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </form>
        </div>

      {/* Settings Overlay */}
      {canConfigureAi && showSettings && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col p-6 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <KeyRound className="text-indigo-600" /> Cấu hình Gemini AI
            </h3>
            <button title="Đóng cài đặt AI" disabled={configBusy} onClick={() => { setShowSettings(false); setGeminiKeyDraft(''); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          
          <div className="space-y-4">
            <p role="status" className="text-sm text-slate-600">{configBusy ? 'Đang xử lý cấu hình…' : configStatus === true ? 'Đã cấu hình cho toàn ứng dụng. Nhân viên có thể dùng trợ lý.' : configStatus === false ? 'Chưa cấu hình. Admin nhập key để kích hoạt trợ lý.' : 'Chưa đọc được trạng thái cấu hình.'}</p>
            {configError && <p role="alert" className="text-sm text-red-600">{configError}</p>}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Gemini API Key
                {isValidGeminiKey(geminiKeyDraft) && (
                  <span className="ml-2 text-emerald-600 text-xs font-semibold">✓ Đúng định dạng</span>
                )}
              </label>
              <input 
                type="password" 
                autoComplete="new-password"
                disabled={configBusy}
                value={geminiKeyDraft}
                onChange={(e) => setGeminiKeyDraft(e.target.value)}
                placeholder="AIzaSy..."
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-4 outline-none transition-all ${
                  geminiKeyDraft && !isValidGeminiKey(geminiKeyDraft)
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : isValidGeminiKey(geminiKeyDraft)
                    ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {geminiKeyDraft && !isValidGeminiKey(geminiKeyDraft) && (
                <p className="text-[11px] text-red-500 mt-1">⚠️ Key không hợp lệ (phải dài ít nhất 35 ký tự)</p>
              )}
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Chỉ admin cấu hình. Key được lưu bảo mật trên máy chủ để toàn ứng dụng dùng chung; nhân viên không cần nhập key.
              </p>
            </div>

            <button 
              onClick={saveAiSettings}
              disabled={configBusy || !isValidGeminiKey(geminiKeyDraft)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Lưu cấu hình
            </button>

          </div>
        </div>
      )}


      <RecipeQuickModal 
        isOpen={showRecipeModal} 
        onClose={() => setShowRecipeModal(false)} 
      />

      <ConfirmModal
        isOpen={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        title="Xóa lịch sử hội thoại"
        message="Bạn có chắc chắn muốn xóa toàn bộ tin nhắn trò chuyện với TÚ mini?"
        variant="warning"
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          setMessages([initialWelcome]);
          localStorage.removeItem(`ai_chat_history_${user?.id || 'anonymous'}_${activeStoreId}`);
          setShowConfirmClear(false);
        }}
      />
    </div>
    </>
  );
}
