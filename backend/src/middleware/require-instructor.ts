import type { RequestHandler } from 'express';
import { Role } from '../types/role.js';

export const requireInstructor: RequestHandler = (req, res, next) => {
  if (req.user?.role !== Role.INSTRUCTOR && req.user?.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
};
