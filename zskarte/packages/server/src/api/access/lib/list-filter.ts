/**
 * Adds the operation condition to the filter set by accessControl without replacing it.
 * Replacing it would drop the organisation (or share-token operation) restriction.
 */
export const withOperationFilter = (filters: Record<string, unknown> | undefined, operationId: string) => ({
  $and: [filters ?? {}, { operation: { documentId: { $eq: operationId } } }],
});
