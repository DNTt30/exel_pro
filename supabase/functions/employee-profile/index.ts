import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createEmployeeProfileHandler } from './handler.js';
const url = Deno.env.get('SUPABASE_URL') || '';
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createEmployeeProfileHandler({
  admin,
  async verifyPassword(email: string, password: string, expectedUserId: string) {
    // Each request gets an isolated client; never replace/revoke the browser's session.
    const verifier = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await verifier.auth.signInWithPassword({ email, password });
    try { return !error && data.user?.id === expectedUserId && !!data.session; }
    finally { if (data.session) await verifier.auth.signOut({ scope: 'local' }).catch(() => {}); }
  },
}));
