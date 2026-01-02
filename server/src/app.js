const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const database = require('./config/database');
const redis = require('./config/redis');
const rabbitmq = require('./config/rabbitmq');
const { initializeSocket } = require('./socket');
const { MediaService } = require('./services');
const { createLogger } = require('./utils/logger');
const routes = require('./routes');

const logger = createLogger('App');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: config.originUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', routes);

app.get('/health', async (req, res) => {
  const dbStatus = database.getStatus();
  const redisStatus = await redis.getStatus();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus.isConnected ? 'connected' : 'disconnected',
      redis: redisStatus.connected ? 'connected' : 'disconnected',
    },
  });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    await Promise.all([
      database.disconnect(),
      redis.disconnect(),
      rabbitmq.disconnect(),
    ]);
    
    logger.info('All connections closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: reason?.message || reason });
});

const start = async () => {
  try {
    logger.info('Starting server');
    
    await database.connect();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await redis.connect();
    
    try {
      await rabbitmq.connect();
    } catch (error) {
      logger.warn('RabbitMQ connection failed, continuing without it', { error: error.message });
    }
    
    await MediaService.init();
    await initializeSocket(server);
    
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

start();