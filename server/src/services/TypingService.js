// src/services/TypingService.js
// Typing indicators with Redis for multi-server support

const { getClient } = require('../config/redis');
const { Conversation } = require('../models');

const TYPING_TTL = 5; // seconds
const TYPING_KEY = (conversationId, userId) =>
  `typing:${conversationId}:${userId}`;

class TypingService {

  /* =======================
   * TYPING STATE
   * ======================= */

  // User started typing
  async setTyping(conversationId, userId) {
    if (!conversationId || !userId) {
      return {
        conversationId,
        userId,
        participants: [],
      };
    }

    const redis = getClient();

    // Store typing heartbeat with TTL
    await redis.set(
      TYPING_KEY(conversationId, userId),
      Date.now().toString(),
      { EX: TYPING_TTL }
    );

    // Get other participants to notify
    const participants = await this.getOtherParticipants(
      conversationId,
      userId
    );

    return {
      conversationId,
      userId,
      participants,
    };
  }

  // User stopped typing
  async clearTyping(conversationId, userId) {
    if (!conversationId || !userId) {
      return {
        conversationId,
        userId,
        participants: [],
      };
    }

    const redis = getClient();

    await redis.del(TYPING_KEY(conversationId, userId));

    const participants = await this.getOtherParticipants(
      conversationId,
      userId
    );

    return {
      conversationId,
      userId,
      participants,
    };
  }

  /* =======================
   * QUERY HELPERS
   * ======================= */

  // Get all users currently typing in a conversation
  async getTypingUsers(conversationId) {
    if (!conversationId) return [];

    const redis = getClient();
    const pattern = `typing:${conversationId}:*`;

    const keys = await redis.keys(pattern);
    if (!keys.length) return [];

    const typingUsers = [];

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length < 3) continue;

      const userId = parts[2];
      const timestamp = await redis.get(key);

      if (timestamp) {
        typingUsers.push({
          userId,
          since: Number(timestamp),
        });
      }
    }

    return typingUsers;
  }

  /* =======================
   * INTERNAL HELPERS
   * ======================= */

  // Get other participants in a conversation
  async getOtherParticipants(conversationId, excludeUserId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants) {
      return [];
    }

    return conversation.participants
      .map(p => p.toString())
      .filter(p => p !== excludeUserId.toString());
  }
}

module.exports = new TypingService();
