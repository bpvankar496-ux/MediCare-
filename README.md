# AllInOne Hospital

A full-featured healthcare platform: React/TypeScript frontend + Node.js/Express + MongoDB backend (converted from the original Supabase-based version — same features, same UI, different backend).

```
client/   React + TypeScript + Vite frontend
server/   Express + MongoDB (Mongoose) API + Socket.IO realtime
```

## Quick Start (one command)

### 1. Configure the server

```bash
cd server
cp .env.example .env
```

Open `server/.env` and paste your MongoDB Atlas connection string into `MONGODB_URI`, and set `JWT_SECRET` to a long random string:

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/hospital?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-long-random-secret
PORT=4000
```

### 2. Install everything

From the **project root** (not `client/` or `server/`):

```bash
npm run install:all
```

### 3. Run everything — one terminal, one command

Still from the project root:

```bash
npm run dev
```

This starts the API and the frontend together in the same terminal (labeled `[SERVER]` / `[CLIENT]`). The app opens at `http://localhost:5173`. No need to open two terminals or `cd` into `client`/`server` separately.

Catalog data (doctors, medicines, lab tests, symptoms, hospitals, articles) is **seeded automatically the first time the server connects to an empty database** — you don't need to run a separate seed command. If you ever want to re-run it manually (e.g. against a different database), `npm run seed` from the root does that too.

### 4. Use it

Open the app, sign up (choose Patient/Doctor/Receptionist), and you're in — no email confirmation step, unlike the original Supabase setup.

## Why pages looked empty before

If `MONGODB_URI` isn't set, or points at a fresh/empty database, and nothing seeded it, catalog pages (Symptom Checker, Emergency, Lab Tests, Pharmacy, etc.) will correctly show "no data" because there genuinely is none yet. This version seeds that data **automatically on server startup**, so as long as `server/.env` has a working `MONGODB_URI`, those pages will populate the first time the server boots. (Health Records / your own appointments etc. still start empty per-account — that's expected, not a bug — until you add some.)

## Video / audio consultations

Video/phone consultations use WebRTC between the two browsers, coordinated through the server's Socket.IO channel (this replaces Supabase Realtime, which the original app used for the same purpose).

**How someone knows they're being called:** when either side clicks "Join Now" on a scheduled consultation, the other side — if they're on the Consultations page (patient) or Doctor Dashboard (doctor) at the time — gets an on-screen "`<name>` is calling you now" banner with its own **Join Now** button, plus a browser notification if they've enabled one ("Enable call notifications" button on the same page). Clicking Join Now on either side opens the same call room and connects them. There's still no call ring while someone is on a *different* page of the app — they need to have that page open (or come back to it) to see the invite.

A few other things worth knowing:

- **Both people must open the *same* consultation and click "Join Now"** — the call only connects when both the patient's and the doctor's browser are looking at the same booked consultation.
- **A doctor only sees consultations under their dashboard if their account is discoverable** — see "Notes" in `client/README.md` about linking a doctor's login to their catalog listing via Receptionist Portal → Link Doctors. This build also relaxed the name-matching so a doctor's dashboard falls back to showing *all* scheduled consultations if none match their profile name exactly, so "Join Now" is always reachable.
- **Camera/mic permission prompts only appear over `localhost` or HTTPS** — if you open the app via a different device's IP address (not `localhost`) without HTTPS, the browser will silently refuse camera/mic access and the call won't start. Test from `localhost` on both sides, or set up HTTPS if testing across two separate devices.
- This build fixes a real bug in the earlier version where the two sides could end up computing the *same* "who goes first" role during connection setup, causing the call to silently stall for both parties. That's now corrected and covered by an automated test (`server/src/realtime.js`).

## What changed from the Supabase version

- **Database**: Postgres (Supabase) → MongoDB (Atlas), via Mongoose. Every collection mirrors the original table's field names, so almost no page logic had to change.
- **Auth**: Supabase Auth → a small JWT-based auth API (`server/src/routes/auth.js`) + `AuthProvider` in the client (`client/src/lib/auth.tsx`).
- **Data access**: `supabase.from(table)...` calls → a matching REST query builder in `client/src/lib/db.ts` that talks to a generic `/api/:collection` REST API (`server/src/routes/collections.js`). The chainable `.select()/.insert()/.update()/.delete()/.eq()/.ilike()/.order()/.single()` calls all work the same way from the page code's point of view.
- **Realtime**: Supabase Realtime channels (used for WebRTC video-call signaling and consultation chat) → Socket.IO, wrapped in the same `channel()`/`removeChannel()`/`.on()`/`.send()`/`.track()` shape in `client/src/lib/db.ts`, backed by `server/src/realtime.js`.
- **Startup**: catalog data now auto-seeds on server boot, and one root-level `npm run dev` starts both apps together.

See `server/README.md` and `client/README.md` for details on each half.
