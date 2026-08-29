# AllInOne Hospital — Client

A full-featured healthcare platform built with React, TypeScript, and a Node.js/Express + MongoDB backend. It brings together doctor consultations, pharmacy ordering, lab test bookings, health records, vitals tracking, reminders, and more into a single app.

> This is the frontend. See `../server` for the API, and the root `README.md` for full setup instructions covering both.

## Features

- **Authentication** — email/password sign up and login (JWT-based, via the API); the app is gated behind login
- **Three roles** — Patient, Doctor, and Receptionist, chosen at signup, each with their own view
- **Real video/audio consultations** — WebRTC calls between patient and doctor, signaled over the API's Socket.IO realtime layer (no separate signaling server needed), plus in-call text chat
- **Reception desk** — patients can raise inquiries ("Ask Reception"); receptionists reply and resolve them, and link doctor accounts to their catalog listing
- **Reminder notifications** — browser push notifications fire at the scheduled reminder time (tab must be open; enable via the "Enable reminder notifications" button on the Reminders page)
- **PDF export** — download/print any health record as a PDF from the Records page
- **Dashboard** — quick overview of health activity and shortcuts to key sections
- **Doctors** — browse and search doctors by specialty, book appointments
- **Consultations** — manage upcoming and past telemedicine/in-person consultations
- **Pharmacy** — browse medicines, add to cart, place orders
- **Lab Tests** — browse tests, book with home collection or in-lab options
- **Health Records** — store and view medical documents and history
- **Vitals** — log and track vitals like BP, heart rate, sugar, weight
- **Reminders** — set medicine/health reminders with custom frequency
- **Symptom Checker** — look up symptoms and possible conditions/specialties
- **Calculators** — health calculators (BMI, etc.)
- **Emergency** — quick access to nearby hospitals and emergency services
- **Articles** — health education content
- **Family** — manage profiles for family members

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** — dev server and build tool
- **React Router 7** — client-side routing
- **Socket.IO client** — realtime broadcast/presence (video call signaling, chat)
- **Lucide React** — icons
- **date-fns** — date handling
- **Oxlint** — linting

## Project Structure

```
src/
├── assets/          # Static assets
├── components/
│   └── Layout.tsx   # App shell (nav, header, layout wrapper)
├── lib/
│   ├── db.ts         # API client: REST query builder + Socket.IO realtime channels
│   ├── auth.tsx       # Auth context (JWT-based, talks to /api/auth)
│   ├── types.ts       # Shared TypeScript interfaces
│   ├── ui.tsx          # Shared UI helper components (data-fetching hook, etc.)
│   └── VideoCall.tsx    # WebRTC video call component
├── pages/           # One file per route/screen
└── App.tsx / main.tsx
```

## Environment Variables

Create a `.env` file (a starter one is already included):

```
VITE_API_URL=http://localhost:4000
```

Point this at wherever the `server` app is running.

## Getting Started

```bash
npm install
npm run dev
```

The app will be available at the local URL printed in the terminal (typically `http://localhost:5173`). Make sure the `server` app (see `../server/README.md` / root README) is running first — the frontend won't work without it.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Notes

- **Roles are self-selected at signup** (Patient/Doctor/Receptionist) and trusted as-is — there's no admin approval step. For real-world use, restrict who can register as Doctor/Receptionist.
- **A doctor's login and their catalog listing (in the `doctors` collection used for booking) are separate until linked.** Once a doctor signs up, a receptionist goes to Receptionist Portal → "Link Doctors" and either **"Add New Doctor"** (creates a fresh catalog listing for that account in one step — specialty, fee, hospital, etc.) or links the account to an existing unlinked catalog row.
- **Video/audio calls use WebRTC**, connected via the API's Socket.IO channels for signaling — no separate call server to host or pay for. Both sides need to click "Join Now" on the same consultation at roughly the same time for the call to connect.
- **Auth is app-wide, not per-user, for most collections** (mirrors the original single-tenant design) — logging in is required to use the app, but all logged-in patients still see and share the same doctors/medicines/lab-tests catalog and each other's appointment-style records. `profiles` and `inquiries` are scoped per-user/role at the API layer where it matters. Don't put real patient data in this setup as-is.
- **Reminder notifications** use the browser Notification API and only fire while the app tab is open — there's no backend/push service.
- **PDF export** opens the browser print dialog with a formatted page — choose "Save as PDF" as the destination.
- **Payment method** on Pharmacy/Lab checkout is a selector (Cash on Delivery vs Online) stored with the order — it does not process real payments.
