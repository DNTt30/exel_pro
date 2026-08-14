import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Khởi tạo Supabase Client
// Lưu ý: Sẽ báo lỗi nếu chưa điền Key trong file .env
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn("Chưa cấu hình Supabase URL và Anon Key trong file .env!");
}
