import mongoose from 'mongoose';
import { User, RefreshToken } from '../db/models.js';
import { presignDownload, s3Enabled } from './s3.js';

export const findById = (id) => (mongoose.isValidObjectId(id) ? User.findById(id) : null);
export const findByEmail = (email) => User.findOne({ email: email.toLowerCase() });

/** Shape sent to the client — never includes passwordHash. */
export async function publicUser(u) {
  let avatar = u.avatarUrl;
  if (avatar?.startsWith('avatars/')) avatar = s3Enabled ? await presignDownload(avatar) : null;
  return {
    id: String(u._id), name: u.name, email: u.email, avatar,
    hasPassword: Boolean(u.passwordHash), createdAt: u.createdAt,
  };
}

/** Find-or-create for Google sign-in; links to an existing email account if present. */
export async function upsertGoogleUser({ sub, email, name, picture }) {
  const lower = email.toLowerCase();
  const existing = await User.findOne({ email: lower });
  if (existing) {
    if (!existing.googleId) {
      // Pre-hijacking defence: password sign-up never verified this email, so whoever registered it
      // may not own it. Google has proven ownership, so the Google user takes over: the old
      // password is dropped and every existing session is revoked.
      existing.googleId = sub;
      existing.passwordHash = undefined;
      await existing.save();
      await RefreshToken.deleteMany({ userId: existing._id });
    }
    return existing;
  }
  return User.create({ email: lower, name: name || lower.split('@')[0], avatarUrl: picture, googleId: sub });
}
