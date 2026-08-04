## Online Teaching System — PEELP (Peace Institute of Language and Computer Centre)

---

## Problem

The Peace Institute of Language and Computer Centre currently relies heavily on traditional face-to-face instruction, creating the following pain points:

1. Limited access to learning materials outside classroom hours
2. Difficulty managing student records manually
3. Inefficient communication between instructors and students
4. Inability to reach students in remote locations
5. Limited flexibility for working-class learners

---

## Solution

Develop a responsive web-based Learning Management System (LMS) that:

1. Enables online course registration and admin-approved enrollment
2. Provides access to digital learning materials (videos, PDFs)
3. Delivers auto-graded online assessments at section and course level
4. Automates student record management and report generation
5. Enforces secure user authentication and role-based access control
6. Supports flexible subscription-based access to course content

---

## Users & Roles

### Administrator
- Can also act as an instructor (create and teach courses)
- Manage user accounts: approve student self-registrations; create instructor accounts
- Approve or reject courses submitted by instructors before they go live
- Manage subscriptions: create/edit/delete subscription plans, set durations, renew or revoke access
- Price and categorize courses
- Make platform-wide announcements
- Generate system reports (see Reports section)
- Monitor system activity

### Instructor
- Created by admin (no self-registration)
- Create courses structured as: **Course → Modules → Lessons**
- Upload lesson materials (pre-recorded videos, PDFs) — async only, no live sessions
- Create MCQ quizzes (one per module section) and a final MCQ exam per course
- Set passing configuration per quiz/exam (default: 50%)
- Submit courses for admin approval before they are visible to students
- View course-level reports: enrollment count, quiz scores per student, completion rate
- *(Communication channels — TBD)*

### Student
- Self-registers → account is pending until admin approves
- While pending: can browse the course catalog (read-only), cannot enroll or access materials
- Once approved: can subscribe and enroll in courses (enrollment requires admin approval)
- Access course materials (videos, PDFs) within active subscription
- Take MCQ quizzes after each module section and a final exam at course end
- Up to **3 retake attempts** per quiz or exam; passing score is **50%**
- Receive an **auto-generated PDF certificate** upon passing the final exam
- Lose access to all materials immediately when subscription expires

---

## Course Structure

```
Course
 └── Module
      └── Lesson (video / PDF)
      └── Section Quiz (MCQ, auto-graded)
 └── Final Exam (MCQ, auto-graded, required to complete course)
```

- One instructor per course
- Courses are grouped by **category** and searchable via a search bar
- Courses are only visible to students after admin approval

---

## Assessments

| Type | Trigger | Format | Grading | Attempts | Pass Score |
|---|---|---|---|---|---|
| Section Quiz | After each module section | MCQ | Auto | 3 | 50% |
| Final Exam | After completing all modules | MCQ | Auto | 3 | 50% |

- Passing the final exam marks the course as complete and triggers certificate generation
- Failing after 3 attempts locks the exam (admin/instructor can reset — TBD)

---

## Subscriptions & Access

- **Subscription types:**
  - Category subscription — access limited to courses within a specific category; duration set by admin
  - Monthly subscription — access to all courses for one month
  - Yearly subscription — access to all courses for one year
- Admin creates, prices, and manages all subscription plans
- On expiry: access to all course materials is revoked immediately
- Enrollment still requires admin approval even within an active subscription
- a student can not hold multiple subscription types simultaneously?

---

## Reports

| Audience | Report Contents |
|---|---|
| Admin | System-wide: user counts, enrollments, revenue, subscription stats, course approval status |
| Instructor | Per-course: enrollment count, per-student quiz scores, course completion rate |

---

## Authentication & Security

- Students self-register with email + password; account inactive until admin approves
- Instructors are created by admin; admin can also hold an instructor role
- Role-based access control: Admin / Instructor / Student
- Secure password storage (hashed); protected routes per role
- Data protection for student records and assessment results

---

## Platform

- Responsive web application (mobile-friendly browser, no native app)
- No live/synchronous sessions — fully asynchronous content delivery

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 19 + TypeScript + Vite | UI — already scaffolded |
| React Router v7 | Role-based protected routes (Admin / Instructor / Student) |
| TanStack Query | Server state — course lists, enrollment status, quiz results |
| React Hook Form + Zod | Forms with validation — registration, course builder, quiz builder |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express (TypeScript) | REST API |
| Prisma | ORM — models Course → Module → Lesson hierarchy and subscription expiry |
| PostgreSQL | Relational database — subscriptions, enrollments, quiz attempts, approval flows |
| JWT + bcrypt | Auth with full control over custom pending/approved account states |

