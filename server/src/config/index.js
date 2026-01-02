// src/config/index.js
// Centralized configuration - validates env vars at startup

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  originUrl: process.env.ORIGIN_URL || 'http://localhost:3000',
    jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/letschat',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    presence: {
      ttlSeconds: 120,        // User considered offline after 2 min
      heartbeatMs: 30000,     // Client pings every 30s
    }
  },
  
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://letschat:letschat@localhost:5672',
    exchanges: {
      chat: 'chat.events',
      calls: 'call.events',
    },
    queues: {
      notifications: 'notifications',
      analytics: 'analytics',
    }
  },
  
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg',
    ]
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  }
};

// Validate required config
const required = ['mongo.uri', 'redis.url'];
for (const key of required) {
  const value = key.split('.').reduce((obj, k) => obj?.[k], config);
  if (!value) {
    throw new Error(`Missing required config: ${key}`);
  }
}

module.exports = config;