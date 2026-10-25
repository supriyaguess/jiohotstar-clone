// Must run before anything imports src/config/env.js.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/hotstar_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.TMDB_API_KEY = 'test-key';
process.env.FRONTEND_URL = 'http://localhost:5173';

export async function boot() {
  const { default: mongoose } = await import('mongoose');
  const { connectDb } = await import('../src/db/models.js');
  const { redis } = await import('../src/cache/redis.js');
  const { app } = await import('../src/app.js');

  await connectDb();
  // Safety: never wipe a database that isn't clearly a test one.
  if (!mongoose.connection.name.endsWith('_test')) throw new Error('Refusing to reset non-test database');
  await mongoose.connection.dropDatabase();
  await redis.flushdb();

  return {
    app,
    redis,
    models: await import('../src/db/models.js'),
    reset: () => redis.flushdb(), // clears rate-limit counters and cache between tests
    close: async () => { await mongoose.disconnect(); redis.disconnect(); },
  };
}

export const creds = (n) => ({ name: `User ${n}`, email: `user${n}@example.com`, password: 'password123' });
