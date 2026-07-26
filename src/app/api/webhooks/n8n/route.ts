import { NextRequest } from 'next/server';
import { json, apiError } from '@/lib/http';
import { config, DEMO_USER } from '@/lib/config';
import {
    createLead,
    getMetaAccountByPageId,
    getCallAttemptById,
    updateCallAttempt,
} from '@/lib/store';
import { completeCall } from '@/lib/pipeline';
import type { ScoringResult } from '@/lib/providers/scoring';
import type { AiSummary, LeadStatus } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Inbound callbacks from n8n (hybrid mode). Handles:
 *   - lead.created   : a Meta lead ingested by n8n's Facebook trigger
 *   - call.completed : call finished + (optionally) scored by n8n
 *
 * Secured by the shared secret when N8N_WEBHOOK_SECRET is set.
 */
export async function POST(req: NextRequest) {
    if (config.n8n.secret) {
        const provided = req.headers.get('x-n8n-secret') || '';
        if (provided !== config.n8n.secret) return apiError('Invalid n8n secret', 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) return apiError('Invalid JSON', 400);

    const event = String(body.event || '');
    const data = (body.data ?? body) as Record<string, unknown>;

    switch (event) {
        case 'lead.created':
        case 'lead.ingest':
            return handleLeadCreated(data);
        case 'call.completed':
            return handleCallCompleted(data);
        default:
            return json({ received: true, handled: false, reason: `unknown event: ${event}` });
    }
}

async function handleLeadCreated(data: Record<string, unknown>) {
    const name = data.name ? String(data.name) : '';
    const phone = data.phone ? String(data.phone) : '';
    if (!name || !phone) return apiError('name and phone are required', 422);

    const pageId = data.pageId ? String(data.pageId) : undefined;
    const account = pageId ? await getMetaAccountByPageId(pageId) : null;
    const userId = account?.userId ?? DEMO_USER.id;

    const lead = await createLead(userId, {
        name,
        phone,
        email: data.email ? String(data.email) : null,
        projectType: data.projectType ? String(data.projectType) : null,
        budget: data.budget ? String(data.budget) : null,
        source: 'meta',
        status: 'NEW',
    });
    return json({ received: true, leadId: lead.id }, 201);
}

async function handleCallCompleted(data: Record<string, unknown>) {
    const attemptId = String(data.attemptId || '');
    if (!attemptId) return apiError('attemptId is required', 422);

    const attempt = await getCallAttemptById(attemptId);
    if (!attempt) return apiError('Unknown attemptId', 404);

    // The attempt is the source of truth for which lead this belongs to.
    const leadId = attempt.leadId;

    if (data.providerCallId) {
        await updateCallAttempt(attemptId, { providerCallId: String(data.providerCallId) });
    }

    const answered = data.answered !== false; // default true unless explicitly false

    // If n8n scored the transcript itself, apply it directly; otherwise
    // completeCall() runs our internal scorer on the transcript.
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
        leadId,
        startedAt: attempt.startedAt,
        answered,
        transcript: data.transcript ? String(data.transcript) : '',
        recordingUrl: data.recordingUrl ? String(data.recordingUrl) : undefined,
        durationSeconds:
            data.durationSeconds != null ? Number(data.durationSeconds) : undefined,
        scoring,
    });

    return json({ received: true, matched: true, leadId });
}
