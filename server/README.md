# AllInOne Hospital — Server

Node.js/Express API backed by MongoDB (via Mongoose), replacing the original Supabase backend. Provides:

- JWT-based auth (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`) — replaces Supabase Auth
- A generic REST CRUD API per collection (`/api/:collection`) — replaces `supabase.from(table)`
- A Socket.IO realtime layer (broadcast + presence) — replaces Supabase Realtime channels, used for video-call signaling and consultation chat

## Setup

Usually you'll run this from the project root with `npm run install:all` / `npm run dev` (see the root `README.md`) — but it also works standalone:

```bash
npm install
cp .env.example .env   # then paste your MongoDB Atlas URI and set a JWT secret
npm run dev
```

The API listens on `http://localhost:4000` by default (`PORT` in `.env`).

## Environment Variables (`.env`)

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/hospital?retryWrites=true&w=majority
JWT_SECRET=some-long-random-string
PORT=4000
```

CORS is wide open by default (reflects whatever origin the request came from) since this is meant to run locally / on a private network. If you deploy this publicly, lock `corsOptions` down in `src/index.js`.

## Auto-seeding

On every successful MongoDB connection, the server calls `seedCatalog()` (`src/seed.js`), which inserts the sample catalog data (doctors, medicines, lab tests, symptoms, hospitals, articles) **only into empty collections** — it's a no-op once data exists, so it's safe to leave this running every time you start the server. To run it manually against a specific database without starting the whole server: `npm run seed`.

## Project Structure

```
src/
├── index.js               # Express app + Mongo connection + wires up realtime.js
├── realtime.js              # Socket.IO channel/broadcast/presence logic (kept separate so it's testable on its own)
├── seed.js                   # Catalog seed data + seedCatalog() (auto-run on boot, and `npm run seed`)
├── middleware/
│   └── auth.js                # JWT verification middleware
├── routes/
│   ├── auth.js                  # signup / login / me
│   └── collections.js            # generic /api/:collection CRUD
└── models/                     # One Mongoose model per collection, plus registry.js
```

## Data Model

Collections mirror the original Supabase tables 1:1 (same field names), so the frontend needed minimal changes:

`doctors`, `appointments`, `medicines`, `medicine_orders`, `lab_tests`, `lab_test_bookings`, `health_records`, `vitals`, `reminders`, `symptoms`, `hospitals`, `family_members`, `consultations`, `articles`, `inquiries`, `profiles` (+ `users`, which holds only login credentials, mirroring Supabase's `auth.users`/`public.profiles` split).

Every document exposes an `id` string field (mirroring Supabase's uuid `id` column) instead of Mongo's `_id`/`__v`, via a shared `toJSON` transform in `models/plugin.js`.

## Auth Model

- All `/api/:collection` routes require a valid `Authorization: Bearer <token>` header (mirrors the original "authenticated only" RLS policies) — there's no per-row `user_id` ownership check except where the app logic itself scopes it (e.g. inquiries, profiles), same as the original single-tenant design.
- `profiles` is read-only through the generic API (insert/update/delete are blocked) since profile rows are created automatically at signup — same restriction Supabase's RLS enforced.

## Realtime

`GET /api/:collection` and friends are plain REST. Video-call signaling and consultation chat instead use Socket.IO events that mimic the shape of Supabase Realtime channels the frontend already used, implemented in `src/realtime.js`:

- `channel:join` / `channel:leave` — join/leave a room (channel name)
- `broadcast` — send/receive a named event with a payload to everyone in a room
- `presence:track` / `presence:sync` — track per-connection state (keyed by a caller-supplied identity, not the raw socket id) and broadcast the room's presence map

See `client/src/lib/db.ts` for the `channel()`/`removeChannel()` wrapper that talks to this, and `client/src/lib/VideoCall.tsx` for how it's used to negotiate a WebRTC call (perfect-negotiation pattern: presence is used to deterministically decide which side is "polite" so both sides don't offer at once).
