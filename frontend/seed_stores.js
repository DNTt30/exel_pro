const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function addStores() {
  const stores = [
    { id: 'VN0485', name: 'OFC Vincom Nguyễn Chí Thanh', region: 'Miền Bắc' },
    { id: 'VN0470', name: 'OFC Lotte Center', region: 'Miền Bắc' },
    { id: 'VN0497', name: 'OFC Aeon Mall Hà Đông', region: 'Miền Bắc' }
  ];

  for (const st of stores) {
    const { data, error } = await supabase.from('stores').upsert([st], { onConflict: 'id' });
    if (error) {
      console.error('Error inserting', st.id, error);
    } else {
      console.log('Inserted', st.id);
    }
  }
}

addStores();
