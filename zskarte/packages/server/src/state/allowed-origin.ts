/** The origin (scheme, host, port) of the app. Stops the start with a clear message if ZSK_APP_URL is not a URL. */
export const appOrigin = (appUrl: string): string => {
  try {
    return new URL(appUrl).origin;
  } catch (error) {
    throw new Error(`ZSK_APP_URL is not a valid URL: "${appUrl}"`, { cause: error });
  }
};

/**
 * Browsers send the address of the page as Origin. Only the app's own origin may open a socket.
 * Requests without Origin do not come from a browser, so a cross-site page cannot send them.
 */
export const isAllowedOrigin = (origin: string | undefined, allowedOrigin: string): boolean =>
  origin === undefined || origin === allowedOrigin;
