import type { RequestHandler, Request, Response, NextFunction } from 'express';

/** Wraps an async route handler and forwards any thrown error to Express's next(). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
