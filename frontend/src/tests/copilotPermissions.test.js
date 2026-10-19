import { expect, it, vi } from 'vitest';
import { scopeCopilotContext, copilotScopeKey } from '../utils/copilotScope';
import { buildCopilotRequest } from '../utils/copilotContext';
import { authorizeCopilotScope, copilotRole } from '../../../supabase/functions/chat-proxy/access.js';
import { createChatProxyHandler } from '../../../supabase/functions/chat-proxy/handler.js';

const employees = [{ id: 'a', name: 'Allowed A', dept: 'A' }, { id: 'b', name: 'Allowed B', dept: 'B' }, { id: 'c', name: 'Private C', dept: 'C' }];
const context = user => ({ user, storeId: 'ALL', stores: ['A', 'B', 'C'].map(id => ({ id })), employees,
  weekSchedule: { a: { T2: '6-14' }, b: { T2: '22-6' }, c: { T2: '14-22' } },
  feedbacks: employees.map(e => ({ empId: e.id, dept: e.dept, reason: e.name, status: 'pending' })),
  shiftSwaps: [{ fromEmpId: 'b', toEmpId: 'c', store: 'C', status: 'pending' }],
});

it.each([
  [{ id: 'a', role: 'STPT', dept: 'A' }, ['a']],
  [{ id: 'a', role: 'STFT', dept: 'A' }, ['a']],
  [{ id: 'sm', role: 'SM', dept: 'A,B' }, ['a', 'b']],
  [{ id: 'ofc', role: 'OFC', dept: 'A' }, ['a', 'b', 'c']],
  [{ id: 'admin', role: 'admin' }, ['a', 'b', 'c']],
  [{ id: 'unassigned', role: 'SM', dept: '' }, []],
  [null, []],
])('scopes data for role $role', (user, expected) => {
  const scoped = scopeCopilotContext(context(user));
  expect(scoped.employees.map(e => e.id)).toEqual(expected);
  expect(Object.keys(scoped.weekSchedule)).toEqual(expected);
  expect(scoped.feedbacks.map(f => f.empId)).toEqual(expected);
});

it('never widens SM scope with a selected store, and applies selection even for OFC', () => {
  for (const user of [{ id: 'sm', role: 'SM', dept: 'A,B' }, { id: 'ofc', role: 'OFC' }]) {
    expect(scopeCopilotContext({ ...context(user), storeId: 'B' }).employees.map(e => e.id)).toEqual(['b']);
  }
  const denied = buildCopilotRequest('Xem lịch tuần', { ...context({ id: 'sm', role: 'SM', dept: 'A' }), storeId: 'C' });
  expect(denied.systemPrompt).not.toContain('Private C');
  expect(denied.options.copilotScope.employeeIds).toEqual([]);
});

it('staff prompt excludes coworkers, other requests and profile secrets', () => {
  const request = buildCopilotRequest('Xem lịch tuần và bù công', context({ id: 'a', role: 'STPT', dept: 'A' }));
  expect(request.systemPrompt).toContain('Allowed A');
  expect(request.systemPrompt).not.toMatch(/Allowed B|Private C/);
  expect(request.options.copilotScope.employeeIds).toEqual(['a']);
  expect(request.systemPrompt).toContain('"pendingFeedbacks":1');
  expect(request.systemPrompt).toContain('"pendingSwaps":0');
});

it('changes history identity when roles or assigned departments change', () => {
  expect(copilotScopeKey({ id: 'a', role: 'SM', dept: 'A' })).not.toBe(copilotScopeKey({ id: 'a', role: 'STPT', dept: 'A' }));
  expect(copilotScopeKey({ id: 'a', role: 'SM', dept: 'A' })).not.toBe(copilotScopeKey({ id: 'a', role: 'SM', dept: 'B' }));
});

it('server derives roles from database fields, not browser flags', () => {
  expect(copilotRole({ role: 'employee', isManager: true, isAdmin: true })).toBe('staff');
  expect(copilotRole({ role: 'employee', job_title: 'Cửa hàng trưởng' })).toBe('sm');
  expect(copilotRole({ type: 'OFC' })).toBe('am');
  expect(copilotRole({}, true)).toBe('admin');
});

it('server enforces personal, manager and instruction scopes independently of frontend', async () => {
  const load = vi.fn(async () => employees);
  const staff = { employeeId: 'a', role: 'staff', memberStoreIds: ['A'], managedStoreIds: [] };
  const sm = { employeeId: 'sm', role: 'sm', memberStoreIds: ['A', 'B'], managedStoreIds: ['A', 'B'] };
  const scope = (storeIds, employeeIds) => ({ kind: 'app', storeIds, employeeIds });
  expect(await authorizeCopilotScope(staff, scope(['A'], ['a']), load)).toBe(true);
  expect(await authorizeCopilotScope(staff, scope(['A'], ['b']), load)).toBe(false);
  expect(await authorizeCopilotScope(staff, scope(['B'], ['a']), load)).toBe(false);
  expect(await authorizeCopilotScope(sm, scope(['A', 'B'], ['a', 'b']), load)).toBe(true);
  expect(await authorizeCopilotScope(sm, scope(['C'], ['c']), load)).toBe(false);
  expect(await authorizeCopilotScope(sm, scope(['A'], ['b']), load)).toBe(false);
  expect(await authorizeCopilotScope(sm, scope(['A'], ['missing']), load)).toBe(false);
  expect(await authorizeCopilotScope(staff, { kind: 'instruction', storeIds: [], employeeIds: [] }, load)).toBe(false);
  expect(await authorizeCopilotScope(sm, { kind: 'instruction', storeIds: [], employeeIds: [] }, load)).toBe(true);
  load.mockClear();
  expect(await authorizeCopilotScope(staff, { kind: 'handbook', storeIds: [], employeeIds: [] }, load)).toBe(true);
  expect(await authorizeCopilotScope(staff, { kind: 'handbook', storeIds: [], employeeIds: ['b'] }, load)).toBe(false);
  expect(load).not.toHaveBeenCalled();
});

it('proxy rejects missing or forged scope before Google and ignores claimed admin role', async () => {
  const fetchImpl = vi.fn(async () => new Response('{}'));
  const identity = { employeeId: 'a', role: 'staff', isAdmin: false, memberStoreIds: ['A'] };
  const handler = createChatProxyHandler({ authorize: async () => identity, getApiKey: async () => 'x'.repeat(39),
    consumeRequest: async () => ({ allowed: true }),
    validateScope: (user, scope) => authorizeCopilotScope(user, scope, async () => employees), fetchImpl });
  const request = scope => new Request('https://test/chat-proxy', { method: 'POST', headers: { Authorization: 'Bearer verified' },
    body: JSON.stringify({ role: 'admin', isAdmin: true, copilotScope: scope, contents: [{ role: 'user', parts: [{ text: 'Xem lịch' }] }] }) });
  expect((await handler(request(undefined))).status).toBe(400);
  expect((await handler(request({ kind: 'app', storeIds: ['A'], employeeIds: ['b'] }))).status).toBe(403);
  expect(fetchImpl).not.toHaveBeenCalled();
  expect((await handler(request({ kind: 'handbook', storeIds: [], employeeIds: [] }))).status).toBe(200);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body).systemInstruction.parts[0].text).toContain('staff');
});
