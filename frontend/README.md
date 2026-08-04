# PEELP Frontend

Frontend client for PEELP built with React, TypeScript, and Vite.

## Current Implementation

- App entry: [src/main.tsx](/C:/Users/hp/PEELP/frontend/src/main.tsx)
- Root component: [src/App.tsx](/C:/Users/hp/PEELP/frontend/src/App.tsx)
- API client scaffold: [src/services/api.ts](/C:/Users/hp/PEELP/frontend/src/services/api.ts)
- Shared types scaffold: [src/types/index.ts](/C:/Users/hp/PEELP/frontend/src/types/index.ts)

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
cd frontend
npm install
```

## Scripts

Defined in [package.json](/C:/Users/hp/PEELP/frontend/package.json):

- `npm run dev` - start Vite dev server
- `npm run build` - TypeScript build + Vite build
- `npm run preview` - preview production build
- `npm run lint` - lint `src/**/*.ts(x)`
- `npm run format` - format `src/**/*.{ts,tsx,css}`

## Run Frontend

```bash
cd frontend
npm run dev
```

Default URL: `http://localhost:5173`

## Environment Variables

Template file: [frontend/.env.example](/C:/Users/hp/PEELP/frontend/.env.example)

Main variable used:
- `VITE_API_URL` (backend API base URL)

## Notes

- The README in [docs/project-scope.md](/C:/Users/hp/PEELP/docs/project-scope.md) describes the planned larger feature set.
- Current frontend code is an initial scaffold and does not yet implement that full scope.
