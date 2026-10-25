import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, RefreshToken, WatchlistItem, WatchHistory } from '../db/models.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { AppError, asyncHandler } from '../middleware/errors.js';
import { findById, publicUser } from '../services/users.js';
import { presignUpload, s3Enabled } from '../services/s3.js';

const router = Router();
router.use(requireAuth);

const load = async (req) => {
  const user = await findById(req.userId);
  if (!user) throw new AppError(401, 'Account no longer exists');
  return user;
};

router.get('/', asyncHandler(async (req, res) => res.json(await publicUser(await load(req)))));

router.patch('/', asyncHandler(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(80) }).parse(req.body);
  const user = await User.findByIdAndUpdate(req.userId, { name }, { new: true });
  res.json(await publicUser(user));
}));

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// 1) POST /api/me/avatar {contentType} -> {uploadUrl}; 2) client PUTs the file to uploadUrl.
// The key is fixed per user, so the DB row is updated here and no second call is needed.
router.post('/avatar', asyncHandler(async (req, res) => {
  if (!s3Enabled) throw new AppError(501, 'Avatar uploads are not configured');
  const { contentType } = z.object({ contentType: z.enum(Object.keys(EXT)) }).parse(req.body);
  const key = `avatars/${req.userId}.${EXT[contentType]}`;
  const uploadUrl = await presignUpload(key, contentType);
  await User.updateOne({ _id: req.userId }, { avatarUrl: key });
  res.json({ uploadUrl });
}));

// Irreversible, so password accounts must re-enter their password (a stolen access token isn't enough).
router.delete('/', rateLimit('delete-account', 5, 900, (req) => req.userId), asyncHandler(async (req, res) => {
  const { password } = z.object({ password: z.string().max(200).optional() }).parse(req.body ?? {});
  const user = await load(req);
  if (user.passwordHash && !(password && (await bcrypt.compare(password, user.passwordHash)))) {
    throw new AppError(401, 'Incorrect password');
  }
  await Promise.all([
    User.deleteOne({ _id: req.userId }),
    RefreshToken.deleteMany({ userId: req.userId }),
    WatchlistItem.deleteMany({ userId: req.userId }),
    WatchHistory.deleteMany({ userId: req.userId }),
  ]);
  res.status(204).end();
}));

export default router;
