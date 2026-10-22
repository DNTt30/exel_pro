import { expect, it, vi } from 'vitest';
import { routeDirectoryQuery, answerDirectoryQuery } from '../utils/copilotDirectory';
const context = { user: { id: 'admin', role: 'admin' }, stores: [{ id: 'VN0485' }, { id: 'VN0500' }], storeId: 'VN0500' };
const route = routeDirectoryQuery('vn0485 có bao nhiêu đức');
it.each(['vn0485 có bao nhiêu đức', 'VN0485 có bao nhiêu nhân viên tên Đức?', 'Có mấy người tên Duc ở VN0485?'])('routes %s to exact directory counting', q => {
  expect(routeDirectoryQuery(q)).toEqual({ storeId: 'VN0485', name: 'duc' });
});
it.each(['VN0485 tuần này có bao nhiêu giờ', 'VN0485 có mấy ca đêm', 'bao nhiêu ml', 'VN0485 có bao nhiêu câu hỏi'])('does not treat %s as a person count', q => expect(routeDirectoryQuery(q)).toBeNull());
it('reads the requested authorized store even when another store is selected, without fuzzy or middle-name matches', async () => {
  const read = vi.fn().mockResolvedValue([
    { id: '1', name: 'Nguyễn Văn Đức', dept: 'VN0485' },
    { id: '2', name: 'Trần Đức (PT)', dept: 'VN0485' },
    { id: '3', name: 'Nguyễn Đức Anh', dept: 'VN0485' },
    { id: '4', name: 'Lê Văn Đực', dept: 'VN0500' },
    { id: '5', name: 'Đức', dept: 'VN0485', isActive: false },
    { id: '1', name: 'Nguyễn Văn Đức', dept: 'VN0485' },
  ]);
  const result = await answerDirectoryQuery(route, context, read);
  expect(read).toHaveBeenCalledWith({ dept: 'VN0485' });
  expect(result).toContain('VN0485 có 2 nhân viên');
  expect(result).not.toContain('Đức Anh');
  expect(result).toContain('Trần Đức (PT)');
});
it('does not call the API for a store outside manager scope or for a staff-only assistant', async () => {
  const read = vi.fn();
  expect(await answerDirectoryQuery(route, { ...context, user: { id: 'sm', role: 'SM', dept: 'VN0500', isManager: true } }, read)).toContain('chưa có quyền');
  expect(await answerDirectoryQuery(route, { ...context, user: { id: 'emp', role: 'employee', dept: 'VN0485' } }, read)).toContain('dữ liệu cá nhân');
  expect(read).not.toHaveBeenCalled();
});
it('reports read failures separately from a successful zero count', async () => {
  expect(await answerDirectoryQuery(route, context, async () => { throw new Error('offline'); })).toContain('chưa thể kết luận');
  expect(await answerDirectoryQuery(route, context, async () => [])).toContain('có 0 nhân viên');
});
it('asks which store when none is specified for an admin viewing all stores', async () => {
  const read = vi.fn();
  expect(await answerDirectoryQuery(routeDirectoryQuery('Có bao nhiêu nhân viên tên Đức?'), { ...context, storeId: 'ALL' }, read)).toContain('cửa hàng nào');
  expect(read).not.toHaveBeenCalled();
});
