import { supabase } from '../../lib/supabase';

export function db() {
  if (!supabase) {
    throw new Error('Chua cau hinh Supabase URL/Key trong file .env');
  }
  return supabase;
}