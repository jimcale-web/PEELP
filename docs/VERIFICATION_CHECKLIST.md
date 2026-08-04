# ✅ PEELP Setup Verification Checklist

Use this checklist to verify your development environment is properly configured.

## Prerequisites

- [ ] Node.js v18+ installed: `node --version`
- [ ] npm v9+ installed: `npm --version`
- [ ] Git installed: `git --version`
- [ ] PostgreSQL 12+ installed or accessible
- [ ] Code editor installed (VS Code recommended)

## Project Structure

- [ ] `/backend` directory exists
- [ ] `/frontend` directory exists
- [ ] `/docs` directory exists with `project-scope.md`
- [ ] Root `README.md` exists
- [ ] Root `SETUP.md` exists
- [ ] Root `package.json` exists
- [ ] Root `.gitignore` updated

## Backend Setup

- [ ] `backend/package.json` has all dependencies
- [ ] `backend/tsconfig.json` configured
- [ ] `backend/.eslintrc.json` exists
- [ ] `backend/.prettierrc.json` exists
- [ ] `backend/.env.example` exists
- [ ] `backend/.gitignore` exists
- [ ] `backend/README.md` created
- [ ] `backend/prisma/schema.prisma` exists with all models
- [ ] `backend/prisma/seed.ts` exists
- [ ] `backend/src/index.ts` created
- [ ] `backend/src/middleware/auth.ts` created
- [ ] `backend/src/types/index.ts` created
- [ ] Directory structure created:
  - [ ] `backend/src/routes/`
  - [ ] `backend/src/controllers/`
  - [ ] `backend/src/services/`
  - [ ] `backend/src/utils/`

## Frontend Setup

- [ ] `frontend/package.json` has all dependencies (React Router, Query, etc.)
- [ ] `frontend/tsconfig.json` configured
- [ ] `frontend/.eslintrc.json` exists
- [ ] `frontend/.prettierrc.json` exists
- [ ] `frontend/.env.example` exists
- [ ] `frontend/.gitignore` exists
- [ ] `frontend/README.md` created
- [ ] `frontend/vite.config.ts` exists
- [ ] `frontend/src/services/api.ts` created
- [ ] `frontend/src/types/index.ts` created
- [ ] Directory structure created:
  - [ ] `frontend/src/pages/auth/`
  - [ ] `frontend/src/pages/admin/`
  - [ ] `frontend/src/pages/instructor/`
  - [ ] `frontend/src/pages/student/`
  - [ ] `frontend/src/components/`
  - [ ] `frontend/src/hooks/`
  - [ ] `frontend/src/context/`
  - [ ] `frontend/src/utils/`
  - [ ] `frontend/src/styles/`

## Environment Configuration

### Backend
- [ ] `backend/.env` created from `.env.example`
- [ ] `DATABASE_URL` set correctly
- [ ] `JWT_SECRET` set to a secure value
- [ ] `PORT` configured (default: 5000)
- [ ] `FRONTEND_URL` set to frontend URL

### Frontend
- [ ] `frontend/.env` created from `.env.example`
- [ ] `VITE_API_URL` points to backend: `http://localhost:5000/api`
- [ ] `VITE_APP_NAME` set to PEELP

## Database Configuration

- [ ] PostgreSQL is installed and running
- [ ] Database connection string is valid
- [ ] Can connect via: `psql $DATABASE_URL`
- [ ] Prisma Client can be generated: `cd backend && npm run prisma:generate`

## Dependency Installation

### Backend
- [ ] Dependencies installed: `cd backend && npm install`
- [ ] No installation errors
- [ ] `node_modules/` created

### Frontend
- [ ] Dependencies installed: `cd frontend && npm install`
- [ ] No installation errors
- [ ] `node_modules/` created

### Root
- [ ] Dependencies installed: `npm install`
- [ ] `concurrently` available for running both servers

## Database Setup

- [ ] Prisma migrations run: `cd backend && npm run prisma:migrate`
- [ ] Database schema created
- [ ] Seed data loaded: `cd backend && npm run prisma:seed`
- [ ] Can access Prisma Studio: `cd backend && npm run prisma:studio`

## Development Servers

### Backend Server Test
- [ ] Backend starts: `cd backend && npm run dev`
- [ ] Listens on `http://localhost:5000`
- [ ] Health check works: `curl http://localhost:5000/api/health`
- [ ] Response: `{"status":"ok","message":"PEELP Backend is running"}`

### Frontend Server Test
- [ ] Frontend starts: `cd frontend && npm run dev`
- [ ] Accessible at `http://localhost:5173`
- [ ] Hot reload works (modify a file, page updates)
- [ ] No build errors in console

### Concurrent Run Test
- [ ] Both run together: `npm run dev` (from root)
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can access both simultaneously

## Code Quality Tools

- [ ] ESLint working: `cd backend && npm run lint`
- [ ] ESLint working: `cd frontend && npm run lint`
- [ ] Prettier formatting: `cd backend && npm run format`
- [ ] Prettier formatting: `cd frontend && npm run format`

## IDE Setup (Optional but Recommended)

- [ ] VS Code installed
- [ ] Extensions installed:
  - [ ] ESLint
  - [ ] Prettier - Code formatter
  - [ ] TypeScript Vue Plugin (Vue)
  - [ ] Thunder Client or REST Client (for API testing)
  - [ ] Prisma

## Git Setup

- [ ] Repository initialized: `git status` works
- [ ] `.gitignore` covers node_modules, .env, dist
- [ ] Can stage files: `git add .`
- [ ] Can commit: `git commit -m "Initial setup"`

## Documentation Review

- [ ] Read `README.md`
- [ ] Read `SETUP.md`
- [ ] Read `backend/README.md`
- [ ] Read `frontend/README.md`
- [ ] Read `docs/project-scope.md`
- [ ] Understand Phase 0 is complete
- [ ] Understand Phase 1 is next step

## External Services (Optional - For Later)

- [ ] Stripe account created (for Phase 5)
- [ ] Cloudinary account created (for Phase 3)
- [ ] API keys obtained and documented

## Final Verification

- [ ] Can start both servers without errors
- [ ] Frontend connects to backend (check network tab in browser dev tools)
- [ ] Database is accessible
- [ ] TypeScript compilation works
- [ ] All tests pass (when tests are added)

---

## Common Issues & Solutions

### Problem: `DATABASE_URL not found`
**Solution:** Create `.env` file with `DATABASE_URL` variable

### Problem: Port 5000/5173 already in use
**Solution:** Kill process on port or change PORT in `.env`

### Problem: Cannot connect to PostgreSQL
**Solution:** Verify PostgreSQL is running, check connection string

### Problem: `npm install` fails
**Solution:** Clear cache: `npm cache clean --force` then retry

### Problem: TypeScript errors in IDE
**Solution:** Restart IDE and dev server

### Problem: CORS errors
**Solution:** Verify `FRONTEND_URL` in backend `.env` matches frontend origin

---

## Next Steps

Once all checkboxes are complete:

1. ✅ Verify Phase 0 is 100% complete
2. ✅ Ensure all development servers run
3. ✅ Review documentation
4. ✅ Start Phase 1: Database Schema & Authentication

See `docs/project-scope.md` for Phase 1 tasks.

---

**Good luck! 🚀**
