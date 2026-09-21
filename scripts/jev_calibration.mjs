#!/usr/bin/env node
// =====================================================================
// scripts/jev_calibration.mjs  —  CONG HIEU CHINH (JEV-02)
//
// Day la buoc quyet dinh use case nao duoc bat, use case nao bi huy.
// Chay TRUOC khi tich hop Jev vao bat ky man hinh nao.
//
// Cach dung:
//   export TYPESAFE_API_KEY=...
//   node scripts/jev_calibration.mjs --task notification_routing \
//        --cases data/labels/uc3.jsonl --field priority --type score
//
// Dinh dang file nhan (JSONL, moi dong 1 ca da gan nhan tay):
//   {"id":"ev_001","state":{...},"label":"digest"}          # choice
//   {"id":"ev_002","state":{...},"label":true}              # noul
//   {"id":"ev_003","state":{...},"label":3}                 # score (chi so bac, 0-based)
//
// Dau ra: bang reliability + nguong de nghi + danh sach ca "tu tin nhung sai".
// =====================================================================

import { readFileSync, writeFileSync } from 'node:fs';

const JEV_API_URL = process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/system-one';
const JEV_API_KEY = process.env.TYPESAFE_API_KEY || '';
const JEV_MODEL = process.env.JEV_MODEL || 'jev-latest';

// Bo cau hoi phai GIONG HET bo trong Edge Function, neu khac thi so do vo nghia.
const QUESTION_SETS = {
  notification_routing: {
    channel: { type: 'choice', instructions: 'Su kien van hanh cua hang tien loi nay nen duoc gui qua kenh nao cho quan ly?', criteria: { in_app: 'Chi hien trong chuong thong bao, khong day di dau', telegram: 'Day Telegram ngay vi can xu ly som', both: 'Vua hien chuong vua day Telegram vi rat quan trong', digest: 'Gom vao ban tin tong hop 8h sang hom sau' } },
    priority: { type: 'score', instructions: 'Muc do uu tien xu ly cua su kien nay doi voi quan ly cua hang.', criteria: ['Khong can lam gi', 'De y sau', 'Xu ly trong tuan', 'Xu ly hom nay', 'Xu ly ngay'] },
    can_wait: { type: 'noul', instructions: 'Viec nay co the doi den 8 gio sang hom sau moi bao cho quan ly ma khong gay hau qua van hanh khong?' },
  },
  // Them staffing_gap_triage / lock_readiness khi chay hieu chinh cho chung.
};

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const task = args.task;
const field = args.field;
const kind = args.type; // choice | noul | score
const casesPath = args.cases;
const MIN_CASES = 300;

if (!task || !field || !kind || !casesPath) {
  console.error('Thieu tham so. Xem huong dan o dau file.');
  process.exit(1);
}
if (!JEV_API_KEY) {
  console.error('Thieu TYPESAFE_API_KEY.');
  process.exit(1);
}

const questions = QUESTION_SETS[task];
if (!questions) {
  console.error(`Chua khai bao bo cau hoi cho task "${task}".`);
  process.exit(1);
}

const cases = readFileSync(casesPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

if (cases.length < MIN_CASES) {
  console.warn(
    `⚠️  Chi co ${cases.length} ca. Duoi ${MIN_CASES} thi bang reliability khong du tin cay — ` +
      `ket qua chi dung de tham khao, KHONG dung de chot nguong.`
  );
}

// ─── Goi Jev cho tung ca ─────────────────────────────────────────────
async function askJev(state) {
  const res = await fetch(JEV_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JEV_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: JEV_MODEL, state, questions }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json())?.answers ?? {};
}

function predictionOf(answer) {
  if (kind === 'choice') return answer?.choice;
  if (kind === 'noul') return (answer?.noul ?? 0) >= 0.5;
  if (kind === 'score') return Math.round(answer?.score ?? -1);
  return undefined;
}

function confidenceOf(answer) {
  const c = answer?.confidence ?? answer?.conf;
  if (typeof c === 'number') return c;
  // Khong co truong confidence -> suy ra tu phan bo xac suat (max prob).
  if (answer?.probabilities) return Math.max(...Object.values(answer.probabilities));
  if (typeof answer?.noul === 'number') return Math.max(answer.noul, 1 - answer.noul);
  return 0;
}

const results = [];
let errors = 0;

for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  try {
    const answers = await askJev(c.state);
    const a = answers[field];
    results.push({
      id: c.id ?? String(i),
      label: c.label,
      pred: predictionOf(a),
      conf: confidenceOf(a),
    });
  } catch (e) {
    errors += 1;
    if (errors <= 3) console.error(`  loi o ca ${c.id ?? i}: ${e.message}`);
  }
  if ((i + 1) % 25 === 0) process.stdout.write(`\r  da chay ${i + 1}/${cases.length}`);
}
process.stdout.write('\n');

