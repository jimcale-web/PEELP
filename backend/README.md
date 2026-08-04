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

Files exist in [backend/prisma/](/C:/Users/hp/PEELP/backend/prisma), but schema/seed are currently placeholders and no Prisma npm scripts are configured yet.
