import { createFailedTryLimiter } from './failed-try-limiter';

const TOTAL_KEY = 'all clients';

/**
 * Six digit codes can be guessed, so wrong codes are limited per client and for all clients together.
 * Without the total limit, many clients (many addresses) could each stay under their own limit.
 */
export const createCodeGuessGuard = (
  perClient: { maxTries: number; windowMs: number },
  total: { maxTries: number; windowMs: number },
) => {
  const perClientLimiter = createFailedTryLimiter(perClient.maxTries, perClient.windowMs);
  const totalLimiter = createFailedTryLimiter(total.maxTries, total.windowMs);
  return {
    isBlocked: (ip: string, now = Date.now()): boolean =>
      perClientLimiter.isBlocked(ip, now) || totalLimiter.isBlocked(TOTAL_KEY, now),
    recordFailure: (ip: string, now = Date.now()): void => {
      perClientLimiter.recordFailure(ip, now);
      totalLimiter.recordFailure(TOTAL_KEY, now);
    },
  };
};
