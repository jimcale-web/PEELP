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
        enabled: true,
        window: 15 * 60,   // 15-minute window
        max: 10,            // max 10 attempts per window per IP
        storage: "memory",  // switch to "database" if running multiple instances
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