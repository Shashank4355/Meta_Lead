# LiveKit Voice Integration

LiveKit is a first-class **voice-call provider** for the calling stage, next to
Vapi. When configured it takes precedence: the pipeline places an outbound
**SIP (PSTN)** call to the lead, a **LiveKit agent** conducts the qualification
conversation, and the transcript comes back for scoring — same
`linking → calling → scoring` flow, different engine.

```
Call Now → POST /api/leads/:id/call → placeCall()
    ├─ LiveKit configured → dispatch agent + SIP-dial the lead (src/lib/providers/livekit.ts)
    │       agent talks to lead → posts transcript → POST /api/webhooks/livekit
    │       app scores (Anthropic/mock) → updates lead → notify
    └─ else Vapi → else mock
```

Provider precedence: **LiveKit → Vapi → mock** (`hasLiveKit()` in `src/lib/config.ts`).
n8n hybrid mode, if enabled, still wins over all of them.

## Pieces you need

1. A **LiveKit project** (Cloud or self-hosted) → `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
2. An **outbound SIP trunk** (LiveKit SIP + a provider like Twilio/Telnyx that
   gives you a phone number) → `LIVEKIT_SIP_TRUNK_ID`.
   See https://docs.livekit.io/sip/ for trunk setup.
3. The **agent worker** running (see [`agent/`](agent/README.md)) — the process
   that actually talks to the lead.
4. A shared secret so the agent can call back: set the SAME value for
   `LIVEKIT_WEBHOOK_SECRET` in the app's `.env.local` and in `agent/.env`.

## Configure the app

`.env.local`:

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=secret...
LIVEKIT_SIP_TRUNK_ID=ST_...
LIVEKIT_AGENT_NAME=lead-qualifier
LIVEKIT_WEBHOOK_SECRET=<long-random-string>
NEXT_PUBLIC_APP_URL=https://<app-public-url>   # so the agent can reach the webhook
```

All four of URL/KEY/SECRET/TRUNK must be present for `hasLiveKit()` to switch
on. Without them the app stays on Vapi or mock — nothing breaks.

## How completion is handled

`POST /api/webhooks/livekit` accepts two things:

- **LiveKit signed events** (verified with `WebhookReceiver`). On `room_finished`
  with no transcript reported, the call is marked `NO_ANSWER`.
- **The agent's callback** `{ event: 'call.completed', attemptId, transcript, ... }`
  (auth via `x-livekit-secret`). If the agent includes `score`+`status`+`summary`
  the app applies them; otherwise the app scores the transcript itself.

Correlation: the room is named `call-<attemptId>`, and the agent also receives
`attemptId` + `callbackUrl` in its job metadata.

`completeCall()` is idempotent, so a late `room_finished` after the agent has
already reported does nothing.

## Test the callback without LiveKit

The inbound side works standalone. Trigger a call, grab the `attemptId`, then:

```bash
curl -X POST http://localhost:3000/api/webhooks/livekit \
  -H 'content-type: application/json' \
  -d '{"event":"call.completed","attemptId":"<ID>","answered":true,
       "transcript":"Agent: hi... Lead: yes, budget 1.2 crore, ready this month"}'
```

(Set `-H "x-livekit-secret: <secret>"` if `LIVEKIT_WEBHOOK_SECRET` is set.)
