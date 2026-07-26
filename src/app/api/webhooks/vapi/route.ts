import { NextRequest } from 'next/server';
import { json } from '@/lib/http';
import { findCallAttemptByProviderId, getLeadByIdInternal } from '@/lib/store';
import { completeCall } from '@/lib/pipeline';

export const runtime = 'nodejs';

/**
 * Vapi end-of-call webhook. Fires when a real call finishes; we look up the
 * matching call attempt, then run the scoring pipeline on the transcript.
 */
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const message = body?.message ?? body;

    // Only act on the final report.
    if (message?.type && message.type !== 'end-of-call-report') {
        return json({ received: true });
    }

    const call = message?.call ?? {};
    const providerCallId = String(call.id ?? message?.callId ?? '');
    if (!providerCallId) return json({ received: true, matched: false });

    const attempt = await findCallAttemptByProviderId(providerCallId);
    if (!attempt) return json({ received: true, matched: false });

    const lead = await getLeadByIdInternal(attempt.leadId);
    if (!lead) return json({ received: true, matched: false });

    const endedReason: string = message?.endedReason ?? '';
    const answered = !/no-answer|did-not-answer|busy|failed|voicemail/i.test(endedReason);
    const transcript: string =
        message?.artifact?.transcript ?? message?.transcript ?? '';
    const recordingUrl: string =
        message?.artifact?.recordingUrl ?? message?.recordingUrl ?? '';
    const durationSeconds =
        typeof message?.durationSeconds === 'number' ? message.durationSeconds : undefined;

    await completeCall({
        attemptId: attempt.id,
        leadId: lead.id,
        startedAt: attempt.startedAt,
        answered: answered && Boolean(transcript),
        transcript,
        recordingUrl,
        durationSeconds,
    });

    return json({ received: true, matched: true });
}
