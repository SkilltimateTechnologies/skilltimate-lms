# Skilltimate Learn

Mock-exam LMS for Microsoft certification prep (AB-900 · AI-900 · AZ-900 · DP-900) at **learn.skilltimate.com**.

No certificates, no payments, no proctoring — mocks are self-preparation. Realism comes from a server-enforced hard timer and randomized papers.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router, standalone output), React 19, plain CSS |
| Database | Turso (libSQL) via Drizzle ORM — local dev falls back to `file:local.db` |
| Auth | Better Auth (email + password, admin plugin, roles: student / instructor / admin) |
| Video | Gumlet (direct-to-Gumlet uploads, signed playback, CNAME → `video.skilltimate.com`) |
| Files | Cloudflare R2 (zero egress, presigned URLs minted per-request after enrollment check) |
| Host | Railway (serves the app only — never media) |

## Local development

```bash
npm install
cp .env.example .env        # then edit
npm run db:push             # create tables (uses DATABASE_URL)
npm run db:seed             # demo content + accounts
npm run dev
```

`.env` for local work:

```
DATABASE_URL=file:local.db
BETTER_AUTH_SECRET=<any long random string>
BETTER_AUTH_URL=http://localhost:3000
```

## Deploying to Railway

1. Connect this repo to a Railway service.
2. Set environment variables:
   - `DATABASE_URL` = `libsql://skilltimate-lms-skilltimate.aws-ap-south-1.turso.io`
   - `TURSO_AUTH_TOKEN` = *(fresh token — rotate the one shared during setup)*
   - `BETTER_AUTH_SECRET` = *(fresh 32+ char random string)*
   - `BETTER_AUTH_URL` = `https://learn.skilltimate.com`
3. Build command: `npm run build` · Start command: `npm run start` (binds `$PORT`).
4. First deploy only — open this URL once in your browser (use your `BETTER_AUTH_SECRET` value as the key):
   ```
   https://<your-app-domain>/api/setup?key=YOUR_BETTER_AUTH_SECRET
   ```
   It creates all tables and seeds the starter content. It refuses to run twice — once any course exists it becomes a no-op, so it can never wipe data. (The CLI path `npm run db:push && npm run db:seed` still works if you prefer.)
5. Point `learn.skilltimate.com` at the Railway service; add `video.skilltimate.com` as the Gumlet CNAME.

## Seeded accounts & content

| | |
|---|---|
| Admin | `arup@skilltimate.com` · `Skilltimate#2026` |
| Student | `demo@skilltimate.com` · `Skilltimate#2026` |
| Invite code | `AZ900-LAUNCH` (all 4 courses, 500 uses) |

AZ-900 ships fully populated: 3 modules, 8 lessons (articles, slide deck, PDF, resources, checkpoint), 24 live questions across all 6 types, one practice exam and one 45-minute full simulation.

**Change both seeded passwords immediately after first deploy.**

## Question types

`single_choice` · `multi_choice` · `true_false` · `drag_order` · `drag_match` · `fill_blank`

Live questions are immutable — editing a live question retires it and versions in a new row, so past attempts stay auditable.

## Exam integrity model

- Papers are frozen at attempt start (question set + shuffled option order stored on the attempt).
- Answers and explanations never ship to the client while an attempt is in progress.
- Every answer save is guarded in SQL: it only lands if the attempt is still `in_progress` and inside its deadline; otherwise the API returns 409 and the client auto-submits.
- Simulation mode auto-submits at zero using the server clock (client offset-corrected).
- Scoring: scaled = round(1000 × correct / total), pass at 700, domain breakdown by pool.

## Tests

```bash
npm run build && npm run start &   # in one shell
node scripts/e2e.mjs               # full student exam flow (20 checks)
```

## Media workflow

- **Video:** upload directly to Gumlet, paste the asset ID into the lesson editor. Playback embeds `https://play.gumlet.io/embed/{asset_id}`; lessons without an asset show an honest "being prepared" state.
- **Files (PDF/resources):** upload to R2; the app mints presigned URLs per request after checking enrollment.
- **Backups:** nightly Turso SQL dump to R2.
