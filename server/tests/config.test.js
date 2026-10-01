describe('application config defaults', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PORT;
    delete process.env.MONGODB_URI;
    delete process.env.REDIS_URL;
    delete process.env.RABBITMQ_URL;
    delete process.env.ORIGIN_URL;
    delete process.env.JWT_SECRET;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('falls back to documented defaults when env vars are unset', () => {
    const config = require('../src/config');

    expect(config.port).toBe(3001);
    expect(config.originUrl).toBe('http://localhost:3000');
    expect(config.mongo.uri).toBe('mongodb://localhost:27017/letschat');
    expect(config.redis.url).toBe('redis://localhost:6379');
    expect(config.rabbitmq.url).toBe('amqp://letschat:letschat@localhost:5672');
    expect(config.rateLimit.windowMs).toBe(60000);
    expect(config.rateLimit.maxRequests).toBe(100);
  });

  test('exposes the expected shape without connecting to anything', () => {
    const config = require('../src/config');

    expect(config).toEqual(
      expect.objectContaining({
        env: expect.any(String),
        port: expect.any(Number),
        jwt: expect.objectContaining({ secret: expect.any(String), expiresIn: expect.any(String) }),
        mongo: expect.objectContaining({ uri: expect.any(String), options: expect.any(Object) }),
        redis: expect.objectContaining({ url: expect.any(String), presence: expect.any(Object) }),
        rabbitmq: expect.objectContaining({ url: expect.any(String), exchanges: expect.any(Object), queues: expect.any(Object) }),
        upload: expect.objectContaining({ allowedMimeTypes: expect.any(Array) }),
        rateLimit: expect.objectContaining({ windowMs: expect.any(Number), maxRequests: expect.any(Number) }),
      })
    );
  });

  test('respects overrides supplied via environment variables', () => {
    process.env.PORT = '4321';
    process.env.MONGODB_URI = 'mongodb://example.test:27017/custom';
    process.env.RATE_LIMIT_MAX_REQUESTS = '50';

    const config = require('../src/config');

    expect(config.port).toBe(4321);
    expect(config.mongo.uri).toBe('mongodb://example.test:27017/custom');
    expect(config.rateLimit.maxRequests).toBe(50);
  });
});
