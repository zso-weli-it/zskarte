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

/** A number is taken by an update when another entry uses it, or more than one entry does. */
export const isNumberTaken = (usedByDocumentIds: string[], documentId: string): boolean =>
  (usedByDocumentIds.length === 1 && usedByDocumentIds[0] !== documentId) || usedByDocumentIds.length > 1;

/** Two entries with one number are a race. The entry saved first (listed first) keeps the number. */
export const isLosingRace = (usedBy: string[], documentId: string): boolean =>
  usedBy.length > 1 && usedBy[0] !== documentId;

/** Moves a losing entry up until its number is free. Each new number is saved, and the final number is returned. */
export const renumberUntilFree = async (
  entry: { documentId: string; messageNumber: number },
  usageOf: (messageNumber: number) => Promise<string[]>,
  saveNumber: (documentId: string, messageNumber: number) => Promise<void>,
): Promise<number> => {
  let usedBy = await usageOf(entry.messageNumber);
  while (isLosingRace(usedBy, entry.documentId)) {
    entry.messageNumber += 1;
    await saveNumber(entry.documentId, entry.messageNumber);
    usedBy = await usageOf(entry.messageNumber);
  }
  return entry.messageNumber;
};
