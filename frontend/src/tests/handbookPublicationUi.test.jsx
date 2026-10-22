// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../lib/supabase', () => ({ supabase: null, supabaseUrl: '', supabaseAnonKey: '' }));
const mock = vi.hoisted(() => ({ getAll: vi.fn(), getKnowledge: vi.fn(), getChanges: vi.fn(), review: vi.fn(), submit: vi.fn(), imageUrl: vi.fn() }));
vi.mock('../services/api/handbook', () => ({ handbookApi: mock }));
import KnowledgeLibrary from '../components/handbook/KnowledgeLibrary';
import RecipeQuickModal from '../components/modals/RecipeQuickModal';
import { useStore } from '../store/useStore';
import { sampleRecipeEntries } from '../sandbox/recipeFixture';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
const doc = { id: 'doc', title: 'Trà thử nghiệm', category: 'recipe', content: 'Size L: 250ml trà, thêm đá.', store_id: 'A', revision: 1, images: [], is_active: true, published_at: '2026-10-17' };
const proposal = { id: 'pending', entry_id: 'doc', status: 'pending', operation: 'upsert', payload: { ...doc, content: 'Size L: 220ml trà.' }, submitted_by: 'sm', submitted_at: '2026-10-17' };
let root, container;
beforeEach(() => {
  vi.clearAllMocks(); mock.getAll.mockResolvedValue([doc]); mock.getKnowledge.mockResolvedValue([doc]); mock.getChanges.mockResolvedValue([]);
  mock.submit.mockResolvedValue(proposal); mock.review.mockResolvedValue({ ...proposal, status: 'approved' });
  useStore.setState({ user: { id: 'sm', role: 'SM', dept: 'A' }, stores: [{ id: 'A', name: 'Cửa hàng A' }, { id: 'B', name: 'Cửa hàng B' }] });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); root = null; useStore.setState(initial, true); });
async function mount(manage = true) {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<KnowledgeLibrary manage={manage} />));
}
const findButton = name => [...container.querySelectorAll('button')].find(b => b.textContent === name);
async function click(name) { const b = typeof name === 'string' ? findButton(name) : name; expect(b).toBeTruthy(); await act(async () => b.click()); }
async function fill(selector, value) {
  const field = container.querySelector(selector);
  await act(async () => { const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); });
}
it('SM must review and confirm quantities; changing the text clears confirmation and never publishes directly', async () => {
  await mount(); await click('Sửa');
  await fill('textarea', 'Size L: 220ml trà.');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(container.querySelector('[role="dialog"]').textContent).toContain('220ml');
  expect(findButton('Gửi Admin duyệt').disabled).toBe(true);
  await click(container.querySelector('input[type="checkbox"]'));
  await click('Quay lại sửa');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(findButton('Gửi Admin duyệt').disabled).toBe(true);
  await click(container.querySelector('input[type="checkbox"]')); await click('Gửi Admin duyệt');
  expect(mock.submit).toHaveBeenCalledWith(expect.objectContaining({ content: 'Size L: 220ml trà.', store_id: 'A' }), doc, { confirmed: true });
  expect(mock.review).not.toHaveBeenCalled();
});
it('Admin sees old/new content and must separately confirm the pending snapshot', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } }); mock.getChanges.mockResolvedValue([proposal]);
  await mount(); await click('Chờ duyệt (1)'); await click('Xem và duyệt');
  const text = container.querySelector('[role="dialog"]').textContent;
  expect(text).toContain('220ml'); expect(text).toContain('250ml');
  expect(findButton('Xác nhận duyệt').disabled).toBe(true);
  await click(container.querySelector('input[type="checkbox"]')); await click('Xác nhận duyệt');
  expect(mock.review).toHaveBeenCalledWith('pending', true, { confirmed: true, note: '' });
});
it('staff sees only the published reader and no draft/editor actions', async () => {
  useStore.setState({ user: { id: 'staff', role: 'STFT', dept: 'A' } });
  await mount(false);
  expect(mock.getKnowledge).toHaveBeenCalledOnce(); expect(mock.getChanges).not.toHaveBeenCalled();
  expect(findButton('Thêm tài liệu')).toBeUndefined(); expect(findButton('Sửa')).toBeUndefined();
  expect(container.textContent).toContain('250ml');
  expect(container.textContent).not.toContain('Duyệt toàn bộ');
});

