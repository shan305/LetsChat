// src/middleware/rateLimiter.js
// Redis-based rate limiting for socket events

const { getClient } = require('../config/redis');
const config = require('../config');

const WINDOW_MS = config.rateLimit.windowMs;
const MAX_REQUESTS = config.rateLimit.maxRequests;

/* =========================================================
 * GENERIC SOCKET RATE LIMITER (middleware-style)
 * ========================================================= */

const createRateLimiter = (options = {}) => {
  const {
    windowMs = WINDOW_MS,
    maxRequests = MAX_REQUESTS,
    keyPrefix = 'rl',
    message = 'Too many requests, please try again later',
  } = options;

  return async (socket, next) => {
    try {
      const redis = getClient();

      const identifier = socket.userId || socket.id;
      const key = `${keyPrefix}:${identifier}`;

      const current = await redis.incr(key);

      // First request → start TTL window
      if (current === 1) {
        await redis.pExpire(key, windowMs);
      }

      // Exceeded limit
      if (current > maxRequests) {
        const ttl = await redis.pTTL(key);

        socket.emit('rateLimited', {
          message,
          retryAfter: Math.max(0, Math.ceil(ttl / 1000)),
        });

        return; // block event
      }

      // Attach debug info (non-functional)
      socket.rateLimit = {
        remaining: Math.max(0, maxRequests - current),
        total: maxRequests,
        resetIn: await redis.pTTL(key),
      };

      next();
    } catch (error) {
      // Fail open if Redis is unavailable
      console.error('[RateLimiter] Error:', error.message);
      next();
    }
  };
};

/* =========================================================
 * PER-EVENT RATE LIMITER (manual check)
 * ========================================================= */

const eventRateLimiter = async (socket, event, limits = {}) => {
  const {
    windowMs = 1000, // default 1 second
    maxRequests = 5,
  } = limits;

  try {
    const redis = getClient();

    const identifier = socket.userId || socket.id;
    const key = `rl:${identifier}:${event}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.pExpire(key, windowMs);
    }

    return current <= maxRequests;
  } catch (error) {
    console.error('[EventRateLimiter] Error:', error.message);
    return true; // fail open
  }
};

/* =========================================================
 * EVENT-SPECIFIC LIMIT DEFINITIONS
 * ========================================================= */

const rateLimits = {
  message: {
    windowMs: 1000,
    maxRequests: 10, // 10 messages/sec
  },
  typing: {
    windowMs: 1000,
    maxRequests: 2, // typing spam protection
  },
  search: {
    windowMs: 5000,
    maxRequests: 5,
  },
};

/* =========================================================
 * SIMPLE HELPER USED BY SOCKET HANDLERS
 * ========================================================= */

const checkEventLimit = async (socket, event) => {
  const limits = rateLimits[event] || {
    windowMs: 1000,
    maxRequests: 10,
  };

  return eventRateLimiter(socket, event, limits);
};

module.exports = {
  createRateLimiter,
  eventRateLimiter,
  checkEventLimit,
  rateLimits,
};
