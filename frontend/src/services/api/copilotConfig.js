import { supabase, supabaseAnonKey, supabaseUrl } from '../../lib/supabase';

async function configurationRequest(action, body = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Vui lòng đăng nhập lại.');
  const response = await fetch(`${supabaseUrl}/functions/v1/chat-proxy?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey, Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể lưu cấu hình AI.');
  return { configured: result.configured === true };
}
export const getCopilotConfiguration = () => configurationRequest('config_status');
export const saveCopilotConfiguration = apiKey => configurationRequest('configure', { apiKey });
