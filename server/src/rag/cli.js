// Manual run: `npm run ingest`. Normally the cron-triggered endpoint does this daily.
import mongoose from 'mongoose';
import { connectDb } from '../db/models.js';
import { redis } from '../cache/redis.js';
import { ensureVectorIndex } from './retrieve.js';
import { syncCatalog } from './sync.js';

await connectDb();
console.log('vector index:', await ensureVectorIndex(console.warn));
console.log(await syncCatalog());
await mongoose.disconnect();
redis.disconnect();
