import { config, hasVapi, hasLiveKit } from '../config';
import { placeLiveKitCall } from './livekit';
import type { Lead, AgentConfig } from '../types';

export interface PlaceCallResult {
    providerCallId: string;
    // When the provider completes synchronously (mock), we get the transcript
    // back immediately. Real providers deliver it later via webhook.
    transcript?: string;
    recordingUrl?: string;
    answered: boolean;
}

/**
 * Start an outbound qualification call. Provider precedence:
 *   LiveKit (SIP + agent) → Vapi → mock.
 * Real providers place the call and deliver the transcript later via their
 * webhook (/api/webhooks/livekit or /api/webhooks/vapi). Mock mode simulates
 * a completed call so the whole linking→calling→scoring flow is demoable.
 */
export async function placeCall(
    lead: Lead,
    agent: AgentConfig,
    ctx?: { attemptId: string; callbackUrl: string }
): Promise<PlaceCallResult> {
    if (hasLiveKit() && ctx) {
        return placeLiveKitCall(lead, agent, ctx.attemptId, ctx.callbackUrl);
    }
    if (hasVapi()) {
        return placeVapiCall(lead, agent);
    }
    return simulateCall(lead, agent);
}

// ─── Vapi (real) ───

async function placeVapiCall(lead: Lead, agent: AgentConfig): Promise<PlaceCallResult> {
    const firstMessage = agent.firstMessage.replace(/\{\{\s*name\s*\}\}/g, lead.name);

    const res = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.vapi.apiKey}`,
        },
        body: JSON.stringify({
            phoneNumberId: config.vapi.phoneNumberId,
            customer: { number: lead.phone.replace(/\s+/g, '') },
            ...(config.vapi.assistantId
                ? { assistantId: config.vapi.assistantId }
                : {
                      assistant: {
                          firstMessage,
                          model: { provider: 'anthropic', model: agent.aiModel },
                          voice: { provider: agent.voiceProvider, voiceId: agent.voiceId },
                      },
                  }),
            // Correlate the eventual webhook back to this lead.
            metadata: { leadId: lead.id },
            maxDurationSeconds: agent.maxCallDuration,
        }),
    });

    if (!res.ok) {
        throw new Error(`Vapi ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return { providerCallId: String(data.id), answered: true };
}

// ─── Simulated (mock) ───

async function simulateCall(lead: Lead, agent: AgentConfig): Promise<PlaceCallResult> {
    // ~20% of mock calls go unanswered so the demo shows NO_ANSWER too.
    const answered = hashToUnit(lead.id) > 0.2;
    const providerCallId = `mock-${lead.id}-${Date.now()}`;
    if (!answered) return { providerCallId, answered: false };

    return {
        providerCallId,
        answered: true,
        transcript: mockTranscript(lead, agent),
        recordingUrl: '', // no real recording in mock mode
    };
}

function mockTranscript(lead: Lead, agent: AgentConfig): string {
    const first = agent.firstMessage.replace(/\{\{\s*name\s*\}\}/g, lead.name);
    const interested = hashToUnit(lead.id + 'x') > 0.35;
    const project = lead.projectType || 'a property';

    if (interested) {
        return [
            `${agent.agentName}: ${first}`,
            `${lead.name}: Yes, this is ${lead.name}.`,
            `${agent.agentName}: Great! I see you're interested in ${project}. What's your budget?`,
            `${lead.name}: My budget is around 1.2 crore and I'm ready to buy this month.`,
            `${agent.agentName}: Perfect. And are you the decision maker?`,
            `${lead.name}: Yes, I decide. I have financing pre-approved.`,
            `${agent.agentName}: Wonderful, I'll have our team follow up with options.`,
        ].join('\n');
    }
    return [
        `${agent.agentName}: ${first}`,
        `${lead.name}: Yeah, hi.`,
        `${agent.agentName}: You enquired about ${project} — is now a good time?`,
        `${lead.name}: Honestly I'm just browsing, no budget yet. Call back later maybe.`,
        `${agent.agentName}: No problem, I'll follow up another time.`,
    ].join('\n');
}

/** Deterministic 0–1 value from a string, so mock outcomes are stable per lead. */
function hashToUnit(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
}
