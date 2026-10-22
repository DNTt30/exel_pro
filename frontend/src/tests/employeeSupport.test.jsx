// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import HelpRequestForm from '../components/employee/HelpRequestForm';
import EmployeeStartGuide from '../components/employee/EmployeeStartGuide';
import AnswerFeedback from '../components/ai/AnswerFeedback';
import MonthConfirmWidget from '../components/dashboard/MonthConfirmWidget';
import MonthConfirmCard from '../components/employee/MonthConfirmCard';
import RegistrationReadiness from '../components/dashboard/RegistrationReadiness';
import { useStore } from '../store/useStore';
import { monthConfirmationState, supportTopicSummary } from '../utils/employeeSupport';
import { readAllPages } from '../services/api/employeeSupport';
import { shiftCompanions, closestAssignedShift } from '../utils/employeeHome';
import * as api from '../services/api';
vi.mock('../services/api', async original => ({ ...await original(), createEmployeeHelp: vi.fn(), saveMyOnboarding: vi.fn(), saveEmployeeAnswerFeedback: vi.fn(), getMonthConfirmations: vi.fn(), getEmployeeStartRoster: vi.fn(), getEmployeeRegistrationWeek: vi.fn(), addFeedback: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
const initialStore = useStore.getState();
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); vi.clearAllMocks(); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); useStore.setState(initialStore, true); vi.useRealTimers(); });
async function render(node) { await act(async () => root.render(<MemoryRouter>{node}</MemoryRouter>)); }
async function click(label) { const button = [...container.querySelectorAll('button')].find(b => b.textContent.includes(label)); expect(button).toBeTruthy(); await act(async () => button.click()); }
async function submit() { await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
const user = { id: '100000002', name: 'An', dept: 'A' };

it('does not share chat until explicit submit; retries use the same request key', async () => {
  api.createEmployeeHelp.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ id: 'r1' });
  await render(<HelpRequestForm user={user} initialQuestion="Tôi chưa rõ cách xem lịch" initialContext="Chỉ trích đoạn đã chọn" />);
  expect(api.createEmployeeHelp).not.toHaveBeenCalled();
  await submit(); expect(container.querySelector('[role=alert]').textContent).toContain('Chưa gửi');
  expect(container.querySelector('textarea').value).toBe('Tôi chưa rõ cách xem lịch');
  await submit();
  expect(api.createEmployeeHelp.mock.calls[0][0]).toEqual(api.createEmployeeHelp.mock.calls[1][0]);
  expect(container.textContent).toContain('Đã gửi yêu cầu');
});
it('does not mark onboarding understood when saving fails', async () => {
  api.saveMyOnboarding.mockRejectedValue(new Error('denied'));
  const changed = vi.fn();
  await render(<EmployeeStartGuide record={{ id: user.id, steps: {} }} onChange={changed} />);
  await act(async () => container.querySelector('input[type=checkbox]').click());
  expect(changed).not.toHaveBeenCalled();
  expect(container.querySelector('input[type=checkbox]').checked).toBe(false);
  expect(container.textContent).toContain('Chưa lưu được');
});
it('unclear feedback suggests a clarification without sending a ticket', async () => {
  api.saveEmployeeAnswerFeedback.mockResolvedValue(); const clarify = vi.fn();
  await render(<AnswerFeedback user={user} messageKey="m1" question="Cách xem lịch?" answer="Mở trang Lịch" onClarify={clarify} />);
  await click('Chưa rõ');
  expect(api.saveEmployeeAnswerFeedback).toHaveBeenCalledWith('m1', 'A', 'unclear');
  expect(clarify).toHaveBeenCalledWith(expect.stringContaining('Cách xem lịch?'));
  expect(api.createEmployeeHelp).not.toHaveBeenCalled();
  await click('Cần người hỗ trợ'); expect(container.querySelector('form')).toBeTruthy();
  expect(api.createEmployeeHelp).not.toHaveBeenCalled();
});
it('reads all pages and rejects an incomplete total on a later-page error', async () => {
  const range = vi.fn().mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, id) => ({ id })) }).mockResolvedValueOnce({ data: [{ id: 500 }] });
  expect((await readAllPages(() => ({ range }))).length).toBe(501);
  expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
  range.mockReset().mockResolvedValueOnce({ data: Array(500).fill({}) }).mockResolvedValueOnce({ error: new Error('timeout') });
  await expect(readAllPages(() => ({ range }))).rejects.toThrow('timeout');
});
it('counts distinct people separately from questions and pending work', () => {
  const rows = [{ emp_id: '1', topic: 'handbook', status: 'resolved' }, { emp_id: '1', topic: 'handbook', status: 'answered' }, { emp_id: '2', topic: 'handbook', status: 'new' }];
  expect(supportTopicSummary(rows).find(r => r.id === 'handbook')).toMatchObject({ people: 2, requests: 3, pending: 2 });
});
it('uses the latest confirmation, excludes inactive employees, and never counts a dispute as confirmed', () => {
  expect(monthConfirmationState([{ emp_id: '1', status: 'pending' }, { emp_id: '1', status: 'confirmed' }, { emp_id: '2', status: 'confirmed' }], [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4', isActive: false }]).map(row => row.confirmation)).toEqual(['disputed', 'confirmed', 'missing']);
});
it('confirmation load failure never renders a misleading zero and retry reads selected cycle', async () => {
  api.getMonthConfirmations.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([{ emp_id: '1', status: 'confirmed' }]);
  await render(<MonthConfirmWidget employees={[{ id: '1', name: 'An' }]} cycleKey="2026-09" />);
  expect(container.textContent).not.toContain('0/1');
  await click('Thử lại');
  expect(api.getMonthConfirmations).toHaveBeenLastCalledWith('2026-09');
  expect(container.textContent).toContain('1/1 người đã xác nhận');
});
it('shift detail respects receiving store, split/overnight ranges and pending registration', () => {
  const employees = [{ id: 'me', dept: 'A' }, { id: 'same', name: 'Cùng ca', dept: 'A' }, { id: 'borrow', name: 'Hỗ trợ', dept: 'B' }, { id: 'away', dept: 'A' }, { id: 'pending', dept: 'A' }, { id: 'next', name: 'Ca sau', dept: 'A' }];
  const schedule = { '2026-10-19': { me: { CN: '22-6' }, same: { CN: '20-23' }, borrow: { CN: '22-6_A' }, away: { CN: '22-6_B' }, pending: { CN: { shift: '22-6', registered: true } } }, '2026-10-26': { next: { T2: '6-10/14-18' } } };
  const shift = closestAssignedShift(schedule['2026-10-19'].me, '2026-10-19', new Date('2026-10-25T20:00:00'));
  const result = shiftCompanions({ schedule, employees, employeeId: 'me', store: 'A', shift });
  expect(result.overlapping.map(r => r.id).sort()).toEqual(['borrow', 'same']);
  expect(result.next.map(r => r.code)).toEqual(['6-10']);
});
it('confirmation totals use a fresh authorized roster and the selected store', async () => {
  api.getEmployeeStartRoster.mockResolvedValue([{ id: '1', dept: 'A' }, { id: '2', dept: 'B' }, { id: '3', dept: 'A,B' }]);
  api.getMonthConfirmations.mockResolvedValue([{ emp_id: '1', status: 'confirmed' }]);
  await render(<MonthConfirmWidget storeId="A" cycleKey="2026-10" />);
  expect(container.textContent).toContain('1/2 người đã xác nhận');
});
it('registration readiness distinguishes OFF, assigned work, pending work and completely blank weeks', async () => {
  api.getEmployeeRegistrationWeek.mockResolvedValue({ a: { T2: 'off' }, b: { T2: '6-14' }, c: { T2: { shift: '6-14', registered: true } } });
  await render(<RegistrationReadiness employees={['a', 'b', 'c', 'd'].map(id => ({ id, name: id, dept: 'A' }))} identity="admin" />);
  expect(container.textContent).toContain('1 người chưa có đăng ký');
  expect(container.textContent).toContain('1 người còn đăng ký chờ xếp');
});
it('zero actual hours stay zero and a resolved payroll dispute can be reviewed and confirmed', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 25, 12));
  useStore.setState({ user, schedule: { '2026-10-19': { [user.id]: { T2: '6-14', T3: { shift: '6-14', registered: true } } } }, attendance: { [`${user.id}|2026-10-19`]: { actualHours: 0 } }, loadAttendanceRange: vi.fn().mockResolvedValue(), ensureWeeksLoaded: vi.fn().mockResolvedValue() });
  api.getMonthConfirmations.mockResolvedValue([{ status: 'approved' }]); api.addFeedback.mockResolvedValue({});
  await render(<MonthConfirmCard />);
  await click('Bạn đã gửi phản hồi');
  expect(container.textContent).toContain('Tổng giờ tham khảo: 0h');
  await click('Tôi xác nhận đúng & đủ công');
  expect(api.addFeedback).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed', hours: 0 }));
});
it('refreshes the payroll cycle when the page remains mounted across day 25', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 24, 23));
  useStore.setState({ user, schedule: {}, attendance: {}, loadAttendanceRange: vi.fn().mockResolvedValue(), ensureWeeksLoaded: vi.fn().mockResolvedValue() });
  api.getMonthConfirmations.mockResolvedValue([]);
  await render(<MonthConfirmCard />); expect(api.getMonthConfirmations).not.toHaveBeenCalled();
  vi.setSystemTime(new Date(2026, 9, 25, 0, 1));
  await render(<MonthConfirmCard />);
  expect(api.getMonthConfirmations).toHaveBeenLastCalledWith('2026-10', user.id);
});
