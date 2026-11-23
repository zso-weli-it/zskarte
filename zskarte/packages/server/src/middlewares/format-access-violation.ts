type AccessViolation = {
  message: string;
  url: string;
  ip: string;
  userAgent: string | undefined;
  userOrganisationId: unknown;
  jwtOperationId: unknown;
};

/**
 * One log line per violation. Values from the client (url, ip, user agent) are JSON encoded,
 * so a line break inside them cannot start a fake log line.
 */
export const formatAccessViolation = (violation: AccessViolation): string =>
  `[global::accessControl]: ${violation.message}, url:${JSON.stringify(violation.url)}, ` +
  `userOrganisationId:${violation.userOrganisationId}, jwtOperationId:${violation.jwtOperationId}, ` +
  `ip:${JSON.stringify(violation.ip)}, user-agent:${JSON.stringify(violation.userAgent)}`;
