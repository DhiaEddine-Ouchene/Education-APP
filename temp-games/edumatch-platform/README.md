# EduMatch — Language Learning Game Platform

A multi-tenant SaaS where language teachers & schools create vocabulary sets, turn them into 6 game modes, brand the platform as their own, add students, and track progress. Includes subscriptions and a platform-admin console.

This is a **full-stack MVP** built with **zero external dependencies** (Node 22+ built-ins only: `http`, `node:sqlite`, `node:crypto`). It runs with a single `node server.js`.

## Quick start

```bash
cd edumatch-platform
cp .env.example .env      # optional, sensible defaults already work
node server.js
# open http://localhost:3000
```

> Node 22+ is required (uses the built-in `node:sqlite`). Run with `node --no-warnings server.js` to hide the experimental-SQLite warning.

## Demo accounts (seeded on first run)

| Role | Email | Password |
|------|-------|----------|
| Platform admin (you) | admin@edumatch.app | admin1234 |
| Teacher / business owner | teacher@edumatch.app | teacher1234 |
| Student | student@edumatch.app | student1234 |

## The three interfaces

- **Teacher / business** — dashboard, word-set editor with **AI auto-fill**, students, results, **branding** (logo + theme), and **subscription**.
- **Student** — sees assigned sets, plays the 6 games, sees personal progress.
- **Platform admin (you)** — overview of every organization, usage stats, estimated MRR, recent activity, and the ability to change/suspend any org's plan to **control subscriptions**.

## Game modes

Memory Match · Multiple Choice · Flashcards · Type It · Listening · Word Scramble — all with built-in text-to-speech and right-to-left support (e.g. Arabic).

## Architecture

```
server.js            HTTP server + REST API + static file serving
lib/db.js            node:sqlite schema, migrations, seed data
lib/auth.js          scrypt password hashing + HMAC session tokens
lib/ai.js            AI auto-fill (OpenAI if key set, else offline generator)
lib/billing.js       plans, subscribe flow, Stripe scaffold
lib/util.js          helpers (ids, JSON, body parsing)
public/index.html    SPA shell
public/css/styles.css
public/js/app.js     SPA: landing, auth, 3 role interfaces
public/js/games.js   6-mode game engine
```

### Data model
orgs · users (superadmin/owner/teacher/student) · sets · words · classes · enrollments · assignments · results · events.

### Key API routes
- `POST /api/auth/register` — creates an org + owner
- `POST /api/auth/login`, `GET /api/me`
- `PUT /api/org` — update branding (logo, theme)
- `GET/POST/PUT/DELETE /api/sets` — word sets
- `POST /api/ai/generate` — AI auto-fill (Pro)
- `GET/POST/DELETE /api/students`
- `POST/GET /api/results`, `GET /api/my/assignments`
- `GET /api/billing/plans`, `POST /api/billing/subscribe`
- `GET /api/admin/overview`, `POST /api/admin/org/:id/plan` (superadmin)

## Enabling real AI & payments
- **AI:** set `OPENAI_API_KEY` (needs outbound network). Without it, a built-in sample generator keeps the feature working for demos.
- **Payments:** set `STRIPE_SECRET_KEY` and wire your price IDs in `lib/billing.js`. Without it, subscriptions activate instantly in test mode.

## Production notes
- `node:sqlite` is great for getting started; for real traffic move to **Postgres** and host on Render/Railway/Fly/a VPS (this app needs a persistent server, so plain Vercel static hosting is not enough).
- Always set a strong `AUTH_SECRET`, serve over HTTPS, and add rate-limiting + email verification before going live.
