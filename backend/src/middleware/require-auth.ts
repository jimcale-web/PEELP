import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (session.user.deletedAt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Fetch fresh approvalStatus from DB (better-auth may cache the session)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { approvalStatus: true },
  });

  if (dbUser?.approvalStatus === "PENDING") {
    res.status(403).json({ error: "PENDING_APPROVAL" });
    return;
  }

  if (dbUser?.approvalStatus === "REJECTED") {
    res.status(403).json({ error: "REJECTED" });
    return;
  }

  req.user = session.user;
  req.session = session.session;
  next();
};