### Services
| Tool | Purpose |
|---|---|
| Cloudinary | Video and PDF upload, storage, and streaming |
| Stripe | Subscription billing — monthly, yearly, category plans; handles expiry/renewal |
| Puppeteer | Auto-generate PDF certificates on course completion |
| node-cron | Scheduled job to revoke access on subscription expiry |

### Architecture
```
React + Vite (TypeScript)
    ↕ REST API (JWT)
Node.js + Express
    ↕ Prisma ORM
PostgreSQL
    + Cloudinary (file storage)
    + Stripe (subscriptions)
    + Puppeteer (certificates)
```

---

## Implementation Plan

### Phase 0 — Project Setup
- [ ] Initialize backend repo: Node.js + Express + TypeScript
- [ ] Configure ESLint, Prettier, tsconfig for both frontend and backend
- [ ] Set up PostgreSQL database (local dev instance)
- [ ] Initialize Prisma and connect to database
- [ ] Install React Router v7, React Hook Form, Zod
- [ ] Set up environment variable files (`.env`) for both frontend and backend
- [ ] Create shared folder structure (`/api`, `/components`, `/pages`, `/hooks`)

---

### Phase 1 — Database Schema & Auth
- [ ] Design and write Prisma schema: User, Role, Course, Module, Lesson, Category
- [ ] Add schema models: Quiz, Question, Attempt, Enrollment, Subscription, Certificate
- [ ] Run initial migration
- [ ] Seed database with an admin account and test categories
- [ ] Build `POST /auth/register` — student self-registration (status: pending)
- [ ] Build `POST /auth/login` — returns JWT with role claim
- [ ] Build `GET /auth/me` — returns current user from token
- [ ] Implement JWT middleware (verify token, attach user to request)
- [ ] Implement role-guard middleware (Admin / Instructor / Student)
- [ ] Frontend: register page, login page
- [ ] Frontend: auth context + protected route wrapper per role
- [ ] Frontend: redirect to correct dashboard after login based on role

---

### Phase 2 — Admin: User Management
- [ ] `GET /admin/users` — list all users with status and role filters
- [ ] `PATCH /admin/users/:id/approve` — approve a pending student
- [ ] `PATCH /admin/users/:id/reject` — reject a pending student
- [ ] `POST /admin/users` — create an instructor account
- [ ] `PATCH /admin/users/:id` — edit user details
- [ ] `DELETE /admin/users/:id` — deactivate/delete user
- [ ] Frontend: admin dashboard layout + sidebar navigation
- [ ] Frontend: pending approvals queue with approve/reject actions
- [ ] Frontend: user management table (search, filter by role/status)
- [ ] Frontend: create instructor form

---

### Phase 3 — Categories & Course Builder (Instructor)
- [ ] `POST /admin/categories` — create course category
- [ ] `GET /categories` — list all categories (public)
- [ ] `POST /courses` — instructor creates a course (status: draft)
- [ ] `POST /courses/:id/modules` — add a module to a course
- [ ] `POST /modules/:id/lessons` — add a lesson (title, type: video/pdf)
- [ ] `POST /lessons/:id/upload` — upload file to Cloudinary, store URL
- [ ] `PATCH /courses/:id/submit` — instructor submits course for admin review
- [ ] `PATCH /admin/courses/:id/approve` — admin approves course (status: published)
- [ ] `PATCH /admin/courses/:id/reject` — admin rejects with reason
- [ ] `PUT/DELETE` routes for editing/removing modules and lessons
- [ ] Frontend: instructor course builder (create course, add modules, add lessons)
- [ ] Frontend: file upload with progress indicator (Cloudinary)
- [ ] Frontend: submit for review button + status badge (draft / pending / published)
- [ ] Frontend: admin course approval queue with preview

---

### Phase 4 — Course Catalog & Student Enrollment
- [ ] `GET /courses` — public catalog (published courses only, with category + search filter)
- [ ] `GET /courses/:id` — course detail page (description, modules, instructor)
- [ ] `POST /enrollments` — student requests enrollment
- [ ] `GET /admin/enrollments` — list pending enrollment requests
- [ ] `PATCH /admin/enrollments/:id/approve` — admin approves enrollment
- [ ] `PATCH /admin/enrollments/:id/reject` — admin rejects enrollment
- [ ] `GET /students/me/enrollments` — student's enrolled courses
- [ ] Frontend: course catalog page with category filter and search bar
- [ ] Frontend: course detail page (visible to unapproved students read-only)
- [ ] Frontend: enroll button (gated by approved account + active subscription)
- [ ] Frontend: admin enrollment approval queue
- [ ] Frontend: student dashboard — my courses list

---

