import { NextRequest } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { json, apiError } from '@/lib/http';
import { config } from '@/lib/config';
import { getCallAttemptById } from '@/lib/store';
import { completeCall } from '@/lib/pipeline';
import type { ScoringResult } from '@/lib/providers/scoring';
import type { AiSummary, LeadStatus } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Two kinds of POST land here:
 *  1. LiveKit's own signed server webhooks (room_finished, etc.) — used to
 *     catch calls that ended without the agent reporting a transcript
 *     (e.g. no answer). Verified with WebhookReceiver.
 *  2. Our agent worker's callback with the finished transcript + outcome
 *     ({ event: 'call.completed', ... }), authenticated by x-livekit-secret.
 */
export async function POST(req: NextRequest) {
    const raw = await req.text();
    const auth = req.headers.get('authorization');

    // 1) LiveKit signed event
    if (auth && config.livekit.apiKey) {
        try {
            const receiver = new WebhookReceiver(config.livekit.apiKey, config.livekit.apiSecret);
            const event = await receiver.receive(raw, auth);
            return handleLiveKitEvent(event);
        } catch {
            // Not a valid LiveKit-signed event — fall through to agent callback.
        }
    }

    // 2) Agent transcript callback
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return apiError('Invalid JSON', 400);
    }

    if (config.livekit.webhookSecret) {
        const provided = req.headers.get('x-livekit-secret') || '';
        if (provided !== config.livekit.webhookSecret) return apiError('Invalid secret', 401);
    }

    if (body.event === 'call.completed') return handleAgentCallback(body);
    return json({ received: true, handled: false });
}

// LiveKit room name is `call-<attemptId>`.
function attemptIdFromRoom(room?: string): string | null {
    if (!room || !room.startsWith('call-')) return null;
    return room.slice('call-'.length);
}

async function handleLiveKitEvent(event: {
    event: string;
    room?: { name?: string };
}): Promise<Response> {
    if (event.event === 'room_finished') {
        const attemptId = attemptIdFromRoom(event.room?.name);
        if (attemptId) {
            const attempt = await getCallAttemptById(attemptId);
            if (attempt) {
                // If the agent already reported a transcript the attempt is
                // terminal and completeCall() no-ops (idempotent). Otherwise
                // the room closed with no result → treat as no-answer.
                await completeCall({
                    attemptId,
                    leadId: attempt.leadId,
                    startedAt: attempt.startedAt,
                    answered: false,
                });
            }
        }
    }
    return json({ received: true, event: event.event });
}

async function handleAgentCallback(data: Record<string, unknown>): Promise<Response> {
    const attemptId = String(data.attemptId || '');
    if (!attemptId) return apiError('attemptId is required', 422);

    const attempt = await getCallAttemptById(attemptId);
    if (!attempt) return apiError('Unknown attemptId', 404);

    // The agent may pre-score (its own LLM) or just send the transcript.
    let scoring: ScoringResult | undefined;
    if (data.score != null && data.status) {
        const s = (data.summary ?? {}) as Partial<AiSummary>;
        scoring = {
            score: Math.max(0, Math.min(100, Math.round(Number(data.score)))),
            status: String(data.status) as LeadStatus,
            summary: {
                qualificationStatus: String(s.qualificationStatus ?? ''),
                confirmedBudget: String(s.confirmedBudget ?? ''),
                timeline: String(s.timeline ?? ''),
                isDecisionMaker: Boolean(s.isDecisionMaker),
                location: String(s.location ?? ''),
                keyRequirements: String(s.keyRequirements ?? ''),
                notes: String(s.notes ?? ''),
            },
        };
    }

    await completeCall({
        attemptId,
        leadId: attempt.leadId,
        startedAt: attempt.startedAt,
        answered: data.answered !== false,
        transcript: data.transcript ? String(data.transcript) : '',
        recordingUrl: data.recordingUrl ? String(data.recordingUrl) : undefined,
        durationSeconds: data.durationSeconds != null ? Number(data.durationSeconds) : undefined,
        scoring,
    });

    return json({ received: true, matched: true });
}
