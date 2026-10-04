import { createClient } from '@supabase/supabase-js';
import { sessionPersistence } from './sessionStorage';

// Supabase config với fallback an toàn
const DEFAULT_SUPABASE_URL = 'https://plitfdjzuealjxbylwxy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_NSojsCWhOgiUvZIrMpoXEg_So_tE3O_';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env. Xem .env.example.');
}

// Khởi tạo Supabase Client
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ofc-supabase-auth',
        storage: sessionPersistence
      }
    })
  : null;
