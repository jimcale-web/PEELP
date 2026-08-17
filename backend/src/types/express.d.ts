import type { auth } from '../lib/auth.js';

type BetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

declare global {
    namespace Express {
        interface Request {
            user?: BetterAuthSession['user'];
            session?: BetterAuthSession['session'];
        }
    }
}
