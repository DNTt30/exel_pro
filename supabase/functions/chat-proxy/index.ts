import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createChatProxyHandler } from './handler.js';
import { authorizeCopilotScope, copilotRole } from './access.js';
const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createChatProxyHandler({
  async consumeRequest(identity) {
    const { data, error } = await admin.rpc('consume_copilot_request', { p_employee_id: identity.employeeId });
    if (error) throw new Error('Cannot verify request budget');
    return data;
  },
  async validateScope(identity, scope) {
    return authorizeCopilotScope(identity, scope, async ids => {
      const result = await admin.from('employees').select('id,dept').in('id', ids);
      if (result.error) throw new Error('Cannot verify employee scope');
      return result.data || [];
    });
  },
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
    const isAdmin = data.user.email === 'admin@ofc.app';
    const match = data.user.email?.match(/^(\d{9})@ofc\.app$/);
    if (!isAdmin && !match) return false;
    const employeeId = isAdmin ? 'admin' : match![1];
    const employee = isAdmin ? null : await admin.from('employees').select('id,dept,role,type,job_title')
      .eq('id', employeeId).eq('is_active', true).maybeSingle();
    if (!isAdmin && (employee?.error || !employee?.data)) return false;
    const role = copilotRole(employee?.data, isAdmin);
    // Reuse database authorization: OFC/admin currently manage the chain; SM's
    // assigned departments are authoritative. Browser flags/JWT user_metadata
    // are not used to grant management rights.
    const scoped = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const managed = role === 'staff' ? { data: [], error: null } : await scoped.rpc('my_managed_stores');
    if (managed.error) return false;
    return { isAdmin, employeeId, role, managedStoreIds: managed.data || [],
      memberStoreIds: String(employee?.data?.dept || '').split(',').map(id => id.trim()).filter(Boolean) };
  },
}));
