# 🚀 PEELP Project Setup Guide

Complete setup instructions for developers working on the PEELP Learning Management System.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Initial Setup](#initial-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Database Management](#database-management)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- **Git** for version control
- **PostgreSQL** 12+ (for database)

### Recommended Tools
- **VS Code** with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Prisma
  - Thunder Client or Postman (API testing)
  - PostgreSQL client (pgAdmin or DBeaver)

### Accounts Required
- **Stripe** ([Create account](https://stripe.com))
- **Cloudinary** ([Create account](https://cloudinary.com))
- **GitHub** (for repository)

---

## Project Overview

PEELP is a full-stack LMS with the following architecture:

```
┌─────────────────────────────────────────────────────┐
│         Frontend (React + TypeScript + Vite)        │
│  Runs on: http://localhost:5173                     │
└────────────────┬────────────────────────────────────┘
                 │ HTTP/REST + JWT
┌────────────────▼────────────────────────────────────┐
│   Backend (Node.js + Express + TypeScript)          │
│  Runs on: http://localhost:5000                     │
└────────────────┬────────────────────────────────────┘
                 │ Prisma ORM
┌────────────────▼────────────────────────────────────┐
│       PostgreSQL Database                           │
│  peelp_dev (development)                            │
└─────────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼─────┐      ┌───▼──────┐
   │  Stripe  │      │Cloudinary│
   └──────────┘      └──────────┘
```

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd PEELP

# Verify structure
ls -la
# Should show: backend/, frontend/, docs/, README.md, package.json, etc.
```

### 2. Install Root Dependencies

```bash
npm install
```

This installs `concurrently` for running both servers simultaneously.

### 3. Set Up Git Hooks (Optional)

```bash
# To prevent accidental commits of .env files:
git config core.hooksPath .git/hooks
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/peelp_dev"

# JWT
JWT_SECRET="your_super_secret_key_change_in_production"
JWT_EXPIRY="7d"

# Server
PORT=5000
NODE_ENV="development"

# Stripe Keys (Get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cloudinary (Get from https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"
```

### Step 4: Set Up PostgreSQL Database

**Option A: Using Local PostgreSQL**

```bash
# macOS (with Homebrew)
brew services start postgresql

# Ubuntu/Debian
sudo service postgresql start

# Windows: Open PostgreSQL app or use Services
```

**Option B: Using Docker**

```bash
docker run --name peelp-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=peelp_dev \
  -p 5432:5432 \
  -d postgres:15
```

**Verify connection:**

```bash
psql postgresql://postgres:password@localhost:5432/peelp_dev
# If successful, you should see: psql (15.0)
# Type: \q to exit
```

### Step 5: Set Up Prisma & Database Schema

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration and apply schema
npm run prisma:migrate -- --name init

# Seed initial data (admin user, categories, etc.)
npm run prisma:seed
```

### Step 6: Verify Backend Setup

```bash
# Start backend server
npm run dev
```

Expected output:
```
🚀 Server running on http://localhost:5000
📚 PEELP Backend - Online Learning Management System
```

Test the health endpoint:
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","message":"PEELP Backend is running"}
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory (from root)

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment File

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# App Info
VITE_APP_NAME=PEELP
VITE_APP_DESCRIPTION=Peace Institute of Language and Computer Centre

# Features
VITE_ENABLE_ANALYTICS=false
```

### Step 4: Verify Frontend Setup

```bash
# Start frontend dev server
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Visit `http://localhost:5173` in your browser.

---

## Running the Application

### Option 1: Run Both Services in Parallel (Recommended)

From the root directory:

```bash
npm run dev
```

This opens two terminal windows running:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

### Option 2: Run Services Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Testing the Full Stack

1. Open `http://localhost:5173` in your browser
2. Navigate to **Register** and create a student account
3. Verify the account in backend console or database
4. Admin should approve the account (manual via database or API, UI to be built)
5. Login with student credentials
6. Explore the interface

### Default Test Credentials (After Seeding)

**Admin:**
- Email: `admin@peelp.com`
- Password: `admin@PEELP123`

**Instructor:**
- Email: `instructor@peelp.com`
- Password: `instructor@123`

---

## Development Workflow

### 1. Creating a New Feature

Example: Building the user approval endpoint

**Step 1: Update Database Schema (Backend)**

Edit `backend/prisma/schema.prisma` if needed, then:

```bash
cd backend
npm run prisma:migrate -- --name add_user_approval_timestamp
```

**Step 2: Create API Endpoint (Backend)**

Create `backend/src/routes/admin.ts`:

```typescript
import express from 'express';
import { verifyToken, roleGuard } from '@/middleware';
// ... endpoint logic
```

**Step 3: Create Frontend Components**

Create `frontend/src/pages/admin/UserApproval.tsx`:

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
// ... component logic
```

### 2. Code Quality Checks

**Linting:**
```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

**Formatting:**
```bash
# Backend
cd backend && npm run format

# Frontend
cd frontend && npm run format
```

### 3. Committing Changes

```bash
# Check what changed
git status

# Stage files
git add backend/... frontend/...

# Commit with descriptive message
git commit -m "feat: add user approval workflow"

# Push to remote
git push origin feature-branch-name
```

### 4. Creating Pull Requests

1. Push to a feature branch
2. Create PR on GitHub
3. Request reviews
4. Address feedback
5. Merge to main after approval

---

## Database Management

### Viewing Data with Prisma Studio

```bash
cd backend
npm run prisma:studio
```

Opens GUI at `http://localhost:5555` to browse/edit data.

### Creating a New Migration

After modifying `schema.prisma`:

```bash
cd backend
npm run prisma:migrate -- --name describe_change
```

Example:
```bash
npm run prisma:migrate -- --name add_course_publishing_status
```

### Resetting Database (⚠️ Destructive!)

```bash
cd backend
npx prisma migrate reset
```

This:
1. Drops all tables
2. Runs all migrations
3. Runs seed script

⚠️ **Only use in development!** Never on production.

### Seeding with Custom Data

Edit `backend/prisma/seed.ts` then:

```bash
cd backend
npm run prisma:seed
```

---

## Troubleshooting

### Common Issues

#### 1. "Port already in use"

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

#### 2. "Cannot find module '@/middleware'"

TypeScript path alias not resolving. Check:
- `tsconfig.json` has correct baseUrl and paths
- Restart IDE and dev server

```bash
npm run dev  # Restart
```

#### 3. "Database connection refused"

```bash
# Check PostgreSQL is running
psql -U postgres

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### 4. "JWT_SECRET not defined"

Ensure `.env` file exists and contains:

```bash
JWT_SECRET="your_secret_key"
```

Reload dev server after editing `.env`.

#### 5. CORS errors

Check:
- Backend has CORS middleware enabled
- FRONTEND_URL in backend `.env` matches frontend origin
- Frontend VITE_API_URL matches backend URL

#### 6. "npm install" fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### 7. Vite "HMR failed" during dev

```bash
# Restart Vite
# Press Ctrl+C in terminal and run:
npm run dev
```

---

## Next Steps

1. **Read Project Documentation**
   - Review `docs/project-scope.md` for full requirements
   - Check `backend/README.md` for API structure
   - Check `frontend/README.md` for component patterns

2. **Explore the Codebase**
   - Backend: Start with `backend/src/index.ts`
   - Frontend: Start with `frontend/src/App.tsx`

3. **Set Up Your IDE**
   - Install recommended VS Code extensions
   - Configure Prettier to auto-format on save
   - Enable ESLint warnings in editor

4. **Start Contributing**
   - Pick a task from Phase 1 (Database & Auth)
   - Create a feature branch
   - Follow the workflow above

5. **Ask Questions**
   - Check existing issues/PRs
   - Review project documentation
   - Ask in team communication channels

---

## Useful Commands Reference

```bash
# Root directory
npm run dev              # Run both backend and frontend
npm run lint            # Lint all projects
npm run format          # Format all projects
npm run build           # Build all projects

# Backend
cd backend
npm run dev             # Start backend
npm run build           # Compile TypeScript
npm run lint            # Lint backend code
npm run format          # Format backend code
npm run prisma:migrate  # Create/run migrations
npm run prisma:studio   # Open database GUI

# Frontend
cd frontend
npm run dev             # Start frontend
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Lint frontend code
npm run format          # Format frontend code
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start development | `npm run dev` |
| Build for prod | `npm run build` |
| Lint code | `npm run lint` |
| Format code | `npm run format` |
| View database | `cd backend && npm run prisma:studio` |
| Reset database | `cd backend && npx prisma migrate reset` |
| Create migration | `cd backend && npm run prisma:migrate -- --name name` |
| Seed database | `cd backend && npm run prisma:seed` |

---

## Support

- 📖 Documentation: See `docs/` folder
- 🐛 Issues: GitHub Issues
- 💬 Questions: Team channels

Happy coding! 🚀
