# n8n Integration (Hybrid Mode)

In hybrid mode the Next.js app keeps the UI, auth, CRUD, and the **Call Now**
trigger, while **n8n runs the pipeline**: place the Vapi call, wait for it to
end, score the transcript with Anthropic, and post the result back to the app.
Supabase is the shared source of truth once you wire persistence.

```
Meta Lead Ads ──► n8n (Facebook trigger) ──► POST /api/webhooks/n8n {event:"lead.created"}
                                                        │
Dashboard "Call Now" ──► POST /api/leads/:id/call ──► app delegates ──► N8N_CALL_WEBHOOK_URL
                                                        │
        n8n: Vapi call ─► (wait for call-end) ─► Anthropic score ─► POST /api/webhooks/n8n {event:"call.completed"}
                                                        │
                                          app updates lead + fires Slack/Telegram
```

## 1. Turn hybrid mode on

In `.env.local`:

```bash
N8N_CALL_WEBHOOK_URL=https://<your-n8n>/webhook/vector-lead/call
N8N_WEBHOOK_SECRET=<any-long-random-string>
NEXT_PUBLIC_APP_URL=https://<your-app-public-url>   # so n8n can call back
```

With `N8N_CALL_WEBHOOK_URL` set, `POST /api/leads/:id/call` no longer runs the
internal pipeline — it POSTs a `call.requested` payload to n8n and marks the
call `IN_PROGRESS`. n8n owns it from there.

## 2. Import the starter workflow

Import [`n8n/vector-lead-workflow.json`](n8n/vector-lead-workflow.json) into
n8n. It contains two flows:

- **Call flow** — Webhook `vector-lead/call` → HTTP (Vapi place call) → respond.
  The Vapi request passes `attemptId` + `callbackUrl` in `metadata` and sets
  Vapi's server URL to the second webhook.
- **Result flow** — Webhook `vector-lead/vapi-end` → HTTP (Anthropic score) →
  HTTP (callback to `POST {callbackUrl}` with `event:"call.completed"`).

Then replace the placeholders: `YOUR_VAPI_API_KEY`, `YOUR_VAPI_PHONE_NUMBER_ID`,
`YOUR_ANTHROPIC_API_KEY`, and `YOUR_N8N_WEBHOOK_SECRET` (must equal
`N8N_WEBHOOK_SECRET`).

## 3. Contracts

**App → n8n** (`N8N_CALL_WEBHOOK_URL`), header `x-n8n-secret`:

```json
{
  "event": "call.requested",
  "attemptId": "…",
  "callbackUrl": "https://your-app/api/webhooks/n8n",
  "lead": { "id": "…", "name": "…", "phone": "…", "email": "…", "projectType": "…" },
  "agent": { "agentName": "…", "firstMessage": "…", "voiceId": "…", "aiModel": "…",
             "maxCallDuration": 600, "customQuestions": [] }
}
```

**n8n → App** — lead ingested (`POST /api/webhooks/n8n`), header `x-n8n-secret`:

```json
{ "event": "lead.created",
  "data": { "pageId": "…", "name": "…", "phone": "…", "email": "…", "projectType": "…", "budget": "…" } }
```

**n8n → App** — call finished (`POST /api/webhooks/n8n`), header `x-n8n-secret`:

```json
{ "event": "call.completed",
  "data": {
    "attemptId": "…",
    "answered": true,
    "transcript": "…",
    "recordingUrl": "…",
    "durationSeconds": 214,
    "score": 87,                       // optional — omit to let the app score
    "status": "QUALIFIED",             // NEW|CALLING|QUALIFIED|FOLLOW_UP|DISQUALIFIED|NO_ANSWER
    "summary": { "qualificationStatus": "Qualified", "confirmedBudget": "₹1.2 Cr",
                 "timeline": "…", "isDecisionMaker": true, "location": "…",
                 "keyRequirements": "…", "notes": "…" }
  } }
```

If you send `score` + `status`, the app applies them directly. If you send only
`transcript`, the app's Anthropic scorer runs instead — so you can let either
side do the scoring.

## 4. Test the callback without n8n

The inbound endpoint works standalone. Trigger a call, grab the `attemptId`
from the response, then simulate n8n's result:

```bash
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H 'content-type: application/json' \
  -d '{"event":"call.completed","data":{"attemptId":"<ID>","answered":true,
       "transcript":"Agent: hi... Lead: yes budget 1.2 crore ready to buy this month",
       "score":91,"status":"QUALIFIED",
       "summary":{"qualificationStatus":"Qualified","confirmedBudget":"1.2 Cr",
                  "isDecisionMaker":true,"notes":"via n8n"}}}'
```

(Leave `N8N_WEBHOOK_SECRET` unset locally to skip the header check, or pass
`-H 'x-n8n-secret: <secret>'`.)

## Notes

- **Go-live still needs Supabase persistence** wired in `src/lib/store.ts` so the
  dashboard and n8n read/write the same data. Until then the app uses its
  in-memory store (per-process).
- Keep `N8N_WEBHOOK_SECRET` matched on both sides; without it the callback is
  unauthenticated.
