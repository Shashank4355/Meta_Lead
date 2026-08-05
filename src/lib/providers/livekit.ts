import { SipClient, AgentDispatchClient } from 'livekit-server-sdk';
import { config } from '../config';
import type { Lead, AgentConfig } from '../types';

// LiveKit outbound voice: a qualification Agent joins a room, and the lead is
// dialed into that room over SIP (PSTN). The Agent conducts the conversation
// and, when the call ends, posts the transcript + outcome back to
// /api/webhooks/livekit (see agent/ worker). This module only *initiates* the
// call; completion is asynchronous, like Vapi.

export interface LiveKitCallResult {
    providerCallId: string; // the LiveKit room name
    answered: boolean;
}

function e164(phone: string): string {
    const trimmed = phone.replace(/[^\d+]/g, '');
    return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

export async function placeLiveKitCall(
    lead: Lead,
    agent: AgentConfig,
    attemptId: string,
    callbackUrl: string
): Promise<LiveKitCallResult> {
    const { url, apiKey, apiSecret, sipTrunkId, agentName } = config.livekit;
    const roomName = `call-${attemptId}`;

    const dispatchClient = new AgentDispatchClient(url, apiKey, apiSecret);
    const sipClient = new SipClient(url, apiKey, apiSecret);

    // Everything the agent worker needs to run + report back the result.
    const metadata = JSON.stringify({
        leadId: lead.id,
        attemptId,
        callbackUrl,
        phone: e164(lead.phone),
        lead: { name: lead.name, projectType: lead.projectType },
        agent: {
            agentName: agent.agentName,
            companyName: agent.companyName,
            aiModel: agent.aiModel,
            firstMessage: agent.firstMessage.replace(/\{\{\s*name\s*\}\}/g, lead.name),
            customQuestions: agent.customQuestions,
            maxCallDuration: agent.maxCallDuration,
        },
    });

    // 1) Put the agent in the room first so it's ready when the lead answers.
    await dispatchClient.createDispatch(roomName, agentName, { metadata });

    // 2) Dial the lead into the room over the outbound SIP trunk.
    await sipClient.createSipParticipant(sipTrunkId, e164(lead.phone), roomName, {
        participantIdentity: `lead-${lead.id}`,
        participantName: lead.name,
        // Return immediately; the agent drives the call and reports completion.
        waitUntilAnswered: false,
    });

    return { providerCallId: roomName, answered: true };
}
