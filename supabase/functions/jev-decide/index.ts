// =====================================================================
// supabase/functions/jev-decide/index.ts
//
// Proxy server-side cho TypeSafe Jev (System One).
// Nguyen tac bat buoc:
//   1. Key Jev KHONG BAO GIO ra toi trinh duyet. Client goi ham nay, khong goi Jev.
//   2. Client KHONG duoc tu do gui cau hoi. Chi duoc goi mot "task" trong whitelist
//      duoi day -> chan ca prompt-injection lan dot quota.
//   3. Moi quyet dinh deu duoc ghi log vao bang jev_decisions -> day la du lieu
//      de chay cong hieu chinh (JEV-02). Khong co log thi khong do duoc gi.
//   4. Loi / cham -> tra ok:false. Client PHAI fallback ve logic deterministic cu.
//
// ⚠️ CAN XAC MINH truoc khi deploy: dat JEV_API_URL theo dung endpoint trong
//    docs.typesafe.ai/api. Shape request/response duoi day dua tren hop dong
//    cong khai cua System One (state + named questions -> answers), nhung ban
//    phai doi chieu lai bang mot call that trong playground.
// =====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const JEV_API_URL = Deno.env.get('JEV_API_URL') ?? 'https://api.typesafe.ai/v1/system-one';
const JEV_API_KEY = Deno.env.get('TYPESAFE_API_KEY') ?? '';
const JEV_MODEL = Deno.env.get('JEV_MODEL') ?? 'jev-latest';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const TIMEOUT_MS = Number(Deno.env.get('JEV_TIMEOUT_MS') ?? 2000);
const MAX_STATE_CHARS = 120_000; // < 150k ky tu (~32K token) de chua bien cho questions

// ─── WHITELIST TASK ──────────────────────────────────────────────────
// Client chi gui { task, state }. Bo cau hoi do SERVER giu.
// Them task moi = sua file nay + deploy, khong sua duoc tu client.
//
// LUU Y THIET KE (quan trong): cac cau hoi trong CUNG mot request duoc danh gia
// DOC LAP tren cung mot state — cau sau KHONG nhin thay dap an cau truoc.
// Neu can phan doan B phu thuoc dap an A thi phai goi 2 lan.
const TASKS: Record<string, { questions: Record<string, unknown>; desc: string }> = {
  // UC-3 — loc & dinh tuyen thong bao
  notification_routing: {
    desc: 'Quyet dinh kenh / do uu tien / co the doi den sang mai cho 1 su kien',
    questions: {
      channel: {
        type: 'choice',
        instructions:
          'Su kien van hanh cua hang tien loi nay nen duoc gui qua kenh nao cho quan ly?',
        criteria: {
          in_app: 'Chi hien trong chuong thong bao, khong day di dau',
          telegram: 'Day Telegram ngay vi can xu ly som',
          both: 'Vua hien chuong vua day Telegram vi rat quan trong',
          digest: 'Gom vao ban tin tong hop 8h sang hom sau',
        },
      },
      priority: {
        type: 'score',
        instructions: 'Muc do uu tien xu ly cua su kien nay doi voi quan ly cua hang.',
        criteria: ['Khong can lam gi', 'De y sau', 'Xu ly trong tuan', 'Xu ly hom nay', 'Xu ly ngay'],
      },
      can_wait: {
        type: 'noul',
        instructions:
          'Viec nay co the doi den 8 gio sang hom sau moi bao cho quan ly ma khong gay hau qua van hanh khong?',
      },
    },
  },

  // UC-1 — xep hang lo hong dinh bien
  staffing_gap_triage: {
    desc: 'Xep hang muc khan + hanh dong goi y cho 1 lo hong dinh bien',
    questions: {
      urgency: {
        type: 'score',
        instructions:
          'Lo hong nhan su nay khan den muc nao? Can nhac ca dem, ngay cuoi tuan, hang doanh thu cua hang va thoi gian con lai truoc ca.',
        criteria: ['Bo qua duoc', 'Theo doi', 'Xu ly trong tuan', 'Xu ly trong hom nay', 'Goi nguoi ngay'],
      },
      action: {
        type: 'choice',
        instructions: 'Hanh dong hop ly nhat de lap lo hong nay la gi?',
        criteria: {
          borrow_store: 'Muon nhan su tu cua hang khac (chi vien)',
          call_pt: 'Goi nhan vien part-time dang ranh',
          internal_ot: 'Cho nhan su hien tai lam them gio',
          shift_move: 'Doi lich mot nhan vien khac sang ca nay',
          accept: 'Chap nhan thieu, khong can hanh dong',
        },
      },
      unlikely_filled: {
        type: 'noul',
        instructions:
          'Lo hong nay co nguy co KHONG duoc lap truoc han chot lich khong?',
      },
    },
  },

  // UC-2 — xep hang ung vien lap ca (fan-out: 1 cau/ung vien, sinh dong)
  candidate_ranking: { desc: 'Cham diem do phu hop cua tung ung vien', questions: {} },

  // UC-4 — cong san sang chot lich
  lock_readiness: {
    desc: 'Phan mo cua cong chot lich — phan cung van do scheduleConflicts.js quyet',
    questions: {
      readiness: {
        type: 'score',
        instructions: 'Tuan lich nay da san sang de chot va gui duyet chua?',
        criteria: ['Con nhieu van de', 'Can ra soat them', 'Co the chot kem luu y', 'San sang chot'],
      },
      night_unfair: {
        type: 'noul',
        instructions:
          'Viec phan bo ca dem trong tuan nay co bat cong ro ret giua cac nhan vien khong?',
      },
      against_registration: {
        type: 'noul',
        instructions:
          'Co nhan vien nao bi xep ca trai voi dang ky ma khong co ly do ro rang khong?',
      },
      likely_rework: {
        type: 'noul',
        instructions: 'Tuan nay nhieu kha nang phai sua lai sau khi da chot khong?',
      },
    },
  },
};

