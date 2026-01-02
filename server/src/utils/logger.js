// src/utils/logger.js
// Simple structured logger (replace with winston/pino for production)

const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = config.env === 'production' ? 'info' : 'debug';

const formatMessage = (level, context, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`;
};

const shouldLog = (level) => {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
};

const createLogger = (context) => ({
  error: (message, meta = {}) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', context, message, meta));
    }
  },
  
  warn: (message, meta = {}) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', context, message, meta));
    }
  },
  
  info: (message, meta = {}) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', context, message, meta));
    }
  },
  
  debug: (message, meta = {}) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', context, message, meta));
    }
  },
  
  // Log socket event
  socket: (event, socketId, data = {}) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', context, `Socket event: ${event}`, { 
        socketId, 
        ...data 
      }));
    }
  },
});

module.exports = { createLogger };