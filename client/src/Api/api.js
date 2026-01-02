// src/Api/api.js
import io from 'socket.io-client';

const CONFIG = {
  url: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  autoConnect: true,
};

export const url = CONFIG.url;
export const wsURL = CONFIG.url;

const socket = io(CONFIG.url, {
  reconnection: CONFIG.reconnection,
  reconnectionAttempts: CONFIG.reconnectionAttempts,
  reconnectionDelay: CONFIG.reconnectionDelay,
  reconnectionDelayMax: CONFIG.reconnectionDelayMax,
  timeout: CONFIG.timeout,
  transports: CONFIG.transports,
  autoConnect: CONFIG.autoConnect,
});

let heartbeatInterval = null;

const startHeartbeat = () => {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat');
    }
  }, 30000);
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  startHeartbeat();
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
  stopHeartbeat();
});

socket.on('connect_error', (error) => {
  console.error('[Socket] Connection error:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('[Socket] Reconnection error:', error.message);
});

if (!socket.connected) {
  socket.connect();
}

const socketApi = {
  connect: () => {
    if (!socket.connected) {
      socket.connect();
    }
  },

  disconnect: () => {
    stopHeartbeat();
    socket.disconnect();
  },

  on: (event, callback) => {
    socket.on(event, callback);
  },

  off: (event, callback) => {
    socket.off(event, callback);
  },

  emit: (event, data) => {
    if (!socket.connected) {
      console.warn('[Socket] Not connected, attempting to connect...');
      socket.connect();
    }
    socket.emit(event, data);
  },

  isConnected: () => socket.connected,

  getSocket: () => socket,

  getId: () => socket.id,
};

export { socket };
export default socketApi;