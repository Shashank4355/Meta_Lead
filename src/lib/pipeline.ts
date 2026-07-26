import {
    getAgentConfig,
    createCallAttempt,
    updateCallAttempt,
    updateLead,
    getLeadByIdInternal,
    getCallAttemptById,
} from './store';
import { placeCall } from './providers/voice';
import { scoreTranscript, ScoringResult } from './providers/scoring';
import { notifyQualified } from './providers/notify';
import { triggerN8nCall } from './providers/n8n';
import { hasVapi, hasN8n, config } from './config';
import type { Lead } from './types';

/**
 * Kick off an outbound qualification call for a lead.
 *
 * Real mode (Vapi configured): places the call, marks it in-progress, and
 * returns immediately — completion is handled later by /api/webhooks/vapi.
 *
 * Mock mode: places a simulated call and finishes the pipeline in the
 * background after a short delay, so the UI shows CALLING then the final
 * scored result on refresh.
 */
export async function startCall(lead: Lead): Promise<{ attemptId: string }> {
    const agent = await getAgentConfig(lead.userId);

    const attempt = await createCallAttempt(lead.id, { status: 'RINGING' });
    await updateLead(lead.id, { status: 'CALLING' });

    // Hybrid mode: delegate the whole call→score→notify flow to n8n. It runs
    // Vapi + Anthropic and posts the result back to /api/webhooks/n8n.
    if (hasN8n()) {
        await updateCallAttempt(attempt.id, { status: 'IN_PROGRESS' });
        await triggerN8nCall({
            lead,
            agent,
            attemptId: attempt.id,
            callbackUrl: `${config.appUrl}/api/webhooks/n8n`,
        });
        return { attemptId: attempt.id };
    }

    const result = await placeCall(lead, agent);
    await updateCallAttempt(attempt.id, { providerCallId: result.providerCallId });

    if (hasVapi()) {
        // Real telephony: the webhook will complete + score this call.
        await updateCallAttempt(attempt.id, { status: 'IN_PROGRESS' });
        return { attemptId: attempt.id };
    }

    // Mock: finish asynchronously so the CALLING state is observable first.
    const startedAt = attempt.startedAt;
    setTimeout(() => {
        void completeCall({
            attemptId: attempt.id,
            leadId: lead.id,
            startedAt,
            answered: result.answered,
            transcript: result.transcript,
            recordingUrl: result.recordingUrl,
        }).catch((e) => console.error('[pipeline] mock completion failed:', e));
    }, 3500);

    return { attemptId: attempt.id };
}

/**
 * Complete a call: record the attempt outcome, and if answered, score the
 * transcript and update the lead. Called by the mock timer and by the Vapi
 * webhook.
 */
export async function completeCall(params: {
    attemptId: string;
    leadId: string;
    startedAt: string;
    answered: boolean;
    transcript?: string;
    recordingUrl?: string;
    durationSeconds?: number;
    // When n8n (or any caller) already scored the transcript, pass it here to
    // skip our internal scorer and apply the result directly.
    scoring?: ScoringResult;
}): Promise<void> {
    const { attemptId, leadId, startedAt, answered } = params;

    // Idempotency guard: a call attempt is completed exactly once. Protects
    // against duplicate webhook deliveries (Vapi/n8n retry) and against the
    // mock timer racing an external callback.
    const existing = await getCallAttemptById(attemptId);
    if (existing && (existing.status === 'COMPLETED' || existing.status === 'NO_ANSWER')) {
        return;
    }

    const endedAt = new Date().toISOString();
    const duration =
        params.durationSeconds ??
        Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));

    if (!answered) {
        await updateCallAttempt(attemptId, { status: 'NO_ANSWER', endedAt, duration: null });
        await updateLead(leadId, { status: 'NO_ANSWER' });
        return;
    }

    await updateCallAttempt(attemptId, { status: 'COMPLETED', endedAt, duration });

    const lead = await getLeadByIdInternal(leadId);
    if (!lead) return;

    const transcript = params.transcript ?? '';
    const agent = await getAgentConfig(lead.userId);
    const { score, status, summary } =
        params.scoring ?? (await scoreTranscript(transcript, lead, agent));

    const updated = await updateLead(leadId, {
        status,
        score,
        transcript,
        aiSummary: JSON.stringify(summary),
        recordingUrl: params.recordingUrl || lead.recordingUrl,
        budget: summary.confirmedBudget && summary.confirmedBudget !== 'Not confirmed'
            ? summary.confirmedBudget
            : lead.budget,
    });

    if (updated && status === 'QUALIFIED') {
        await notifyQualified(updated);
    }
}
