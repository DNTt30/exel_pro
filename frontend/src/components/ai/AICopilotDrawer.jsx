import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Trash2, Settings, KeyRound } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { askAICopilot, askGeminiCopilot, askOllamaCopilot, isGenericCopilotFallback } from '../../utils/aiSchedulerEngine';
import { isOpsManager, canPickStore } from '../../lib/authSession';
import { visibleDeptIds } from '../../utils/dataScope';
import { inferAiIntent } from '../../utils/appLogs';
import { useShallow } from 'zustand/react/shallow';
import RecipeQuickModal from '../modals/RecipeQuickModal';
import ConfirmModal from '../modals/ConfirmModal';

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
    } catch {
      // Bỏ qua lỗi parsing
    }
    return [initialWelcome];
  });

  useEffect(() => {
    localStorage.setItem(`ai_chat_history_${activeStoreId}`, JSON.stringify(messages));
  }, [messages, activeStoreId]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const messagesEndRef = useRef(null);

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
    try {
      if (geminiApiKey && geminiApiKey.trim()) {
        try {
          aiReply = await askGeminiCopilot(query, contextData, chatHistory, geminiApiKey.trim());
          model = 'gemini-1.5-flash';
        } catch (geminiErr) {
          console.warn('Gemini API call failed, falling back to local engine:', geminiErr);
          aiReply = askAICopilot(query, contextData, chatHistory);
          model = 'local-engine-fallback';
        }
      } else {
        const localReply = askAICopilot(query, contextData, chatHistory);
        aiReply = localReply;
        model = 'local-engine';
      }
      const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.warn('AI error:', error);
      err = error.message || 'ai-error';
      aiReply = askAICopilot(query, contextData, chatHistory);
      const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] sm:h-[540px] bg-white shadow-2xl shadow-slate-900/20 rounded-2xl overflow-hidden z-50 flex flex-col border border-slate-200 print:hidden">
      {/* Header */}
      <div className="p-5 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white flex items-center justify-between shadow-md relative overflow-hidden">
        {/* Lớp phủ trang trí (Glass effect) */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20 overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}tu_mini_avatar.jpg`} alt="Tú mini" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-extrabold text-base flex items-center gap-2">
              <span className="tracking-tight">TÚ mini</span>
              <span className="px-2 py-0.5 bg-emerald-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                Trực chiến
              </span>
            </div>
            <div className="text-xs text-indigo-100 font-medium mt-0.5">Đệ tử ruột - Cửa hàng {activeStoreId}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative z-10">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white cursor-pointer"
            title="Cài đặt AI"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white cursor-pointer"
            title="Xóa lịch sử"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 transition-all text-white/80 hover:text-white cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
        {messages.map((m) => {
          const isAI = m.sender === 'ai';
          return (
            <div key={m.id} className={`flex gap-3 ${isAI ? 'items-start' : 'items-end flex-row-reverse'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm overflow-hidden ${
                isAI ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm'
              }`}>
                {isAI ? <img src={`${import.meta.env.BASE_URL}tu_mini_avatar.jpg`} alt="Tú mini" className="w-full h-full object-cover" /> : <User size={16} />}
              </div>

              <div className={`p-3.5 rounded-2xl text-[13px] max-w-[82%] leading-relaxed ${
                isAI 
                  ? 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-tl-sm' 
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md rounded-tr-sm'
              }`}>
                <div className="whitespace-pre-line font-normal">{m.text}</div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-3 text-xs text-slate-500 italic">
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm animate-bounce border border-indigo-100">
              <img src={`${import.meta.env.BASE_URL}tu_mini_avatar.jpg`} alt="Tú mini" className="w-full h-full object-cover" />
            </div>
            <span className="bg-slate-200/50 px-3 py-1.5 rounded-full">TÚ mini đang lục lọi dữ liệu...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="p-3 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <button
          type="button"
          onClick={() => setShowRecipeModal(true)}
          className="whitespace-nowrap px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 border border-transparent rounded-full font-bold text-white transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md cursor-pointer animate-[pulse_3s_ease-in-out_infinite]"
        >
          🍳 Sổ tay Công Thức 1-Chạm
        </button>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap px-4 py-2 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-full font-medium text-slate-600 hover:text-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            placeholder={isAdmin ? "Hỏi lịch, định biên, công thức FF..." : "Hỏi công thức, ca hôm nay, đổi ca..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-3 text-[13px] border border-slate-200 rounded-full bg-slate-50 hover:bg-white focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-full disabled:opacity-40 transition-all cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 group"
          >
            <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
            <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Gemini API Key</label>
              <input 
                type="password" 
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Key này được lưu an toàn trên trình duyệt của bạn (LocalStorage) và dùng để gọi trực tiếp tới Google Gemini.
              </p>
            </div>
            
            <button 
              onClick={() => {
                localStorage.setItem('gemini_api_key', geminiApiKey);
                setShowSettings(false);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer"
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
          localStorage.removeItem(`ai_chat_history_${activeStoreId}`);
          setShowConfirmClear(false);
        }}
      />
    </div>
  );
}