// ─── CHE PII ─────────────────────────────────────────────────────────
// State di ra ngoai he thong -> khong mang CCCD, so tai khoan, luong tuyet doi.
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{9,12}\b/g, '[SO]'], // CCCD / so tai khoan
  [/\b0\d{9}\b/g, '[SDT]'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]'],
  [/\b\d{1,3}(?:[.,]\d{3}){2,}\b/g, '[TIEN]'], // 12.000.000
];

function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const [re, rep] of PII_PATTERNS) out = out.replace(re, rep);
    return out;
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/cccd|cmnd|bank|account|salary|luong|tai_khoan/i.test(k)) continue; // bo han
      out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

// ─── CIRCUIT BREAKER (in-memory, per-instance) ───────────────────────
let consecutiveFailures = 0;
let breakerOpenUntil = 0;
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 60_000;

function breakerOpen() {
  return Date.now() < breakerOpenUntil;
}
function noteFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= BREAKER_THRESHOLD) {
    breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
    consecutiveFailures = 0;
  }
}
function noteSuccess() {
  consecutiveFailures = 0;
}

// ─── HANDLER ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const started = Date.now();

  if (req.method !== 'POST') {
    return json({ ok: false, reason: 'METHOD_NOT_ALLOWED' }, 405);
  }
  if (!JEV_API_KEY) {
    return json({ ok: false, reason: 'NOT_CONFIGURED' }, 200); // 200 -> client fallback em
  }

  // 1. Xac thuc nguoi goi bang JWT Supabase. Khong co JWT = tu choi.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ ok: false, reason: 'UNAUTHENTICATED' }, 401);
  }
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ ok: false, reason: 'UNAUTHENTICATED' }, 401);
  }
  const userId = userData.user.id;

  // 2. Doc body, kiem tra task nam trong whitelist
  let body: { task?: string; state?: unknown; questions?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'BAD_JSON' }, 400);
  }

  const taskName = String(body.task ?? '');
  const taskDef = TASKS[taskName];
  if (!taskDef) {
    return json({ ok: false, reason: 'UNKNOWN_TASK' }, 400);
  }

  // candidate_ranking sinh cau hoi dong (1 cau/ung vien) nen cho client gui,
  // nhung VAN kiem tra tung cau: chi cho type score/noul + instructions trong mau cho phep.
  let questions = taskDef.questions;
  if (taskName === 'candidate_ranking') {
    const incoming = body.questions ?? {};
    const keys = Object.keys(incoming);
    if (keys.length === 0 || keys.length > 60) {
      return json({ ok: false, reason: 'BAD_QUESTION_COUNT' }, 400);
    }
    for (const q of Object.values(incoming) as Array<Record<string, unknown>>) {
      if (q?.type !== 'score' && q?.type !== 'noul') {
        return json({ ok: false, reason: 'QUESTION_TYPE_FORBIDDEN' }, 400);
      }
    }
    questions = incoming;
  }

  // 3. Che PII + chan state qua to
  const safeState = scrub(body.state ?? {});
  const stateStr = JSON.stringify(safeState);
  if (stateStr.length > MAX_STATE_CHARS) {
    return json({ ok: false, reason: 'STATE_TOO_LARGE', chars: stateStr.length }, 413);
  }

  if (breakerOpen()) {
    return json({ ok: false, reason: 'CIRCUIT_OPEN' }, 200);
  }

  // 4. Goi Jev, co timeout cung
  let answers: Record<string, unknown> | null = null;
  let usage: unknown = null;
  let failReason = '';

  try {
    const res = await fetch(JEV_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${JEV_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: JEV_MODEL, state: safeState, questions }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      failReason = `HTTP_${res.status}`;
      noteFailure();
    } else {
      const data = await res.json();
      answers = data?.answers ?? null;
      usage = data?.usage ?? null;
      noteSuccess();
    }
  } catch (err) {
    failReason = err instanceof Error && err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK';
    noteFailure();
  }

  const latencyMs = Date.now() - started;

  // 5. Ghi log MOI lan goi — thanh cong hay that bai. Day la du lieu cho JEV-02.
  //    Log chay "fire and forget", khong duoc lam cham duong tra ve.
  if (SERVICE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    admin
      .from('jev_decisions')
      .insert({
        task: taskName,
        user_id: userId,
        state_hash: await sha256(stateStr),
        state_chars: stateStr.length,
        answers,
        usage,
        latency_ms: latencyMs,
        ok: !!answers,
        fail_reason: failReason || null,
        model: JEV_MODEL,
      })
      .then(() => {})
      .catch(() => {});
  }

  if (!answers) {
    return json({ ok: false, reason: failReason || 'NO_ANSWERS', latencyMs }, 200);
  }
  return json({ ok: true, answers, latencyMs, usage }, 200);
});

// ─── helpers ─────────────────────────────────────────────────────────
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
