import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && !session.user.deletedAt) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { approvalStatus: true },
      });

      if (dbUser && dbUser.approvalStatus !== 'PENDING' && dbUser.approvalStatus !== 'REJECTED') {
        req.user = session.user;
        req.session = session.session;
      }
    }
  } catch (_error) {
    // Ignore authentication errors for optional routes
  }
  next();
};
