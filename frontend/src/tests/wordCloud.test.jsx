// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import WordCloudCanvas from '../components/dashboard/WordCloudCanvas';
import AICopilotAnalyticsWidget from '../components/dashboard/AICopilotAnalyticsWidget';
import { MemoryRouter } from 'react-router-dom';
import { getCopilotActivity } from '../services/api/logs';
import WordCloud from 'wordcloud';
vi.mock('wordcloud', () => ({ default: vi.fn() }));
vi.mock('../services/api/logs', () => ({ getCopilotActivity: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const words = [{ text: 'Lịch làm việc', weight: 10 }, { text: 'Hủy cơm nắm', weight: 5 }];
let root, container, width, resize, disconnect;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); width = 280; disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class { constructor(fn) { resize = fn; } observe() {} disconnect = disconnect; });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width, height: 380, left: 0, top: 0 }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const render = async element => { await act(async () => root.render(element)); await act(async () => vi.advanceTimersByTime(60)); };

it('selecting or clearing words never redraws; click uses the latest callback', async () => {
  const first = vi.fn(), second = vi.fn();
  await render(<WordCloudCanvas words={words} onSelectWord={first} />);
  const config = WordCloud.mock.calls[0][1];
  await render(<WordCloudCanvas words={words} selectedWord="Lịch làm việc" onSelectWord={second} />);
  expect(WordCloud).toHaveBeenCalledTimes(1);
  await act(async () => config.click(['Lịch làm việc', 30], { x: 10, y: 10, w: 100, h: 20 }));
  expect(second).toHaveBeenCalledWith('Lịch làm việc'); expect(first).not.toHaveBeenCalled();
  await render(<WordCloudCanvas words={words} selectedWord="" onSelectWord={second} />);
  expect(WordCloud).toHaveBeenCalledTimes(1);
});

it('ignores height-only resize and fits narrow containers; redraws on actual width/data changes', async () => {
  await render(<WordCloudCanvas words={words} />);
  expect(container.querySelector('canvas').style.width).toBe('280px');
  await act(async () => { resize(); window.dispatchEvent(new Event('resize')); vi.advanceTimersByTime(60); });
  expect(WordCloud).toHaveBeenCalledTimes(1);
  width = 240; await act(async () => { resize(); vi.advanceTimersByTime(60); });
  expect(WordCloud).toHaveBeenCalledTimes(2);
  expect(container.querySelector('canvas').style.width).toBe('240px');
  await render(<WordCloudCanvas words={[...words, { text: 'Ca đêm', weight: 3 }]} />);
  expect(WordCloud).toHaveBeenCalledTimes(3);
});

it('stops only its own canvas when unmounted', async () => {
  await render(<WordCloudCanvas words={words} />);
  const stopped = vi.fn(); container.querySelector('canvas').addEventListener('wordcloudstart', stopped);
  await render(null);
  expect(stopped).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalledOnce();
});

it('Dashboard filters actual conversation topics without fabricated cloud data', async () => {
  getCopilotActivity.mockResolvedValue([
    { id:'1', userMessage:'lich lam viec tuan nay?', storeId:'A', createdAt:'2026-10-18T01:00:00Z' },
    { id:'2', userMessage:'huy com nam luc nao?', storeId:'A', createdAt:'2026-10-18T02:00:00Z' },
  ]);
  await render(<MemoryRouter><AICopilotAnalyticsWidget filterDept="A" /></MemoryRouter>);
  expect(container.querySelectorAll('article')).toHaveLength(2);
  const topic = [...container.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.includes('ca'));
  expect(topic).toBeTruthy();
  await act(async()=>topic.click());
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('article').textContent).toContain('lich lam viec');
  await act(async()=>topic.click());
  expect(container.querySelectorAll('article')).toHaveLength(2);
  expect(WordCloud).not.toHaveBeenCalled();
});
