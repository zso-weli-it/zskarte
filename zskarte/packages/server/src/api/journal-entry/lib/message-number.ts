/**
 * Decides the messageNumber of a new journal entry. Same rules as before:
 * - positive submitted number: used as is, unless it is already taken (conflict)
 * - negative submitted number (offline patch): its positive twin, if still free
 * - otherwise: highest existing number + 1
 * `automatic` is true when the server picked the number (a later clash may then be fixed by renumbering).
 */
export type MessageNumberChoice =
  | { conflict: true; messageNumber?: undefined; automatic?: undefined }
  | { conflict: false; messageNumber: number; automatic: boolean };

export const chooseMessageNumber = async (
  submitted: number | null | undefined,
  isTaken: (n: number) => Promise<boolean>,
  highestExisting: () => Promise<number>,
): Promise<MessageNumberChoice> => {
  if (submitted && submitted > 0) {
    if (await isTaken(submitted)) return { conflict: true };
    return { conflict: false, messageNumber: submitted, automatic: false };
  }
  if (submitted && submitted < 0 && !(await isTaken(-submitted))) {
    return { conflict: false, messageNumber: -submitted, automatic: true };
  }
  return { conflict: false, messageNumber: (await highestExisting()) + 1, automatic: true };
};
