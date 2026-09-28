// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../pages/Login';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import * as api from '../services/api';
vi.mock('../services/api', () => ({ requestPasswordResetOtp: vi.fn(), resetPasswordWithOtp: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
beforeEach(() => { vi.resetAllMocks(); api.requestPasswordResetOtp.mockResolvedValue({ ok: true, channel: 'email' }); api.resetPasswordWithOtp.mockResolvedValue({ ok: true }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); root = null; });
async function mount(element) { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); await act(async () => root.render(<MemoryRouter>{element}</MemoryRouter>)); }
async function fill(input, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function click(text) { await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent.includes(text)).click()); }
async function submit() { await act(async () => [...container.querySelectorAll('form')].at(-1).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
async function advance() { await submit(); await fill([...container.querySelectorAll('input')].find(e => e.autocomplete === 'one-time-code'), '012345'); await submit(); }

describe('forgot-password recovery', () => {
  it('completes all three steps and returns account/focus to the login password field', async () => {
    await mount(<Login />);
    await click('Quên mật khẩu');
    await fill([...container.querySelectorAll('input')].at(-1), '260512001');
    await advance();
    const inputs = [...container.querySelectorAll('input[autocomplete="new-password"]')];
    await fill(inputs[0], 'MatKhau9'); await fill(inputs[1], 'MatKhau9'); await submit();
    expect(api.requestPasswordResetOtp).toHaveBeenCalledWith('260512001');
    expect(api.resetPasswordWithOtp).toHaveBeenCalledWith('260512001', '012345', 'MatKhau9');
    await act(async () => new Promise(resolve => requestAnimationFrame(resolve)));
    expect(container.textContent).not.toContain('Các bước khôi phục');
    expect(container.querySelector('input[autocomplete="username"]')?.value || container.querySelector('input[type="text"]').value).toBe('260512001');
    const loginPassword = container.querySelector('input[type="password"]');
    expect(loginPassword.value).toBe('');
    expect(document.activeElement).toBe(loginPassword);
    expect(container.textContent).toContain('Đã đổi mật khẩu');
  });
  it('displays request errors without advancing', async () => {
    api.requestPasswordResetOtp.mockRejectedValue(new Error('Chưa có email khôi phục'));
    await mount(<ForgotPasswordModal isOpen onClose={() => {}} initialEmpId="260512001" />);
    await submit();
    expect(container.querySelector('[role="alert"]').textContent).toContain('Chưa có email');
    expect(container.querySelector('[aria-current="step"]').textContent).toContain('Tài khoản');
  });
  it('validates passwords locally and returns to OTP entry on server rejection', async () => {
    await mount(<ForgotPasswordModal isOpen onClose={() => {}} initialEmpId="260512001" />);
    await advance();
    let inputs = container.querySelectorAll('input');
    await fill(inputs[0], '12345678'); await fill(inputs[1], '12345678'); await submit();
    expect(api.resetPasswordWithOtp).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toContain('quá đơn giản');
    await fill(inputs[0], 'MatKhau9'); await fill(inputs[1], 'MatKhau9');
    api.resetPasswordWithOtp.mockRejectedValue(Object.assign(new Error('Mã OTP hết hạn'), { code: 'OTP_EXPIRED' }));
    await submit();
    expect(container.querySelector('[aria-current="step"]').textContent).toContain('Mã OTP');
    expect(container.querySelector('[role="alert"]').textContent).toContain('hết hạn');
  });
  it('ignores a late response after closing the modal', async () => {
    let finish;
    api.requestPasswordResetOtp.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const onSuccess = vi.fn();
    await mount(<ForgotPasswordModal isOpen onClose={() => {}} onSuccess={onSuccess} initialEmpId="260512001" />);
    await submit();
    await act(async () => root.render(<MemoryRouter><ForgotPasswordModal isOpen={false} /></MemoryRouter>));
    await act(async () => finish({ ok: true, channel: 'email' }));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });
});
