import { NextRequest } from 'next/server';
import { withAuth, json } from '@/lib/http';
import { getAgentConfig, updateAgentConfig } from '@/lib/store';
import type { AgentConfig, CustomQuestion } from '@/lib/types';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, user) => {
    const config = await getAgentConfig(user.id);
    return json({ config });
});

export const PUT = withAuth(async (req: NextRequest, user) => {
    const body = (await req.json().catch(() => ({}))) as Partial<AgentConfig>;

    // Whitelist updatable fields; coerce types defensively.
    const patch: Partial<AgentConfig> = {};
    if (typeof body.agentName === 'string') patch.agentName = body.agentName;
    if (typeof body.companyName === 'string') patch.companyName = body.companyName;
    if (typeof body.voiceProvider === 'string') patch.voiceProvider = body.voiceProvider;
    if (typeof body.voiceId === 'string') patch.voiceId = body.voiceId;
    if (typeof body.aiModel === 'string') patch.aiModel = body.aiModel;
    if (body.maxCallDuration != null) patch.maxCallDuration = Number(body.maxCallDuration) || 600;
    if (typeof body.firstMessage === 'string') patch.firstMessage = body.firstMessage;
    if (Array.isArray(body.customQuestions)) {
        patch.customQuestions = (body.customQuestions as CustomQuestion[])
            .filter((q) => q && typeof q.question === 'string')
            .map((q) => ({ question: q.question, required: Boolean(q.required) }));
    }

    const config = await updateAgentConfig(user.id, patch);
    return json({ config });
});
