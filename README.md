# Impahla app · Party Registry

A private contribution registry for Zambian kitchen parties and bridal showers. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, MySQL + Drizzle ORM, and wrapped for Android with Capacitor.

---

## Team

| Full Name | Student Number |
|-----------|----------------|
| Wongani Miyanza | 2420907 |
| Robert Muntanga | 2420908 |
| Oliver Kakungu | 2300176 |

---

## The Problem

When a family hosts a kitchen party or a bridal shower in Zambia, gifts arrive in a mix of cash, groceries, décor and promises — and they are almost always recorded in a paper notebook that gets lost, written over, or argued about afterwards. The host or event planner cannot easily tell who gave what, what has actually been received, or what is still only promised, and there is no single record the whole family can trust.

Impahla app solves this for the host, the event planner and the guests by keeping every contribution — cash, gifts and promises — in one private, account-based registry. Records are saved to a MySQL database, so everyone involved sees the same up-to-date picture.

---

## Tech Stack

- **Framework**: Next.js (App Router) with React
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database & ORM**: MySQL 8 with Drizzle ORM
- **Mobile wrapper**: Capacitor (`@capacitor/android`)
- **Authentication**: Node.js `crypto` (scrypt password hashing) with cookie-based sessions

---

## Colour Palette & Theme

The application uses a warm, earthy palette inspired by Zambian celebrations:

- **Burgundy (`#800020`)**: Primary accent, action buttons and focus rings.
- **Army Green (`#4B5320`)**: Secondary highlights and badge accents.
- **Coffee Brown (`#6f4e37`)**: Sidebar navigation, borders and structural tones.
- **Beige (`#F5F5DC` & `#FAF8F2`)**: Warm paper background and card surfaces.

---

## How to Build and Run

### Prerequisites

- **Node.js** v20 or newer (v22 or newer is required for the Capacitor CLI)
- **pnpm** (package manager)
- **MySQL 8** or XAMPP — optional, see step 3

### 1. Clone the repository

```bash
git clone https://github.com/Wongani01/impahla.git
cd impahla
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. (Optional) Connect MySQL

Import the schema, then point the app at the database:

```bash
mysql -u root < db/schema.sql
printf 'DATABASE_URL=mysql://root@127.0.0.1:3306/mphatso\n' > .env.local
```

If no database is configured, the app automatically falls back to a local JSON store (`.data/store.json`) so it still runs for a demonstration.

### 4. Run the web app

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

### 5. Type-check and build

```bash
npx tsc --noEmit
pnpm build
```

### 6. Run on Android (Capacitor)

**Important:** this app is a Next.js *server* application — it has API routes — so the Android WebView loads a running server rather than a self-contained static bundle.

1. Start the server with `pnpm dev` and note your computer's LAN IP address.
2. Point the native app at that address, either by editing `server.url` in `capacitor.config.ts` or by setting the `CAP_SERVER_URL` environment variable, for example `http://192.168.0.192:3000`.
3. Sync and open the native project:

   ```bash
   pnpm cap:sync
   pnpm cap:open
   ```

4. In Android Studio, wait for the Gradle sync to finish, then press **Run** on an emulator or a connected phone.

If you are running on an emulator, the phone cannot reach your machine by LAN IP by default — use `adb reverse tcp:3000 tcp:3000` and point the app at `http://localhost:3000`, or run the server so both devices share the same network.

### Where the Android project is

The native Android project lives in the **`android/`** folder. It contains the `app` module and the `build.gradle` / `settings.gradle` files. Open the `android/` folder directly in Android Studio.

---

## Screens

- **Landing page** (`/`) — introduces the app, explains how it works, and links to sign in or create an account.
- **Create account** (`/signup`) — registers a new user with a name, email, password and role.
- **Sign in** (`/login`) — authenticates an existing account and starts a session.
- **Registry / dashboard** (`/dashboard`) — the main workspace; the content changes with the signed-in role:
  - **Overview** — a hero for the current event plus summary cards for cash received, cash promised, contributor count and outstanding gifts.
  - **Contributions** — a searchable and filterable list of the contribution records.
  - **My Events** — a planner's list of their own events, with options to create, open and edit.
  - **Create / Edit event** — a form for creating or updating an event (name, category, host, date, time, venue, location, contact, expected attendees, cover image).
  - **Planner event detail** — totals for one event, a contribution table with a per-row status dropdown, and a "Close event" button.
  - **Discover** — a contributor's searchable list of open events they can support.
  - **Contributor event detail** — the full details of one event, with "Contribute Cash" and "Contribute Physical Gift" actions.
  - **Contribute cash** — a form for a cash contribution (full name, phone, amount in ZMW, note).
  - **Contribute physical gift** — a form for a gift (full name, phone, gift description, estimated value, quantity, optional photo, message).
