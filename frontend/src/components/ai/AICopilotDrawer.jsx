import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, MessageSquare, ChevronRight, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { askAICopilot } from '../../utils/aiSchedulerEngine';

export default function AICopilotDrawer({ isOpen, onClose, currentWeek, storeId }) {
  const { employees, schedule, stores, shiftSwaps, feedbacks, user } = useStore();
  const weekSched = schedule[currentWeek] || {};
  const activeStoreId = storeId === 'ALL' ? (user?.dept || 'VN0485') : storeId;

  const initialWelcome = {
    id: 'welcome',
    sender: 'ai',
    text: `👋 Chào bạn! Tôi là **Trợ lý AI Lịch Làm Việc OFC** của cửa hàng **${activeStoreId}**.\n\nTôi có thể đọc chi tiết **toàn bộ dữ liệu** của các bảng: Nhân sự, Lịch phân ca, Đơn đổi ca, Báo bù công C&B và Danh mục cửa hàng. Bạn cần tra cứu hoặc hỗ trợ điều gì?`
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`ai_chat_history_${activeStoreId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    return [initialWelcome];
  });

  useEffect(() => {
    localStorage.setItem(`ai_chat_history_${activeStoreId}`, JSON.stringify(messages));
  }, [messages, activeStoreId]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?')) {
      setMessages([initialWelcome]);
      localStorage.removeItem(`ai_chat_history_${activeStoreId}`);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickPrompts = [
    '🔍 Quét lỗi & vi phạm lịch tuần',
    '📊 Nhân viên nào làm nhiều giờ nhất?',
    '🔄 Có đơn đổi ca nào đang chờ?',
    '📋 Kiểm tra đơn báo bù công C&B'
  ];

  const handleSend = (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = { id: 'user_' + Date.now(), sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const aiReply = askAICopilot(query, {
        employees,
        weekSchedule: weekSched,
        schedule,
        stores,
        shiftSwaps,
        feedbacks,
        storeId: activeStoreId,
        currentWeek
      });

      const aiMsg = { id: 'ai_' + Date.now(), sender: 'ai', text: aiReply };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 350);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-left print:hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Sparkles size={18} className="text-amber-300" />
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center gap-1.5">
              <span>OFC AI Copilot</span>
              <span className="px-1.5 py-0.2 bg-emerald-400 text-slate-950 text-[9px] font-black rounded-full uppercase">
                Active
              </span>
            </div>
            <div className="text-[11px] text-white/80 font-medium">Trợ lý Cửa hàng {activeStoreId}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
            title="Xóa lịch sử"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
        {messages.map((m) => {
          const isAI = m.sender === 'ai';
          return (
            <div key={m.id} className={`flex gap-2.5 ${isAI ? 'items-start' : 'items-end flex-row-reverse'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                isAI ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-800 text-white'
              }`}>
                {isAI ? <Bot size={15} /> : <User size={15} />}
              </div>

              <div className={`p-3 rounded-2xl text-xs max-w-[82%] leading-relaxed ${
                isAI 
                  ? 'bg-white border border-slate-200 text-slate-800 shadow-2xs' 
                  : 'bg-blue-600 text-white shadow-xs'
              }`}>
                <div className="whitespace-pre-line font-normal">{m.text}</div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <Bot size={14} className="text-indigo-600 animate-bounce" />
            <span>AI đang phân tích dữ liệu...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg font-medium text-slate-600 transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Hỏi AI về lịch tuần, định biên, nhân sự..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-xs"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
