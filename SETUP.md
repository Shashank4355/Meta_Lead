# Vector Lead — Setup & Pipeline Guide

The full lead pipeline — **Meta linking → calling → AI scoring** — is
implemented in this repo as Next.js Route Handlers (`src/app/api/**`) backed
by a swappable data layer. Every integration **degrades to a working mock**,
so you can run and demo the entire flow with **zero credentials**, then go
live one key at a time.

## Run it now (no keys)

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Login** (click through — demo mode) → you land
on the dashboard with seeded leads. Click **Call Now** on a lead: it flips to
`CALLING`, and ~3.5s later (refresh) it shows a transcript, an AI score, and a
`QUALIFIED` / `FOLLOW_UP` / `DISQUALIFIED` / `NO_ANSWER` status.

### Try the whole pipeline end to end (mock)

```bash
# 1. Linking: simulate a Meta lead arriving via the webhook
curl -X POST http://localhost:3000/api/webhooks/meta \
  -H 'content-type: application/json' \
  -d '{"pageId":"seed-meta-1","name":"Test Buyer","phone":"+91 90000 00000","projectType":"3BHK"}'

# 2. It now appears on the dashboard. Grab its id from:
curl http://localhost:3000/api/leads

# 3. Calling + scoring: trigger a call (replace <ID>)
curl -X POST http://localhost:3000/api/leads/<ID>/call

# 4. Re-fetch the lead a few seconds later — score + summary are populated:
curl http://localhost:3000/api/leads/<ID>
```

## Going live (add keys to `.env.local`)

Copy `.env.example` → `.env.local` and fill in what you have. Each block
activates independently:

| Add these keys | What turns on |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real login/signup is enforced (demo bypass off) |
| `SUPABASE_SERVICE_ROLE_KEY` | Persist to Postgres — run `supabase/schema.sql` first, then wire the Supabase branch in `src/lib/store.ts` |
| `ANTHROPIC_API_KEY` | Real AI scoring of call transcripts (replaces the heuristic) |
| `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` | Real outbound calls; completion arrives via `POST /api/webhooks/vapi` |
| `META_APP_ID` + `META_APP_SECRET` (+ redirect/verify) | Real Meta OAuth + Lead Ads webhook ingestion |

`MOCK_MODE=1` forces mocks even when keys exist.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/me` | Current user |
| GET/POST | `/api/leads` | List / create leads |
| GET | `/api/leads/:id` | Lead detail + call history |
| POST | `/api/leads/:id/call` | Start a qualification call |
| GET | `/api/analytics` | Dashboard stats |
| GET/PUT | `/api/settings/agent` | Voice-agent config |
| GET/PUT | `/api/settings/notifications` | Slack / Telegram config |
| GET | `/api/settings/meta` · DELETE `/api/settings/meta/:id` | Connected Meta pages |
| GET | `/api/meta/auth/login` → callback | Connect a Meta account |
| GET/POST | `/api/webhooks/meta` | Meta verification / lead ingest |
| POST | `/api/webhooks/vapi` | Vapi end-of-call → scoring |

## Where things live

- `src/lib/store.ts` — data layer (in-memory now; the one place to swap in Supabase)
- `src/lib/pipeline.ts` — call → transcript → scoring → notify orchestration
- `src/lib/providers/` — `voice.ts` (Vapi), `scoring.ts` (Anthropic), `notify.ts`
- `src/lib/config.ts` — capability detection (`hasVapi()`, `hasAnthropic()`, …)
