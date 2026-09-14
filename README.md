# PEELP Monorepo

PEELP is a full-stack LMS project scaffold with:
- [backend/](/C:/Users/hp/PEELP/backend) - Node.js + Express + TypeScript API
- [frontend/](/C:/Users/hp/PEELP/frontend) - React + TypeScript + Vite app

## Current Status

This repository is currently in **early scaffold stage**:
- Backend has a working Express server and health endpoint.
- Frontend has a minimal React app and shared API/types scaffolding.
- Backend is wired to PostgreSQL through Prisma (schema + scripts + startup DB connection check).

## Repository Structure

```text
PEELP/
├── backend/
├── frontend/
├── docs/
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
# Root utilities
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Running the Project

From repository root:

```bash
# Run backend + frontend together
npm run dev
```

Or run each side separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Root Scripts

Defined in [package.json](/C:/Users/hp/PEELP/package.json):

- `npm run dev` - runs backend and frontend concurrently
- `npm run build` - builds the backend for deployment
- `npm run build:all` - builds both backend and frontend
- `npm run build:backend` - builds the backend without reinstalling dependencies
- `npm run lint` - lints backend then frontend
- `npm run format` - formats backend then frontend

## Backend Scripts

Defined in [backend/package.json](/C:/Users/hp/PEELP/backend/package.json):

- `npm run dev` - runs compiled backend from `dist/`
- `npm run build` - compiles TypeScript (`tsc`)
- `npm run start` - runs compiled backend from `dist/`
- `npm run lint` - runs ESLint on `src/**/*.ts`
- `npm run format` - formats backend TypeScript files

## Frontend Scripts

Defined in [frontend/package.json](/C:/Users/hp/PEELP/frontend/package.json):

- `npm run dev` - starts Vite dev server
- `npm run build` - TypeScript build + Vite build
- `npm run preview` - previews production build
- `npm run lint` - runs ESLint on `src/**/*.ts(x)`
- `npm run format` - formats frontend TS/TSX/CSS files

## Available API Endpoint

Backend currently exposes:
- `GET /api/health` -> `{ "status": "ok", "message": "PEELP Backend is running" }`

## Notes

- Existing docs in [docs/](/C:/Users/hp/PEELP/docs) describe broader planned architecture and phases.
- Use them as roadmap material; implementation is currently much smaller than the full target scope.

## Deploying to Railway

Deploy the repository as two Railway services:

1. Create a PostgreSQL database in the Railway project.
2. Create a backend service from this repository, setting the service root directory
   to `backend` so it uses [backend/railway.toml](/C:/Users/hp/PEELP/backend/railway.toml)
   for its build and start commands and only reads backend-specific environment variables.
3. Add these backend variables:
   - `DATABASE_URL` - reference the Railway PostgreSQL service
   - `BETTER_AUTH_SECRET` - a strong, persistent secret
   - `BETTER_AUTH_URL=https://peelp-production-9c07.up.railway.app`
   - `FRONTEND_URL=https://peaceful-emotion-production-d146.up.railway.app`
   - `NODE_ENV=production`
4. Deploy a second service from the same repository with root directory `frontend`.
5. `frontend/.env.production` configures `VITE_API_URL` for the deployed backend. If Railway
   variables override committed environment files, set `VITE_API_URL` to
   `https://peelp-production-9c07.up.railway.app/api` and redeploy the frontend after changing it.

The backend service applies committed Prisma migrations before starting and exposes
`/api/health` for Railway health checks. The frontend service runs the Vite production
preview server.
