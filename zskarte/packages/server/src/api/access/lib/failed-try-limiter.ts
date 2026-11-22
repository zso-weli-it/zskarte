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

  return {
    isBlocked: (key: string, now = Date.now()): boolean => recent(key, now).length >= maxTries,
    recordFailure: (key: string, now = Date.now()): void => {
      failures.set(key, [...recent(key, now), now]);
    },
  };
};
