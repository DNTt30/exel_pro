import { useEffect, useRef, useState } from 'react';
import WordCloud from 'wordcloud';

const PALETTE = ['#1e293b', '#334155', '#475569', '#1e3a8a', '#0369a1'];
const CATEGORY_COLORS = { schedule: '#1d4ed8', recipe: '#b45309', shelf: '#be123c', labor: '#047857' };
const EMPTY_WORDS = [];
const weightOf = word => Math.max(1, Number(word.activeWeight || word.weight) || 1);

export default function WordCloudCanvas({ words = EMPTY_WORDS, selectedWord = '', onSelectWord, height = 360 }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const onSelectRef = useRef(onSelectWord);
  onSelectRef.current = onSelectWord;
  const [hover, setHover] = useState(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    const container = containerRef.current, canvas = canvasRef.current;
    if (!container || !canvas) return;
    let timer, lastSize = '', disposed = false;
    // Stop only this canvas. WordCloud.stop() would cancel other charts as well.
    const stop = () => canvas.dispatchEvent(new CustomEvent('wordcloudstart', { cancelable: true }));
    const render = () => {
      if (disposed) return;
      const width = Math.floor(container.getBoundingClientRect().width);
      if (width < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = `${width}:${height}:${dpr}`;
      if (size === lastSize) return; // Mobile browser chrome/height changes are not a new layout.
      lastSize = size;
      stop(); setHover(null); setSelection(null);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      canvas.style.cursor = 'default';
      if (!words.length) return;
      const weights = words.map(weightOf);
      const min = Math.min(...weights), range = Math.max(Math.max(...weights) - min, 1);
      const maxFont = width < 640 ? 30 : 44;
      const list = words.map(word => [word.text, Math.round(12 + Math.pow((weightOf(word) - min) / range, 1.35) * (maxFont - 12)) * dpr]);
      const toBox = dimension => dimension && ({ left: dimension.x / dpr, top: dimension.y / dpr, width: dimension.w / dpr, height: dimension.h / dpr });
      try {
        WordCloud(canvas, {
          list, gridSize: Math.max(Math.round(4 * dpr), 3), weightFactor: 1,
          fontFamily: 'system-ui, sans-serif', fontWeight: '600',
          color: word => {
            const category = words.find(item => item.text === word)?.cat;
            if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
            let hash = 0;
            for (const char of word) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
            return PALETTE[Math.abs(hash) % PALETTE.length];
          },
          // No random rotation or shuffle: identical data/width keeps identical placement.
          rotateRatio: 0, minRotation: 0, maxRotation: 0, shuffle: false,
          backgroundColor: 'transparent', drawOutOfBound: false, shrinkToFit: true,
          shape: 'ellipse', ellipticity: 0.62,
          hover: item => {
            if (disposed) return;
            canvas.style.cursor = item ? 'pointer' : 'default';
            const word = item && words.find(w => w.text === item[0]);
            setHover(word || null);
          },
          click: (item, dimension) => {
            if (disposed || !item?.[0]) return;
            setSelection({ text: item[0], box: toBox(dimension) });
            onSelectRef.current?.(item[0]);
          },
        });
      } catch (error) { console.warn('WordCloud render warning:', error); }
    };
    const scheduleRender = () => { clearTimeout(timer); timer = setTimeout(render, 50); };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleRender) : null;
    observer?.observe(container);
    window.addEventListener('resize', scheduleRender);
    scheduleRender();
    return () => { disposed = true; clearTimeout(timer); observer?.disconnect(); window.removeEventListener('resize', scheduleRender); stop(); };
  }, [words, height]); // Selection/callback updates must never reposition the words.

  const selected = selection?.text.toLowerCase() === selectedWord.toLowerCase() ? selection : null;
  return <div className="w-full min-w-0"
    onMouseLeave={() => { setHover(null); if (canvasRef.current) canvasRef.current.style.cursor = 'default'; }}>
    <div ref={containerRef} className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-white" style={{ height }}>
      <canvas ref={canvasRef} className="block" role="img" aria-label="Đám mây từ khóa. Bấm một từ để lọc; có thể nhập từ khóa ở ô tìm câu hỏi bên dưới." style={{ width: '100%', height }} />
      {selected?.box && <div aria-hidden="true" className="pointer-events-none absolute rounded border-2 border-slate-600 bg-slate-100/20" style={selected.box} />}
    </div>
    {/* Reserve a separate caption row so hover never covers words or shifts the page. */}
    <div className="flex h-14 min-w-0 items-center border-t border-slate-100 px-3 text-xs text-slate-600">
      {hover ? <div role="tooltip" className="min-w-0">
        <strong className="block truncate" title={hover.text}>{hover.text}</strong>
        <span className="block">{hover.realCount > 0 ? `${hover.realCount} lượt hỏi thực tế` : 'Từ khóa tham khảo'} · Bấm để lọc</span>
      </div> : <span>Chạm hoặc di chuột vào từ khóa để xem chi tiết.</span>}
    </div>
  </div>;
}
