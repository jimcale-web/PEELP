import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as { message?: string }).message ?? 'Internal server error';
  res.status(status).json({ error: message });
};
