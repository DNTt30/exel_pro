import { isOpsManager } from '../lib/authSession';

export function requiredPasswordPath(user) {
  if (!user?.mustChangePassword && !user?.mustSetupPassword) return null;
  // SM/OFC là tài khoản nhân viên; form admin chỉ đổi tài khoản builtin.
  return user.id === 'admin' ? '/admin/security/change-password' : '/employee/change-password';
}

export function signedInPath(user) {
  return requiredPasswordPath(user) || (isOpsManager(user) ? '/admin/dashboard' : '/employee/home');
}
