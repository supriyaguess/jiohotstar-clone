import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request', details: err.flatten().fieldErrors });
  }
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  if (err?.code === 11000) return res.status(409).json({ error: 'Already exists' }); // unique-index race
  (req.log ?? console).error(err);
  res.status(500).json({ error: 'Internal server error' });
}
