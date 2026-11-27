import type { Core } from '@strapi/strapi';
import { Access } from '../../../definitions';

/** A share link works only while it is active and has not expired. */
export const isShareAccessUsable = (
  access: Pick<Access, 'active' | 'expiresOn'>,
  now = Date.now(),
): boolean => access.active === true && (!access.expiresOn || new Date(access.expiresOn).getTime() >= now);

/**
 * A login token keeps working only as long as its share link exists. Deleting the link revokes the token,
 * so the link is looked up again on every use instead of trusting the token alone.
 */
export const isShareLinkUsable = async (strapi: Core.Strapi, accessId: string | undefined): Promise<boolean> => {
  if (!accessId) return false;
  const access = (await strapi.documents('api::access.access').findOne({ documentId: accessId })) as Access | null;
  return access !== null && isShareAccessUsable(access);
};
