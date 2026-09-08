const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://plitfdjzuealjxbylwxy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NSojsCWhOgiUvZIrMpoXEg_So_tE3O_';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const WEEK_DATE = '2026-09-07';

// 1. Danh sách 15 nhân viên mới cần thêm vào DB
const NEW_EMPLOYEES = [
  { id: '260811022', name: 'NGUYỄN THU HÀ', dept: 'VN0485', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260812061', name: 'PHÙNG QUANG MINH', dept: 'VN0485', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260813014', name: 'HOÀNG THU HIỀN', dept: 'VN0485', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260804021', name: 'NGUYỄN VŨ THANH BÌNH', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260811018', name: 'NGÔ SỸ NGUYỄN', dept: 'VN0500', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260818015', name: 'NGÔ THỊ PHƯƠNG ANH', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260819068', name: 'NGUYỄN THU THỦY', dept: 'VN0470', type: 'STFT', role: 'STFT', max_h: 48 },
  { id: '260820016', name: 'NGUYỄN AN NHƯ', dept: 'VN0470', type: 'STFT', role: 'STFT', max_h: 48 },
  { id: '260820021', name: 'BÙI TÚ ANH', dept: 'VN0470', type: 'STFT', role: 'STFT', max_h: 48 },
  { id: '260825012', name: 'NGUYỄN THỊ MINH THƯ', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260828010', name: 'NGUYỄN PHƯƠNG LINH', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260828018', name: 'VŨ DUY TÙNG', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260828021', name: 'PHẠM NGỌC ĐỨC MINH', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260903006', name: 'NGUYỄN KIM CHI', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 },
  { id: '260903010', name: 'PHẠM QUỐC TUẤN', dept: 'VN0470', type: 'STPT', role: 'STPT', max_h: 23 }
];

