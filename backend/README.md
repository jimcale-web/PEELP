# PEELP Backend

Backend service for PEELP built with Node.js, Express, and TypeScript.

## Current Implementation

- Express app entry: [src/index.ts](/C:/Users/hp/PEELP/backend/src/index.ts)
- CORS + JSON middleware configured
- Health check endpoint implemented:
  - `GET /api/health`

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
cd backend
npm install
```

## Scripts

Defined in [package.json](/C:/Users/hp/PEELP/backend/package.json):

- `npm run build` - compile TypeScript to `dist/`
- `npm run dev` - run compiled backend (`node dist/index.js`)
- `npm run start` - run compiled backend (`node dist/index.js`)
- `npm run lint` - lint `src/**/*.ts`
- `npm run format` - format `src/**/*.ts`
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - create/apply development migrations
- `npm run prisma:migrate:deploy` - apply migrations in non-dev environments
- `npm run prisma:studio` - open Prisma Studio
- `npm run prisma:seed` - seed database records

## Run Backend

```bash
cd backend
npm run build
npm run dev
```

Server default: `http://localhost:5000`

Health check:

```bash
curl http://localhost:5000/api/health
```

## Environment Variables

Template file: [backend/.env.example](/C:/Users/hp/PEELP/backend/.env.example)

Common variables used now:
- `PORT`
- `FRONTEND_URL`

Additional variables in template are for planned integrations.

## Prisma Status

Prisma is configured for PostgreSQL in [schema.prisma](/C:/Users/hp/PEELP/backend/prisma/schema.prisma), with a shared client in [prisma.ts](/C:/Users/hp/PEELP/backend/src/lib/prisma.ts).  
On backend startup, [startServer](/C:/Users/hp/PEELP/backend/src/index.ts:36) verifies DB connectivity before serving traffic.

## Railway

Set the Railway service root directory to `backend`. The included
Railway configuration uses the native Nixpacks Node.js builder, runs
`prisma migrate deploy` before starting the API, and should provide `PORT` and
`DATABASE_URL`; also configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`FRONTEND_URL` for production.
