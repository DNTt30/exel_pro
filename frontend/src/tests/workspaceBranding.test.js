import { beforeEach, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import { DEFAULT_BRANDING, brandingDraft, brandingSchema, mapBranding } from '../utils/workspaceBranding';
import { createWorkspaceSlice } from '../store/slices/workspaceSlice';
import * as api from '../services/api';
vi.mock('../services/api', () => ({ getWorkspaceBranding: vi.fn(), saveWorkspaceBranding: vi.fn() }));

const profile = { ...DEFAULT_BRANDING, revision: 1 };
const admin = { id: 'admin', role: 'admin' };
const store = (user = admin) => create((set, get) => ({ user, ...createWorkspaceSlice(set, get) }));
beforeEach(() => vi.resetAllMocks());

it.each([
  { primaryColor: 'url(https://tracker.test)' }, { logoDataUrl: 'https://tracker.test/logo.png' },
  { logoDataUrl: 'data:image/svg+xml,<svg onload=alert(1) />' }, { appName: '<script>test</script>' },
  { contactEmail: 'name@example.com\nBcc:other@example.com' }, { apiKey: 'secret' }, { appName: 'a' },
])('rejects unsafe/unsupported public identity %j', patch => {
  expect(brandingSchema.safeParse({ ...brandingDraft(profile), ...patch }).success).toBe(false);
});
it('accepts neutral defaults and trims text without changing operational rules', () => {
  expect(brandingSchema.parse({ ...brandingDraft(profile), appName: '  Cửa hàng A  ' }).appName).toBe('Cửa hàng A');
  expect(() => mapBranding(null)).toThrow();
});
it.each([null, { id:'nv',role:'employee' }, { id:'sm',role:'SM' }, { id:'ofc',role:'OFC' }, { id:'fake',role:'admin' }])('blocks settings write for %j before API call', async user => {
  const s=store(user);s.setState({ brandingStatus:'ready' });
  await expect(s.getState().updateWorkspaceBranding(brandingDraft(profile),1)).rejects.toThrow('Admin');
  expect(api.saveWorkspaceBranding).not.toHaveBeenCalled();
});
it('deduplicates concurrent reads and retains defaults when migration/network is unavailable', async () => {
  let reject;api.getWorkspaceBranding.mockReturnValue(new Promise((_,r)=>{reject=r;}));const s=store();
  const a=s.getState().loadWorkspaceBranding(), b=s.getState().loadWorkspaceBranding();
  expect(api.getWorkspaceBranding).toHaveBeenCalledTimes(1);reject(new Error('offline'));await Promise.all([a,b]);
  expect(s.getState().brandingStatus).toBe('error');expect(s.getState().workspaceBranding).toEqual(DEFAULT_BRANDING);
  await expect(s.getState().updateWorkspaceBranding(brandingDraft(profile),1)).rejects.toThrow('tải');
});
it('failed save preserves shared identity and releases save lock', async () => {
  const s=store();s.setState({ workspaceBranding:profile, brandingStatus:'ready' });
  api.saveWorkspaceBranding.mockRejectedValue(new Error('conflict'));
  await expect(s.getState().updateWorkspaceBranding({ ...brandingDraft(profile),appName:'Draft' },1)).rejects.toThrow('conflict');
  expect(s.getState().workspaceBranding).toEqual(profile);expect(s.getState().brandingSaving).toBe(false);
});
it('only applies committed data, prevents double save and ignores refresh while saving', async () => {
  const s=store();s.setState({ workspaceBranding:profile, brandingStatus:'ready' });
  let resolve;api.saveWorkspaceBranding.mockReturnValue(new Promise(r=>{resolve=r;}));
  const next={ ...profile,appName:'Đơn vị mới',revision:2 };
  const request=s.getState().updateWorkspaceBranding(brandingDraft(next),1);
  expect(s.getState().workspaceBranding.appName).toBe(profile.appName);
  await s.getState().loadWorkspaceBranding();expect(api.getWorkspaceBranding).not.toHaveBeenCalled();
  await expect(s.getState().updateWorkspaceBranding(brandingDraft(next),1)).rejects.toThrow('đang');
  resolve(next);await request;expect(s.getState().workspaceBranding).toEqual(next);
});
