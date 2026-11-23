/** An operation cache that nobody has used for this long is dropped from memory. */
export const EVICT_AFTER_MS = 30 * 60 * 1000;

/**
 * A cache may be dropped only when no one is connected, nothing is waiting to be saved, and it has been
 * unused for a while. Reloading it later from the database gives the same state.
 */
export const isEvictable = (
  cache: { connections: unknown[]; mapStateChanged: boolean; lastUsed: number },
  now: number,
): boolean => cache.connections.length === 0 && !cache.mapStateChanged && now - cache.lastUsed > EVICT_AFTER_MS;
