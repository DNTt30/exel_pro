import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, User, Trash2, Settings, KeyRound, ChevronDown, Copy, Check, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { askAICopilot, askGeminiCopilot } from '../../utils/aiSchedulerEngine';
import { isOpsManager, canPickStore } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import { inferAiIntent } from '../../utils/appLogs';
import { isValidGeminiKey, AVAILABLE_MODELS, getActiveGeminiModel } from '../../services/geminiService';
import { useShallow } from 'zustand/react/shallow';
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



export default function AICopilotDrawer({ isOpen, onClose, currentWeek, storeId }) {
  const { employees, schedule, stores, shiftSwaps, feedbacks, user } = useStore(useShallow((s) => ({ employees: s.employees, schedule: s.schedule, stores: s.stores, shiftSwaps: s.shiftSwaps, feedbacks: s.feedbacks, user: s.user })));
  const weekSched = schedule[currentWeek] || {};
  const activeStoreId = storeId === 'ALL' ? (user?.dept || '') : storeId;

  const userName = user?.name || user?.username || 'bạn';
  const firstName = userName.split(' ').pop();

  const initialWelcome = {
    id: 'welcome',
    sender: 'bot',
    text: `Chào ${firstName}! Mình là TÚ mini 🤖 — Trợ lý GS25.\nBạn có thể hỏi mình về ca làm việc, chấm công, hạn sử dụng món ăn, hoặc quy định OFC.`
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`ai_chat_history_${activeStoreId}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn('[AICopilot] Không đọc được lịch sử chat — dùng mặc định:', err?.message);
    }
    return [initialWelcome];
  });

  useEffect(() => {
    localStorage.setItem(`ai_chat_history_${activeStoreId}`, JSON.stringify(messages));
  }, [messages, activeStoreId]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeModel, setActiveModel] = useState(() => (localStorage.getItem('gemini_api_key') ? getActiveGeminiModel() : 'local-engine'));
  const [selectedModel, setSelectedModel] = useState(() => getActiveGeminiModel());
  const [modelDraft, setModelDraft] = useState(() => getActiveGeminiModel());
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [geminiKeyDraft, setGeminiKeyDraft] = useState(() => localStorage.getItem('gemini_api_key') || '');
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
    if (!query) return;

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

    const contextData = {
      employees: scopedEmployees,
      weekSchedule: scopedSchedule,
      schedule: { [currentWeek]: scopedSchedule },
      stores: isAdmin ? stores : (() => { const ok = new Set(visibleDeptIds(user, stores)); if (activeStoreId) ok.add(activeStoreId); return stores.filter(s => ok.has(s.id)); })(),
      shiftSwaps: scopedSwaps,
      feedbacks: scopedFeedbacks,
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
    const validKey = geminiApiKey && geminiApiKey.trim();

    try {
      if (validKey) {
        // Tạo placeholder message để stream vào
        const streamMsgId = 'ai_' + Date.now();
        streamingMsgIdRef.current = streamMsgId;
        setMessages(prev => [...prev, { id: streamMsgId, sender: 'ai', text: '' }]);
        setIsTyping(false);
        setIsStreaming(true);

        try {
          aiReply = await askGeminiCopilot(query, contextData, chatHistory, validKey, (delta) => {
            // Stream: cập nhật tin nhắn theo từng chunk
            setMessages(prev => prev.map(m =>
              m.id === streamMsgId ? { ...m, text: m.text + delta } : m
            ));
          });
          model = selectedModel;
          setActiveModel(selectedModel);
        } catch (geminiErr) {
          console.warn('Gemini API call failed, falling back to local engine:', geminiErr);
          // Xóa placeholder rỗng, dùng local engine
          setMessages(prev => prev.filter(m => m.id !== streamMsgId));
          aiReply = askAICopilot(query, contextData, chatHistory);
          model = 'local-engine-fallback';
          const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply };
          setMessages(prev => [...prev, aiMsg]);
        } finally {
          setIsStreaming(false);
          streamingMsgIdRef.current = null;
        }
      } else {
        aiReply = askAICopilot(query, contextData, chatHistory);
        model = 'local-engine';
        const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      console.warn('AI error:', error);
      err = error.message || 'ai-error';
      aiReply = askAICopilot(query, contextData, chatHistory);
      const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply };
      setMessages(prev => [...prev, aiMsg]);
      setIsStreaming(false);
    } finally {
      setIsTyping(false);
      setActiveModel(model);
      useStore.getState().logAiTurn?.({
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
                {activeModel && activeModel.startsWith('gemini') && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/15 rounded-full text-[9px] font-bold tracking-wide">
                    <Zap size={9} className="text-yellow-300" />
                    {activeModel.includes('thinking') ? 'Gemini 2.0 Thinking' : activeModel.includes('lite') ? 'Gemini 2.0 Lite' : 'Gemini 2.0 Flash'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 relative z-10">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white cursor-pointer"
              title="Cài đặt AI"
            >
              <Settings size={17} />
            </button>
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
                    isAI
                      ? 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-tl-xs'
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
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col p-6 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <KeyRound className="text-indigo-600" /> Cấu hình Gemini AI
            </h3>
            <button onClick={() => { setShowSettings(false); setGeminiKeyDraft(geminiApiKey); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Gemini API Key
                {isValidGeminiKey(geminiKeyDraft) && (
                  <span className="ml-2 text-emerald-600 text-xs font-semibold">✓ Hợp lệ</span>
                )}
              </label>
              <input 
                type="password" 
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
                <p className="text-[11px] text-red-500 mt-1">⚠️ Key không đúng định dạng (phải bắt đầu bằng AIzaSy...)</p>
              )}
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Key được lưu bảo mật trên trình duyệt của bạn và gọi trực tiếp tới Google AI Studio.
              </p>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mô hình AI (Model)
              </label>
              <div className="space-y-1.5">
                {AVAILABLE_MODELS.map(m => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      modelDraft === m.id
                        ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gemini_model"
                      value={m.id}
                      checked={modelDraft === m.id}
                      onChange={() => setModelDraft(m.id)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{m.name}</span>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded-md">
                          {m.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {
                if (geminiKeyDraft && !isValidGeminiKey(geminiKeyDraft)) return;
                localStorage.setItem('gemini_api_key', geminiKeyDraft);
                localStorage.setItem('gemini_model', modelDraft);
                setGeminiApiKey(geminiKeyDraft);
                setSelectedModel(modelDraft);
                if (geminiKeyDraft) setActiveModel(modelDraft);
                setShowSettings(false);
              }}
              disabled={!!(geminiKeyDraft && !isValidGeminiKey(geminiKeyDraft))}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Lưu cấu hình
            </button>

            {geminiApiKey && (
              <button
                onClick={() => {
                  localStorage.removeItem('gemini_api_key');
                  setGeminiApiKey('');
                  setGeminiKeyDraft('');
                  setActiveModel('local-engine');
                  setShowSettings(false);
                }}
                className="w-full text-red-500 hover:bg-red-50 font-medium py-2 rounded-xl text-sm transition-all cursor-pointer"
              >
                Xóa API key
              </button>
            )}
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
          localStorage.removeItem(`ai_chat_history_${activeStoreId}`);
          setShowConfirmClear(false);
        }}
      />
    </div>
    </>
  );
}
