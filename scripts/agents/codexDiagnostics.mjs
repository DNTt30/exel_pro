export function codexEvents(stdout = '') {
  return stdout.split(/\r?\n/).flatMap(line => { try { const event = JSON.parse(line); return event && typeof event === 'object' && !Array.isArray(event) ? [event] : []; } catch { return []; } });
}

export function codexFailure(result) {
  const messages = codexEvents(result.stdout).flatMap(event => event.type === 'error' ? [event.message] : event.type === 'turn.failed' ? [event.error?.message] : []).filter(message => typeof message === 'string');
  const detail = [...messages, result.stderr || ''].join('\n');
  let code = `CODEX_EXIT_${result.code}`, retryable = true;
  if (/usage limit|usage_limit|quota exceeded/i.test(detail)) { code = 'CODEX_USAGE_LIMIT'; retryable = false; }
  else if (/not logged in|unauthenticated|unauthorized|authentication failed|invalid api key/i.test(detail)) { code = 'CODEX_AUTH_REQUIRED'; retryable = false; }
  const error = new Error(code);
  error.code = code;
  error.retryable = retryable;
  // Preserve the provider's wording as a hint, not a parsed deadline or approval
  // to retry automatically. Relative times have an unspecified timezone.
  if (code === 'CODEX_USAGE_LIMIT') error.retryAfterHint = detail.match(/try again at ([^\r\n]+?)(?:\.(?:\s|$)|$)/i)?.[1]?.slice(0, 160) || null;
  return error;
}
