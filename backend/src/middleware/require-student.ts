import type { RequestHandler } from 'express';
import { Role } from '../types/role.js';

export const requireStudent: RequestHandler = (req, res, next) => {
  if (req.user?.role !== Role.STUDENT) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
};
