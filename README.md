<<<<<<< HEAD
# Zenti Portal — School Management System

A full-stack, multi-role school management platform. It brings academics, finance, and the library under one roof, with a dashboard tailored to each type of user.
=======

# Zenti Portal — School Management System

A full-stack, multi-role school management platform. It brings academics, finance, and the library under one roof, with a dashboard tailored to each type of user.



>>>>>>> 07d6213a18a425ef6ac2efb3aadc6974a0115e3c

## What it does

Zenti Portal handles the day-to-day running of an institution:
<<<<<<< HEAD
=======



>>>>>>> 07d6213a18a425ef6ac2efb3aadc6974a0115e3c

- **Academics** — course catalog, student enrollment, attendance, grading, exam papers, and degree progress tracking
- **Finance** — student invoices, payments, ledgers, and expense/requisition tracking for the accounts team
- **Library** — book catalog, loans, reservations, reading lists, reviews, and gate logs
- **Admin tools** — system stats, password reset approvals, and account management

## Who uses it

The system supports five roles, each with its own dashboard and permissions:
<<<<<<< HEAD

| Role | Can do |
=======
| what the system Can do |
>>>>>>> 07d6213a18a425ef6ac2efb3aadc6974a0115e3c
|---|---|
| **Student** | View courses, grades, invoices, attendance, and the library |
| **Lecturer** | Manage courses, grade students, log office hours, publish research |
| **Accountant** | Handle invoices, payments, and expenses |
| **Librarian** | Manage the book catalog, loans, and reservations |
| **Admin** | Oversee everything — users, system stats, and access requests |

## Tech stack

**Frontend**
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts (for dashboard charts)

**Backend**
- Node.js + Express
- Drizzle ORM
- PostgreSQL (via Supabase)
- JWT-based authentication with role-based access control (RBAC)

**Deployment**
- Vercel (frontend as static build, backend as a serverless function)

## Project structure

```
├── frontend/          # React + Vite client app
│   └── src/
│       ├── components/    # Dashboards, login, library, finance UIs
│       ├── App.tsx
│       └── types.ts
├── backend/           # Express API server
│   ├── server.ts           # All API routes
│   ├── src/db/              # Drizzle schema & Supabase client
│   └── database_design.md  # Full relational schema reference
├── api/               # Vercel serverless entry point (wraps the backend)
└── vercel.json        # Deployment/routing config
```

## Getting started

**Prerequisites:** Node.js and a Supabase (PostgreSQL) project.

1. **Clone and install**
   ```bash
   git clone https://github.com/julesjnr/School-Management-System.git
   cd School-Management-System
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your own values:
   ```bash
   cp .env.example .env
   ```
   You'll need a Supabase URL/key and database connection details.

3. **Run the app** (starts backend and frontend together)
   ```bash
   npm run dev
   ```
   - Backend runs on `http://localhost:3000`
   - Frontend runs on Vite's dev server, proxying API calls to the backend

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run backend + frontend together |
| `npm run dev:backend` | Run only the API server |
| `npm run dev:frontend` | Run only the React app |
| `npm run build` | Build both for production |
| `npm run lint` | Type-check both frontend and backend |

Inside `backend/`, you also get:
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:push` — push schema changes to the database
- `npm run db:studio` — open Drizzle Studio to browse your data

## API overview

The backend exposes a REST API under `/api`, covering:
- `auth` — login, passcode changes, password reset requests
- `students`, `lecturers`, `courses` — core academic data
- `student-enrollments`, `student-attendance` — coursework tracking
- `invoices`, `payments` — finance
- `books`, `loans`, `gate-logs` — library
- `admin` — system stats and reset-request approvals

Full data model (tables, keys, and constraints) is documented in `backend/database_design.md`.

## Notes

- Data can sync to Supabase (Postgres) in addition to the local JSON store used for quick local testing (`db_store.json`).
- Authentication uses JWTs with bcrypt-hashed passwords and role-based endpoint protection.
<<<<<<< HEAD
=======

1. Install dependencies:

3. Run the app:   `npm install`
2. Set 
   `npm run dev`

>>>>>>> 07d6213a18a425ef6ac2efb3aadc6974a0115e3c