it.each(['admin', 'STFT'])('opens the ratio calculator for %s without publishing handbook edits', async role => {
  useStore.setState({ user: { id: role, role, dept: 'A' } });
  await mount(role === 'admin');
  await click('Tính nhanh tỷ lệ');
  const result = container.querySelector('[data-testid="recipe-result"]');
  expect(result.textContent).toContain('80 ml');
  expect(result.textContent).toContain('180 ml');
  expect(result.textContent).toContain('260 ml');
  expect(mock.submit).not.toHaveBeenCalled();
  expect(mock.review).not.toHaveBeenCalled();
});

it('bulk approval is hidden from managers', async () => {
  mock.getChanges.mockResolvedValue([proposal]);
  await mount(); await click('Chờ duyệt (1)');
  expect(container.textContent).not.toContain('Duyệt toàn bộ');
});
it('bulk approval respects filters, excludes removals and requires confirmation', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  mock.getChanges.mockResolvedValue([proposal,
    { ...proposal, id: 'other', payload: { ...doc, title: 'Khác' } },
    { ...proposal, id: 'remove', operation: 'archive' }]);
  await mount(); await click('Chờ duyệt (3)');
  expect(findButton('Duyệt toàn bộ (2)')).toBeTruthy();
  await fill('input[aria-label="Tìm tài liệu đã duyệt hoặc đề nghị"]', doc.title);
  await click('Duyệt toàn bộ (1)');
  expect(findButton('Xác nhận duyệt 1 tài liệu').disabled).toBe(true);
  expect(mock.review).not.toHaveBeenCalled();
  await click(container.querySelector('input[type="checkbox"]'));
  await click('Xác nhận duyệt 1 tài liệu');
  expect(mock.review).toHaveBeenCalledExactlyOnceWith('pending', true, { confirmed: true, note: '' });
  expect(container.querySelector('[role="dialog"]').textContent).toContain('Đã duyệt 1/1');
});
it('bulk approval reports partial failures and refreshes without retrying successes', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  mock.getChanges.mockResolvedValue([proposal, { ...proposal, id: 'conflict', payload: { ...doc, title: 'Bản bị đổi' } }]);
  mock.review.mockResolvedValueOnce({ status: 'approved' }).mockRejectedValueOnce(new Error('Tài liệu đã thay đổi'));
  await mount(); await click('Chờ duyệt (2)'); await click('Duyệt toàn bộ (2)');
  await click(container.querySelector('input[type="checkbox"]')); await click('Xác nhận duyệt 2 tài liệu');
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Đã duyệt 1/2');
  expect(dialog.textContent).toContain('Bản bị đổi: Tài liệu đã thay đổi');
  expect(mock.review).toHaveBeenCalledTimes(2);
  expect(mock.getChanges).toHaveBeenCalledTimes(2);
});
it('does not submit the next bulk item after switching accounts', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  mock.getChanges.mockResolvedValue([proposal, { ...proposal, id: 'next' }]);
  let finish;
  mock.review.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount(); await click('Chờ duyệt (2)'); await click('Duyệt toàn bộ (2)');
  await click(container.querySelector('input[type="checkbox"]')); await click('Xác nhận duyệt 2 tài liệu');
  expect(findButton('Đang duyệt…').disabled).toBe(true);
  await act(async () => useStore.setState({ user: { id: 'staff', role: 'STFT', dept: 'A' } }));
  await act(async () => finish({ status: 'approved' }));
  expect(mock.review).toHaveBeenCalledTimes(1);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});
