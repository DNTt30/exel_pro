import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createChatProxyHandler } from './handler.js';
const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createChatProxyHandler({
  async getApiKey() {
    const { data, error } = await admin.rpc('copilot_get_api_key');
    if (error) throw new Error('Cannot read AI configuration');
    return data || Deno.env.get('GEMINI_API_KEY') || '';
  },
  async saveApiKey(key: string) {
    const { error } = await admin.rpc('copilot_set_api_key', { p_key: key });
    if (error) throw new Error('Cannot save AI configuration');
  },
  async authorize(token: string) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return false;
    if (data.user.email === 'admin@ofc.app') return { isAdmin: true };
    const match = data.user.email?.match(/^(\d{9})@ofc\.app$/);
    if (!match) return false;
    const employee = await admin.from('employees').select('id').eq('id', match[1]).eq('is_active', true).maybeSingle();
    return !employee.error && employee.data ? { isAdmin: false } : false;
  },
}));
