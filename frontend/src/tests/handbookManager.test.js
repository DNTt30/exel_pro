import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  return { from };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from
  }
}));

import { handbookApi } from '../services/api/handbook';
import { CATEGORY_OPTIONS, CATEGORY_MAP } from '../pages/admin/HandbookManager';

describe('handbookApi service contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches active entries ordered by category and created_at', async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: [{ id: '1', title: 'Quy trình lẩu', category: 'recipe' }],
      error: null
    });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mocks.from.mockReturnValue({ select: mockSelect });

    const result = await handbookApi.getAll();

    expect(mocks.from).toHaveBeenCalledWith('handbook_entries');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('is_active', true);
    expect(mockOrder1).toHaveBeenCalledWith('category');
    expect(mockOrder2).toHaveBeenCalledWith('created_at');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Quy trình lẩu');
  });

  it('create inserts an entry with is_active: true', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'uuid-1', title: 'Quy trình hủy hàng', category: 'quality', is_active: true },
      error: null
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mocks.from.mockReturnValue({ insert: mockInsert });

    const newEntry = { title: 'Quy trình hủy hàng', category: 'quality', content: 'Chi tiết...' };
    const created = await handbookApi.create(newEntry);

    expect(mocks.from).toHaveBeenCalledWith('handbook_entries');
    expect(mockInsert).toHaveBeenCalledWith([{ ...newEntry, is_active: true }]);
    expect(created.id).toBe('uuid-1');
  });

  it('update modifies an entry by id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'uuid-1', title: 'Tiêu đề mới' },
      error: null
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mocks.from.mockReturnValue({ update: mockUpdate });

    const updated = await handbookApi.update('uuid-1', { title: 'Tiêu đề mới' });

    expect(mocks.from).toHaveBeenCalledWith('handbook_entries');
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Tiêu đề mới' });
    expect(mockEq).toHaveBeenCalledWith('id', 'uuid-1');
    expect(updated.title).toBe('Tiêu đề mới');
  });

  it('remove soft-deletes entry by setting is_active: false', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mocks.from.mockReturnValue({ update: mockUpdate });

    await handbookApi.remove('uuid-1');

    expect(mocks.from).toHaveBeenCalledWith('handbook_entries');
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'uuid-1');
  });

  it('throws error when database operation fails', async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Database connection failed')
    });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mocks.from.mockReturnValue({ select: mockSelect });

    await expect(handbookApi.getAll()).rejects.toThrow('Database connection failed');
  });
});

describe('HandbookManager category configuration', () => {
  it('contains all 5 required business categories', () => {
    const categoryValues = CATEGORY_OPTIONS.map(c => c.value);
    expect(categoryValues).toContain('general');
    expect(categoryValues).toContain('quality');
    expect(categoryValues).toContain('labor');
    expect(categoryValues).toContain('recipe');
    expect(categoryValues).toContain('ops');
    expect(CATEGORY_MAP.general).toBeDefined();
    expect(CATEGORY_MAP.quality).toBeDefined();
    expect(CATEGORY_MAP.labor).toBeDefined();
    expect(CATEGORY_MAP.recipe).toBeDefined();
    expect(CATEGORY_MAP.ops).toBeDefined();
  });
});
