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
// Railway doesn't set NODE_ENV, so gate on the API actually being served over
// HTTPS (i.e. deployed, not local dev) rather than an env var nothing sets.
const isHttpsDeployment = configuredBaseURL.startsWith('https://');

export const auth = betterAuth({
    basePath: '/api/auth',
    baseURL: configuredBaseURL,
    trustedOrigins: allowedOrigins,
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    advanced: {
        // Railway (and most proxies/load balancers) forward the original client IP
        // via X-Forwarded-For. Without this, Better Auth's rate limiter can't
        // distinguish clients and falls back to a single shared bucket.
        ipAddress: {
            ipAddressHeaders: ['x-forwarded-for'],
        },
        // The frontend and backend are deployed as separate Railway services on
        // different *.up.railway.app hosts, so every API call is cross-site. The
        // default SameSite=Lax session cookie is dropped by the browser on the
        // way back to the API, which makes authenticated requests (e.g.
        // /api/admin/users) — and optionalAuth-gated ones like the student
        // course-access check — look logged-out, so approved students still see
        // everything locked. SameSite=None (with Secure, required alongside it
        // and already true for HTTPS deployments) lets the cookie travel with
        // cross-site requests. Railway doesn't set NODE_ENV, so this is keyed
        // off the deployment actually being HTTPS instead.
        useSecureCookies: isHttpsDeployment,
        defaultCookieAttributes: isHttpsDeployment
            ? {
                  sameSite: 'none',
                  secure: true,
              }
            : undefined,
    },
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