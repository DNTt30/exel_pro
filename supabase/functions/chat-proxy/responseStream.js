/** Bound the upstream body as well as headers; cancel it on client disconnect. */
export function boundedResponseBody(body, signal) {
  if (!body) return null;
  const reader = body.getReader();
  let ended = false, idleTimer, totalTimer, output;
  const cleanup = () => { clearTimeout(idleTimer); clearTimeout(totalTimer); signal?.removeEventListener('abort', abort); };
  const stop = error => {
    if (ended) return;
    ended = true; cleanup();
    void reader.cancel().catch(() => {});
    if (error) output.error(error);
  };
  const abort = () => stop(signal.reason || new Error('Request cancelled'));
  const timeout = () => stop(new Error('Upstream response timeout'));
  const heartbeat = () => { clearTimeout(idleTimer); idleTimer = setTimeout(timeout, 30000); };
  return new ReadableStream({
    start(controller) {
      output = controller;
      totalTimer = setTimeout(timeout, 90000); heartbeat();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (ended) return;
        if (done) { ended = true; cleanup(); controller.close(); }
        else { heartbeat(); controller.enqueue(value); }
      } catch (error) { stop(error); }
    },
    cancel() { stop(); },
  });
}
