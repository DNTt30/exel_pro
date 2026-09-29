// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import EmployeeProfile from '../pages/employee/EmployeeProfile';
import Employees from '../pages/admin/Employees';
import * as api from '../services/api';
vi.mock('../services/api', () => ({ getEmployeeProfiles: vi.fn(), saveMyEmployeeProfile: vi.fn(), changeMyRecoveryEmail: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
const profile = { id: '260716009', name: 'Nhân viên thử', dept: 'VN0485', role: 'STPT', type: 'STPT',
  recoveryEmail: 'old@example.com', dob: '', university: '', major: '', workPlanUntil: '' };
let root, container;
beforeEach(() => {
  api.getEmployeeProfiles.mockResolvedValue([{ ...profile }]);
  api.saveMyEmployeeProfile.mockResolvedValue();
  api.changeMyRecoveryEmail.mockImplementation(async email => email);
  useStore.setState({ user: { id: profile.id, role: 'employee' }, employees: [{ ...profile }], stores: [{ id: 'VN0485', name: 'CH thử' }] });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); root = null; useStore.setState(initial, true); vi.resetAllMocks(); });
async function mount(element = <EmployeeProfile />) {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<MemoryRouter>{element}</MemoryRouter>));
}
async function fill(input, value) { await act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}); }
async function submit(form) { await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
const button = text => [...container.querySelectorAll('button')].find(b => b.textContent === text);
it('renders immutable identity and saves optional personal fields separately', async () => {
  await mount();
  expect(container.textContent).toContain('Nhân viên thử');
  expect([...container.querySelectorAll('input')].some(i => i.value === profile.name || i.value === profile.id)).toBe(false);
  expect(container.querySelector('a').getAttribute('href')).toBe('/employee/change-password');
  await submit(container.querySelectorAll('form')[1]);
  expect(api.saveMyEmployeeProfile).toHaveBeenCalledWith(expect.objectContaining({ dob: '', university: '', major: '', workPlanUntil: '' }), profile.id);
  expect(api.changeMyRecoveryEmail).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Đã lưu thông tin cá nhân');
});
it('requires confirmation, keeps email on failure, clears password and updates only after success', async () => {
  await mount();
  await fill(container.querySelector('input[type=email]'), 'new@example.com');
  await submit(container.querySelector('form'));
  expect(api.changeMyRecoveryEmail).not.toHaveBeenCalled();
  const confirmation = () => container.querySelector('form[aria-label="Xác nhận đổi email"]');
  api.changeMyRecoveryEmail.mockRejectedValueOnce(new Error('Mật khẩu hiện tại không đúng.'));
  await fill(container.querySelector('input[type=password]'), 'Wrong9'); await submit(confirmation());
  expect(container.textContent).toContain('Mật khẩu hiện tại không đúng');
  expect(container.querySelector('input[type=password]').value).toBe('');
  expect(useStore.getState().employees[0].recoveryEmail).toBe('old@example.com');
  await fill(container.querySelector('input[type=password]'), 'Correct9'); await submit(confirmation());
  expect(api.changeMyRecoveryEmail).toHaveBeenLastCalledWith('new@example.com', 'Correct9', profile.id);
  expect(confirmation()).toBeNull();
  expect(useStore.getState().employees[0].recoveryEmail).toBe('new@example.com');
});
it('cancels confirmation without changing email', async () => {
  await mount(); await fill(container.querySelector('input[type=email]'), 'new@example.com'); await submit(container.querySelector('form'));
  await fill(container.querySelector('input[type=password]'), 'NeverSend9');
  await act(async () => button('Hủy').click());
  expect(container.querySelector('input[type=password]')).toBeNull();
  expect(api.changeMyRecoveryEmail).not.toHaveBeenCalled();
});
it('does not show success after failed personal save', async () => {
  api.saveMyEmployeeProfile.mockRejectedValueOnce(new Error('Không lưu được'));
  await mount(); await submit(container.querySelectorAll('form')[1]);
  expect(container.querySelector('[role=alert]').textContent).toContain('Không lưu được');
  expect(container.textContent).not.toContain('Đã lưu thông tin');
});
it('shows manager reminder and personal details from scoped API', async () => {
  const now = new Date();
  api.getEmployeeProfiles.mockResolvedValue([{ ...profile, dob: '2004-02-29', university: 'Trường thử', major: 'CNTT', workPlanUntil: `${now.getMonth() + 1}/${now.getFullYear()}` }]);
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  await mount(<Employees />);
  expect(container.textContent).toContain('Dự định nghỉ tháng này');
  await act(async () => container.querySelector('[title="Xem hồ sơ Nhân viên thử"]').click());
  expect(container.textContent).toContain('29/02/2004');
  expect(container.textContent).toContain('Trường thử');
  expect(container.textContent).toContain('CNTT');
});
it('edits Night Ready without removing other skill tags', async () => {
  const updateEmployee = vi.fn().mockResolvedValue();
  useStore.setState({ user: { id: 'admin', role: 'admin' }, employees: [{ ...profile, skills: ['CASHIER', 'NIGHT_READY'] }], updateEmployee });
  await mount(<Employees />);
  expect(container.textContent).toContain('☾ Night Ready');
  await act(async () => container.querySelector('[title="Sửa thông tin"]').click());
  const checkbox = container.querySelector('input[type=checkbox]');
  expect(checkbox.checked).toBe(true);
  await act(async () => checkbox.click());
  await act(async () => container.querySelector('[title="Lưu"]').click());
  expect(updateEmployee).toHaveBeenCalledWith(profile.id, expect.objectContaining({ skills: ['CASHIER'] }));
});
it('discards a late response when the account changes', async () => {
  let finish;
  api.getEmployeeProfiles.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await mount();
  api.getEmployeeProfiles.mockResolvedValueOnce([{ ...profile, id: '260716010', name: 'Người mới' }]);
  await act(async () => useStore.setState({ user: { id: '260716010', role: 'employee' } }));
  await act(async () => finish([{ ...profile }]));
  expect(container.textContent).toContain('Người mới');
  expect(container.textContent).not.toContain('Nhân viên thử');
});