const scored = results.filter((r) => r.pred !== undefined);
scored.forEach((r) => {
  r.correct = kind === 'noul' ? Boolean(r.label) === r.pred : r.label === r.pred;
});

// ─── Bang reliability ────────────────────────────────────────────────
const BUCKETS = [
  [0.95, 1.01], [0.9, 0.95], [0.85, 0.9], [0.8, 0.85],
  [0.7, 0.8], [0.6, 0.7], [0.5, 0.6], [0, 0.5],
];

console.log(`\n=== RELIABILITY — task=${task} field=${field} (${scored.length} ca) ===\n`);
console.log('dai confidence |   n  | do chinh xac thuc te | lech');
console.log('---------------|------|----------------------|------');

const rows = [];
for (const [lo, hi] of BUCKETS) {
  const inBucket = scored.filter((r) => r.conf >= lo && r.conf < hi);
  if (!inBucket.length) continue;
  const acc = inBucket.filter((r) => r.correct).length / inBucket.length;
  const mid = (lo + Math.min(hi, 1)) / 2;
  const gap = acc - mid;
  rows.push({ lo, hi, n: inBucket.length, acc, gap });
  const flag = Math.abs(gap) > 0.1 ? (gap < 0 ? ' ← qua tu tin' : ' ← qua khiem ton') : '';
  console.log(
    `${lo.toFixed(2)}–${Math.min(hi, 1).toFixed(2)}     | ${String(inBucket.length).padStart(4)} | ` +
      `${(acc * 100).toFixed(1).padStart(18)}% | ${(gap * 100).toFixed(1).padStart(5)}${flag}`
  );
}

const overall = scored.filter((r) => r.correct).length / (scored.length || 1);
console.log(`\nDo chinh xac tong: ${(overall * 100).toFixed(1)}%  (loi goi API: ${errors})`);

// ─── De nghi nguong ──────────────────────────────────────────────────
// auto:    dai thap nhat ma tu do tro len van dat >= 95%
// confirm: dai thap nhat ma tu do tro len van dat >= 85%
function thresholdFor(target) {
  const sorted = [...scored].sort((a, b) => b.conf - a.conf);
  let correct = 0;
  let best = null;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].correct) correct += 1;
    const acc = correct / (i + 1);
    if (i + 1 >= 30 && acc >= target) best = sorted[i].conf;
  }
  return best;
}

const autoT = thresholdFor(0.95);
const confirmT = thresholdFor(0.85);

console.log('\n=== NGUONG DE NGHI ===');
console.log(`  auto    (>=95% dung): ${autoT !== null ? autoT.toFixed(3) : 'KHONG DAT — khong duoc tu dong hoa'}`);
console.log(`  confirm (>=85% dung): ${confirmT !== null ? confirmT.toFixed(3) : 'KHONG DAT'}`);

// ─── Quyet dinh di tiep hay dung ────────────────────────────────────
console.log('\n=== KET LUAN ===');
if (autoT !== null) {
  const covered = scored.filter((r) => r.conf >= autoT).length / scored.length;
  console.log(`  ✅ BAT DUOC che do tu dong cho ${(covered * 100).toFixed(0)}% luu luong (conf >= ${autoT.toFixed(3)}).`);
  console.log(`     Phan con lai di qua duong "can xac nhan" hoac deterministic.`);
} else if (confirmT !== null) {
  console.log('  ⚠️  CHI DUOC chay che do goi y co nguoi xac nhan. Khong tu dong hoa.');
} else {
  console.log('  ❌ HUY use case nay. Giu nguyen logic deterministic hien co.');
}

// ─── Ca nguy hiem nhat: tu tin nhung sai ─────────────────────────────
const confidentWrong = scored
  .filter((r) => !r.correct && r.conf >= 0.85)
  .sort((a, b) => b.conf - a.conf);

console.log(`\n=== TU TIN NHUNG SAI: ${confidentWrong.length} ca (doc ky, day la loai loi nguy hiem nhat) ===`);
confidentWrong.slice(0, 15).forEach((r) =>
  console.log(`  ${r.id}  conf=${r.conf.toFixed(3)}  doan="${r.pred}"  that="${r.label}"`)
);

const outPath = `jev_calibration_${task}_${field}.json`;
writeFileSync(outPath, JSON.stringify({ task, field, kind, overall, rows, autoT, confirmT, confidentWrong, results: scored }, null, 2));
console.log(`\nBao cao day du: ${outPath}\n`);
