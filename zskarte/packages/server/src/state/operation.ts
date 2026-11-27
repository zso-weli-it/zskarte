import { applyPatches, enablePatches } from 'immer';
import { Core } from '@strapi/types';
import _ from 'lodash';

import {
  Operation,
  OperationCache,
  OperationPhases,
  PatchExtended,
  StrapiLifecycleHook,
  StrapiLifecycleHooks,
  User,
} from '../definitions';
import { broadcastConnections, broadcastPatches } from './socketio';
import { isEvictable } from './cache-eviction';

const WEEK = 1000 * 60 * 60 * 24 * 7;
const MIN = 1000 * 60;

enablePatches();

const operationCaches: { [key: string]: OperationCache } = {};
const loadingCaches = new Map<string, Promise<OperationCache | undefined>>();

/** Returns the cache of an operation, loading it from the database the first time it is needed. */
export const getOperationCache = async (operationId: string): Promise<OperationCache | undefined> => {
  const cache = operationCaches[operationId];
  if (cache) {
    cache.lastUsed = Date.now();
    return cache;
  }
  // concurrent requests for the same operation share one load, so no second copy with lost patches is made
  if (!loadingCaches.has(operationId)) {
    loadingCaches.set(
      operationId,
      loadOperationCache(operationId).finally(() => loadingCaches.delete(operationId)),
    );
  }
  return loadingCaches.get(operationId);
};

const loadOperationCache = async (operationId: string): Promise<OperationCache | undefined> => {
  const operation = (await strapi.documents('api::operation.operation').findOne({
    documentId: operationId,
    populate: ['organization'],
  })) as Operation | null;
  if (!operation || operation.phase === OperationPhases.ARCHIVED) return undefined;
  operationCaches[operationId] = {
    operation,
    connections: [],
    mapState: operation.mapState || {},
    mapStateChanged: false,
    lastUsed: Date.now(),
  };
  return operationCaches[operationId];
};

/** Drops caches that nobody uses any more; they are loaded again when needed. */
const evictIdleCaches = () => {
  const now = Date.now();
  for (const [operationId, cache] of Object.entries(operationCaches)) {
    if (isEvictable(cache, now)) delete operationCaches[operationId];
  }
};

/** Drops the cache of an archived operation. Unsaved map changes are written first; if that fails, the cache stays. */
const dropCacheWhenSaved = async (operationId: string) => {
  const operationCache = operationCaches[operationId];
  if (operationCache) await saveMapState(strapi, operationId, operationCache);
  if (!operationCache?.mapStateChanged) delete operationCaches[operationId];
};

/** The implementation of the Strapi Lifecylce hooks of the operation collection type */
const lifecycleOperation = async (lifecycleHook: StrapiLifecycleHook, operation: Operation) => {
  operation =
    ((await strapi.documents('api::operation.operation').findOne({
      documentId: operation.documentId,
      populate: ['organization'],
    })) as Operation) || operation;
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_CREATE) {
    const mapState = operation.mapState || {};
    operationCaches[operation.documentId] = {
      operation,
      connections: [],
      mapState,
      mapStateChanged: false,
      lastUsed: Date.now(),
    };
    if (!operation.organization) return;
  }
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_UPDATE) {
    if (operation.phase === OperationPhases.ARCHIVED) {
      await dropCacheWhenSaved(operation.documentId);
      return;
    } else if (!(operation.documentId in operationCaches)) {
      //maybe an "unarchive" operation
      const mapState = operation.mapState || {};
      operationCaches[operation.documentId] = {
        operation,
        connections: [],
        mapState,
        mapStateChanged: false,
        lastUsed: Date.now(),
      };
      if (!operation.organization) return;
    } else {
      operationCaches[operation.documentId].operation = operation;
    }
  }
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_DELETE) {
    delete operationCaches[operation.documentId];
  }
};

const isValidImmerPatch = (patch: PatchExtended) => {
  if (typeof patch !== 'object' || patch === null) return false;
  if (!['replace', 'add', 'remove'].includes(patch.op)) return false;
  if (!Array.isArray(patch.path)) return false;
  if (patch.op === 'replace' || patch.op === 'add') {
    if (patch.value === undefined) return false;
  }
  return true;
};

const validatePatches = (patches: PatchExtended[]) => {
  if (!patches || !_.isArray(patches)) return [];
  return _.orderBy(_.filter(patches, isValidImmerPatch), ['timestamp'], ['asc']);
};

/** Applies the patches one by one. Returns the new state and only the patches that changed it. */
const applyEachPatch = (mapState: object, patches: PatchExtended[]) => {
  let state = mapState;
  const applied: PatchExtended[] = [];
  for (const patch of patches) {
    try {
      const next = applyPatches(state, [patch]);
      // immer returns the same object when a patch changes nothing, so a reference check is enough
      if (next !== state) applied.push(patch);
      state = next;
    } catch (error) {
      strapi.log.error(error);
    }
  }
  return { mapState: state, applied };
};

