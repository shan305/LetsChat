// src/services/PresenceService.js
// Redis-backed presence (online/offline) - works across multiple servers

const { getClient } = require('../config/redis');
const config = require('../config');

const KEYS = {
  presence: (userId) => `presence:${userId}`,
  userSockets: (userId) => `user_sockets:${userId}`,
  socketUser: (socketId) => `socket_user:${socketId}`,
};

const TTL = config.redis.presence.ttlSeconds;

class PresenceService {

  /* =======================
   * CONNECTION HANDLING
   * ======================= */

  // User connects with a socket
  async setOnline(userId, socketId) {
    if (!userId || !socketId) {
      throw new Error('userId and socketId are required');
    }

    const redis = getClient();
    const now = Date.now();

    await Promise.all([
      // Main presence key
      redis.set(
        KEYS.presence(userId),
        JSON.stringify({
          status: 'online',
          lastSeen: now,
          socketId,
        }),
        { EX: TTL }
      ),

      // Track sockets per user (multi-device support)
      redis.sAdd(KEYS.userSockets(userId), socketId),
      redis.expire(KEYS.userSockets(userId), TTL),

      // Reverse lookup: socket -> user
      redis.set(KEYS.socketUser(socketId), userId, { EX: TTL }),
    ]);

    return { userId, status: 'online', socketId };
  }

  // User disconnects
  async setOffline(socketId) {
    if (!socketId) return null;

    const redis = getClient();

    // Find user by socket
    const userId = await redis.get(KEYS.socketUser(socketId));
    if (!userId) {
      return null;
    }

    // Remove socket mapping
    await Promise.all([
      redis.sRem(KEYS.userSockets(userId), socketId),
      redis.del(KEYS.socketUser(socketId)),
    ]);

    // Check remaining sockets
    const remainingSockets = await redis.sCard(KEYS.userSockets(userId));

    if (remainingSockets === 0) {
      // Fully offline
      await redis.set(
        KEYS.presence(userId),
        JSON.stringify({
          status: 'offline',
          lastSeen: Date.now(),
        }),
        { EX: TTL * 10 } // keep lastSeen longer
      );

      return { userId, status: 'offline' };
    }

    // Still online on another device
    return { userId, status: 'online', remainingSockets };
  }

  /* =======================
   * HEARTBEAT / TTL
   * ======================= */

  async heartbeat(userId, socketId) {
    if (!userId || !socketId) return false;

    const redis = getClient();

    await Promise.all([
      redis.expire(KEYS.presence(userId), TTL),
      redis.expire(KEYS.userSockets(userId), TTL),
      redis.expire(KEYS.socketUser(socketId), TTL),
    ]);

    return true;
  }

  /* =======================
   * PRESENCE QUERIES
   * ======================= */

  async getPresence(userId) {
    if (!userId) {
      return { userId: null, status: 'offline', lastSeen: null };
    }

    const redis = getClient();
    const data = await redis.get(KEYS.presence(userId));

    if (!data) {
      return { userId, status: 'offline', lastSeen: null };
    }

    return { userId, ...JSON.parse(data) };
  }

  async getPresenceBatch(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return {};
    }

    const redis = getClient();
    const keys = userIds.map(id => KEYS.presence(id));
    const results = await redis.mGet(keys);

    const presenceMap = {};

    for (let i = 0; i < userIds.length; i++) {
      const data = results[i];
      presenceMap[userIds[i]] = data
        ? { userId: userIds[i], ...JSON.parse(data) }
        : { userId: userIds[i], status: 'offline', lastSeen: null };
    }

    return presenceMap;
  }

  // For small user bases only
  async getOnlineUsers() {
    const redis = getClient();
    const keys = await redis.keys('presence:*');

    const onlineUsers = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (!data) continue;

      const parsed = JSON.parse(data);
      if (parsed.status === 'online') {
        const userId = key.replace('presence:', '');
        onlineUsers.push(userId);
      }
    }

    return onlineUsers;
  }

  /* =======================
   * SOCKET LOOKUPS
   * ======================= */

  async getUserSockets(userId) {
    if (!userId) return [];
    const redis = getClient();
    return redis.sMembers(KEYS.userSockets(userId));
  }

  async getUserBySocket(socketId) {
    if (!socketId) return null;
    const redis = getClient();
    return redis.get(KEYS.socketUser(socketId));
  }

  async isOnline(userId) {
    const presence = await this.getPresence(userId);
    return presence.status === 'online';
  }
}

module.exports = new PresenceService();
