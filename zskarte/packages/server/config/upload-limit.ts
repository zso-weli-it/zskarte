const DEFAULT_MEGABYTES = 50;

/**
 * Largest accepted upload in bytes. Map layer files are parsed in memory, so the limit protects the server.
 * Set ZSK_MAX_UPLOAD_MB in deploy.env to change it.
 */
export const uploadSizeLimitBytes = (megabytes: string | undefined): number => {
  const value = Number(megabytes ?? DEFAULT_MEGABYTES);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`ZSK_MAX_UPLOAD_MB must be a positive number of megabytes, got "${megabytes}"`);
  }
  return Math.floor(value * 1024 * 1024);
};
