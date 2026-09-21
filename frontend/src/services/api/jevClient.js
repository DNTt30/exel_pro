// =====================================================================
// frontend/src/utils/jev/jevClient.js
//
// Cau noi duy nhat tu app -> Edge Function jev-decide.
// Quy tac song con: HAM NAY KHONG BAO GIO NEM LOI.
// Moi truong hop that bai deu tra ve null, va noi goi BAT BUOC phai co
// duong deterministic chay tiep. Tat Jev = app van chay y nhu hom nay.
// =====================================================================

import { supabase } from '../../lib/supabase';

const FN_URL = import.meta.env.VITE_JEV_FN_URL || '';
const CLIENT_TIMEOUT_MS = 2500; // > timeout phia server (2000ms) mot chut

// Bat/tat tung use case ma khong can deploy lai. Mac dinh TAT HET.
// Chi bat sau khi use case do qua duoc cong hieu chinh JEV-02.
const FLAGS = {
  notification_routing: import.meta.env.VITE_JEV_UC3 === 'on',
  staffing_gap_triage: import.meta.env.VITE_JEV_UC1 === 'on',
  candidate_ranking: import.meta.env.VITE_JEV_UC2 === 'on',
  lock_readiness: import.meta.env.VITE_JEV_UC4 === 'on',
};

export function jevEnabled(task) {
  return Boolean(FN_URL && FLAGS[task]);
}

/**
 * Goi Jev cho mot task da duoc whitelist phia server.
 * @returns {Promise<Object|null>} answers, hoac null khi bat ky dieu gi tro trot.
 */
export async function jevDecide(task, state, questions = undefined) {
  if (!jevEnabled(task)) return null;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null; // chua dang nhap -> khong goi

    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(questions ? { task, state, questions } : { task, state }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json?.ok ? json.answers : null;
  } catch {
    return null; // timeout, mat mang, CORS... deu ve mot moi: dung duong cu
  }
}

// ─── DOC DAP AN AN TOAN ──────────────────────────────────────────────
// Answer cua Jev co the la:
//   noul   -> { type:'noul',   noul: 0.94, confidence }
//   choice -> { type:'choice', choice:'billing', probabilities:{...}, confidence }
//   score  -> { type:'score',  score: 1.8, probabilities:{...}, confidence }
// Score tra ve VI TRI tren thang bac (co the la so le, vd 1.8 nam giua bac 1 va 2),
// khong phai 0..1. Muon 0..1 thi tu chia cho (so bac - 1).

export function readNoul(answers, key, fallback = null) {
  const v = answers?.[key]?.noul;
  return typeof v === 'number' ? v : fallback;
}

export function readChoice(answers, key, fallback = null) {
  const v = answers?.[key]?.choice;
  return typeof v === 'string' ? v : fallback;
}

export function readScore(answers, key, fallback = null) {
  const v = answers?.[key]?.score;
  return typeof v === 'number' ? v : fallback;
}

export function readConfidence(answers, key, fallback = 0) {
  const a = answers?.[key];
  const v = a?.confidence ?? a?.conf;
  return typeof v === 'number' ? v : fallback;
}

/**
 * Chuyen confidence thanh 1 trong 3 dai hanh dong.
 * NGUONG DUOI DAY LA CHO TAM — phai thay bang so do duoc tu JEV-02
 * tren du lieu that cua tung use case truoc khi bat that.
 */
export const PLACEHOLDER_BANDS = { auto: 0.9, confirm: 0.65 };

export function band(confidence, bands = PLACEHOLDER_BANDS) {
  if (confidence >= bands.auto) return 'auto';
  if (confidence >= bands.confirm) return 'confirm';
  return 'human';
}