it('requesting removal requires a reason and creates an archive proposal', async () => {
  await mount(); await click('Đề nghị gỡ'); await click(container.querySelector('input[type="checkbox"]'));
  expect(findButton('Gửi đề nghị gỡ').disabled).toBe(true);
  await fill('textarea', 'Công thức đã hết áp dụng'); await click('Gửi đề nghị gỡ');
  expect(mock.submit).toHaveBeenCalledWith(null, doc, { operation: 'archive', confirmed: true, reason: 'Công thức đã hết áp dụng' });
  expect(mock.review).not.toHaveBeenCalled();
});
it('keeps the proposal and entered data after an API failure', async () => {
  mock.submit.mockRejectedValue(new Error('Network failed'));
  await mount(); await click('Sửa');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await click(container.querySelector('input[type="checkbox"]')); await click('Gửi Admin duyệt');
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  expect(container.querySelector('[role="alert"]').textContent).toBe('Network failed');
});
it('quick recipes use the same published source and exclude operations, drafts and archived recipes', async () => {
  useStore.setState({ user: { id: 'staff', role: 'STFT', dept: 'A' } });
  mock.getKnowledge.mockResolvedValue([doc, { ...doc, id:'ops', title:'OPS_ONLY', category:'ops' },
    { ...doc, id:'archived', title:'ARCHIVED_RECIPE', is_active:false },
    { ...doc, id:'draft', title:'DRAFT_RECIPE', published_at:null }]);
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  await act(async()=>root.render(<RecipeQuickModal isOpen onClose={()=>{}} />));
  expect(container.textContent).toContain('250ml');
  expect(container.textContent).not.toMatch(/OPS_ONLY|ARCHIVED_RECIPE|DRAFT_RECIPE/);
  expect(findButton('Sửa')).toBeUndefined();
  expect(mock.getKnowledge).toHaveBeenCalledOnce();
});
it('reader has no bundled recipes when the database is empty or fails', async () => {
  useStore.setState({ user: { id:'staff',role:'STFT',dept:'A' } });
  mock.getKnowledge.mockResolvedValue([]); await mount(false);
  expect(container.textContent).toContain('Chưa có tài liệu đã công bố');
  expect(container.textContent).not.toContain('250ml');
  mock.getKnowledge.mockRejectedValue(new Error('Source unavailable')); await click('Tải lại');
  expect(container.querySelector('[role=alert]').textContent).toBe('Source unavailable');
  expect(container.querySelector('details')).toBeNull();
});

it('manager edits structured quantities through the same confirmed proposal, not direct publication', async () => {
  const milo={...sampleRecipeEntries[1],store_id:'A'};
  mock.getAll.mockResolvedValue([milo]);
  await mount(); await click('Sửa');
  expect(container.querySelector('[data-testid="recipe-base"]').value).toBe('600');
  await fill('[data-testid="recipe-base"]','1200');
  await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(container.querySelector('[role="dialog"]').textContent).toContain('1200 g');
  expect(mock.submit).not.toHaveBeenCalled();
  await click(container.querySelector('input[type="checkbox"]')); await click('Gửi Admin duyệt');
  expect(mock.submit).toHaveBeenCalledWith(expect.objectContaining({recipe_spec:expect.objectContaining({baseAmount:1200})}),milo,{confirmed:true});
  expect(mock.submit.mock.calls[0][0].content).not.toContain('600g');
  expect(mock.review).not.toHaveBeenCalled();
});

it('reloads approved recipes on calculator open and hides results when the fresh source fails', async()=>{
  useStore.setState({user:{id:'recipe-reader',role:'STFT',dept:'A'}});
  mock.getKnowledge.mockResolvedValue(sampleRecipeEntries);
  await mount(false);
  mock.getKnowledge.mockRejectedValue(new Error('Connection lost'));
  await click('Tính nhanh tỷ lệ');
  expect(container.querySelector('[data-testid="recipe-result"]')).toBeNull();
  expect(container.querySelector('[data-testid="recipe-calculator"]').textContent).toContain('Không tải được công thức mẫu');
});
