/** One cancellable budget, including stalled promises that ignore AbortSignal. */
export function createCopilotRequest(parentSignal, totalMs = 90000) {
  const controller = new AbortController();
  let idleTimer;
  const timeout = () => controller.abort(Object.assign(new Error('Trợ lý phản hồi quá chậm. Anh/chị có thể thử lại.'), { status: 408 }));
  const totalTimer = setTimeout(timeout, totalMs);
  const abort = () => controller.abort(parentSignal.reason);
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    heartbeat() { clearTimeout(idleTimer); idleTimer = setTimeout(timeout, 30000); },
    wait(promise) {
      return new Promise((resolve, reject) => {
        const cancelled = () => reject(controller.signal.reason);
        if (controller.signal.aborted) { Promise.resolve(promise).catch(() => {}); cancelled(); return; }
        controller.signal.addEventListener('abort', cancelled, { once: true });
        Promise.resolve(promise).then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', cancelled));
      });
    },
    dispose() { clearTimeout(totalTimer); clearTimeout(idleTimer); parentSignal?.removeEventListener('abort', abort); },
  };
}
