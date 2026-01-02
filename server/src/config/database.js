// src/config/database.js
// MongoDB connection with proper error handling and graceful shutdown

const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;
let listenersAttached = false;

// Human-readable connection states
const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected');
    isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected');
    isConnected = true;
  });
};

const connect = async () => {
  if (isConnected) {
    console.log('[MongoDB] Using existing connection');
    return;
  }

  try {
    attachListeners();

    const conn = await mongoose.connect(
      config.mongo.uri,
      config.mongo.options
    );

    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Initial connection failed:', error.message);
    process.exit(1); // Fail fast
  }
};

const disconnect = async () => {
  if (!isConnected) return;

  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[MongoDB] Disconnected gracefully');
  } catch (error) {
    console.error('[MongoDB] Error during disconnect:', error.message);
  }
};

const getStatus = () => ({
  isConnected,
  state: STATES[mongoose.connection.readyState] || 'unknown',
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
});

module.exports = {
  connect,
  disconnect,
  getStatus,
};
