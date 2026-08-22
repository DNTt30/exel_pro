import { describe, it, expect } from 'vitest';
import { redact, describeDiff, inferAiIntent } from '../utils/appLogs';

describe('appLogs', () => {
  it('never keeps secrets in redacted payloads', () => {
    const out = redact({
      qty: 5,
      password: '1',
      accessToken: 'abc',
      nested: { refreshToken: 'xyz', name: 'Tú' }
    });
    expect(out.qty).toBe(5);
    expect(out.password).toBe('[REDACTED]');
    expect(out.accessToken).toBe('[REDACTED]');
    expect(out.nested.refreshToken).toBe('[REDACTED]');
    expect(out.nested.name).toBe('Tú');
  });

  it('describes field-level inventory changes', () => {
    const text = describeDiff({ quantity: 10, sku: 'SP01' }, { quantity: 5, sku: 'SP01' });
    expect(text).toContain('quantity: 10 → 5');
    expect(text).not.toMatch(/sku/);
  });

  it('classifies AI intents', () => {
    expect(inferAiIntent('công thức trà tắc')).toBe('recipe');
    expect(inferAiIntent('hôm nay tôi làm ca mấy')).toBe('schedule');
    expect(inferAiIntent('tuần này bao nhiêu giờ')).toBe('hours');
  });
});
