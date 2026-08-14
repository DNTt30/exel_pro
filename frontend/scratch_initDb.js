import { createClient } from '@supabase/supabase-js';
import { DEFAULT_EMP, INITIAL_SCHEDULE_2026_8_10, DEFAULT_FEEDBACK_CB } from './src/data/initialData.js';

const supabaseUrl = 'https://plitfdjzuealjxbylwxy.supabase.co';
const supabaseAnonKey = 'sb_publishable_NSojsCWhOgiUvZIrMpoXEg_So_tE3O_';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function init() {
  console.log("Pushing employees...");
  const { error: err1 } = await supabase.from('employees').upsert(
    DEFAULT_EMP.map(e => ({
      id: e.id,
      name: e.name,
      dept: e.dept,
      type: e.type,
      role: e.role || e.type,
      max_h: e.maxH
    }))
  );
  if (err1) {
    console.error("Error pushing employees:", err1.message);
  } else {
    console.log("Employees pushed.");
  }

  console.log("Pushing schedules for 2026-8-10...");
  const scheduleRows = Object.keys(INITIAL_SCHEDULE_2026_8_10).map(empId => ({
    week_date: '2026-8-10',
    emp_id: empId,
    shifts: INITIAL_SCHEDULE_2026_8_10[empId]
  }));
  const { error: err2 } = await supabase.from('schedules').upsert(scheduleRows, { onConflict: 'week_date,emp_id' });
  if (err2) {
    console.error("Error pushing schedules:", err2.message);
  } else {
    console.log("Schedules pushed.");
  }

  console.log("Pushing feedbacks...");
  const fbRows = DEFAULT_FEEDBACK_CB.map(fb => ({
    emp_id: fb.empId,
    name: fb.name,
    dept: fb.dept,
    date: fb.date,
    shift: fb.shift,
    hours: fb.hours,
    reason: fb.reason,
    status: fb.status
  }));
  const { error: err3 } = await supabase.from('feedbacks').upsert(fbRows);
  if (err3) {
    console.error("Error pushing feedbacks:", err3.message);
  } else {
    console.log("Feedbacks pushed.");
  }
  
  console.log("Successfully pushed all initial data to Supabase!");
}

init();
