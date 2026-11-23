/**
 * Counts wrong share codes per client and blocks a client once it has too many in a time window.
 * shortcut: in-memory per process, one server process assumed; use a shared store if scaled out.
 */
export const createFailedTryLimiter = (maxTries: number, windowMs: number) => {
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number): number[] => {
    const kept = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
    if (kept.length) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  };

  // clients that stopped failing are dropped too, otherwise the map grows with every address that ever failed.
  // Scanning the whole map on every failure would cost time per failure, so it runs once per window.
  let lastForget = -Infinity;
  const forgetExpired = (now: number) => {
    if (now - lastForget < windowMs) return;
    lastForget = now;
    for (const key of [...failures.keys()]) recent(key, now);
  };

  return {
    isBlocked: (key: string, now = Date.now()): boolean => recent(key, now).length >= maxTries,
    recordFailure: (key: string, now = Date.now()): void => {
      forgetExpired(now);
      failures.set(key, [...recent(key, now), now]);
    },
    trackedClients: (): number => failures.size,
  };
};