/** Uses the immer library to patch the server map state and sends the applied patches to the other users */
const updateMapState = async (operationId: string, identifier: string, patches: PatchExtended[]) => {
  const operationCache = await getOperationCache(operationId);
  if (!operationCache) return;
  const { mapState, applied } = applyEachPatch(operationCache.mapState, validatePatches(patches));
  if (!applied.length) return;
  operationCache.mapState = mapState;
  operationCache.mapStateChanged = true;
  // other users must get exactly what the server kept, or their maps differ from the server's
  broadcastPatches(operationCache, identifier, applied);
};

/** Updates the current location of a connection */
const updateCurrentLocation = async (
  operationId: string,
  identifier: string,
  longLat: { long: number; lat: number } | undefined,
) => {
  const operationCache = await getOperationCache(operationId);
  if (!operationCache) return;
  for (const connection of operationCache.connections) {
    try {
      if (connection.identifier !== identifier) continue;
      connection.currentLocation = longLat;
      broadcastConnections(operationCache);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Writes the map state of one operation to the database if it has changed since the last write. */
const saveMapState = async (strapi: Core.Strapi, operationId: string, operationCache: OperationCache) => {
  if (!operationCache.mapStateChanged) return;
  // clear the flag before the write: a change arriving during the save sets it again and is saved next time
  operationCache.mapStateChanged = false;
  try {
    await strapi.documents('api::operation.operation').update({
      documentId: operationId,
      data: {
        mapState: operationCache.mapState as any,
      },
    });
    strapi.log.info(`MapState of operation ${operationId} Persisted`);
  } catch (error) {
    operationCache.mapStateChanged = true;
    strapi.log.error(error);
  }
};

/** Persist the map state to the database if something has changed */
const persistMapStates = async (strapi: Core.Strapi) => {
  try {
    for (const [operationId, operationCache] of Object.entries(operationCaches)) {
      await saveMapState(strapi, operationId, operationCache);
    }
  } catch (error) {
    strapi.log.error(error);
  }
  evictIdleCaches();
};

/** Archive operations who are active and are not updated since 7 days */
const archiveOperations = async (strapi: Core.Strapi) => {
  try {
    const activeOperations = (await strapi.documents('api::operation.operation').findMany({
      filters: { phase: OperationPhases.ACTIVE },
      limit: -1,
    })) as Operation[];
    for (const operation of activeOperations) {
      if (new Date(operation.updatedAt).getTime() + WEEK > Date.now()) continue;
      await strapi.documents('api::operation.operation').update({
        documentId: operation.documentId,
        data: {
          phase: OperationPhases.ARCHIVED,
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const deleteGuestOperations = async (strapi: Core.Strapi) => {
  try {
    const guestUsers = (await strapi.documents('plugin::users-permissions.user').findMany({
      fields: ['documentId', 'username', 'email'],
      filters: { username: 'zso_guest' },
      populate: ['organization.operations'],
      limit: 1,
    })) as User[];
    const guestUser = _.first(guestUsers);
    if (!guestUser?.organization?.operations) return;
    const { operations } = guestUser.organization;
    for (const operation of operations) {
      strapi.log.info(`Deleting operation ${operation.name} of guest user`);
      await strapi.db
        .query('api::map-snapshot.map-snapshot')
        .deleteMany({ filters: { operation: { documentId: operation.documentId } } });
      await strapi.db
        .query('api::access.access')
        .deleteMany({ filters: { operation: { documentId: operation.documentId } } });
      await strapi.documents('api::operation.operation').delete({
        documentId: operation.documentId,
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const createMapStateSnapshots = async (strapi: Core.Strapi) => {
  try {
    const activeOperations = (await strapi.documents('api::operation.operation').findMany({
      filters: { phase: OperationPhases.ACTIVE },
      limit: -1,
    })) as Operation[];

    strapi.log.debug(`Found ${activeOperations.length} operations to create snapshots from`);

    for (const operation of activeOperations) {
      const fiveMins = MIN * 5;
      // If the operation has not been updated in the last 5mins don't create a snapshot
      if (new Date(operation.updatedAt).getTime() + fiveMins < Date.now()) continue;

      strapi.log.debug(`Creating snapshot for operation [${operation.documentId}] ${operation.name}`);

      await strapi.documents('api::map-snapshot.map-snapshot').create({
        data: {
          operation,
          mapState: operation.mapState as any,
          publishedAt: Date.now(),
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

export {
  operationCaches,
  lifecycleOperation,
  updateMapState,
  updateCurrentLocation,
  persistMapStates,
  archiveOperations,
  deleteGuestOperations,
  createMapStateSnapshots,
};
