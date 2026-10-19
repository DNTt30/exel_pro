// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
const api = vi.hoisted(() => Object.fromEntries(['getRegistrationDeadline', 'getEmployees', 'getFeedbacks',
  'getShiftSwaps', 'getShelves', 'getShelfItems', 'getStores', 'getSchedulesByWeeks'].map(key => [key, vi.fn()])));
const client = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock('../services/api', () => api);
vi.mock('../services/api/client', () => ({ db: () => client }));
vi.mock('../store/useStore', async () => ({ useStore: (await import('zustand')).create(() => ({ user: null })) }));
import { useStore } from '../store/useStore';
import { useRegistrationDeadline } from '../hooks/useRegistrationDeadline';
import { buildBackupData, buildBackupWorkbook } from '../utils/exportBackup';
import { getReadNotificationIds, markNotificationsRead } from '../services/api/notifications';
import { saveRegistrationDeadline } from '../services/api/registrationDeadlines';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container, deadline;
function Probe({ store = 'A' }) {
  deadline = useRegistrationDeadline(store, '2026-10-26');
  return <span>{deadline.info.status}</span>;
}
async function mount(store = 'A') {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<Probe store={store} />));
}
const snapshot = config => ({ config, serverNow: '2026-10-20T00:00:00Z', defaultRevision: 2, weekRevision: 3 });
beforeEach(() => {
  vi.resetAllMocks();
  useStore.setState({ user: { id: 'staff', role: 'STFT', dept: 'A' } });
  for (const name of ['from', 'select', 'order']) client[name].mockReturnValue(client);
  for (const fn of Object.values(api)) fn.mockResolvedValue([]);
  api.getSchedulesByWeeks.mockResolvedValue({});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = null; vi.useRealTimers();
});
it('fails closed while loading and after a deadline network failure', async () => {
  let reject;
  api.getRegistrationDeadline.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  await mount(); expect(deadline.ready).toBe(false); expect(deadline.info.isExpired).toBe(true);
  await act(async () => reject(new Error('offline')));
  expect(deadline.ready).toBe(false); expect(deadline.error).toBe('offline');
});
it('uses server time even when the local device clock is years ahead', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2035-01-01'));
  api.getRegistrationDeadline.mockResolvedValue(snapshot({ enabled: true, customDeadline: '2026-10-20T00:01:00Z' }));
  await mount(); expect(deadline.info.isExpired).toBe(false);
  api.getRegistrationDeadline.mockResolvedValue({ ...snapshot({ enabled: true, customDeadline: '2026-10-20T00:01:00Z' }), serverNow: '2026-10-20T00:02:00Z' });
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(deadline.info.isExpired).toBe(true);
});
it('requires every assigned store to be open and ignores a response from the previous account', async () => {
  let finishOld;
  api.getRegistrationDeadline.mockImplementation(store => store === 'A'
    ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve(snapshot({ isForceClosed: true })));
  await mount('A,B');
  api.getRegistrationDeadline.mockResolvedValue(snapshot({ isForceClosed: true }));
  await act(async () => useStore.setState({ user: { id: 'other', role: 'STFT', dept: 'A,B' } }));
  expect(deadline.info.isExpired).toBe(true);
  await act(async () => finishOld(snapshot({ isForceOpen: true })));
  expect(deadline.info.isExpired).toBe(true);
  expect(deadline.ready).toBe(true);
});
it('sends both revisions and exposes an edit conflict rather than overwriting it', async () => {
  client.rpc.mockResolvedValue({ error: { message: 'DEADLINE_CONFLICT' } });
  await expect(saveRegistrationDeadline({ storeId: 'A', weekDate: '2026-10-26', config: {}, snapshot: snapshot({}) })).rejects.toThrow('người khác');
  expect(client.rpc).toHaveBeenCalledWith('save_registration_deadline', expect.objectContaining({ p_default_revision: 2, p_week_revision: 3 }));
});
it('never exports stale local data when a fresh request fails', async () => {
  api.getEmployees.mockRejectedValue(new Error('offline'));
  await expect(buildBackupData({ employees: [{ id: 'stale' }] })).rejects.toThrow('offline');
});
it('exports only requested weeks and explains limits in the workbook', async () => {
  const data = await buildBackupData({ currentWeek: '2026-10-19', schedule: { '2026-10-12': {} }, scheduleWeeks: {} });
  expect(api.getSchedulesByWeeks).toHaveBeenCalledWith(['2026-10-12', '2026-10-19']);
  expect(api.getFeedbacks).toHaveBeenCalledWith({ limit: 150 });
  const wb = buildBackupWorkbook(data);
  const scope = XLSX.utils.sheet_to_json(wb.Sheets['Pham vi'], { header: 1 }).flat().join(' ');
  expect(scope).toContain('150'); expect(scope).toContain('2026-10-19'); expect(scope).toContain('không dùng làm bản sao lưu');
});
it('reads all notification receipt pages, preserving versioned keys', async () => {
  client.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ event_key: `id:${i}` })) })
    .mockResolvedValueOnce({ data: [{ event_key: 'same-event:new-version' }] });
  const ids = await getReadNotificationIds();
  expect(ids).toHaveLength(501); expect(ids.at(-1)).toBe('same-event:new-version');
  expect(client.range).toHaveBeenLastCalledWith(500, 999);
});
it('does not report read success if persistence fails', async () => {
  client.rpc.mockResolvedValue({ error: new Error('offline') });
  await expect(markNotificationsRead(['event:1', 'event:1'])).rejects.toThrow('offline');
  expect(client.rpc).toHaveBeenCalledWith('mark_notifications_read', { p_keys: ['event:1'] });
});
