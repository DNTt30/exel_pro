#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { workspaceRevision } from './agents/workspace.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const FRONTEND_DIR = join(ROOT_DIR, 'frontend');
const startRevision = workspaceRevision(ROOT_DIR);

console.log('='.repeat(60));
console.log('🚀 SCHEDULE APP — AGENT AUTONOMOUS EVALUATION LOOP');
console.log('='.repeat(60));

const results = {
  unitTests: { passed: false, score: 0, max: 35, detail: '' },
  lintClean: { passed: false, score: 0, max: 25, detail: '' },
  archIntegrity: { passed: false, score: 0, max: 20, detail: '' },
  guardrails: { passed: false, score: 0, max: 20, detail: '' }
};

// 1. UNIT TESTS (35 pts)
try {
  process.stdout.write('⏳ [1/4] Chạy Unit Test Suite (vitest)... ');
  const testOutput = execSync('npm run test', { cwd: FRONTEND_DIR, stdio: 'pipe', timeout: 120000, maxBuffer: 8 * 1024 * 1024 }).toString();
  results.unitTests.passed = true;
  results.unitTests.score = 35;
  results.unitTests.detail = testOutput.replace(/\u001b\[[0-9;]*m/g, '').match(/Tests\s+[^\r\n]+/)?.[0] || 'Toàn bộ bài test đều PASS.';
  console.log('✅ PASS (35/35)');
} catch (err) {
  results.unitTests.score = 0;
  results.unitTests.detail = [err.stdout?.toString(), err.stderr?.toString(), err.message].filter(Boolean).join('\n');
  console.log('❌ FAIL (0/35)');
}

// 2. LINT CLEAN (25 pts)
try {
  process.stdout.write('⏳ [2/4] Kiểm tra Code Quality (oxlint)... ');
  execSync('npm run lint -- --deny-warnings', { cwd: FRONTEND_DIR, stdio: 'pipe', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  results.lintClean.passed = true;
  results.lintClean.score = 25;
  results.lintClean.detail = '0 error, 0 warning (oxlint --deny-warnings).';
  console.log('✅ PASS (25/25)');
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
  } catch (error) { throw new Error(`Cannot scan ${dir}: ${error.message}`); }
  return found;
}

const componentFiles = ['components', 'pages'].flatMap(dir => scanFiles(join(FRONTEND_DIR, 'src', dir), f => f.endsWith('.jsx') || f.endsWith('.js')));
const violations = [];
for (const file of componentFiles) {
  const content = readFileSync(file, 'utf-8');
  if (content.includes('@supabase/supabase-js') || /(?:from\s*|import\s*\()(['"])[^'"]*lib\/supabase(?:\.js)?\1/.test(content)) {
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

// Build and every mandatory gate must pass; scores cannot override a failure.
try {
  execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'pipe', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  results.build = { passed: true, score: 0, max: 0, detail: 'Build passed' };
} catch (error) {
  results.build = { passed: false, score: 0, max: 0, detail: error.stdout?.toString() || error.message };
}
const finalRevision = workspaceRevision(ROOT_DIR);
const passed = Object.values(results).every(r => r.passed) && finalRevision === startRevision;
const totalScore = Object.values(results).reduce((sum, r) => sum + r.score, 0);
console.log(JSON.stringify({ passed, totalScore, revision: startRevision, unchanged: finalRevision === startRevision, results }, null, 2));
console.log('JEV_AUDIT_RESULT=' + JSON.stringify({ passed, revision: startRevision, results }));
console.log(passed ? 'PASS: machine checks passed. Independent code review still required.' : 'FAIL: a mandatory check failed or source changed during evaluation.');
if (!passed) process.exitCode = 1;
