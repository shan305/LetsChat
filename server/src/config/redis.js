// src/config/redis.js
// Redis connection manager
// Safe for Socket.IO adapter + presence + rate limits

const { createClient } = require('redis');
const config = require('./index');

let mainClient;
let pubClient;
let subClient;

let connectingPromise = null;
let isShuttingDown = false;

/* -----------------------------
 * Helpers
 * ----------------------------- */

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const createBaseClient = (name, { allowReconnect }) => {
  const client = createClient({
    url: config.redis.url,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (attempt) => {
        if (!allowReconnect) return null; // ❗ NO silent reconnects
        if (attempt > 10) return null;
        return Math.min(attempt * 200, 3000);
      },
    },
  });

  client.on('connect', () =>
    console.log(`[Redis:${name}] connecting…`)
  );

  client.on('ready', () =>
    console.log(`[Redis:${name}] ready`)
  );

  client.on('reconnecting', () =>
    console.warn(`[Redis:${name}] reconnecting…`)
  );

  client.on('error', (err) =>
    console.error(`[Redis:${name}] error:`, err.message)
  );

  client.on('end', () =>
    console.warn(`[Redis:${name}] connection closed`)
  );

  return client;
};

/* -----------------------------
 * Connect
 * ----------------------------- */

const connect = async () => {
  if (isShuttingDown) {
    throw new Error('Redis is shutting down');
  }

  if (mainClient?.isReady) {
    return { client: mainClient, pubClient, subClient };
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    console.log('[Redis] Initializing connections…');

    mainClient = createBaseClient('main', { allowReconnect: true });
    pubClient  = createBaseClient('pub',  { allowReconnect: false });
    subClient  = createBaseClient('sub',  { allowReconnect: false });

    try {
      await Promise.all([
        mainClient.connect(),
        pubClient.connect(),
        subClient.connect(),
      ]);
    } catch (err) {
      console.error('[Redis] Fatal connection failure:', err.message);
      process.exit(1); // ❗ FAIL FAST
    }

    console.log('[Redis] All clients connected');
    return { client: mainClient, pubClient, subClient };
  })();

  return connectingPromise;
};

/* -----------------------------
 * Accessors
 * ----------------------------- */

const getClient = () => {
  if (!mainClient?.isReady) {
    throw new Error('Redis main client not ready');
  }
  return mainClient;
};

const getPubSubClients = () => {
  if (!pubClient?.isReady || !subClient?.isReady) {
    throw new Error('Redis pub/sub clients not ready');
  }
  return { pubClient, subClient };
};

const getStatus = async () => {
  if (!mainClient?.isReady) return { connected: false };
  try {
    await mainClient.ping();
    return { connected: true };
  } catch {
    return { connected: false };
  }
};

/* -----------------------------
 * Shutdown
 * ----------------------------- */

const disconnect = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[Redis] Shutting down…');

  const clients = [subClient, pubClient, mainClient].filter(Boolean);

  for (const c of clients) {
    try {
      if (c.isOpen) await c.quit();
    } catch {}
  }

  mainClient = pubClient = subClient = null;
  connectingPromise = null;

  console.log('[Redis] Disconnected');
};

/* -----------------------------
 * Process hooks
 * ----------------------------- */

process.on('SIGINT', disconnect);
process.on('SIGTERM', disconnect);
process.on('uncaughtException', async (err) => {
  console.error('[Redis] Uncaught exception:', err);
  await disconnect();
  process.exit(1);
});

module.exports = {
  connect,
  disconnect,
  getClient,
  getPubSubClients,
  getStatus,
};
