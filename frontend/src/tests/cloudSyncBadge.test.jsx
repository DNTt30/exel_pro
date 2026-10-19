// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../store/useStore', () => ({ useStore: selector => selector(state) }));
import CloudSyncBadge from '../components/layout/CloudSyncBadge';
const state = { syncStatus: 'ok', realtimeStatus: 'connected', lastSyncedAt: 1, initializeData: vi.fn(), authWarning: null };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); vi.clearAllMocks(); });
it.each([
  ['error', 'connected', null, 'Lỗi đồng bộ'],
  ['ok', 'error', null, 'Live gián đoạn'],
  ['ok', 'disconnected', null, 'Đã tải dữ liệu'],
  ['saved', 'connected', null, 'Live'],
  ['saving', 'connected', null, 'Đang lưu'],
  ['error', 'connected', 'Phiên đã hết hạn', 'Kiểm tra đăng nhập'],
])('reports data/session/live status separately (%s, %s)', async (syncStatus, realtimeStatus, authWarning, label) => {
  Object.assign(state, { syncStatus, realtimeStatus, authWarning });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<CloudSyncBadge />));
  expect(container.textContent).toContain(label);
  expect(container.textContent).not.toContain('Offline');
  const button = container.querySelector('button');
  if (button) { await act(async () => button.click()); expect(state.initializeData).toHaveBeenCalledOnce(); }
});
