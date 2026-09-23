import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { sessionPersistence, setRememberSession } from '../lib/sessionStorage';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key), clear: () => values.clear() };
};
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
});
afterEach(() => vi.unstubAllGlobals());

describe('remember session storage', () => {
  it('moves both auth and app sessions to tab storage when unchecked', () => {
    for (const key of ['schedule-storage','ofc-supabase-auth']) sessionPersistence.setItem(key,'session');
    setRememberSession(false);
    for (const key of ['schedule-storage','ofc-supabase-auth']) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionPersistence.getItem(key)).toBe('session');
    }
    sessionStorage.clear(); // A new tab has no previous tab's session.
    expect(sessionPersistence.getItem('ofc-supabase-auth')).toBeNull();
  });
  it('persists a remembered session across a new tab', () => {
    setRememberSession(true);
    sessionPersistence.setItem('ofc-supabase-auth','remembered');
    sessionStorage.clear();
    expect(sessionPersistence.getItem('ofc-supabase-auth')).toBe('remembered');
  });
  it('keeps this tab preference when another tab changes the shared preference', () => {
    setRememberSession(false);
    sessionPersistence.setItem('ofc-supabase-auth','tab-session');
    localStorage.setItem('ofc-remember-session','true');
    localStorage.setItem('ofc-supabase-auth','other-session');
    expect(sessionPersistence.getItem('ofc-supabase-auth')).toBe('tab-session');
  });
  it('tolerates browsers that reject access to storage properties', () => {
    for (const name of ['localStorage','sessionStorage']) {
      Object.defineProperty(globalThis,name,{ configurable:true, get() { throw new Error('SecurityError'); } });
    }
    expect(() => setRememberSession(false)).not.toThrow();
    expect(() => sessionPersistence.removeItem('ofc-supabase-auth')).not.toThrow();
    expect(sessionPersistence.getItem('ofc-supabase-auth')).toBeNull();
  });
});
