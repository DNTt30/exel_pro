export function normalizeRecoveryEmail(value) {
  if (typeof value !== 'string') throw new Error('Email khôi phục không hợp lệ');
  const email = value.trim().toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error('Email khôi phục không hợp lệ');
  }
  return email;
}
