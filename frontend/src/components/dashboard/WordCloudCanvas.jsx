import React, { useEffect, useRef, useState, useCallback } from 'react';
import WordCloud from 'wordcloud';

// Bảng màu typographic chuyên sâu mô phỏng chuẩn xác hình mẫu của người dùng
// Gồm các sắc thái: Deep Navy, Cobalt Blue, Royal Blue, Sky, Slate & Deep Cyan
const TYPOGRAPHIC_PALETTE = [
  '#092347', // Deep Navy
  '#0f3261', // Dark Navy
  '#1e3a8a', // Deep Blue
  '#1d4ed8', // Royal Blue
  '#2563eb', // Blue 600
  '#0284c7', // Sky 600
  '#0369a1', // Sky 700
  '#0e7490', // Cyan 700
  '#0891b2', // Cyan 600
  '#3730a3', // Indigo 800
  '#4338ca', // Indigo 700
  '#1e293b', // Slate 800
  '#334155', // Slate 700
  '#475569'  // Slate 600
];

export default function WordCloudCanvas({
  words = [],
  selectedWord = '',
  onSelectWord = () => {},
  height = 360
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [seed, setSeed] = useState(0);

  const renderCloud = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 320);
    const h = height;

    // Hỗ trợ màn hình Retina / High DPI để chữ sắc nét tuyệt đối
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;

    if (!words || words.length === 0) return;

    // Chuẩn hóa trọng số
    const maxWeight = Math.max(...words.map(w => w.activeWeight || w.weight || 1), 1);
    const minWeight = Math.min(...words.map(w => w.activeWeight || w.weight || 1), 1);
    const range = Math.max(maxWeight - minWeight, 1);

    // Tính toán kích thước chữ:
    // Trên desktop: lớn nhất ~ 46px, nhỏ nhất ~ 11px
    // Trên mobile: lớn nhất ~ 32px, nhỏ nhất ~ 9.5px
    const isMobile = width < 640;
    const maxFont = isMobile ? 32 : 46;
    const minFont = isMobile ? 9.5 : 11;

    const list = words.map(w => {
      const weightVal = w.activeWeight || w.weight || 1;
      const norm = (weightVal - minWeight) / range;
      // Dùng hàm mũ phi tuyến để từ khóa nổi bật to hẳn lên giống mẫu
      const fontPx = Math.round(minFont + Math.pow(norm, 1.35) * (maxFont - minFont));
      return [w.text, fontPx * dpr, w];
    });

    try {
      WordCloud(canvas, {
        list: list.map(([text, size]) => [text, size]),
        gridSize: Math.max(Math.round(4 * dpr), 3),
        weightFactor: 1,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontWeight: (word, weight) => {
          const effectivePx = weight / dpr;
          if (effectivePx >= 30) return '900';
          if (effectivePx >= 20) return '800';
          if (effectivePx >= 14) return '700';
          return '600';
        },
        color: (word, weight) => {
          if (selectedWord && word.toLowerCase() === selectedWord.toLowerCase()) {
            return '#e11d48'; // Nổi bật màu hồng đỏ khi đang được chọn
          }
          // Chọn màu ổn định theo chuỗi ký tự
          let hash = 0;
          for (let i = 0; i < word.length; i++) {
            hash = (hash << 5) - hash + word.charCodeAt(i);
          }
          return TYPOGRAPHIC_PALETTE[Math.abs(hash) % TYPOGRAPHIC_PALETTE.length];
        },
        rotateRatio: 0.28, // 28% từ xoay thẳng đứng 90 độ giống mẫu của bạn
        minRotation: -Math.PI / 2,
        maxRotation: -Math.PI / 2, // Chỉ cho phép góc 0 (ngang) và -90 độ (dọc)
        rotationSteps: 2,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        shrinkToFit: true,
        shape: 'ellipse', // Dáng đám mây nằm ngang
        ellipticity: 0.62, // Tỷ lệ dẹt để tạo khối đám mây mỹ thuật
        shuffle: false, // Từ lớn nhất luôn ưu tiên nằm giữa đám mây
        hover: (item, dimension, event) => {
          if (!item) {
            setHoveredWord(null);
            canvas.style.cursor = 'default';
            return;
          }
          canvas.style.cursor = 'pointer';
          const matched = words.find(w => w.text === item[0]);
          setHoveredWord(matched || { text: item[0], weight: Math.round(item[1] / dpr) });
          if (event) {
            const cRect = container.getBoundingClientRect();
            setTooltipPos({
              x: event.clientX - cRect.left,
              y: event.clientY - cRect.top
            });
          }
        },
        click: (item) => {
          if (item && item[0]) {
            onSelectWord(item[0]);
          }
        }
      });
    } catch (err) {
      console.warn('WordCloud render warning:', err);
    }
  }, [words, selectedWord, height, onSelectWord, seed]);

  useEffect(() => {
    // Render sau khi DOM mount ổn định
    const timer = setTimeout(() => {
      renderCloud();
    }, 50);

    const handleResize = () => {
      renderCloud();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (WordCloud.stop) WordCloud.stop();
    };
  }, [renderCloud]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full overflow-hidden select-none flex items-center justify-center bg-white rounded-xl"
      style={{ minHeight: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        className="block mx-auto"
        style={{ width: '100%', height: `${height}px` }}
      />

      {/* Tooltip vị trí chính xác khi hover qua từng từ */}
      {hoveredWord && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-xl backdrop-blur-xs border border-slate-700/80 transition-opacity duration-100 flex items-center gap-2.5"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 6}px`
          }}
        >
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-[13px]">{hoveredWord.text}</span>
            <span className="text-[10px] text-slate-400">
              {hoveredWord.realCount > 0 
                ? `🔥 ${hoveredWord.realCount} lượt hỏi thực tế`
                : `Trọng số nghiệp vụ: ${hoveredWord.weight || hoveredWord.activeWeight}`}
            </span>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30 font-semibold self-center">
            Click để lọc
          </span>
        </div>
      )}
    </div>
  );
}
