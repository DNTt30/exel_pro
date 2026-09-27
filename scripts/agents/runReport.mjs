import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const cell = value => String(value ?? '—').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
export function nextStepFor(result, simulation = false) {
  if (simulation) return 'Đây là demo giả lập; chưa có approval hoặc kiểm thử Codex thật.';
  const failures = (result.state?.tasks || []).map(t => t.failure).filter(Boolean);
  if (failures.some(f => f.code === 'CODEX_USAGE_LIMIT')) return 'Chờ quota Codex hoặc kiểm tra gói sử dụng, rồi khởi chạy lượt mới. Không tự retry.';
  if (failures.some(f => f.code === 'CODEX_AUTH_REQUIRED')) return 'Đăng nhập Codex CLI trên máy rồi khởi chạy lượt mới.';
  if (result.state?.review?.status === 'rejected') return 'Xử lý các finding trong review, sau đó chạy review và kiểm thử trên revision mới.';
  if (result.action === 'DONE') return 'Các bước bắt buộc đã hoàn tất. Báo cáo này không tự commit, deploy hoặc cấp quyền cho lượt chạy khác.';
  return 'Đọc nguyên nhân và log local; giữ lại thay đổi, xử lý lỗi rồi khởi chạy lượt mới.';
}

export function createRunReport({ root, artifactDir, simulation = false, jevRequested = false }) {
  const directory = artifactDir || join(root, 'artifacts', 'jev-agents', randomUUID());
  mkdirSync(directory, { recursive: true });
  const path = join(directory, 'run-report.json');
  const startedAt = new Date().toISOString();
  const decisions = { rules: 0, jev: 0 };
  const write = report => { writeFileSync(`${path}.tmp`, JSON.stringify(report, null, 2)); renameSync(`${path}.tmp`, path); };
  write({ version: 1, status: 'RUNNING', startedAt, simulation, jevRequested });
  return {
    path,
    record(event) {
      if (event.type === 'decision' && Object.hasOwn(decisions, event.decision?.source)) decisions[event.decision.source]++;
      appendFileSync(join(directory, 'workflow-events.jsonl'), JSON.stringify(event) + '\n');
    },
    finish(result) {
      const report = {
        version: 1, status: result.action, reason: result.reason || null, startedAt, finishedAt: new Date().toISOString(),
        simulation, jevRequested, decisions, revision: result.state.revision, mode: result.state.mode,
        tasks: result.state.tasks.map(t => ({ id: t.id, status: t.status === 'running' ? 'cancel_requested' : t.status, attempts: t.attempts, failure: t.failure || null })),
        checks: result.state.checks || {}, review: result.state.review || null,
        findings: Object.entries(result.outputs || {}).filter(([id, output]) => id.endsWith('_review') && Array.isArray(output?.findings)).flatMap(([id, output]) => output.findings.filter(text => typeof text === 'string').map(text => ({ agent: id, text }))),
        nextStep: nextStepFor(result, simulation),
      };
      write(report);
      const rows = report.tasks.map(t => `| ${cell(t.id)} | ${cell(t.status)} | ${t.attempts} | ${cell(t.failure?.code || t.failure?.message)} |`).join('\n');
      const findings = report.findings.map(f => `- ${cell(f.agent)}: ${cell(f.text)}`).join('\n');
      writeFileSync(join(directory, 'run-report.md'), `# Báo cáo điều phối agent\n\nTrạng thái: **${report.status}**${simulation ? ' (giả lập)' : ''}\n\nRevision: \`${report.revision}\`\n\nLý do: ${cell(report.reason)}\n\n${report.nextStep}\n\n| Agent | Trạng thái | Số lượt | Lỗi |\n|---|---|---|---|\n${rows}\n\n${findings || 'Không có finding được trả về; điều này không đồng nghĩa review đã approve.'}\n`);
      return report;
    },
  };
}

export function latestRunReport(root) {
  const directory = join(root, 'artifacts', 'jev-agents');
  if (!existsSync(directory)) return null;
  const files = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(directory, entry.name, 'run-report.json')).filter(existsSync).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!files.length) return null;
  const path = files[0];
  try {
    const report = JSON.parse(readFileSync(path, 'utf8'));
    if (report?.version === 1 && typeof report.simulation === 'boolean' && typeof report.startedAt === 'string' && ['RUNNING', 'DONE', 'ESCALATE'].includes(report.status) && (report.status === 'RUNNING' || typeof report.revision === 'string' && Array.isArray(report.tasks))) return { ...report, reportPath: path };
  }
  catch { /* Never replace a broken latest report with an older successful run. */ }
  return { status: 'UNREADABLE_REPORT', reportPath: path, reason: 'The latest report is incomplete or has an unsupported format.' };
}
