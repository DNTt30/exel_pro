// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Modal from '../components/modals/Modal';
import ConfirmModal from '../components/modals/ConfirmModal';
import StoreDemandFields from '../components/StoreDemandFields';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container, opener;
beforeEach(() => {
  opener = document.createElement('button'); document.body.append(opener); opener.focus();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); opener.remove(); vi.restoreAllMocks(); });
const render = async element => act(async () => root.render(element));
const escape = async () => act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

it('Escape closes only the top dialog and restores focus to its opener', async () => {
  const lower = vi.fn(), upper = vi.fn();
  await render(<><Modal isOpen title="Lịch" onClose={lower}><button>Mở ngoại lệ</button></Modal><Modal isOpen={false} title="Ngoại lệ" onClose={upper} /></>);
  const openOverride = [...container.querySelectorAll('button')].find(b => b.textContent === 'Mở ngoại lệ'); openOverride.focus();
  await render(<><Modal isOpen title="Lịch" onClose={lower}><button>Mở ngoại lệ</button></Modal><Modal isOpen title="Ngoại lệ" onClose={upper}><input autoFocus /></Modal></>);
  await escape(); expect(upper).toHaveBeenCalledOnce(); expect(lower).not.toHaveBeenCalled();
  await render(<><Modal isOpen title="Lịch" onClose={lower}><button>Mở ngoại lệ</button></Modal><Modal isOpen={false} title="Ngoại lệ" onClose={upper} /></>);
  expect(document.activeElement).toBe(openOverride);
  await escape(); expect(lower).toHaveBeenCalledOnce();
});

it('cannot dismiss or double-submit a busy confirmation via keyboard, backdrop or buttons', async () => {
  const close = vi.fn(), confirm = vi.fn();
  await render(<ConfirmModal isOpen loading onClose={close} onConfirm={confirm} />);
  await escape();
  await act(async () => {
    container.firstElementChild.click();
    container.querySelectorAll('button').forEach(b => b.click());
  });
  expect(close).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
  await render(<ConfirmModal isOpen onClose={close} onConfirm={confirm} />);
  await escape(); expect(close).toHaveBeenCalledOnce();
});

it('keeps Tab inside the dialog and restores the original trigger on close', async () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}]);
  await render(<Modal isOpen title="Kiểm tra" onClose={() => {}}><input aria-label="Nhập" /><button>Cuối</button></Modal>);
  const items = container.querySelectorAll('button, input'), first = items[0], last = items[items.length - 1];
  last.focus(); await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
  expect(document.activeElement).toBe(first);
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
  expect(document.activeElement).toBe(last);
  await render(<Modal isOpen={false} title="Kiểm tra" />);
  expect(document.activeElement).toBe(opener);
});

it('shared demand form keeps the other bucket intact and clamps negative input to zero', async () => {
  let lastValue;
  function Fixture() {
    const [demand, setDemand] = useState({ weekday: { sales: 100, customers: 20 }, weekend: { sales: 200, customers: 30 } });
    return <StoreDemandFields demand={demand} onChange={next => { lastValue = next; setDemand(next); }} />;
  }
  await render(<Fixture />);
  const input = container.querySelector('[aria-label="Doanh số (đ) weekday"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '-10');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(lastValue).toEqual({ weekday: { sales: 0, customers: 20 }, weekend: { sales: 200, customers: 30 } });
});

it('includes expandable sections in keyboard navigation', async () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}]);
  await render(<Modal isOpen title="Báo cáo" onClose={() => {}}><input /><details><summary>Xem thêm</summary><p>Chi tiết</p></details></Modal>);
  const summary = container.querySelector('summary'); summary.focus();
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
  expect(document.activeElement).toBe(container.querySelector('button'));
});
