const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getPubSubClients } = require('../config/redis');
const config = require('../config');
const { createLogger } = require('../utils/logger');
const { registerUserHandlers } = require('./handlers/userHandler');
const { registerChatHandlers } = require('./handlers/chatHandler');
const { registerCallHandlers } = require('./handlers/callHandler');
const { PresenceService } = require('../services');

const logger = createLogger('Socket');

let io = null;

const initializeSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: config.originUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  // 🔹 Optional Redis adapter (do NOT assume availability)
  try {
    const { pubClient, subClient } = getPubSubClients();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter enabled');
  } catch (err) {
    logger.warn('Socket.IO Redis adapter not available, running in single-node mode');
  }

  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // Register domain handlers
    registerUserHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);

    // Transport-level disconnect only
    socket.on('disconnect', async (reason) => {
      logger.info('Client disconnected', { socketId: socket.id, reason });

      try {
        const result = await PresenceService.setOffline(socket.id);
        if (result?.status === 'offline') {
          io.emit('userOffline', { userId: result.userId });
        }
      } catch (error) {
        logger.error('Disconnect cleanup failed', { error: error.message });
      }
    });

    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Best-effort emit (do NOT throw if Redis/presence unavailable)
const emitToUser = async (userId, event, data) => {
  try {
    const sockets = await PresenceService.getUserSockets(userId);
    const ioInstance = getIO();

    for (const socketId of sockets) {
      ioInstance.to(socketId).emit(event, data);
    }
  } catch (err) {
    // Silent failure is intentional
    logger.debug('emitToUser skipped', {
      userId,
      event,
      reason: err.message,
    });
  }
};

const emitToUsers = async (userIds, event, data) => {
  for (const userId of userIds) {
    await emitToUser(userId, event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToUsers,
};
