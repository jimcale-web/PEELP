import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

export const auth = betterAuth({
    basePath: '/api/auth',
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
    },
    trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
})