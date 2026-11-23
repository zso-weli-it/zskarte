/**
 * A user may open an operation's live channel only while they belong to the operation's organisation.
 * The organisation is read from the database at connect time, so changes to its members apply at once.
 */
export const isMemberOfOperation = (
  user: { id: number },
  operation: { organization?: { users?: { id: number }[] } } | null,
): boolean => (operation?.organization?.users ?? []).some((member) => member.id === user.id);
