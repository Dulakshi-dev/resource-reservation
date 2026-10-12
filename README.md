# Resource Desk

A resource reservation system for a growing organisation. People can see what is free right now, book a room, vehicle or piece of equipment, and cancel when plans change. Double-booking is impossible, because the database itself refuses overlapping reservations. Admins manage the resource list and see how it is being used.

Built for the PrimeWave Lab Software Engineering Internship technical assessment.

## How it addresses the business scenario

| Problem in the brief | What the app does |
| --- | --- |
| Overlapping reservations | A PostgreSQL exclusion constraint rejects any overlapping confirmed booking for the same resource, even when two people submit at the same moment |
| Uncertainty about availability | The home page shows every resource as "Free until 3:30 PM" or "In use until 4:00 PM", with a strip of today's bookings. Each resource has a full day timeline |
| Informal communication and manual records | One shared schedule, with who booked what and when |
| Needs to stay reliable as activity grows | Rules are enforced in the database, queries are indexed, and the app holds no server-side state |
| Understanding usage | An admin usage page shows bookings, hours, utilisation per resource and busiest hours |

## Features

- Sign in with two roles: **admin** and **member**
- Resource list with category filter and live status
- Resource page with a day timeline, day-by-day navigation and booking form
- Clear conflict message that says who holds the slot and when
- Back-to-back bookings are allowed (10:00 to 11:00, then 11:00 to 12:00)
- Cancel your own reservations (admins can cancel any). A cancelled slot can be booked again
- "Your reservations" page with upcoming and past bookings (admins can view everyone's)
- Admin: add, edit, deactivate and reactivate resources
- Admin: usage dashboard for the last 7, 30 or 90 days

## Tech stack

- Next.js 16 (App Router, Server Components and Server Actions) and TypeScript
- PostgreSQL 16 with Prisma 6
- Tailwind CSS 4
- Zod for validation, bcryptjs for password hashing
- Docker Compose for the local database

## Getting started

### Prerequisites

- Node.js 20 or newer
- Docker Desktop (or any PostgreSQL 14+ server that supports the `btree_gist` extension)

### Setup

```bash
git clone https://github.com/Dulakshi-dev/resource-reservation.git
cd resource-reservation
npm install

# environment variables
cp .env.example .env          # on Windows: copy .env.example .env
```

Open `.env` and set `SESSION_SECRET` to a random string of at least 16 characters. One way to generate it:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the database, create the tables and load sample data:

```bash
docker compose up -d
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Run the app:

```bash
npm run dev
```

Open http://localhost:3000.

The database runs on port **5433** (not 5432) so it does not clash with a PostgreSQL already installed on your machine. `DATABASE_URL` in `.env.example` already uses it.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | password123 |
| Member | member@example.com | password123 |

The seed script creates five resources, four weeks of past bookings (so the usage page has data) and a few upcoming bookings. Running `npx prisma db seed` again resets resources and reservations.

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npx prisma studio` | Browse the database in the browser |
| `npx prisma db seed` | Reset sample data |
| `docker compose down -v` | Stop the database and delete its data |

## Key design decisions

### 1. Double-booking is prevented by the database, not by application code

Checking for overlaps in JavaScript and then inserting has a race condition: two requests can both see a free slot and both insert. Instead, the `Reservation` table has an exclusion constraint:

```sql
ALTER TABLE "Reservation"
  ADD CONSTRAINT reservation_no_overlap
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');
```

- Ranges are half-open (`[)`), so one booking can end exactly when the next begins.
- The `WHERE` clause ignores cancelled reservations, so cancelling frees the slot.
- A second constraint requires `endAt > startAt`.
- The app catches the constraint violation (SQLSTATE `23P01`) and turns it into a readable message that names the person and time that block the slot.

Prisma cannot describe exclusion constraints in `schema.prisma`, so they live in the first migration as raw SQL (`prisma/migrations/*_init/migration.sql`, with the same SQL kept in `prisma/sql/overlap_constraints.sql`).

### 2. Business rules in one place

`src/lib/reservations.ts` holds validation (end after start, not in the past, at most 12 hours), the booking and cancellation logic and the permission check. Server Actions in `src/actions/` only read form data and call it. Pages stay focused on rendering.

### 3. Time zones

Times are stored as `timestamptz` (absolute instants). Input and display use Sri Lanka time (`Asia/Colombo`, fixed +05:30, no daylight saving), handled in `src/lib/time.ts`.

### 4. Soft cancellation

Cancelling sets `status = CANCELLED` and `cancelledAt` instead of deleting the row. This keeps history for the usage report and an audit trail.

### 5. Authentication kept small and safe

Sessions are an HMAC-signed, HTTP-only cookie (`src/lib/session.ts`) with a 7 day expiry, using Node's `crypto` module. Passwords are hashed with bcrypt. Every protected page and every Server Action checks the session on the server, and admin pages check the role, so hiding a menu link is never the only protection.

### 6. Scope

The brief asks for a focused solution, so there are deliberately no recurring bookings, approvals, notifications or payments.

## Data model

```
User 1 --- * Reservation * --- 1 Resource * --- 1 Category
```

| Table | Purpose |
| --- | --- |
| `User` | Name, email (unique), password hash, role (`ADMIN` or `MEMBER`) |
| `Category` | Groups resources (Meeting Room, Lab, Vehicle, Equipment) |
| `Resource` | Name, description, location, capacity, `isActive`, category |
| `Reservation` | Resource, user, title, notes, `startAt`, `endAt`, status, `cancelledAt` |

An index on `Reservation(resourceId, startAt)` supports the timeline and availability queries. The ER diagram link is provided in the submission form.

## Project structure

```
prisma/
  schema.prisma             data model
  migrations/               SQL migrations, including the overlap constraint
  seed.ts                   sample data
src/
  actions/                  Server Actions (auth, resources, reservations)
  app/
    login/                  sign-in page
    (app)/                  signed-in area
      page.tsx              resource list with live availability
      resources/[id]/       day timeline and booking form
      reservations/         your reservations
      admin/resources/      manage resources (admin)
      admin/usage/          usage dashboard (admin)
  components/               UI pieces (day strip, forms, navigation)
  lib/
    reservations.ts         booking rules and conflict handling
    session.ts              signed-cookie sessions and role checks
    time.ts                 time zone helpers
    usage.ts                usage statistics
    db.ts                   Prisma client
```

## Limitations and next steps

- No automated tests yet. The first ones I would add are for the overlap rules and the usage calculations.
- No login rate limiting, password reset or email verification.
- Times are fixed to Sri Lanka time rather than per-user time zones.
- A resource can be deactivated, but existing bookings on it stay on the schedule until cancelled.
- Possible additions: recurring bookings, an approval step for restricted resources, email reminders and a calendar export.

## Development notes

I used AI assistance (Claude) during development, as the assessment allows. I reviewed the code and can explain the decisions above.
