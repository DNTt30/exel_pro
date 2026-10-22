// Real Supabase Auth + RPC runner. Credentials never enter the browser bundle.
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..',import.meta.url)));
const week = process.argv[2];
const store = process.argv[3] || 'VN0500';
if (!/^\d{4}-\d{2}-\d{2}$/.test(week || '') || new Date(`${week}T12:00:00Z`).getUTCDay()!==1) throw new Error('Dùng: npm run bot:draft -- YYYY-MM-DD VN0500 (thứ Hai).');
if (!/^[A-Z0-9]+$/.test(store)) throw new Error('Mã cửa hàng không hợp lệ.');
let credentials;
if (process.env.SCHEDULE_BOT_PASSWORD) {
  credentials = { url: process.env.SCHEDULE_BOT_URL, key: process.env.SCHEDULE_BOT_ANON_KEY, email: process.env.SCHEDULE_BOT_EMAIL, password: process.env.SCHEDULE_BOT_PASSWORD };
} else {
  const command = `Add-Type -AssemblyName System.Security; $p=Join-Path $env:LOCALAPPDATA 'LichCa/agents/${store}.bin'; $b=[IO.File]::ReadAllBytes($p); $v=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::Write([Text.Encoding]::UTF8.GetString($v))`;
  try { credentials = JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',command],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).replace(/^\uFEFF/,'')); }
  catch { throw new Error('Chưa có thông tin bot mã hóa trên tài khoản Windows này. Cấp tài khoản bot trước hoặc dùng biến môi trường SCHEDULE_BOT_*.'); }
}
const client = createClient(credentials.url,credentials.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const login = await client.auth.signInWithPassword({email:credentials.email,password:credentials.password});
if (login.error) throw new Error('Không đăng nhập được tài khoản bot.');
const claims = JSON.parse(Buffer.from(login.data.session.access_token.split('.')[1], 'base64url').toString());
if (claims.role !== 'schedule_bot') {
  await client.auth.signOut({scope:'local'});
  throw new Error('Chỉ dùng tài khoản có vai trò schedule_bot; không dùng tài khoản quản lý.');
}
const vite = await createServer({root,configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try {
  const {saveBotDraftOnce} = await vite.ssrLoadModule('/src/utils/scheduleBot.js');
  console.log(JSON.stringify(await saveBotDraftOnce(client,store,week),null,2));
} finally { await vite.close(); await client.auth.signOut({scope:'local'}); }
