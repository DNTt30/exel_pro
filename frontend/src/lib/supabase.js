import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://plitfdjzuealjxbylwxy.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NSojsCWhOgiUvZIrMpoXEg_So_tE3O_';

// Khởi tạo Supabase Client
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
