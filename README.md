# MediCare+

**A full-stack, role-based hospital management + telemedicine platform** — patients book doctors, order medicines, run lab tests, track vitals, and consult doctors live; doctors manage their own patients, availability, and records; receptionists run the front desk. Built as a single MERN-style codebase with a few genuinely advanced extras (AI, blockchain, real-time video).

**Live demo:** https://medicare-f0fu.onrender.com
**Repo:** https://github.com/bpvankar496-ux/MediCare-

---

## 1. What problem this solves

Most student/hackathon healthcare projects are a doctor-booking CRUD app. MediCare+ instead models a **real hospital's three actors** (patient, doctor, receptionist) with **actually-enforced, role-based data access** — a doctor can only ever see their own patients, never another doctor's, checked server-side on every request, not just hidden in the UI. On top of that core, it adds an AI symptom triage assistant, optional blockchain record integrity, and live telemedicine — features usually shown only as mockups in similar projects, implemented here end-to-end and working.

## 2. Features (what actually works, end to end)

| Area | What it does |
|---|---|
| **Doctor booking** | Search/filter doctors by specialty, city, name; book an appointment; leave a 1–5 star review (auto-averaged into the doctor's rating). |
| **Telemedicine** | Book a video/phone/chat consultation. Real WebRTC video calls + a Socket.io signalling layer; incoming-call popups (`PhoneIncoming`) so a doctor is notified live, not just on refresh. |
| **AI Symptom Checker** | Patient describes symptoms in free text → sent to a Groq-hosted LLM → returns possible conditions, urgency level, and a recommended specialty. Clicking a suggested specialty jumps straight into the Doctors page **pre-filtered to that specialty** — a genuine cross-feature integration, not just a static result. |
| **Pharmacy** | Browse medicines, cart, checkout (sandbox payment — see §5). |
| **Lab Tests** | Browse tests, book with home sample collection, checkout (sandbox payment). |
| **Health Records** | Patient uploads/manages their own documents, exports any record as a PDF. **A treating doctor can also view and add records** (e.g. a prescription after a consultation) for their own patients only — see §4 for how this is scoped. Records can optionally be anchored on-chain (§6). |
| **Vitals Tracker** | Log blood pressure, heart rate, sugar, weight, temperature, SpO2 — with trend line charts (Recharts) over time. |
| **Reminders** | Medicine/appointment reminders with browser push notifications. |
| **Family Members** | Manage basic health info for dependents under one account. |
| **Doctor Dashboard** | Own appointments/consultations (scoped, never another doctor's), a "Patients" tab (§4), an availability editor, a weekly-volume analytics chart, and a Health Library publishing tool. |
| **Receptionist Dashboard** | Manage the doctor catalog, answer patient inquiries, view clinic-wide analytics (pie/bar charts by specialty and status). |
| **PWA** | Installable, works offline for static assets (service worker + manifest). |

## 3. Tech stack

- **Frontend:** React 19 + TypeScript, Vite, React Router, Recharts (charts), jsPDF (record export), Socket.io-client (real-time), date-fns.
- **Backend:** Node.js + Express, MongoDB + Mongoose, JWT auth, bcryptjs, Socket.io (server), Nodemailer, ethers.js (blockchain), express-rate-limit.
- **Optional third-party integrations:** Groq (AI), Google Identity Services (sign-in), SMTP (email), Ethereum Sepolia testnet + Pinata/IPFS (record anchoring).
- **No ORM-magic, no framework CMS** — the API is a small generic `/api/:collection` REST layer over Mongoose models, with per-collection, per-role access rules enforced centrally (see §4) rather than scattered across routes.

## 4. Architecture highlight: how role-based access is actually enforced

This is the part worth explaining to a judge, since it's the least "template" part of the project.

All patient-generated data goes through one generic route (`server/src/routes/collections.js`). Instead of trusting the client's query filters, every request is force-merged with a server-computed ownership filter in `scopeFilter()`:

- **Patient:** sees only rows where they're the patient (`patient_id` / `user_id` = their own id).
- **Doctor:** for appointments/consultations/health records, the server first computes (in `middleware/auth.js`) the doctor's own `doctorId` and the full list of patient ids they've actually treated (`myPatientIds`, derived from their own appointments + consultations). Every query is then forced to that list — a doctor calling `/api/health_records` with no filter at all gets only their own patients' records, never the whole database.
- **Health records specifically:** a patient can add/edit/delete their own; a doctor can add a record for one of their own patients (validated server-side against `myPatientIds`, not just trusted from the request body) but can only edit/delete records they personally added — a doctor's prescription stays authoritative and can't be edited or deleted by the patient.
- **Receptionist:** full access to clinic-management collections (doctors catalog, inquiries), zero access to clinical records.
- **Reviews:** publicly readable (anyone can see a doctor's rating), but writes are scoped to the review's own author.

If a role has no valid match (e.g. a doctor account with no linked `Doctor` catalog entry), the filter resolves to a condition that matches nothing — the default is "show nothing," never "show everything." That default-deny choice is what earlier iterations of this project got backwards (see git history / commit messages if shared): a doctor with no matching consultations used to fall back to seeing *every* patient's data. This was found and fixed during development, which is itself a good story for a hackathon demo: **"we found and closed a real cross-tenant data leak, here's the before/after."**

## 5. Payments — sandbox, clearly labelled

Pharmacy/Lab Test checkout is a **simulated** payment flow (`client/src/lib/payment.tsx`) — Card/UPI inputs are format-validated (Luhn check, UPI ID shape) but no real gateway is called and no money moves. The UI says "Sandbox mode" wherever this appears, so it's never presented as more than it is. Swapping in Razorpay/Stripe test mode would be a contained change to that one file.

## 6. Blockchain — optional record integrity layer

Health records can be anchored on Ethereum Sepolia: the server computes a `keccak256` hash of a record's clinically-relevant fields (title, type, date, doctor, hospital, notes, file reference) and submits it in a transaction via `ethers.js`, so any later tampering with those fields is detectable by re-hashing and comparing on-chain. The file itself can optionally also be pinned to IPFS via Pinata for independent retrieval. This is fully optional — without the env vars set, the Records page just shows a clear "not set up" message instead of pretending the feature is live. See `blockchain/README.md` for the 10-minute deploy steps (free Sepolia RPC + free testnet ETH, no paid infra required).

## 7. What's genuinely custom vs. what's standard CRUD

To be transparent about scope for judging:
- **Standard/expected:** auth, CRUD for appointments/medicines/lab tests, dashboards, PWA shell.
- **Custom engineering:** the centralized, doctor-aware `scopeFilter` access-control layer (§4); the AI symptom-checker → doctor-search specialty handoff; the doctor-add-record-for-patient flow with edit/delete provenance rules; the blockchain anchoring/verification pipeline; real WebRTC calling (not a third-party embed).

## 8. Project structure

```
client/       React frontend (Vite) - see client/src/pages for one file per screen
server/       Express API + MongoDB models - server/src/routes/collections.js is the core access-control logic
blockchain/   Solidity contract + deploy/compile scripts (optional feature, see §6)
```

## 9. Setup (to run locally / for a live demo)

Requires Node.js 18+ and a MongoDB connection (local, or a free MongoDB Atlas cluster).

```bash
# 1. Server
cd server
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET at minimum
npm install
npm run dev             # http://localhost:4000

# 2. Client (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173

# 3. (optional) seed sample doctors/articles
cd server && npm run seed
```

### Environment variables

Everything below `MONGODB_URI`/`JWT_SECRET` is optional — the app runs fine without it, with just that one feature disabled/hidden:

| Variable | Enables |
|---|---|
| `MONGODB_URI`, `JWT_SECRET` | Core app (always required) |
| `GROQ_API_KEY` | AI Symptom Checker |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Appointment/consultation confirmation emails |
| `GOOGLE_CLIENT_ID` (server) + `VITE_GOOGLE_CLIENT_ID` (client) | "Sign in with Google" |
| `SEPOLIA_RPC_URL` / `SEPOLIA_PRIVATE_KEY` / `CONTRACT_ADDRESS` | Blockchain record anchoring (§6) |
| `PINATA_JWT` | IPFS file pinning (needs blockchain vars too) |

### Roles

Set a user's role on their `Profile` document (`patient` \| `doctor` \| `receptionist`). A doctor account must be linked to a `Doctor` catalog entry via `profile_id` for their dashboard and record access to be scoped correctly (§4).

## 10. Known limitations (worth stating upfront, not discovering live)

- Payments are sandboxed (§5) — by design, not a bug.
- Blockchain anchoring needs a one-time manual contract deploy (§6) — not automated on first run.
- No automated test suite beyond a couple of unit tests (`payment.test.ts`, `i18n`-era tests removed); manual QA only.