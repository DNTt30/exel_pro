import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAutoBackupConfig, saveAutoBackupConfig, getAutoBackupHistory, 
  appendAutoBackupHistory, workbookToBlob, checkAndRunScheduledBackup 
} from '../utils/autoBackupService';
import * as XLSX from 'xlsx';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

describe('Auto Backup Service Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides sensible default backup configuration', () => {
    const config = getAutoBackupConfig();
    expect(config.enabled).toBe(false);
    expect(config.frequency).toBe('weekly');
    expect(config.channel).toBe('telegram');
  });

  it('persists and retrieves updated configuration', () => {
    const custom = {
      enabled: true,
      frequency: 'daily',
      channel: 'both',
      telegramToken: 'test_token',
      telegramChatId: '123456',
      webhookUrl: 'https://example.com/webhook',
      lastRunAt: null
    };
    saveAutoBackupConfig(custom);
    const loaded = getAutoBackupConfig();
    expect(loaded.enabled).toBe(true);
    expect(loaded.frequency).toBe('daily');
    expect(loaded.telegramToken).toBe('test_token');
  });

  it('records and caps history items up to 20', () => {
    for (let i = 0; i < 25; i++) {
      appendAutoBackupHistory({ fileName: `backup_${i}.xlsx`, status: 'success' });
    }
    const history = getAutoBackupHistory();
    expect(history.length).toBe(20);
    expect(history[0].fileName).toBe('backup_24.xlsx');
  });

  it('converts XLSX workbook to binary Blob correctly', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Mã NV', 'Tên'], ['0101', 'Test User']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Test');

    const blob = workbookToBlob(wb);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toContain('spreadsheetml.sheet');
  });

  it('skips scheduled backup when disabled', async () => {
    saveAutoBackupConfig({ enabled: false });
    const res = await checkAndRunScheduledBackup({});
    expect(res).toBeNull();
  });
});
