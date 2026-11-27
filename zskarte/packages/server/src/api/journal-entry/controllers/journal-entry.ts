/**
 * journal-entry controller
 */

import { factories } from '@strapi/strapi';
import { updateJournal } from '../../../state/journal';
import { chooseMessageNumber, isLosingRace, isNumberTaken, renumberUntilFree } from '../lib/message-number';
import { errors } from '@strapi/utils';
import fp from 'lodash/fp';

// documentIds of the entries in the operation that use this message number, the earliest saved first
const findNumberUsage = async (messageNumber: number, operationId: string, organizationId: string): Promise<string[]> =>
  (
    await strapi.documents('api::journal-entry.journal-entry').findMany({
      filters: {
        messageNumber,
        operation: { documentId: { $eq: operationId } },
        organization: { documentId: { $eq: organizationId } },
      },
      sort: { createdAt: 'asc' },
      fields: ['documentId' as any],
    })
  ).map((entry) => entry.documentId);

export default factories.createCoreController('api::journal-entry.journal-entry', ({ strapi }) => ({
  async byNumber(ctx) {
    await this.validateQuery(ctx);
    ctx.query.filters['messageNumber'] = ctx.params.number;
    //operation and organization filter is added by accessControl
    const entry = await strapi.documents('api::journal-entry.journal-entry').findFirst(ctx.query);
    const sanitizedResults = await this.sanitizeOutput(entry, ctx);
    return this.transformResponse(sanitizedResults);
  },
  async create(ctx) {
    const { identifier }: { identifier: string } = ctx.request.headers as any;
    if (!identifier) {
      ctx.status = 400;
      return { message: 'Missing headers: identifier' };
    }

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const { body = {} } = ctx.request;
    if (!fp.isObject(body.data)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }
    await this.validateInput(body.data, ctx);
    const sanitizedInputData = (await this.sanitizeInput(body.data, ctx)) as any;

    const { db } = strapi;
    return await db.transaction(async ({ trx }) => {
      // serialise number assignment per operation: concurrent saves would otherwise read the same max number
      // (messageNumber has no unique index). The lock is released automatically at commit/rollback.
      await trx.raw('select pg_advisory_xact_lock(hashtext(?))', [`journal:${sanitizedInputData.operation}`]);
      const usageOf = (messageNumber: number) =>
        findNumberUsage(messageNumber, sanitizedInputData.operation, sanitizedInputData.organization);

      const messageNumber = sanitizedInputData.messageNumber;
      const choice = await chooseMessageNumber(
        messageNumber,
        async (n) => (await usageOf(n)).length > 0,
        async () => {
          //if not submitted find highest number
          const entry = await strapi.documents('api::journal-entry.journal-entry').findFirst({
            filters: {
              operation: { documentId: { $eq: sanitizedInputData.operation } },
              organization: { documentId: { $eq: sanitizedInputData.organization } },
            },
            sort: { messageNumber: 'desc' },
            fields: ['messageNumber'],
          });
          return entry?.messageNumber || 0;
        },
      );
      //if messageNumber is submitted and already exist return error
      if (choice.conflict) {
        ctx.status = 409;
        return { message: `messageNumber ${messageNumber} already exist` };
      }
      sanitizedInputData.messageNumber = choice.messageNumber;
      //null = the client's own number: a race can only be reported, not renumbered
      const nextMessageNumber = choice.automatic ? choice.messageNumber : null;

      //insert journal entry
      const entity = await strapi.documents('api::journal-entry.journal-entry').create({
        ...sanitizedQuery,
        data: sanitizedInputData,
      });
      const sanitizedEntity = (await this.sanitizeOutput(entity, ctx)) as any;

      //a race can give the new entry a number that another entry just took
      if (isLosingRace(await usageOf(sanitizedEntity.messageNumber), sanitizedEntity.documentId)) {
        //a submitted number cannot be changed, so the save fails and the transaction is rolled back
        if (nextMessageNumber === null) {
          throw new errors.ValidationError(`messageNumber ${messageNumber} already exist`);
        }
        await renumberUntilFree(sanitizedEntity, usageOf, async (documentId, number) => {
          await strapi.documents('api::journal-entry.journal-entry').update({
            documentId,
            data: { messageNumber: number },
          });
        });
      }
      updateJournal(identifier, sanitizedInputData.operation, sanitizedEntity);
      ctx.status = 201;
      return this.transformResponse(sanitizedEntity);
    });
  },
  async update(ctx) {
    const { identifier }: { identifier: string } = ctx.request.headers as any;
    if (!identifier) {
      ctx.status = 400;
      return { message: 'Missing headers: identifier' };
    }
    const { id } = ctx.params;
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const { body = {} } = ctx.request;
    if (!fp.isObject(body.data)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }
    await this.validateInput(body.data, ctx);
    const sanitizedInputData = (await this.sanitizeInput(body.data, ctx)) as any;

    let documentId: string;
    let entry: any;
    let uuid: string;
    if (id.length >= 36) {
      //it's an uuidv4, fetch documentId & operationId
      uuid = id;
      entry = await strapi.documents('api::journal-entry.journal-entry').findFirst({
        filters: { uuid },
        fields: ['documentId' as any],
        populate: {
          operation: { fields: ['documentId' as any] },
          organization: { fields: ['documentId' as any] },
        },
      });
      if (!entry) return ctx.notFound('Journal entry not found');
      documentId = entry.documentId;
      ctx.params.id = documentId;
    } else {
      documentId = id;
      //fetch operationId
      entry = await strapi.documents('api::journal-entry.journal-entry').findOne({
        documentId,
        fields: ['uuid'],
        populate: {
          operation: { fields: ['documentId' as any] },
          organization: { fields: ['documentId' as any] },
        },
      });
      if (!entry) return ctx.notFound('Journal entry not found');
      uuid = entry.uuid;
    }
    const operationId = entry.operation.documentId;
    const organizationId = entry.organization.documentId;

    if ('messageNumber' in sanitizedInputData) {
      if (!sanitizedInputData.messageNumber || sanitizedInputData.messageNumber < 0){
        ctx.status = 409;
        return { message: `messageNumber ${sanitizedInputData.messageNumber} not valid` };
      }
    }

    //check the number and update under the same per-operation lock as create, so two saves cannot take one number
    const { db } = strapi;
    const { entity, numberTaken } = await db.transaction(async ({ trx }) => {
      await trx.raw('select pg_advisory_xact_lock(hashtext(?))', [`journal:${operationId}`]);
      if ('messageNumber' in sanitizedInputData) {
        const usedBy = await findNumberUsage(sanitizedInputData.messageNumber, operationId, organizationId);
        if (isNumberTaken(usedBy, documentId)) return { entity: null, numberTaken: true };
      }
      const updated = await strapi.documents('api::journal-entry.journal-entry').update({
        documentId,
        ...sanitizedQuery,
        data: sanitizedInputData,
      });
      return { entity: updated, numberTaken: false };
    });
    if (numberTaken) {
      ctx.status = 409;
      return { message: `messageNumber ${sanitizedInputData.messageNumber} already exist` };
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    updateJournal(identifier, operationId, { ...sanitizedInputData, documentId, uuid });
    return this.transformResponse(sanitizedEntity);
  },
}));
