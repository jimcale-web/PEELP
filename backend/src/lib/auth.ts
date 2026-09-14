import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://peaceful-emotion-production-d146.up.railway.app',
];
const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];
const configuredBaseURL = (process.env.BETTER_AUTH_URL || 'http://localhost:5000')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');

export const auth = betterAuth({
    basePath: '/api/auth',
    baseURL: configuredBaseURL,
    trustedOrigins: allowedOrigins,
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
            approvalStatus: {
            type: "string",
            required: false,
            defaultValue: "PENDING",
        },
        deletedAt: {
                type: "date",
                required: false,
            },
            country: {
                type: "string",
                required: false,
            },
            city: {
                type: "string",
                required: false,
            },
            phoneNumber: {
                type: "string",
                required: false,
            },
        },
    },
});