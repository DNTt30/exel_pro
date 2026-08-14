const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plitfdjzuealjxbylwxy.supabase.co';
const supabaseAnonKey = 'sb_publishable_NSojsCWhOgiUvZIrMpoXEg_So_tE3O_';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  console.log("Testing connection...");
  const { data, error } = await supabase.from('employees').select('*').limit(1);
  if (error) {
    console.error("Connection Error:", error.message);
  } else {
    console.log("Connection Success! Data:", data);
  }
}
checkConnection();
