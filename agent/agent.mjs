// Vector Lead — LiveKit qualification agent (worker).
//
// Runs as its own process: `node agent.mjs dev`. When the app dispatches a
// call, LiveKit starts a job for this agent in the room. The agent reads the
// lead + question script from the job metadata, talks to the lead (STT→LLM→TTS
// over the SIP audio), and on hang-up POSTs the transcript + outcome to the
// app's /api/webhooks/livekit.
//
// This is a working scaffold. Pick your STT/LLM/TTS plugins and provider keys
// (see agent/.env.example). It targets @livekit/agents ^0.7 — align versions
// if you upgrade. The stable contract is the callback payload at the bottom.

import { fileURLToPath } from 'node:url';
import { cli, WorkerOptions, defineAgent, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import 'dotenv/config';

function buildInstructions(md) {
    const a = md.agent || {};
    const questions = (a.customQuestions || [])
        .map((q, i) => `${i + 1}. ${q.question}${q.required ? ' (required)' : ''}`)
        .join('\n');
    return [
        `You are ${a.agentName || 'a friendly assistant'} from ${a.companyName || 'our company'}.`,
        `You are calling ${md.lead?.name || 'a prospective lead'} about ${md.lead?.projectType || 'their enquiry'}.`,
        `Open with: "${a.firstMessage || 'Hi, is now a good time to talk?'}"`,
        questions ? `Naturally work through these qualification questions:\n${questions}` : '',
        `Be concise and polite. If they are not interested, thank them and end the call.`,
    ]
        .filter(Boolean)
        .join('\n');
}

export default defineAgent({
    entry: async (ctx) => {
        const md = JSON.parse(ctx.job.metadata || '{}');
        await ctx.connect();

        const session = new voice.AgentSession({
            vad: await silero.VAD.load(),
            stt: new openai.STT({ model: 'gpt-4o-transcribe' }),
            llm: new openai.LLM({ model: md.agent?.aiModel || 'gpt-4o-mini' }),
            tts: new openai.TTS({ voice: 'alloy' }),
        });

        const agent = new voice.Agent({ instructions: buildInstructions(md) });
        await session.start({ agent, room: ctx.room });
        await session.say(md.agent?.firstMessage || 'Hi, is now a good time to talk?');

        // On call end, assemble the transcript and report it back to the app.
        ctx.addShutdownCallback(async () => {
            const transcript = (session.history?.items || [])
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => `${m.role === 'assistant' ? md.agent?.agentName || 'Agent' : 'Lead'}: ${m.textContent || ''}`)
                .join('\n');

            await reportResult(md, {
                answered: transcript.length > 0,
                transcript,
            });
        });
    },
});

async function reportResult(md, result) {
    if (!md.callbackUrl) return;
    try {
        await fetch(md.callbackUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(process.env.LIVEKIT_WEBHOOK_SECRET
                    ? { 'x-livekit-secret': process.env.LIVEKIT_WEBHOOK_SECRET }
                    : {}),
            },
            body: JSON.stringify({
                event: 'call.completed',
                attemptId: md.attemptId,
                answered: result.answered,
                transcript: result.transcript,
                // Omit score/status/summary → the app scores the transcript
                // (Anthropic). Include them here if you score inside the agent.
            }),
        });
    } catch (e) {
        console.error('[agent] failed to report result:', e);
    }
}

cli.runApp(
    new WorkerOptions({
        agent: fileURLToPath(import.meta.url),
        agentName: process.env.LIVEKIT_AGENT_NAME || 'lead-qualifier',
    })
);
