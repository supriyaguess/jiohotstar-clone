import { env } from './config/env.js';
import { connectDb } from './db/models.js';
import { redis } from './cache/redis.js';
import mongoose from 'mongoose';
import { app } from './app.js';
import { bootstrapRag } from './rag/bootstrap.js';

await connectDb();
const server = app.listen(env.port, () => console.log(`API listening on :${env.port}`));

bootstrapRag().catch((err) => console.error('[rag] bootstrap failed:', err.message)); // background; never blocks startup

// Finish in-flight requests, then close connections (deploys send SIGTERM).
async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async () => {
    await mongoose.disconnect();
    redis.disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
