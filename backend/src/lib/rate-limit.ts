import rateLimit from 'express-rate-limit';

// Defence-in-depth: hard rate limit on the sign-in endpoint.
// 10 attempts per 15 minutes per IP → HTTP 429.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Raise the limit in test mode so E2E test logins don't get blocked
  max: process.env.NODE_ENV === 'test' ? 10000 : (Number(process.env.RATE_LIMIT_MAX) || 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});
