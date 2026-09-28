import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createResetPasswordHandler } from './handler.js';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(Deno.env.get('SUPABASE_URL') || '', serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createResetPasswordHandler({
  admin,
  hashSecret: Deno.env.get('PASSWORD_RESET_HASH_SECRET') || serviceKey,
  botToken: Deno.env.get('TELEGRAM_BOT_TOKEN') || '',
  chatId: Deno.env.get('TELEGRAM_CHAT_ID') || '',
  resendKey: Deno.env.get('RESEND_API_KEY') || '',
  emailFrom: Deno.env.get('PASSWORD_RESET_EMAIL_FROM') || '',
}));