### Phase 5 — Subscriptions & Access Control
- [ ] Configure Stripe products for monthly, yearly, and category plan types
- [ ] `POST /subscriptions/checkout` — create Stripe checkout session
- [ ] `POST /webhooks/stripe` — handle payment success, update subscription in DB
- [ ] `GET /subscriptions/me` — student's current subscription status
- [ ] `GET /admin/subscriptions` — list all subscriptions
- [ ] `PATCH /admin/subscriptions/:id/revoke` — manually revoke access
- [ ] `POST /admin/subscriptions/manual` — admin manually assigns a subscription
- [ ] Add access-check middleware: verify active subscription before serving course content
- [ ] Set up `node-cron` job to expire subscriptions daily and revoke access
- [ ] Frontend: subscription plans page with Stripe checkout redirect
- [ ] Frontend: admin subscription management table (renew, revoke, assign manually)
- [ ] Frontend: subscription status badge on student dashboard

---

### Phase 6 — Lesson Viewer & Progress Tracking
- [ ] `GET /enrollments/:id/lessons/:lessonId` — serve lesson (gated by subscription + enrollment)
- [ ] `POST /progress` — mark a lesson as complete
- [ ] `GET /enrollments/:id/progress` — return completed lessons for a course
- [ ] Enforce lesson order: next lesson unlocked only after current is marked complete
- [ ] Frontend: course player layout (sidebar module/lesson list + main content area)
- [ ] Frontend: video player (Cloudinary video URL) and PDF viewer
- [ ] Frontend: progress bar and lesson completion checkmarks
- [ ] Frontend: locked lesson state for students without active subscription

---

### Phase 7 — Quizzes & Exams
- [ ] `POST /modules/:id/quiz` — instructor creates quiz with MCQ questions
- [ ] `POST /courses/:id/exam` — instructor creates final exam
- [ ] `PUT /quizzes/:id` — edit quiz questions
- [ ] `POST /quizzes/:id/attempt` — student submits quiz answers
- [ ] Auto-grade submission: compare answers, calculate score, record attempt
- [ ] Enforce 3-attempt limit; lock quiz after 3 failures
- [ ] `GET /quizzes/:id/attempts/me` — student views their attempt history
- [ ] `PATCH /admin/attempts/:id/reset` — admin/instructor resets attempt count
- [ ] Trigger certificate generation when final exam is passed
- [ ] Frontend: quiz UI — one question at a time or all at once (TBD)
- [ ] Frontend: result screen — score, pass/fail, retake button (if attempts remain)
- [ ] Frontend: locked state after 3 failed attempts with contact message

---

### Phase 8 — Certificates
- [ ] Set up Puppeteer in backend
- [ ] Design HTML/CSS certificate template (student name, course, date, institute logo)
- [ ] `POST /certificates/generate/:enrollmentId` — render template to PDF, store URL
- [ ] `GET /certificates/me` — list student's earned certificates
- [ ] `GET /certificates/:id/download` — serve PDF file
- [ ] Frontend: certificates section on student dashboard
- [ ] Frontend: download certificate button on course completion screen

---

### Phase 9 — Reports & Announcements
- [ ] `GET /admin/reports/overview` — user counts, enrollments, revenue, subscription stats
- [ ] `GET /admin/reports/courses` — course approval status, enrollment per course
- [ ] `GET /instructor/reports/courses/:id` — enrollment count, quiz scores, completion rate
- [ ] Add CSV export to all report endpoints
- [ ] `POST /admin/announcements` — create platform-wide announcement
- [ ] `GET /announcements` — list active announcements (shown on all dashboards)
- [ ] Frontend: admin reports page with charts (enrollment trend, revenue)
- [ ] Frontend: instructor report page per course
- [ ] Frontend: announcement banner on student and instructor dashboards

---

### Phase 10 — Polish & Security Hardening
- [ ] Add rate limiting to auth endpoints (prevent brute force)
- [ ] Add input sanitization on all POST/PUT endpoints
- [ ] Validate file type and size on upload (videos and PDFs only)
- [ ] Audit all routes: ensure no endpoint is accessible outside its intended role
- [ ] Add pagination to all list endpoints
- [ ] Error handling middleware — consistent error response format
- [ ] Loading states, empty states, and error states on all frontend pages
- [ ] Responsive layout QA across screen sizes
- [ ] Write environment setup documentation (README)
- [ ] Final end-to-end test of full student journey (register → subscribe → enroll → study → exam → certificate)

---

## Open Items (TBD)

- [ ] Communication channels: which of these are in scope? — announcements, direct messages, per-course discussion forum, email/system notifications
- [ ] What happens after a student exhausts all 3 exam retakes — can admin/instructor reset attempts?
- [ ] Subscription model edge case: can a student hold multiple subscription types simultaneously?
