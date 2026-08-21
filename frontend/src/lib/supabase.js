import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Khởi tạo Supabase Client
// Lưu ý: Sẽ báo lỗi nếu chưa điền Key trong file .env
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ofc-supabase-auth'
      }
    })
  : null;

if (!supabase) {
  console.warn("Chưa cấu hình Supabase URL và Anon Key trong file .env!");
}
