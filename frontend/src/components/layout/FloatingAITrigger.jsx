import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Move } from 'lucide-react';

/**
 * Nút nổi Trợ lý AI Copilot thông minh:
 * - Hỗ trợ kéo thả (drag & drop) tự do để không bao giờ che khuất nút thao tác của bảng
 * - Ghi nhớ vị trí sau khi kéo thả qua localStorage
 * - Có nút thu nhỏ / ẩn nút nổi (người dùng vẫn dùng được nút Trợ lý AI trên thanh Header)
 * - Vị trí mặc định được nhấc cao hơn (bottom-24) tránh góc bấm thao tác dòng cuối
 */
export default function FloatingAITrigger({ onOpen }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('ofc-ai-fab-hidden') === 'true';
    } catch {
      return false;
    }
  });

  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('ofc-ai-fab-pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null; // Mặc định dùng CSS positioning
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false
  });

  const buttonRef = useRef(null);

  // Đảm bảo vị trí lưu không bị lọt ra ngoài màn hình khi resize cửa sổ
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return null;
        const maxX = window.innerWidth - 64;
        const maxY = window.innerHeight - 64;
        if (prev.x > maxX || prev.y > maxY) {
          return {
            x: Math.min(prev.x, Math.max(16, maxX)),
            y: Math.min(prev.y, Math.max(60, maxY))
          };
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      hasMoved: false
    };

    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.hasMoved = true;
        setIsDragging(true);

        const newX = Math.min(
          Math.max(12, dragRef.current.initialX + dx),
          window.innerWidth - 68
        );
        const newY = Math.min(
          Math.max(60, dragRef.current.initialY + dy),
          window.innerHeight - 68
        );

        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (dragRef.current.hasMoved) {
        setTimeout(() => setIsDragging(false), 50);
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const pos = { x: rect.left, y: rect.top };
          try {
            localStorage.setItem('ofc-ai-fab-pos', JSON.stringify(pos));
          } catch {}
        }
      } else {
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleClick = (e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen();
  };

  const handleHide = (e) => {
    e.stopPropagation();
    setHidden(true);
    try {
      localStorage.setItem('ofc-ai-fab-hidden', 'true');
    } catch {}
  };

  if (hidden) return null;

  const customStyle = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        zIndex: 40,
        touchAction: 'none'
      }
    : {};

  return (
    <div
      ref={buttonRef}
      style={customStyle}
      onPointerDown={handlePointerDown}
      className={`${
        !position
          ? 'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-24 right-3.5 md:right-6'
          : ''
      } z-40 group select-none print:hidden`}
    >
      <div className="relative">
        {/* Nút ẩn nhỏ trên góc khi hover */}
        <button
          type="button"
          onClick={handleHide}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50 cursor-pointer"
          title="Ẩn icon nổi (Bạn luôn có thể mở AI ở nút trên thanh Header)"
        >
          <X size={11} />
        </button>

        {/* Nút chính */}
        <button
          type="button"
          onClick={handleClick}
          className={`w-11 h-11 md:w-13 md:h-13 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-full shadow-lg shadow-blue-500/35 flex items-center justify-center text-white transition-all cursor-pointer focus:ring-3 focus:ring-blue-300 ${
            isDragging
              ? 'scale-110 shadow-2xl cursor-grabbing'
              : 'hover:scale-105 active:scale-95'
          }`}
          title="Kéo thả để di chuyển vị trí · Bấm để mở TÚ mini AI"
        >
          <Sparkles size={20} className="group-hover:animate-pulse" />
        </button>

        {/* Tooltip hướng dẫn kéo thả */}
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden sm:flex items-center gap-1.5">
          <Move size={11} className="text-blue-300" />
          <span>Kéo thả để đổi chỗ</span>
        </div>
      </div>
    </div>
  );
}
