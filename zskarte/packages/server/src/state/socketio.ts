import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { getOperationCache } from './operation';
import { Operation, OperationCache, PatchExtended, User, WebsocketEvent } from '../definitions';
import { Server } from 'socket.io';
import { Core } from '@strapi/strapi';
import { serialize as superjsonSerialize } from '../middlewares/superjson';
import { appOrigin, isAllowedOrigin } from './allowed-origin';
import { isMemberOfOperation } from './membership';

const sanitizeUser = (user) => {
  delete user.password;
  delete user.resetPasswordToken;
  delete user.confirmationToken;
  return user;
};

let socketIo: Server;

const connectSocketIo = (strapi: Core.Strapi) => {
  const allowedOrigin = appOrigin(process.env.ZSK_APP_URL || 'http://localhost:4300');
  socketIo = new Server(strapi.server.httpServer, {
    transports: ['websocket'],
    // cors does not apply to websockets, so the origin is checked on the handshake
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin, allowedOrigin)),
  });
  socketIo.on('connection', (socket) => socketConnection({ strapi }, socket));
};

/** Handles new socket connections, checks the token and the needed query parameters. */
const socketConnection = async ({ strapi }, socket: Socket) => {
  try {
    strapi.log.info(`Socket Connecting: ${socket.id}`);
    const { token } = socket.handshake.auth;
    const operationId = socket.handshake.query.operationId as string;
    const identifier = socket.handshake.query.identifier as string;
    const label = socket.handshake.query.label as string;
    if (!operationId || !token || !identifier || !label) {
      strapi.log.warn(`Socket: ${socket.id} - Empty token, operationId, label or identifier in handshake`);
      socket.disconnect();
      return;
    }
    const { jwt, user: userService } = strapi.plugins['users-permissions'].services;
    const { id: userId, operationId: tokenOperationId }: { id: number; operationId: string } = await jwt.verify(token);
    // Check if the token operationId matches the query operationId
    if (tokenOperationId && operationId !== tokenOperationId) {
      strapi.log.warn(
        `Socket: ${socket.id} - OperationId: ${operationId} does not match provided access token OperationId: ${tokenOperationId}`,
      );
      socket.disconnect();
      return;
    }
    const user = (await userService.fetch(userId)) as User;
    const operationCache = await getOperationCache(operationId);
    // Check if the operationCache exists
    if (!operationCache) {
      strapi.log.warn(`Socket: ${socket.id} - No operationCache for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    // Membership is read from the database now, so removed members are refused and new members are admitted.
    // Token connections are checked by their token instead.
    const operation = (await strapi.documents('api::operation.operation').findOne({
      documentId: operationId,
      populate: ['organization.users'],
    })) as Operation | null;
    if (!tokenOperationId && !isMemberOfOperation(user, operation)) {
      strapi.log.warn(`Socket: ${socket.id} - User: ${user.email} not allowed for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    const sanitizedUser = sanitizeUser(user);
    operationCache.connections.push({ user: sanitizedUser, socket, identifier, label });
    strapi.log.info(`Socket Connected: ${socket.id}, ${user.email}, OperationId: ${operationId}`);
    broadcastConnections(operationCache);
    socket.on('disconnect', () => socketDisconnect(operationCache, socket));
  } catch (error) {
    socket.disconnect();
    strapi.log.error(error);
  }
};

/** Removes disconnected socket connections from the connection stack. */
const socketDisconnect = async (operationCache: OperationCache, socket: Socket) => {
  operationCache.connections = _.filter(operationCache.connections, (c) => c.socket.id !== socket.id);
  strapi.log.info(`Socket Disconnected: ${socket.id}`);
  await broadcastConnections(operationCache);
};

/** Broadcasts the current connections to all currently connected sockets of an operation */
const broadcastConnections = (operationCache: OperationCache) => {
  const connections = operationCache.connections.map((c) => {
    return {
      user: c.user,
      identifier: c.identifier,
      label: c.label,
      currentLocation: c.currentLocation,
    };
  });
  for (const connection of operationCache.connections) {
    try {
      connection.socket.emit(WebsocketEvent.CONNECTIONS, connections);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Broadcast received patches to all currently connected sockets of an operation */
const broadcastPatches = (operationCache: OperationCache, identifier: string, patches: PatchExtended[]) => {
  const connections = _.filter(operationCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    try {
      connection.socket.emit(WebsocketEvent.STATE_PATCHES, patches);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Broadcast received journal change to all currently connected sockets of an operation */
const broadcastJournal = (operationCache: OperationCache, identifier: string, data: any) => {
  data = superjsonSerialize(data);
  const connections = _.filter(operationCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    try {
      connection.socket.emit(WebsocketEvent.STATE_JOURNAL, data);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

export { connectSocketIo, socketConnection, broadcastConnections, broadcastPatches, broadcastJournal };
