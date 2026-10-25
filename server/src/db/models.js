import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const connectDb = () => mongoose.connect(env.mongoUri);

const opts = { timestamps: true, versionKey: false };
const userRef = { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true };

export const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  avatarUrl: String,                    // external URL (Google) or S3 key starting with "avatars/"
  passwordHash: String,                 // absent for Google-only accounts
  googleId: { type: String, unique: true, sparse: true },
}, opts));

// Stored hashed; the TTL index deletes expired rows automatically.
export const RefreshToken = mongoose.model('RefreshToken', new mongoose.Schema({
  userId: userRef,
  tokenHash: { type: String, required: true, unique: true },
  usedAt: Date,                         // set when rotated; presenting it again signals theft
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { versionKey: false }));

// Snapshot of the TMDB item so the UI can render without re-fetching.
const mediaFields = {
  userId: userRef,
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String, required: true },
  posterPath: String,
  backdropPath: String,
};

const watchlistSchema = new mongoose.Schema({ ...mediaFields, voteAverage: Number, releaseDate: String }, opts);
watchlistSchema.index({ userId: 1, mediaType: 1, tmdbId: 1 }, { unique: true });
export const WatchlistItem = mongoose.model('WatchlistItem', watchlistSchema);

const historySchema = new mongoose.Schema(
  { ...mediaFields, progressSeconds: { type: Number, default: 0 }, durationSeconds: Number }, opts);
historySchema.index({ userId: 1, mediaType: 1, tmdbId: 1 }, { unique: true });
historySchema.index({ userId: 1, updatedAt: -1 });
export const WatchHistory = mongoose.model('WatchHistory', historySchema);
