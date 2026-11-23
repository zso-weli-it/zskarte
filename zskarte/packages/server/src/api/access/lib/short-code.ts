type DeleteMany = (params: { where: Record<string, unknown> }) => Promise<{ count: number }>;

/**
 * Short codes are single use. The delete matches the code itself, so when two requests race for
 * the same code only one of them deletes a row.
 */
export const claimShortCode = async (deleteMany: DeleteMany, documentId: string, accessToken: string): Promise<boolean> => {
  const { count } = await deleteMany({ where: { documentId, accessToken } });
  return count > 0;
};
