// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import { PrivateRoute } from '../App';
import { signedInPath } from '../utils/authNavigation';
import EmployeeChangePassword from '../pages/employee/EmployeeChangePassword';
import SecurityChangePassword from '../pages/admin/SecurityChangePassword';
import ChangePasswordModal from '../components/modals/ChangePasswordModal';
import Login from '../pages/Login';
import * as api from '../services/api';

vi.mock('../services/api', () => ({ changeMyPassword: vi.fn(), adminResetPassword: vi.fn() }));
vi.mock('../lib/adminCredential', () => ({ setAdminPassword: vi.fn().mockResolvedValue(true) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
let root, container;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = null;
  useStore.setState(initial, true); localStorage.clear(); vi.clearAllMocks();
});
async function mount(element) {
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(element));
}
function Location() { return <div>{useLocation().pathname}</div>; }
async function fill(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('forced password routes', () => {
  it.each([
    [{ id: '260512001', role: 'employee', mustChangePassword: true }, '/employee/change-password'],
    [{ id: '260512001', role: 'employee', isManager: true, mustChangePassword: true }, '/employee/change-password'],
    [{ id: 'admin', role: 'admin', mustSetupPassword: true }, '/admin/security/change-password'],
  ])('redirects from the actual login form for %j', async (user, expected) => {
    const login = vi.fn().mockResolvedValue(user);
    useStore.setState({ user: null, login });
    await mount(<MemoryRouter initialEntries={['/login']}><Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Location />} />
    </Routes></MemoryRouter>);
    await fill(container.querySelector('input[type="text"]'), user.id);
    await fill(container.querySelector('input[type="password"]'), '1');
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(login).toHaveBeenCalledWith(user.id, '1', { rememberMe: true });
    expect(container.textContent).toBe(expected);
  });
  it.each([
    [{ id: '260512001', role: 'employee', mustChangePassword: true }, '/employee/home', '/employee/change-password'],
    [{ id: '260512001', role: 'employee', isManager: true, mustChangePassword: true }, '/admin/dashboard', '/employee/change-password'],
    [{ id: 'admin', role: 'admin', mustSetupPassword: true }, '/employee/home', '/admin/security/change-password'],
    [{ id: 'admin', role: 'admin', mustChangePassword: true }, '/admin/dashboard', '/admin/security/change-password'],
  ])('prevents direct navigation for %j', async (user, entry, expected) => {
    expect(signedInPath(user)).toBe(expected);
    useStore.setState({ user });
    const protectedRender = vi.fn();
    function Protected() { protectedRender(); return <div>private content</div>; }
    await mount(<MemoryRouter initialEntries={[entry]}><Routes>
      <Route path={entry} element={<PrivateRoute><Protected /></PrivateRoute>} />
      <Route path={expected} element={<PrivateRoute><Location /></PrivateRoute>} />
    </Routes></MemoryRouter>);
    expect(container.textContent).toContain(expected);
    expect(protectedRender).not.toHaveBeenCalled();
  });
  it('blocks a persisted expired user before rendering any private page', async () => {
    useStore.setState({ user: { id: '260512001', role: 'employee', isPasswordExpired: true, mustChangePassword: true } });
    await mount(<MemoryRouter initialEntries={['/employee/change-password']}><Routes>
      <Route path="/employee/change-password" element={<PrivateRoute><div>private</div></PrivateRoute>} />
      <Route path="/login" element={<Location />} />
    </Routes></MemoryRouter>);
    expect(container.textContent).toBe('/login');
  });
});

describe('password forms use the real store action', () => {
  it.each([false, true])('saves an employee password and returns to the correct home (manager=%s)', async isManager => {
    useStore.setState({ user: { id: '260512001', role: 'employee', isManager, mustChangePassword: true } });
    api.changeMyPassword.mockResolvedValue(true);
    await mount(<MemoryRouter initialEntries={['/employee/change-password']}><Routes>
      <Route path="/employee/change-password" element={<EmployeeChangePassword />} />
      <Route path="*" element={<Location />} />
    </Routes></MemoryRouter>);
    const inputs = container.querySelectorAll('input');
    await fill(inputs[0], '1'); await fill(inputs[1], 'MatKhau9'); await fill(inputs[2], 'MatKhau9');
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(api.changeMyPassword).toHaveBeenCalledWith('1', 'MatKhau9', { userId: '260512001', isFirstTime: false });
    expect(useStore.getState().user.mustChangePassword).toBe(false);
    expect(container.textContent).toBe(isManager ? '/admin/dashboard' : '/employee/home');
  });
  it('clears both admin flags after changing the password', async () => {
    useStore.setState({ user: { id: 'admin', role: 'admin', mustSetupPassword: true, mustChangePassword: true } });
    api.changeMyPassword.mockResolvedValue(true);
    await mount(<MemoryRouter initialEntries={['/admin/security/change-password']}><Routes>
      <Route path="/admin/security/change-password" element={<SecurityChangePassword />} />
      <Route path="*" element={<Location />} />
    </Routes></MemoryRouter>);
    const inputs = container.querySelectorAll('input');
    await fill(inputs[0], '1'); await fill(inputs[1], 'MatKhau9'); await fill(inputs[2], 'MatKhau9');
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(useStore.getState().user).toMatchObject({ mustChangePassword: false, mustSetupPassword: false });
    expect(container.textContent).toBe('/admin/dashboard');
  });
  it.each(['12345678', 'abcdefgh', '00000000'])('rejects weak admin reset password %s before calling the API', async password => {
    useStore.setState({ user: { id: 'admin', role: 'admin' } });
    await mount(<MemoryRouter><ChangePasswordModal isOpen onClose={() => {}} targetEmp={{ id: '260512001', name: 'NV' }} /></MemoryRouter>);
    const inputs = document.querySelectorAll('input[type="password"]');
    await fill(inputs[0], password); await fill(inputs[1], password);
    const button = [...document.querySelectorAll('button')].find(b => b.textContent === 'Đặt lại mật khẩu');
    await act(async () => button.click());
    expect(api.adminResetPassword).not.toHaveBeenCalled();
  });
});
