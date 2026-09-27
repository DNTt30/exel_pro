export const MIN_PASSWORD_LENGTH = 8;

const WEAK_PASSWORDS = new Set([
  '1', '123', '123456', '12345678', '123456789', '1234567890',
  '87654321', 'password', 'password1', 'qwerty123', 'gs25',
]);

export function hasPasswordNumberOrSymbol(password) {
  return /[\p{N}\p{P}\p{S}]/u.test(password);
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }
  if (/^(.)\1+$/u.test(password)) return 'Mật khẩu không được lặp một ký tự';
  if (WEAK_PASSWORDS.has(password.trim().toLowerCase())) {
    return 'Mật khẩu quá đơn giản, vui lòng chọn mật khẩu khác';
  }
  if (!hasPasswordNumberOrSymbol(password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ số hoặc ký tự đặc biệt';
  }
  return null;
}
