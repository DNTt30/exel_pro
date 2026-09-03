#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const FRONTEND_DIR = join(ROOT_DIR, 'frontend');

console.log('='.repeat(60));
console.log('🚀 SCHEDULE APP — AGENT AUTONOMOUS EVALUATION LOOP');
console.log('='.repeat(60));

let score = 0;
const results = {
  unitTests: { passed: false, score: 0, max: 35, detail: '' },
  lintClean: { passed: false, score: 0, max: 25, detail: '' },
  archIntegrity: { passed: false, score: 0, max: 20, detail: '' },
  guardrails: { passed: false, score: 0, max: 20, detail: '' }
};

// 1. UNIT TESTS (35 pts)
try {
  process.stdout.write('⏳ [1/4] Chạy Unit Test Suite (vitest)... ');
  const testOutput = execSync('npm run test', { cwd: FRONTEND_DIR, stdio: 'pipe' }).toString();
  results.unitTests.passed = true;
  results.unitTests.score = 35;
  results.unitTests.detail = 'Toàn bộ bài test đều PASS.';
  console.log('✅ PASS (35/35)');
} catch (err) {
  results.unitTests.score = 0;
  results.unitTests.detail = err.stdout?.toString() || err.message;
  console.log('❌ FAIL (0/35)');
}

// 2. LINT CLEAN (25 pts)
try {
  process.stdout.write('⏳ [2/4] Kiểm tra Code Quality (oxlint)... ');
  const lintOutput = execSync('npm run lint', { cwd: FRONTEND_DIR, stdio: 'pipe' }).toString();
  const warningCount = (lintOutput.match(/warning/g) || []).length;
  if (warningCount === 0) {
    results.lintClean.passed = true;
    results.lintClean.score = 25;
    results.lintClean.detail = '0 error, 0 warning.';
    console.log('✅ PASS (25/25)');
  } else {
    // Trừ 3 điểm cho mỗi warning
    const penalty = Math.min(25, warningCount * 3);
    results.lintClean.score = 25 - penalty;
    results.lintClean.detail = `Phát hiện ${warningCount} warnings. Cần dọn dẹp.`;
    console.log(`⚠️ WARNING (${results.lintClean.score}/25) - ${warningCount} warnings`);
  }
} catch (err) {
  results.lintClean.score = 0;
  results.lintClean.detail = err.stdout?.toString() || err.message;
  console.log('❌ FAIL (0/25)');
}

// 3. ARCHITECTURE INTEGRITY (20 pts)
// Rule: Không component nào được import trực tiếp @supabase/supabase-js
process.stdout.write('⏳ [3/4] Quét vi phạm kiến trúc (Direct Supabase imports in components)... ');
function scanFiles(dir, filter, found = []) {
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) {
        scanFiles(full, filter, found);
      } else if (filter(full)) {
        found.push(full);
      }
    }
  } catch (_) {}
  return found;
}

const componentFiles = scanFiles(join(FRONTEND_DIR, 'src', 'components'), f => f.endsWith('.jsx') || f.endsWith('.js'));
const violations = [];
for (const file of componentFiles) {
  const content = readFileSync(file, 'utf-8');
  if (content.includes('@supabase/supabase-js') || content.includes("from '../lib/supabase'") || content.includes('from "@/lib/supabase"')) {
    violations.push(file);
  }
}

if (violations.length === 0) {
  results.archIntegrity.passed = true;
  results.archIntegrity.score = 20;
  results.archIntegrity.detail = 'Tất cả components đều giao tiếp chuẩn qua api.js.';
  console.log('✅ PASS (20/20)');
} else {
  results.archIntegrity.score = 0;
  results.archIntegrity.detail = `Vi phạm: ${violations.join(', ')}`;
  console.log(`❌ FAIL (0/20) - Bypass api.js tại ${violations.length} files`);
}

// 4. GUARDRAILS CHECK (20 pts)
// Rule: Login password check và MA_RE regex phải nguyên bản
process.stdout.write('⏳ [4/4] Kiểm tra phanh an toàn (Auth & Secrets Guardrails)... ');
let guardrailViolations = [];
try {
  const authSliceContent = readFileSync(join(FRONTEND_DIR, 'src', 'store', 'slices', 'authSlice.js'), 'utf-8');
  if (!authSliceContent.includes("password === '1'")) {
    guardrailViolations.push("Mật khẩu mặc định trong authSlice.js bị thay đổi!");
  }
  const constContent = readFileSync(join(FRONTEND_DIR, 'src', 'data', 'constants.js'), 'utf-8');
  if (!constContent.includes('MA_RE = /^\\d{9}$/')) {
    guardrailViolations.push("Regex mã NV 9 số MA_RE bị thay đổi!");
  }
} catch (e) {
  guardrailViolations.push(e.message);
}

if (guardrailViolations.length === 0) {
  results.guardrails.passed = true;
  results.guardrails.score = 20;
  results.guardrails.detail = 'Phanh an toàn Auth và Constants nguyên vẹn.';
  console.log('✅ PASS (20/20)');
} else {
  results.guardrails.score = 0;
  results.guardrails.detail = guardrailViolations.join('; ');
  console.log(`❌ FAIL (0/20) - Vi phạm: ${results.guardrails.detail}`);
}

// TỔNG KẾT
const totalScore = Object.values(results).reduce((sum, r) => sum + r.score, 0);
console.log('\n' + '='.repeat(60));
console.log(`🎯 ĐIỂM ĐÁNH GIÁ TỰ CHẤM (EVAL SCORE): ${totalScore}/100`);
console.log(`📊 KẾT LUẬN NGHIỆM THU: ${totalScore >= 90 ? '🟢 PASS (SẴN SÀNG RELEASE)' : totalScore >= 70 ? '🟡 CẦN SỬA CHỮA THÊM' : '🔴 FAIL (CẦN SỬA GẤP)'}`);
console.log('='.repeat(60));

if (totalScore < 90) {
  process.exitCode = 1;
}
