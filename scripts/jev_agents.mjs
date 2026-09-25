#!/usr/bin/env node
// Local developer tooling, not an application backend. No model-generated commands.
import { readFileSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { workspaceRevision } from './agents/workspace.mjs';
import { developerPlan } from './agents/developerPlan.mjs';
import { createCodexAdapter } from './agents/codexAdapter.mjs';
import { agentDecisionState, agentOptions, chooseAgentStep, runAgentWorkflow, validateAgentState } from '../frontend/src/utils/agentArbiter.js';
import { questionsFor, validateAnswers, JEV_API_URL } from '../supabase/functions/_shared/jevContract.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : null;
const live = args.includes('--live'), demo = args.includes('--demo'), codex = args.includes('--codex'), run = args.includes('--run') || codex;
const key = process.env.TYPESAFE_API_KEY;
if (args.includes('--help')) {
  console.log('node scripts/jev_agents.mjs [--state state.json] [--live]\n  --demo: simulate agent adapters, no code edits or provider calls\n  --codex --task-file objective.txt [--review-only]: run local Codex CLI agents and machine checks\n  --run --adapter path.mjs: run explicitly supplied real agent adapters\n  --live: call Jev with TYPESAFE_API_KEY from environment; sends only task metadata');
  process.exit(0);
}
if (live && !key) throw new Error('Set TYPESAFE_API_KEY in the process environment; never use VITE_ for this secret');
if (demo && live || demo && run) throw new Error('Demo cannot be combined with --live or --run');
const revision = workspaceRevision(root);
const state = value('--state') ? JSON.parse(readFileSync(resolve(value('--state')), 'utf8').replace(/^\uFEFF/, '')) : developerPlan(revision);
if (args.includes('--review-only')) {
  if (!codex || value('--state')) throw new Error('--review-only requires --codex without --state');
  state.tasks = state.tasks.filter(t => !['analyze', 'implement'].includes(t.id)).map(t => ({ ...t, dependsOn: t.dependsOn.filter(id => id !== 'implement'), maxAttempts: 1 }));
}
validateAgentState(state);
if (state.mode !== 'development' || state.revision !== revision) throw new Error('STATE_REVISION_MISMATCH: refresh state/evidence for the current workspace');

async function decide(current, signal) {
  if (!live) return null;
  const metadata = agentDecisionState(current), questions = questionsFor('agent_next_step', metadata);
  const response = await fetch(JEV_API_URL, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.JEV_MODEL || 'jev-latest', state: metadata, questions }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(1800)]) : AbortSignal.timeout(1800),
  });
  if (!response.ok) throw new Error(`JEV_HTTP_${response.status}`);
  return validateAnswers((await response.json()).answers, questions);
}
if (demo) {
  let evidence = {};
  const result = await runAgentWorkflow(state, {
    execute: async task => {
      if (task.id === 'verify') evidence = { checks: Object.fromEntries(['tests','lint','build'].map(k => [k, { status: 'passed', revision }])), review: { status: 'approved', revision, author: 'demo_coder', reviewer: 'demo_reviewer' } };
      return { simulated: true, role: task.role };
    },
    getRevision: () => revision, collectEvidence: () => evidence,
  });
  console.log(JSON.stringify({ simulation: true, providerCalled: false, ...result }, null, 2));
} else if (run) {
  let adapter;
  if (codex) {
    const taskFile = value('--task-file');
    if (!taskFile || value('--adapter')) throw new Error('--codex requires --task-file and cannot combine --adapter');
    adapter = createCodexAdapter({ root, objective: readFileSync(resolve(taskFile), 'utf8').replace(/^\uFEFF/, ''), readOnly: args.includes('--review-only') });
  } else {
    const file = value('--adapter');
    if (!file) throw new Error('--run requires --adapter: module exporting execute and collectEvidence');
    const absolute = resolve(root, file), rel = relative(root, absolute);
    if (rel.startsWith('..') || isAbsolute(rel) || !absolute.endsWith('.mjs')) throw new Error('Adapter must be an explicitly selected .mjs file inside this repository');
    adapter = await import(pathToFileURL(absolute).href);
  }
  if (typeof adapter.execute !== 'function' || typeof adapter.collectEvidence !== 'function') throw new Error('INVALID_ADAPTER');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  const result = await runAgentWorkflow(state, { execute: adapter.execute, collectEvidence: adapter.collectEvidence, getRevision: () => workspaceRevision(root), decide, signal: controller.signal, timeoutMs: 300000, onEvent: event => console.error(JSON.stringify(event)) });
  process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
  console.log(JSON.stringify(result, null, 2));
  if (result.action !== 'DONE') process.exitCode = 1;
} else {
  let answers = null, providerError = null;
  try { if (live && agentOptions(state).length > 1) answers = await decide(state); }
  catch (error) { providerError = error.message; }
  console.log(JSON.stringify({ revision, decision: chooseAgentStep(state, answers), providerError, executable: false, state }, null, 2));
}
