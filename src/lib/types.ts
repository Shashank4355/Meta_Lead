// ─── Domain types ───
// These field names match exactly what the existing UI reads
// (dashboard, lead detail, settings). Do not rename without updating the pages.

export type LeadStatus =
    | 'NEW'
    | 'CALLING'
    | 'QUALIFIED'
    | 'FOLLOW_UP'
    | 'DISQUALIFIED'
    | 'NO_ANSWER';

export type CallStatus =
    | 'QUEUED'
    | 'RINGING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'NO_ANSWER'
    | 'FAILED';

/** Parsed shape of Lead.aiSummary (stored as a JSON string on the lead). */
export interface AiSummary {
    qualificationStatus: string;
    confirmedBudget: string;
    timeline: string;
    isDecisionMaker: boolean;
    location: string;
    keyRequirements: string;
    notes: string;
}

export interface CallAttempt {
    id: string;
    leadId: string;
    status: CallStatus;
    duration: number | null; // seconds
    startedAt: string; // ISO
    endedAt: string | null; // ISO
    provider: string;
    providerCallId: string | null;
}

export interface Lead {
    id: string;
    userId: string;
    name: string;
    phone: string;
    email: string | null;
    status: LeadStatus;
    score: number | null; // 0–100
    projectType: string | null;
    budget: string | null;
    source: string; // e.g. 'meta', 'manual'
    aiSummary: string | null; // JSON string of AiSummary
    transcript: string | null;
    recordingUrl: string | null;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    callAttempts?: CallAttempt[];
}

export interface MetaAccount {
    id: string;
    userId: string;
    pageId: string;
    pageName: string | null;
    accessToken: string | null;
    connectedAt: string; // ISO
}

export interface CustomQuestion {
    question: string;
    required: boolean;
}

export interface AgentConfig {
    userId: string;
    agentName: string;
    companyName: string;
    voiceProvider: string;
    voiceId: string;
    aiModel: string;
    maxCallDuration: number;
    firstMessage: string;
    customQuestions: CustomQuestion[];
}

export interface NotificationConfig {
    userId: string;
    slackWebhookUrl: string | null;
    telegramBotToken: string | null;
    telegramChatId: string | null;
}

export interface Analytics {
    totalLeads: number;
    qualifiedLeads: number;
    qualificationRate: number; // percentage 0–100
    averageScore: number;
}
