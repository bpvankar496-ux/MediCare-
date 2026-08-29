# MediCare+ — Hospital & Health Management App

A full-stack healthcare app: doctor booking, telemedicine (video/chat), pharmacy,
lab tests, health records, vitals tracking, reminders, family member profiles,
symptom checker, health calculators, emergency info, and a health article
library. Three roles are supported: **patient**, **doctor**, and
**receptionist**, each with their own dashboard.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite, React Router, Socket.io client
- **Backend:** Node.js + Express, MongoDB (Mongoose), Socket.io (realtime chat/video signaling)
- **Auth:** JWT (HTTP Bearer tokens) + bcrypt password hashing

## Project Structure

```
.
├── client/    # React + Vite frontend
├── server/    # Express + MongoDB API
└── package.json  # root scripts to run both together
```

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works well)

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment variables

Copy `server/.env.example` to `server/.env` and fill it in:

```bash
cp server/.env.example server/.env
```

| Variable        | Description                                              |
| --------------- | --------------------------------------------------------- |
| `MONGODB_URI`   | Your MongoDB connection string                            |
| `JWT_SECRET`    | A long random string used to sign auth tokens             |
| `PORT`          | Port the API listens on (default `4000`)                  |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS (dev default is fine)    |

### 4. Run in development

```bash
npm run dev
```

This starts the API on `:4000` and the Vite dev server on `:5173` together.
Open `http://localhost:5173`.

### 5. Seed sample data (optional)

```bash
npm run seed
```

Populates doctors, medicines, lab tests, hospitals, articles, and symptoms so
the app isn't empty on first run.

### 6. Production build / single-process deploy

```bash
npm start
```

Builds the frontend and serves it from the same Express server as the API —
one process, one port, ideal for platforms like Render or Railway.

## Security Notes

- Every personal-data collection (health records, vitals, reminders, family
  members, medicine orders, lab bookings, appointments, consultations) is
  scoped **server-side** to the logged-in user — the API ignores any
  client-supplied owner/user id and always uses the identity from the JWT.
  Patients can only ever see their own data; doctors/receptionists can see
  what their role needs to do its job.
- Passwords must be at least 8 characters and include a letter and a number.
- `/api/auth/login` and `/api/auth/signup` are rate-limited (10 requests per
  15 minutes per IP) to slow down brute-force attempts.
- Users can change their password and display name from **Settings** in the app.

## Available Scripts (root)

| Script                | What it does                                      |
| ---------------------- | -------------------------------------------------- |
| `npm run install:all`  | Installs dependencies for both client and server   |
| `npm run dev`          | Runs client + server together in dev mode          |
| `npm run build`        | Builds the production frontend bundle              |
| `npm start`            | Builds the frontend, then starts the single-process server |
| `npm run seed`         | Seeds the database with sample catalog data        |

## License

MIT
