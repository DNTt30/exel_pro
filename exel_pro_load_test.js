import http from 'k6/http';
import { check, sleep } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const WEEK = __ENV.TEST_WEEK || '2026-8-10';

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY (truyền qua biến môi trường)');
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

export const options = {
  scenarios: {
    // Kịch bản 1: mô phỏng "mount burst" — đúng như 100 SM cùng mở app/F5
    // trong cùng khung giờ (vd. 9h sáng thứ Hai, tất cả cùng vào xem lịch tuần mới)
    mount_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 }, // đỉnh tải mục tiêu: 100 người dùng đồng thời
        { duration: '2m', target: 100 }, // giữ ở mức 100 trong 2 phút
        { duration: '30s', target: 0 },
      ],
      exec: 'simulateMount',
    },
    // Kịch bản 2: song song mô phỏng một nhóm nhỏ SM đang sửa lịch cùng lúc
    // (để quan sát write contention / lost-update — xem ghi chú cuối file)
    concurrent_writes: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      exec: 'simulateShiftUpdate',
      startTime: '30s',
    },
  },
  thresholds: {
    // Ngưỡng ví dụ — chỉnh theo SLA thực tế bạn muốn đạt
    'http_req_duration{scenario:mount_burst}': ['p(95)<800', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

// Mô phỏng đúng 4 request song song mà initializeData() bắn ra mỗi lần mount
export function simulateMount() {
  const responses = http.batch([
    ['GET', `${SUPABASE_URL}/rest/v1/employees?select=*&order=dept.asc`, null, { headers }],
    ['GET', `${SUPABASE_URL}/rest/v1/feedbacks?select=*&order=created_at.desc`, null, { headers }],
    ['GET', `${SUPABASE_URL}/rest/v1/schedules?select=*&week_date=eq.${WEEK}`, null, { headers }],
    ['GET', `${SUPABASE_URL}/rest/v1/stores?select=*&order=id.asc`, null, { headers }],
  ]);

  responses.forEach((res, i) => {
    check(res, { [`request ${i} status 200`]: (r) => r.status === 200 });
  });

  // Mô phỏng người dùng nhìn màn hình 1-4s trước khi thao tác tiếp
  sleep(Math.random() * 3 + 1);
}

// Mô phỏng 1 lượt lưu ca (đúng shape UPSERT trong saveEmployeeSchedule, api.js dòng 90-101)
export function simulateShiftUpdate() {
  const empId = __ENV.TEST_EMP_ID || '260520021'; // đổi thành mã NV có thật trong dữ liệu test của bạn
  const payload = JSON.stringify({
    week_date: WEEK,
    emp_id: empId,
    shifts: { T2: '6-14', T3: '14-22', T4: 'off', T5: '', T6: '', T7: '', CN: '' },
  });

  const res = http.post(`${SUPABASE_URL}/rest/v1/schedules?on_conflict=week_date,emp_id`, payload, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
  });

  check(res, { 'upsert ok (2xx)': (r) => r.status >= 200 && r.status < 300 });
  sleep(Math.random() * 5 + 2);
}
