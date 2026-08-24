import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

export const auth = betterAuth({
    basePath: '/api/auth',
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
    trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:5173'],
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    rateLimit: {
        // Disable in test mode — tests make many get-session calls and a separate
        // express-rate-limit already guards sign-in in production.
        enabled: process.env.NODE_ENV !== 'test',
        window: 15 * 60,
        max: 10,
        storage: "memory",
    },
    emailAndPassword: {
        enabled: true,
        disableSignUp: false,
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "STUDENT",
            },
            deletedAt: {
                type: "date",
                required: false,
            },
        },
    },
});