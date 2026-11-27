export const AccessTypes = {
  READ: 'read',
  WRITE: 'write',
} as const;
export type AccessType = (typeof AccessTypes)[keyof typeof AccessTypes];