- **Admin console** (`/admin`) — administrator-only view of platform statistics, users, all contributions and site content.

---

## Research Notes

Two concepts the team taught itself, and how they were used in this project.

### Concept 1 — Drizzle ORM with MySQL

**What it is.** Drizzle ORM is a TypeScript-first ORM. Database tables are declared in TypeScript using `mysqlTable`, mirroring the real SQL schema, so the structure of the database lives in code and every query is type-checked by the compiler. It runs on top of the `mysql2` driver and generates the SQL for us.

**Why our app needs it.** The registry must store events and contributions in MySQL so that every account — host, planner and guests, on any device — reads and writes the same records. We needed a typed layer because the same fields are used across API routes, services and the user interface; when we renamed columns, we wanted the compiler to point at every place still using the old name. Drizzle also let us compute each event's summary with SQL aggregates instead of loading every row into JavaScript and counting there.

**Where we learned it.** The official Drizzle ORM documentation (`orm.drizzle.team/docs`), particularly the MySQL column-types, schema and select pages; the MySQL 8.0 Reference Manual for `ENUM`, foreign keys and InnoDB behaviour; and the Next.js documentation for running database code inside server-only route handlers.

**What went wrong, and how we fixed it.**

- **Two sources of truth drifted.** `db/schema.sql` and `lib/db/schema.ts` stopped matching after a column rename. We fixed this by treating the two files as a single unit and diffing them after every change.
- **`date()` columns returned the wrong type.** Drizzle's `date()` column returns a JavaScript `Date`, but our service code assumed the driver handed back a `'YYYY-MM-DD'` string. This produced type errors and incorrect comparisons. We fixed it by adding small `dateOnly()` and `dateOnlyToDate()` normalisers so the code always works with one representation.
- **Renaming columns needed a migration, not a reset.** Renaming `amount → cash_amount`, `gift → gift_description`, `promised → pledged` and `received → confirmed` meant existing rows had to be preserved. We wrote a migration that copies and converts the old values and reports any row it cannot migrate, and we mirrored the same mapping in the JSON fallback store so no stale record could crash the dashboard.

### Concept 2 — Password hashing and session authentication

**What it is.** Instead of storing passwords, we store a salted, one-way hash and compare hashes at sign-in. We use Node's built-in `crypto.scrypt` to derive a 64-byte key from the password plus a random 16-byte salt, and store the result as `scrypt$salt$hash`. Verification recomputes the hash and compares it using `timingSafeEqual`, so the comparison takes the same amount of time no matter where the first difference is. After a successful sign-in we create a session: a random 32-byte token held in an `httpOnly` cookie, with the token mapped to a user id in the `sessions` table.

**Why our app needs it.** A registry is private to an account, so every API route must prove who is calling and we must never keep recoverable passwords. Sessions also carry the user's role (user, planner or admin) so we can gate screens and routes — for example, only the planner who owns an event may close it or change a contribution's status.

**Where we learned it.** The official Node.js documentation (`nodejs.org/api/crypto.html`) for `scrypt`, `randomBytes` and `timingSafeEqual`; the OWASP Password Storage Cheat Sheet for current guidance on password hashing; and the Next.js documentation for `cookies()` and route handlers.

**What went wrong, and how we fixed it.**

- **`cookies()` is asynchronous in Next.js 16.** Reading or setting the session cookie without awaiting it failed. We fixed this by awaiting `cookies()` everywhere it is used.
- **`timingSafeEqual` throws on unequal lengths.** If a stored hash was ever corrupted or truncated, the comparison would crash. We now check the buffer length first and fail the comparison safely instead.
- **Session lookups depend on MySQL.** So that the app still works when the database is unavailable during development, we added a fallback store that keeps sessions and users in a local JSON file, while MySQL remains the source of truth when it is reachable.

---

## Sources

- Drizzle ORM documentation — https://orm.drizzle.team/docs/overview
- MySQL 8.0 Reference Manual — https://dev.mysql.com/doc/refman/8.0/en/
- Node.js crypto documentation — https://nodejs.org/api/crypto.html
- OWASP Password Storage Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Next.js documentation — https://nextjs.org/docs
