import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';
export function workspaceRevision(root) {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024 }).split('\0').filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const file of new Set(files)) {
    if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')) continue;
    if (file.startsWith('schedule-app/')) continue;
    hash.update(file + '\0');
    const path = resolve(root, file);
    try { const stat = lstatSync(path); hash.update(stat.isSymbolicLink() ? readlinkSync(path) : readFileSync(path)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; hash.update('[deleted]'); }
    hash.update('\0');
  }
  return hash.digest('hex');
}
