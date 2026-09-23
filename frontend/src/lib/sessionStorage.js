const PREFERENCE = 'ofc-remember-session';
const SESSION_KEYS = ['schedule-storage', 'ofc-supabase-auth'];

function storage(name) {
  try { return globalThis[name]; } catch { return null; }
}

export function remembersSession() {
  try { return (storage('sessionStorage')?.getItem(PREFERENCE) ?? storage('localStorage')?.getItem(PREFERENCE)) !== 'false'; }
  catch { return false; }
}

function targetStorage() {
  return storage(remembersSession() ? 'localStorage' : 'sessionStorage');
}

export const sessionPersistence = {
  getItem(key) { try { return targetStorage()?.getItem(key) ?? null; } catch { return null; } },
  setItem(key, value) { try { targetStorage()?.setItem(key, value); } catch { /* private browsing */ } },
  removeItem(key) {
    for (const name of ['localStorage', 'sessionStorage']) {
      try { storage(name)?.removeItem(key); } catch { /* private browsing */ }
    }
  }
};

export function setRememberSession(remember) {
  const previous = SESSION_KEYS.map(key => sessionPersistence.getItem(key));
  for (const name of ['localStorage', 'sessionStorage']) {
    try { storage(name)?.setItem(PREFERENCE, String(remember)); } catch { /* private browsing */ }
  }
  SESSION_KEYS.forEach((key, index) => {
    sessionPersistence.removeItem(key);
    if (previous[index] != null) sessionPersistence.setItem(key, previous[index]);
  });
}