// 2. Toàn bộ 45 dòng lịch làm việc tuần 2026-09-07
const ALL_SCHEDULES = [
  // --- VN0485 ---
  {
    emp_id: '250729066',
    shifts: { T2: 'off', T3: '18-22', T4: 'off', T5: 'off', T6: '18-22', T7: 'off', CN: '14-22' }
  },
  {
    emp_id: '260508026',
    shifts: { T2: 'off', T3: '14-18', T4: 'off', T5: 'off', T6: 'off', T7: '14-18', CN: { shift: '6-14', covering_store: 'VN0497' } }
  },
  {
    emp_id: '260512008',
    shifts: { T2: '22-6', T3: 'off', T4: '22-6', T5: '18-22', T6: '22-6', T7: '18-22', CN: 'off' }
  },
  {
    emp_id: '260626006',
    shifts: { T2: '18-22', T3: { shift: '14-22', covering_store: 'VN0564' }, T4: '14-22', T5: '14-22', T6: '14-22', T7: '14-22', CN: '18-22' }
  },
  {
    emp_id: '260716009',
    shifts: { T2: 'off', T3: '6-14', T4: 'off', T5: '6-14', T6: '6-14', T7: '6-14', CN: { shift: '22-6', covering_store: 'VN0497' } }
  },
  {
    emp_id: '260716010',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: '14-18' }
  },
  {
    emp_id: '260716026',
    shifts: { T2: '10-18', T3: 'off', T4: 'off', T5: { shift: '10-18', covering_store: 'VN0564' }, T6: 'off', T7: 'off', CN: { shift: '14-22', covering_store: 'VN0497' } }
  },
  {
    emp_id: '260728021',
    shifts: { T2: '6-10', T3: '6-10', T4: '6-10', T5: { shift: '6-10', covering_store: 'VN0497' }, T6: '6-10', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260806011',
    shifts: { T2: { shift: '22-6', covering_store: 'VN0497' }, T3: '22-6', T4: { shift: '22-6', covering_store: 'VN0497' }, T5: '22-6', T6: { shift: '22-6', covering_store: 'VN0497' }, T7: '22-6', CN: '22-6' }
  },
  {
    emp_id: '260806018',
    shifts: { T2: 'off', T3: { shift: '18-22', covering_store: 'VN0564' }, T4: { shift: '18-22', covering_store: 'VN0564' }, T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260811022',
    shifts: { T2: '18-22', T3: 'off', T4: 'off', T5: '6-10', T6: 'off', T7: 'off', CN: { shift: '18-22', covering_store: 'VN0497' } }
  },
  {
    emp_id: '260812061',
    shifts: { T2: { shift: '18-22', covering_store: 'VN0497' }, T3: { shift: '14-18', covering_store: 'VN0497' }, T4: '14-18', T5: 'off', T6: { shift: '6-10', covering_store: 'VN0497' }, T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260813014',
    shifts: { T2: '6-10', T3: { shift: '18-22', covering_store: 'VN0497' }, T4: 'off', T5: '18-22', T6: '14-18', T7: '10-14', CN: '10-14' }
  },
  {
    emp_id: '260804021',
    shifts: { T2: 'off', T3: { shift: '14-22', covering_store: 'VN0564' }, T4: '10-14', T5: '10-14', T6: { shift: '6-14', covering_store: 'VN0497' }, T7: '6-14', CN: { shift: '14-22', covering_store: 'VN0497' } }
  },

  // --- VN0497 ---
  {
    emp_id: '250829022',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260225006',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260619006',
    shifts: { T2: '18-22', T3: '18-22', T4: '18-22', T5: '18-22', T6: '18-22', T7: '18-22', CN: 'off' }
  },
  {
    emp_id: '260714021',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260721017',
    shifts: { T2: 'off', T3: '6-10', T4: '6-10', T5: 'off', T6: 'off', T7: '6-10', CN: '10-18' }
  },
  {
    emp_id: '260723005',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260415020',
    shifts: { T2: 'off', T3: '12-20', T4: '12-20', T5: '14-22', T6: '6-10', T7: '10-18', CN: '6-14' }
  },

  // --- VN0500 ---
  {
    emp_id: '250910016',
    shifts: { T2: '6-14', T3: '22-6', T4: 'off', T5: { shift: '10-18', covering_store: 'VN0564' }, T6: { shift: '10-18', covering_store: 'VN0564' }, T7: { shift: '10-18', covering_store: 'VN0564' }, CN: '6-14' }
  },
  {
    emp_id: '251030015',
    shifts: { T2: { shift: '6-14', covering_store: 'VN0497' }, T3: 'off', T4: { shift: '6-14', covering_store: 'VN0497' }, T5: { shift: '6-14', covering_store: 'VN0497' }, T6: '6-14', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260602009',
    shifts: { T2: '6-12', T3: 'off', T4: { shift: '6-12', covering_store: 'VN0564' }, T5: { shift: '6-12', covering_store: 'VN0564' }, T6: 'off', T7: { shift: '6-12', covering_store: 'VN0497' }, CN: { shift: '10-18', covering_store: 'VN0497' } }
  },
  {
    emp_id: '260602010',
    shifts: { T2: { shift: '6-14', covering_store: 'VN0497' }, T3: 'off', T4: 'off', T5: '6-12', T6: '10-18', T7: '6-12', CN: { shift: '6-14', covering_store: 'VN0485' } }
  },
  {
    emp_id: '260603050',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: '6-14', T6: 'off', T7: 'off', CN: '6-14' }
  },
  {
    emp_id: '260612008',
    shifts: { T2: '18-22', T3: '14-22', T4: '10-14', T5: '14-22', T6: '14-22', T7: '10-18', CN: '14-22' }
  },
  {
    emp_id: '260616013',
    shifts: { T2: 'off', T3: '10-14', T4: '22-6', T5: 'off', T6: 'off', T7: '22-6', CN: '14-22' }
  },
  {
    emp_id: '260618015',
    shifts: { T2: '22-6', T3: '22-6', T4: '22-6', T5: '22-6', T6: '22-6', T7: '22-6', CN: 'off' }
  },
  {
    emp_id: '260618023',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: { shift: '22-6', covering_store: 'VN0497' }, T6: '14-22', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260710011',
    shifts: { T2: 'off', T3: '14-18', T4: '6-10', T5: '18-22', T6: '6-10', T7: '10-18', CN: 'off' }
  },
  {
    emp_id: '260730056',
    shifts: { T2: '10-14', T3: 'off', T4: '6-12', T5: 'off', T6: '6-14', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260807061',
    shifts: { T2: '22-6', T3: 'off', T4: 'off', T5: { shift: '6-10', covering_store: 'VN0497' }, T6: '6-10', T7: { shift: '22-6', covering_store: 'VN0497' }, CN: 'off' }
  },
  {
    emp_id: '260811014',
    shifts: { T2: '14-22', T3: '10-14', T4: { shift: '18-22', covering_store: 'VN0497' }, T5: '18-22', T6: 'off', T7: '22-6', CN: '18-22' }
  },
  {
    emp_id: '260811018',
    shifts: { T2: 'off', T3: 'off', T4: '18-22', T5: '18-22', T6: '18-22', T7: { shift: '14-18', covering_store: 'VN0497' }, CN: 'off' }
  },

  // --- VN0470 ---
  {
    emp_id: '260818015',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: '14-18', T6: '14-18', T7: '14-18', CN: '6-10' }
  },
  {
    emp_id: '260819068',
    shifts: { T2: 'off', T3: 'off', T4: '14-22', T5: '14-22', T6: 'off', T7: '22-6', CN: '14-22' }
  },
  {
    emp_id: '260820016',
    shifts: { T2: 'off', T3: '14-22', T4: '10-18', T5: '22-6', T6: '14-22', T7: '22-6', CN: '6-14' }
  },
  {
    emp_id: '260820021',
    shifts: { T2: 'off', T3: '8-16', T4: '14-22', T5: 'off', T6: 'off', T7: '22-6', CN: '14-22' }
  },
  {
    emp_id: '260825012',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: '6-10', T6: '6-10', T7: '6-10', CN: '22-6' }
  },
  {
    emp_id: '260828010',
    shifts: { T2: 'off', T3: '8-16', T4: '6-14', T5: '6-14', T6: 'off', T7: 'off', CN: 'off' }
  },
  {
    emp_id: '260828018',
    shifts: { T2: 'off', T3: '10-14', T4: '10-14', T5: 'off', T6: '10-14', T7: 'off', CN: '6-10' }
  },
  {
    emp_id: '260828021',
    shifts: { T2: 'off', T3: 'off', T4: 'off', T5: '10-18', T6: '10-18', T7: 'off', CN: '10-18' }
  },
  {
    emp_id: '260903006',
    shifts: { T2: 'off', T3: '10-14', T4: '6-10', T5: '6-10', T6: '22-6', T7: '6-10', CN: '18-22' }
  },
  {
    emp_id: '260903010',
    shifts: { T2: 'off', T3: 'off', T4: '22-6', T5: '22-6', T6: '22-6', T7: '22-6', CN: '22-6' }
  }
];

async function main() {
  console.log('--- BẮT ĐẦU NẠP DỮ LIỆU BẢNG PHÂN CA SM VĂN CHƯƠNG ---');

  // Đăng nhập tài khoản Admin để có toàn quyền ghi theo chính sách RLS
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
    email: 'admin@ofc.app',
    password: 'ofc-admin-1'
  });
  if (authErr) {
    console.error('Lỗi đăng nhập Auth Admin:', authErr);
    return;
  }
  console.log('✅ Đăng nhập Admin thành công:', authData.user.email);

  // 1. Thêm 15 nhân viên mới
  console.log('\n--- 1. THÊM 15 NHÂN VIÊN MỚI ---');
  for (const emp of NEW_EMPLOYEES) {
    const { data: existing } = await sb.from('employees').select('id').eq('id', emp.id).maybeSingle();
    if (!existing) {
      const { error: insErr } = await sb.from('employees').insert([{
        id: emp.id,
        name: emp.name,
        dept: emp.dept,
        type: emp.type,
        role: emp.role,
        max_h: emp.max_h,
        is_active: true
      }]);
      if (insErr) {
        console.error(`❌ Lỗi thêm nhân viên ${emp.id} - ${emp.name}:`, insErr.message);
      } else {
        console.log(`✅ Đã thêm nhân viên: ${emp.id} - ${emp.name} (${emp.dept} - ${emp.type})`);
      }
    } else {
      console.log(`ℹ️ Nhân viên đã tồn tại: ${emp.id} - ${emp.name}`);
    }

    // Provision Auth User bằng client riêng biệt để không ảnh hưởng phiên admin
    const email = `${emp.id}@ofc.app`;
    const password = `ofc-${emp.id}-1`;
    try {
      const provClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error: signErr } = await provClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            emp_id: emp.id,
            role: 'employee',
            is_manager: false,
            dept: emp.dept
          }
        }
      });
      if (signErr && !/already|registered|exists/i.test(signErr.message)) {
        console.warn(`⚠️ Provision auth cho ${emp.id}:`, signErr.message);
      }
    } catch {
      // Bỏ qua nếu user đã tồn tại
    }
  }

  // 2. Nạp 45 bản ghi lịch làm việc
  console.log(`\n--- 2. NẠP LỊCH TUẦN ${WEEK_DATE} CHO 45 NHÂN VIÊN ---`);
  let successCount = 0;
  for (const item of ALL_SCHEDULES) {
    // Thử RPC save_employee_schedule trước
    const { error: rpcErr } = await sb.rpc('save_employee_schedule', {
      p_week_date: WEEK_DATE,
      p_emp_id: item.emp_id,
      p_shifts: item.shifts,
      p_expect_version: null
    });

    if (rpcErr) {
      // Fallback: Direct Upsert
      const { error: upsertErr } = await sb.from('schedules').upsert({
        week_date: WEEK_DATE,
        emp_id: item.emp_id,
        shifts: item.shifts
      }, { onConflict: 'week_date,emp_id' });

      if (upsertErr) {
        console.error(`❌ Lỗi lưu lịch NV ${item.emp_id}:`, upsertErr.message);
      } else {
        successCount++;
        process.stdout.write(`.`);
      }
    } else {
      successCount++;
      process.stdout.write(`.`);
    }
  }
  console.log(`\n✅ Đã nạp thành công lịch cho ${successCount} / ${ALL_SCHEDULES.length} nhân sự!`);

  // 3. Đánh dấu tuần đã duyệt/công bố cho 4 cửa hàng
  console.log('\n--- 3. CẬP NHẬT TRẠNG THÁI TUẦN (schedule_weeks) ---');
  const stores = ['VN0485', 'VN0497', 'VN0500', 'VN0470'];
  for (const st of stores) {
    const { error: wErr } = await sb.from('schedule_weeks').upsert({
      store_id: st,
      week_date: WEEK_DATE,
      status: 'approved',
      approved_by: '251104004' // SM Ma Văn Chương
    }, { onConflict: 'store_id,week_date' });
    if (!wErr) {
      console.log(`✅ Đã cập nhật tuần ${WEEK_DATE} cho CH ${st} (status: approved)`);
    } else {
      console.warn(`⚠️ schedule_weeks ${st}:`, wErr.message);
    }
  }

  console.log('\n--- HOÀN TẤT NẠP DỮ LIỆU ---');
}

main().catch(console.error);
