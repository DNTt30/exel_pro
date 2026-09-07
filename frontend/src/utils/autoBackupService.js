import * as XLSX from 'xlsx';
import { buildBackupData, buildBackupWorkbook } from './exportBackup';

const BACKUP_CONFIG_KEY = 'ofc_auto_backup_config_v1';
const BACKUP_HISTORY_KEY = 'ofc_auto_backup_history_v1';

export function getAutoBackupConfig() {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    enabled: false,
    frequency: 'weekly', // 'daily' | 'weekly'
    channel: 'telegram', // 'telegram' | 'webhook' | 'both'
    telegramToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
    telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || '',
    webhookUrl: '',
    lastRunAt: null,
    lastStatus: null
  };
}

export function saveAutoBackupConfig(config) {
  try {
    localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Không thể lưu cấu hình auto backup:', err);
  }
}

export function getAutoBackupHistory() {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function appendAutoBackupHistory(entry) {
  try {
    const history = getAutoBackupHistory();
    history.unshift({
      id: 'bk_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...entry
    });
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch (err) {
    console.error('Không thể ghi log backup:', err);
  }
}

/** Chuyển workbook thành Blob binary để gửi qua mạng */
export function workbookToBlob(wb) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/** Gửi file backup qua Telegram Bot API (sendDocument) */
export async function sendBackupTelegram(blob, fileName, caption, { token, chatId }) {
  const botToken = token || import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
  const targetChatId = chatId || import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

  if (!botToken || !targetChatId) {
    throw new Error('Chưa cấu hình Telegram Bot Token hoặc Chat ID.');
  }

  const formData = new FormData();
  formData.append('chat_id', targetChatId);
  formData.append('document', blob, fileName);
  if (caption) formData.append('caption', caption);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(30000)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.description || `Lỗi HTTP ${res.status} từ Telegram`);
  }
  return json;
}

/** Gửi thông báo & metadata backup qua Webhook */
export async function sendBackupWebhook(webhookUrl, metadata) {
  if (!webhookUrl) throw new Error('Chưa cấu hình Webhook URL.');

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'auto_backup',
      system: 'GS25 Schedule App',
      timestamp: new Date().toISOString(),
      ...metadata
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    throw new Error(`Webhook phản hồi mã lỗi HTTP ${res.status}`);
  }
  return true;
}

/** Thực thi tạo và gửi bản sao lưu toàn diện */
export async function executeAutoBackup(state, opts = {}) {
  const config = { ...getAutoBackupConfig(), ...opts };
  const startTime = Date.now();

  try {
    // 1. Thu thập dữ liệu 7 bảng
    const data = await buildBackupData(state);
    const wb = buildBackupWorkbook(data);
    const blob = workbookToBlob(wb);

    const pad = n => String(n).padStart(2, '0');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    const fileName = `GS25_AutoBackup_${stamp}.xlsx`;

    const summaryText = [
      `📦 **BẢN SAO LƯU HỆ THỐNG GS25 (${d.toLocaleString('vi-VN')})**`,
      `• Nhân viên: ${data.employees?.length || 0} hồ sơ`,
      `• Lịch đã lưu: ${Object.keys(data.schedule || {}).length} tuần`,
      `• Đổi ca: ${data.shiftSwaps?.length || 0} đơn`,
      `• Khiếu nại/Bù công: ${data.feedbacks?.length || 0} đơn`,
      `• Kệ hàng: ${data.shelves?.length || 0} kệ (${data.shelfItems?.length || 0} sản phẩm)`,
      `• Dung lượng: ${(blob.size / 1024).toFixed(1)} KB`,
      `🔒 Sao lưu tự động bảo vệ dữ liệu vận hành chuỗi GS25.`
    ].join('\n');

    const dispatchedChannels = [];

    // 2. Gửi qua Telegram nếu bật
    if (config.channel === 'telegram' || config.channel === 'both') {
      await sendBackupTelegram(blob, fileName, summaryText, {
        token: config.telegramToken,
        chatId: config.telegramChatId
      });
      dispatchedChannels.push('telegram');
    }

    // 3. Gửi qua Webhook nếu bật
    if (config.channel === 'webhook' || config.channel === 'both') {
      await sendBackupWebhook(config.webhookUrl, {
        fileName,
        sizeBytes: blob.size,
        summary: summaryText,
        counts: {
          employees: data.employees?.length || 0,
          weeks: Object.keys(data.schedule || {}).length,
          shelves: data.shelves?.length || 0
        }
      });
      dispatchedChannels.push('webhook');
    }

    // 4. Lưu lại lịch sử & cấu hình
    const record = {
      status: 'success',
      fileName,
      sizeKb: (blob.size / 1024).toFixed(1),
      channels: dispatchedChannels,
      durationMs: Date.now() - startTime
    };

    appendAutoBackupHistory(record);
    saveAutoBackupConfig({
      ...config,
      lastRunAt: new Date().toISOString(),
      lastStatus: 'success'
    });

    state.appendAdminLog?.('AUTO_BACKUP_DISPATCH', fileName, 'system', {
      category: 'backup',
      channels: dispatchedChannels,
      sizeBytes: blob.size
    });

    return { ok: true, fileName, channels: dispatchedChannels };
  } catch (err) {
    console.error('Tự động sao lưu thất bại:', err);
    appendAutoBackupHistory({
      status: 'error',
      error: err.message,
      durationMs: Date.now() - startTime
    });
    saveAutoBackupConfig({
      ...config,
      lastRunAt: new Date().toISOString(),
      lastStatus: 'error'
    });
    throw err;
  }
}

/** Kiểm tra và tự động kích hoạt sao lưu ngầm nếu đến hạn */
export async function checkAndRunScheduledBackup(state) {
  const config = getAutoBackupConfig();
  if (!config.enabled) return null;

  const now = Date.now();
  const lastRun = config.lastRunAt ? new Date(config.lastRunAt).getTime() : 0;
  const hoursSinceLast = (now - lastRun) / (1000 * 60 * 60);

  let shouldRun = false;
  if (config.frequency === 'daily' && hoursSinceLast >= 24) {
    shouldRun = true;
  } else if (config.frequency === 'weekly' && hoursSinceLast >= 168) {
    shouldRun = true;
  } else if (!config.lastRunAt) {
    shouldRun = true;
  }

  if (shouldRun) {
    console.log('[AutoBackup] Kích hoạt tự động sao lưu định kỳ...');
    try {
      return await executeAutoBackup(state);
    } catch (e) {
      console.warn('[AutoBackup] Lỗi sao lưu ngầm:', e);
      return null;
    }
  }
  return null;
}
