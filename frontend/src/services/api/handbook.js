import { supabase } from '../../lib/supabase';

export const handbookApi = {
  async getAll() {
    if (!supabase) throw new Error('Chưa cấu hình Supabase');
    const { data, error } = await supabase
      .from('handbook_entries')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('created_at');
    if (error) throw error;
    return data || [];
  },

  async create(entry) {
    if (!supabase) throw new Error('Chưa cấu hình Supabase');
    const { data, error } = await supabase
      .from('handbook_entries')
      .insert([{ ...entry, is_active: true }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    if (!supabase) throw new Error('Chưa cấu hình Supabase');
    const { data, error } = await supabase
      .from('handbook_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    if (!supabase) throw new Error('Chưa cấu hình Supabase');
    const { error } = await supabase
      .from('handbook_entries')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  }
};
