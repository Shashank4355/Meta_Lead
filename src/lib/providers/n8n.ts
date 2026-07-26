import { config } from '../config';
import type { Lead, AgentConfig } from '../types';

/**
 * Hand the call→score→notify pipeline off to an n8n workflow.
 * n8n places the Vapi call, waits for the end-of-call event, scores the
 * transcript (Anthropic node), and posts the result back to
 * POST /api/webhooks/n8n with { event: 'call.completed', ... }.
 */
export async function triggerN8nCall(params: {
    lead: Lead;
    agent: AgentConfig;
    attemptId: string;
    callbackUrl: string;
}): Promise<void> {
    const { lead, agent, attemptId, callbackUrl } = params;

    const res = await fetch(config.n8n.callWebhookUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            // n8n verifies this against its stored secret.
            ...(config.n8n.secret ? { 'x-n8n-secret': config.n8n.secret } : {}),
        },
        body: JSON.stringify({
            event: 'call.requested',
            attemptId,
            callbackUrl,
            lead: {
                id: lead.id,
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                projectType: lead.projectType,
            },
            agent: {
                agentName: agent.agentName,
                companyName: agent.companyName,
                voiceProvider: agent.voiceProvider,
                voiceId: agent.voiceId,
                aiModel: agent.aiModel,
                maxCallDuration: agent.maxCallDuration,
                firstMessage: agent.firstMessage,
                customQuestions: agent.customQuestions,
            },
        }),
    });

    if (!res.ok) {
        throw new Error(`n8n webhook ${res.status}: ${await res.text()}`);
    }
}
