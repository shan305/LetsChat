// src/config/rabbitmq.js
// RabbitMQ for async events (analytics, notifications, audit)

const amqp = require('amqplib');
const config = require('./index');

let connection;
let publishChannel;
let consumeChannel;

let connectingPromise;
let isShuttingDown = false;

/* -----------------------------
 * Connect
 * ----------------------------- */

const connect = async () => {
  if (isShuttingDown) {
    throw new Error('RabbitMQ is shutting down');
  }

  if (connection && publishChannel && consumeChannel) {
    return { publishChannel, consumeChannel };
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    console.log('[RabbitMQ] Connecting…');

    try {
      connection = await amqp.connect(config.rabbitmq.url);

      connection.on('error', (err) => {
        console.error('[RabbitMQ] connection error:', err.message);
      });

      connection.on('close', () => {
        console.error('[RabbitMQ] connection closed');
        process.exit(1); // ❗ fail fast
      });

      publishChannel = await connection.createConfirmChannel();
      consumeChannel = await connection.createChannel();

      /* -----------------------------
       * Exchanges
       * ----------------------------- */

      await publishChannel.assertExchange(
        config.rabbitmq.exchanges.chat,
        'topic',
        { durable: true }
      );

      await publishChannel.assertExchange(
        config.rabbitmq.exchanges.calls,
        'topic',
        { durable: true }
      );

      /* -----------------------------
       * Dead Letter Exchange
       * ----------------------------- */

      const DLX = 'dlx.events';

      await publishChannel.assertExchange(DLX, 'fanout', { durable: true });

      /* -----------------------------
       * Queues
       * ----------------------------- */

      await consumeChannel.assertQueue(
        config.rabbitmq.queues.notifications,
        {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': DLX,
          },
        }
      );

      await consumeChannel.assertQueue(
        config.rabbitmq.queues.analytics,
        {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': DLX,
          },
        }
      );

      /* -----------------------------
       * Bindings
       * ----------------------------- */

      await consumeChannel.bindQueue(
        config.rabbitmq.queues.notifications,
        config.rabbitmq.exchanges.chat,
        'message.*'
      );

      await consumeChannel.bindQueue(
        config.rabbitmq.queues.analytics,
        config.rabbitmq.exchanges.chat,
        '#'
      );

      /* -----------------------------
       * QoS
       * ----------------------------- */

      await consumeChannel.prefetch(10);

      console.log('[RabbitMQ] Ready');
      return { publishChannel, consumeChannel };
    } catch (err) {
      console.error('[RabbitMQ] Failed to connect:', err.message);
      process.exit(1);
    }
  })();

  return connectingPromise;
};

/* -----------------------------
 * Publish
 * ----------------------------- */

const publish = async (exchange, routingKey, payload) => {
  if (!publishChannel) {
    throw new Error('RabbitMQ publish channel not ready');
  }

  const message = Buffer.from(
    JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    })
  );

  return new Promise((resolve, reject) => {
    publishChannel.publish(
      exchange,
      routingKey,
      message,
      {
        persistent: true,
        contentType: 'application/json',
      },
      (err) => {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
};

/* -----------------------------
 * Consume
 * ----------------------------- */

const consume = async (queue, handler) => {
  if (!consumeChannel) {
    throw new Error('RabbitMQ consume channel not ready');
  }

  await consumeChannel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      await handler(content, msg);
      consumeChannel.ack(msg);
    } catch (err) {
      console.error('[RabbitMQ] handler error:', err.message);
      consumeChannel.nack(msg, false, false); // ❌ no requeue
    }
  });
};

/* -----------------------------
 * Shutdown
 * ----------------------------- */

const disconnect = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[RabbitMQ] Shutting down…');

  try {
    if (consumeChannel) await consumeChannel.close();
    if (publishChannel) await publishChannel.close();
    if (connection) await connection.close();
  } catch {}

  consumeChannel = publishChannel = connection = null;
  connectingPromise = null;

  console.log('[RabbitMQ] Disconnected');
};

/* -----------------------------
 * Process hooks
 * ----------------------------- */

process.on('SIGINT', disconnect);
process.on('SIGTERM', disconnect);
process.on('uncaughtException', async (err) => {
  console.error('[RabbitMQ] Uncaught exception:', err);
  await disconnect();
  process.exit(1);
});

module.exports = {
  connect,
  publish,
  consume,
  disconnect,
};
