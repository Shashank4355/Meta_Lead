# Vector Lead — LiveKit Agent Worker

The voice agent that conducts qualification calls. It runs as its own process
(not part of the Next.js app). When the app dispatches a call, LiveKit starts a
job for this agent in the room; the agent talks to the lead and posts the
transcript back to the app.

See [`../LIVEKIT.md`](../LIVEKIT.md) for the full picture.

## Run

```bash
cd agent
cp .env.example .env      # fill in LiveKit + provider keys + LIVEKIT_WEBHOOK_SECRET
npm install
npm run dev               # registers the agent and waits for dispatched calls
```

`LIVEKIT_WEBHOOK_SECRET` here **must equal** the one in the app's `.env.local`,
and `LIVEKIT_AGENT_NAME` must equal the app's (default `lead-qualifier`).

## What it does (`agent.mjs`)

1. Reads the lead + question script from the job metadata the app sent.
2. Runs a voice pipeline (VAD → STT → LLM → TTS) and works through the
   configured `firstMessage` + `customQuestions`.
3. On hang-up, assembles the transcript and POSTs it to the app's
   `/api/webhooks/livekit` (`{ event: 'call.completed', attemptId, transcript }`),
   authenticated with `x-livekit-secret`. The app then scores it.

## Customizing

- **Providers**: `agent.mjs` uses OpenAI plugins (`STT`/`LLM`/`TTS`) + Silero VAD
  as a starting stack. Swap in Deepgram, Cartesia, ElevenLabs, Anthropic, etc.,
  and set the matching keys in `.env`. See https://docs.livekit.io/agents/.
- **Scoring in the agent**: to score inside the agent instead of the app,
  include `score` + `status` + `summary` in the callback payload; the app will
  apply them directly.

> This is a scaffold targeting `@livekit/agents ^0.7`. If you upgrade the SDK,
> reconcile the `AgentSession` / plugin APIs. The stable contract with the app
> is the callback payload, documented in `../LIVEKIT.md`.
