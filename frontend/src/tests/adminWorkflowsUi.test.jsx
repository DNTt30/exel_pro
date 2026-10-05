// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../lib/supabase', () => ({ supabase: null, supabaseUrl: '', supabaseAnonKey: '' }));
import { useStore } from '../store/useStore';
import FeedbackCB from '../pages/admin/FeedbackCB';
import Timesheet from '../pages/admin/Timesheet';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
let root, container;
beforeEach(() => {
  useStore.setState({
    user: { id: 'admin', role: 'admin' }, currentWeek: '2026-09-28',
    stores: [{ id: 'A' }, { id: 'B' }],
    employees: [{ id: '260000001', name: 'Nhân viên A', dept: 'A', role: 'STPT', type: 'STPT' }],
    feedbacks: [
      { id: 'first', empId: '260000001', date: '30/09/2026', status: 'pending', issue: 'Quên chấm tháng trước' },
      { id: 'second', empId: '260000001', dept: 'A', date: '2026-10-01', status: 'approved', issue: 'Công đầu tháng' },
      { id: 'third', empId: '260000002', dept: 'B', date: '02/10/2026', status: 'rejected', issue: 'Công cửa hàng B' },
    ],
    schedule: { '2026-09-28': { '260000001': { T2: '6-14', T3: 'off' } } },
    attendance: {}, ensureWeeksLoaded: vi.fn().mockResolvedValue(), loadAttendanceRange: vi.fn().mockResolvedValue(),
    saveAttendanceCell: vi.fn().mockResolvedValue(),
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = null;
  useStore.setState(initial, true);
});
async function mount(element) {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(element));
}
async function fill(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function select(label, value) {
  await act(async () => {
    const input = container.querySelector(`[aria-label="${label}"]`);
    input.value = value; input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
it('filters feedback by inclusive incident dates across months, then combines store/status and clears dates', async () => {
  await mount(<FeedbackCB />);
  expect(container.querySelector('[aria-label="Tuần"]')).toBeNull();
  await fill(container.querySelector('[aria-label="Bù công từ ngày"]'), '2026-09-30');
  await fill(container.querySelector('[aria-label="Bù công đến ngày"]'), '2026-10-01');
  expect(container.textContent).toContain('Quên chấm tháng trước');
  expect(container.textContent).toContain('Công đầu tháng');
  expect(container.textContent).not.toContain('Công cửa hàng B');
  await select('Cửa hàng', 'A');
  await select('Trạng thái bù công', 'pending');
  expect(container.textContent).toContain('Quên chấm tháng trước');
  expect(container.textContent).not.toContain('Công đầu tháng');
  await select('Trạng thái bù công', 'ALL');
  await select('Cửa hàng', 'B');
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Bỏ lọc ngày').click());
  expect(container.textContent).toContain('Công cửa hàng B');
});
it('keeps multi-store SM filters within assigned stores, including the all-stores option', async () => {
  useStore.setState({ user: { id: 'sm', jobTitle: 'Cửa hàng trưởng', role: 'employee', isManager: true, dept: 'A,B' } });
  useStore.setState({ stores: [...useStore.getState().stores, { id: 'C' }], feedbacks: [...useStore.getState().feedbacks,
    { id: 'outside', empId: 'other', dept: 'C', date: '02/10/2026', status: 'approved', issue: 'Ngoài phạm vi' }] });
  await mount(<FeedbackCB />);
  expect(container.querySelector('[aria-label="Cửa hàng"]').value).toBe('ALL');
  expect(container.textContent).toContain('Quên chấm tháng trước');
  expect(container.textContent).not.toContain('Ngoài phạm vi');
  await select('Cửa hàng', 'B');
  expect(container.textContent).toContain('Công cửa hàng B');
  expect(container.textContent).not.toContain('Quên chấm tháng trước');
});
it('shows scheduled hours and dates while editing, saves the exact date, and Escape cancels', async () => {
  await mount(<Timesheet />);
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Sửa công thực tế').click());
  const input = container.querySelector('[aria-label="Công thực tế 260000001 ngày T2 28/09"]');
  expect(input).not.toBeNull();
  expect(input.placeholder).toBe('8');
  expect(input.value).toBe('');
  expect(input.parentElement.textContent).toContain('Lịch: 8');
  await act(async () => input.focus());
  await fill(input, '7,84');
  await act(async () => input.blur());
  expect(useStore.getState().saveAttendanceCell).toHaveBeenCalledExactlyOnceWith('260000001', '2026-09-28', 7.84, 'admin', '');
  await act(async () => input.focus());
  await fill(input, '4');
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(useStore.getState().saveAttendanceCell).toHaveBeenCalledTimes(1);
});
it('preserves 0/OFF and counts only overrides in the visible month', async () => {
  useStore.setState({ attendance: {
    '260000001|2026-09-28': { actualHours: 0 },
    '260000001|2026-09-29': { actualHours: 0, note: 'OFF' },
    '260000001|2026-08-01': { actualHours: 8 },
  } });
  await mount(<Timesheet />);
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Sửa công thực tế').click());
  expect(container.textContent).toContain('Đang sửa công (2 ô)');
  expect(container.querySelector('[aria-label="Công thực tế 260000001 ngày T2 28/09"]').value).toBe('0');
  expect(container.querySelector('[aria-label="Công thực tế 260000001 ngày T3 29/09"]').value).toBe('OFF');
});
