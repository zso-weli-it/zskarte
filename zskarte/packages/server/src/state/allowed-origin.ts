/**
 * Browsers send the address of the page as Origin. Only the app's own origin may open a socket.
 * Requests without Origin do not come from a browser, so a cross-site page cannot send them.
 */
export const isAllowedOrigin = (origin: string | undefined, appUrl: string): boolean =>
  origin === undefined || origin === new URL(appUrl).origin;
