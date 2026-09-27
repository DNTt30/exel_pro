// Edge Function: ADMIN đặt lại mật khẩu nhân viên.
// POST { target_emp_id, new_password } với Authorization = JWT của admin.
// Kiểm tra: caller phải có role ADMIN trong user_store_roles (qua app_profiles).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateNewPassword } from '../_shared/passwordPolicy.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  const SB_URL = Deno.env.get('SUPABASE_URL')!;
  const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SB_URL, SB_KEY);

  // Xác thực caller từ JWT
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer /i, '');
  const { data: userData, error: uErr } = await admin.auth.getUser(jwt);
  if (uErr || !userData?.user) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: cors });
  }
  const uid = userData.user.id;

  // Caller phải là ADMIN
  const { data: prof } = await admin.from('app_profiles').select('emp_id').eq('id', uid).single();
  const empId = prof?.emp_id;
  const { data: roleRow } = await admin.from('user_store_roles')
    .select('id').eq('user_emp_id', empId).eq('role', 'ADMIN').limit(1);
  if (!roleRow?.length) {
    return new Response(JSON.stringify({ ok: false, error: 'forbidden: only ADMIN' }), { status: 403, headers: cors });
  }

  const { target_emp_id, new_password } = await req.json();
  const passwordError = validateNewPassword(new_password);
  if (!target_emp_id || passwordError) {
    return new Response(JSON.stringify({ ok: false, error: passwordError || 'bad-input' }), { status: 400, headers: cors });
  }

  // Tìm auth user của NV đích theo email quy ước
  // listUsers không lọc được email trực tiếp — dùng lookup qua profiles trước
  const { data: tProf } = await admin.from('app_profiles').select('id').eq('emp_id', target_emp_id).single();
  let targetUserId = tProf?.id;
  if (!targetUserId) {
    return new Response(JSON.stringify({ ok: false, error: 'target-has-no-auth-user' }), { status: 404, headers: cors });
  }

  const upd = await admin.auth.admin.updateUserById(targetUserId, {
    password: new_password,
    user_metadata: { must_change_password: true, password_changed_at: null },
  });
  if (upd.error) {
    return new Response(JSON.stringify({ ok: false, error: upd.error.message }), { status: 500, headers: cors });
  }

  // Mật khẩu quản lý cấp là tạm thời: buộc tự đổi ở lần đăng nhập tiếp theo.
  await admin.from('app_profiles').update({ credential_set_at: null })
    .eq('emp_id', target_emp_id);

  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
