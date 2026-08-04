# PEELP Monorepo

PEELP is a full-stack LMS project scaffold with:
- [backend/](/C:/Users/hp/PEELP/backend) - Node.js + Express + TypeScript API
- [frontend/](/C:/Users/hp/PEELP/frontend) - React + TypeScript + Vite app

## Current Status

This repository is currently in **early scaffold stage**:
- Backend has a working Express server and health endpoint.
- Frontend has a minimal React app and shared API/types scaffolding.
- Prisma files exist but are placeholders and not wired into scripts yet.

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
- `npm run build` - builds backend then frontend
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
