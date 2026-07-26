import { randomUUID } from 'crypto';
import type {
    Lead,
    CallAttempt,
    MetaAccount,
    AgentConfig,
    NotificationConfig,
    Analytics,
    LeadStatus,
} from './types';
import { DEMO_USER } from './config';

// ─────────────────────────────────────────────────────────────
// In-memory store (mock persistence).
//
// This is the working data engine used in mock mode. It is intentionally
// the single seam for persistence: to move to Supabase, reimplement these
// exported functions against the DB (schema in supabase/schema.sql) — the
// route handlers call only this module and never touch the DB directly.
//
// Data is held on globalThis so it survives Next.js dev hot-reloads.
// It is per-process and resets on server restart (fine for demo/dev).
// ─────────────────────────────────────────────────────────────

interface Db {
    leads: Lead[];
    callAttempts: CallAttempt[];
    metaAccounts: MetaAccount[];
    agentConfigs: Record<string, AgentConfig>;
    notificationConfigs: Record<string, NotificationConfig>;
}

const g = globalThis as unknown as { __vectorLeadDb?: Db };

function now() {
    return new Date().toISOString();
}

function defaultAgentConfig(userId: string): AgentConfig {
    return {
        userId,
        agentName: 'Priya',
        companyName: 'Vector Lead',
        voiceProvider: 'vapi',
        voiceId: 'Elliot',
        aiModel: 'claude-opus-4-8',
        maxCallDuration: 600,
        firstMessage: 'Hi, am I speaking with {{name}}?',
        customQuestions: [
            { question: 'What is your budget for this project?', required: true },
            { question: 'What is your ideal timeline?', required: true },
            { question: 'Are you the decision maker?', required: false },
        ],
    };
}

function defaultNotificationConfig(userId: string): NotificationConfig {
    return { userId, slackWebhookUrl: null, telegramBotToken: null, telegramChatId: null };
}

function seed(): Db {
    const userId = DEMO_USER.id;
    const base = Date.now();
    const mk = (
        i: number,
        name: string,
        phone: string,
        status: LeadStatus,
        extra: Partial<Lead>
    ): Lead => ({
        id: `seed-${i}`,
        userId,
        name,
        phone,
        email: extra.email ?? null,
        status,
        score: extra.score ?? null,
        projectType: extra.projectType ?? null,
        budget: extra.budget ?? null,
        source: 'meta',
        aiSummary: extra.aiSummary ?? null,
        transcript: extra.transcript ?? null,
        recordingUrl: extra.recordingUrl ?? null,
        createdAt: new Date(base - i * 3600_000).toISOString(),
        updatedAt: new Date(base - i * 3600_000).toISOString(),
    });

    const leads: Lead[] = [
        mk(1, 'Amit Sharma', '+91 98765 43210', 'QUALIFIED', {
            email: 'amit@example.com',
            score: 87,
            projectType: '3BHK Apartment',
            budget: '₹1.2 Cr',
            aiSummary: JSON.stringify({
                qualificationStatus: 'Qualified',
                confirmedBudget: '₹1.2 Cr',
                timeline: 'Within 3 months',
                isDecisionMaker: true,
                location: 'Pune',
                keyRequirements: 'Sea-facing, 3BHK, ready to move',
                notes: 'Strong buyer, financing pre-approved.',
            }),
            transcript:
                'Agent: Hi, am I speaking with Amit?\nAmit: Yes, speaking.\nAgent: Great — are you looking for a 3BHK?\nAmit: Yes, budget around 1.2 crore, want to close in three months.',
        }),
        mk(2, 'Neha Verma', '+91 99887 66554', 'FOLLOW_UP', {
            email: 'neha@example.com',
            score: 62,
            projectType: 'Villa',
            budget: '₹2.5 Cr',
            aiSummary: JSON.stringify({
                qualificationStatus: 'Needs follow-up',
                confirmedBudget: 'Not confirmed',
                timeline: '6–12 months',
                isDecisionMaker: false,
                location: 'Bangalore',
                keyRequirements: 'Villa with garden',
                notes: 'Spouse is co-decision maker; call back next week.',
            }),
        }),
        mk(3, 'Rahul Mehta', '+91 91234 56780', 'NEW', {
            email: 'rahul@example.com',
            projectType: '2BHK Apartment',
        }),
        mk(4, 'Priya Nair', '+91 90000 11111', 'DISQUALIFIED', {
            score: 21,
            projectType: 'Commercial',
            aiSummary: JSON.stringify({
                qualificationStatus: 'Disqualified',
                confirmedBudget: 'Below range',
                timeline: 'No timeline',
                isDecisionMaker: true,
                location: 'Delhi',
                keyRequirements: 'Just browsing',
                notes: 'Budget far below project minimum.',
            }),
        }),
        mk(5, 'Sanjay Gupta', '+91 98111 22333', 'NO_ANSWER', { projectType: '3BHK Apartment' }),
    ];

    const callAttempts: CallAttempt[] = [
        {
            id: 'seed-call-1',
            leadId: 'seed-1',
            status: 'COMPLETED',
            duration: 214,
            startedAt: new Date(base - 3500_000).toISOString(),
            endedAt: new Date(base - 3286_000).toISOString(),
            provider: 'vapi',
            providerCallId: 'mock-call-1',
        },
        {
            id: 'seed-call-2',
            leadId: 'seed-5',
            status: 'NO_ANSWER',
            duration: null,
            startedAt: new Date(base - 1800_000).toISOString(),
            endedAt: new Date(base - 1790_000).toISOString(),
            provider: 'vapi',
            providerCallId: 'mock-call-2',
        },
    ];

    return {
        leads,
        callAttempts,
        metaAccounts: [
            {
                id: 'seed-meta-1',
                userId,
                pageId: '1029384756',
                pageName: 'Vector Realty — Ads',
                accessToken: null,
                connectedAt: new Date(base - 7 * 86400_000).toISOString(),
            },
        ],
        agentConfigs: { [userId]: defaultAgentConfig(userId) },
        notificationConfigs: { [userId]: defaultNotificationConfig(userId) },
    };
}

function db(): Db {
    if (!g.__vectorLeadDb) g.__vectorLeadDb = seed();
    return g.__vectorLeadDb;
}

function withAttempts(lead: Lead): Lead {
    const attempts = db()
        .callAttempts.filter((c) => c.leadId === lead.id)
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    return { ...lead, callAttempts: attempts };
}

// ─── Leads ───

export async function listLeads(
    userId: string,
    opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ leads: Lead[]; pagination: { total: number; limit: number; offset: number } }> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    let rows = db()
        .leads.filter((l) => l.userId === userId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (opts.status) rows = rows.filter((l) => l.status === opts.status);
    const total = rows.length;
    return {
        leads: rows.slice(offset, offset + limit).map(withAttempts),
        pagination: { total, limit, offset },
    };
}

export async function getLead(userId: string, id: string): Promise<Lead | null> {
    const lead = db().leads.find((l) => l.id === id && l.userId === userId);
    return lead ? withAttempts(lead) : null;
}

/** Unscoped lookup for webhooks (no session context). */
export async function getLeadByIdInternal(id: string): Promise<Lead | null> {
    const lead = db().leads.find((l) => l.id === id);
    return lead ? withAttempts(lead) : null;
}

export async function createLead(
    userId: string,
    data: Partial<Lead> & { name: string; phone: string; source?: string }
): Promise<Lead> {
    const ts = now();
    const lead: Lead = {
        id: randomUUID(),
        userId,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        status: data.status ?? 'NEW',
        score: data.score ?? null,
        projectType: data.projectType ?? null,
        budget: data.budget ?? null,
        source: data.source ?? 'manual',
        aiSummary: data.aiSummary ?? null,
        transcript: data.transcript ?? null,
        recordingUrl: data.recordingUrl ?? null,
        createdAt: ts,
        updatedAt: ts,
    };
    db().leads.unshift(lead);
    return withAttempts(lead);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
    const lead = db().leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch, { updatedAt: now() });
    return withAttempts(lead);
}

// ─── Call attempts ───

export async function createCallAttempt(
    leadId: string,
    data: Partial<CallAttempt> = {}
): Promise<CallAttempt> {
    const attempt: CallAttempt = {
        id: randomUUID(),
        leadId,
        status: data.status ?? 'QUEUED',
        duration: data.duration ?? null,
        startedAt: data.startedAt ?? now(),
        endedAt: data.endedAt ?? null,
        provider: data.provider ?? 'vapi',
        providerCallId: data.providerCallId ?? null,
    };
    db().callAttempts.push(attempt);
    return attempt;
}

export async function updateCallAttempt(
    id: string,
    patch: Partial<CallAttempt>
): Promise<CallAttempt | null> {
    const attempt = db().callAttempts.find((c) => c.id === id);
    if (!attempt) return null;
    Object.assign(attempt, patch);
    return attempt;
}

export async function findCallAttemptByProviderId(
    providerCallId: string
): Promise<CallAttempt | null> {
    return db().callAttempts.find((c) => c.providerCallId === providerCallId) ?? null;
}

export async function getCallAttemptById(id: string): Promise<CallAttempt | null> {
    return db().callAttempts.find((c) => c.id === id) ?? null;
}

// ─── Analytics ───

export async function getAnalytics(userId: string): Promise<Analytics> {
    const rows = db().leads.filter((l) => l.userId === userId);
    const total = rows.length;
    const qualified = rows.filter((l) => l.status === 'QUALIFIED').length;
    const scored = rows.filter((l) => l.score != null);
    const avg = scored.length
        ? Math.round(scored.reduce((s, l) => s + (l.score as number), 0) / scored.length)
        : 0;
    return {
        totalLeads: total,
        qualifiedLeads: qualified,
        qualificationRate: total ? Math.round((qualified / total) * 100) : 0,
        averageScore: avg,
    };
}

// ─── Meta accounts ───

export async function listMetaAccounts(userId: string): Promise<MetaAccount[]> {
    return db().metaAccounts.filter((a) => a.userId === userId);
}

export async function getMetaAccountByPageId(pageId: string): Promise<MetaAccount | null> {
    return db().metaAccounts.find((a) => a.pageId === pageId) ?? null;
}

export async function createMetaAccount(
    userId: string,
    data: { pageId: string; pageName?: string | null; accessToken?: string | null }
): Promise<MetaAccount> {
    const existing = db().metaAccounts.find(
        (a) => a.userId === userId && a.pageId === data.pageId
    );
    if (existing) {
        existing.pageName = data.pageName ?? existing.pageName;
        existing.accessToken = data.accessToken ?? existing.accessToken;
        return existing;
    }
    const account: MetaAccount = {
        id: randomUUID(),
        userId,
        pageId: data.pageId,
        pageName: data.pageName ?? null,
        accessToken: data.accessToken ?? null,
        connectedAt: now(),
    };
    db().metaAccounts.push(account);
    return account;
}

export async function deleteMetaAccount(userId: string, id: string): Promise<boolean> {
    const list = db().metaAccounts;
    const idx = list.findIndex((a) => a.id === id && a.userId === userId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
}

// ─── Configs ───

export async function getAgentConfig(userId: string): Promise<AgentConfig> {
    const store = db().agentConfigs;
    if (!store[userId]) store[userId] = defaultAgentConfig(userId);
    return store[userId];
}

export async function updateAgentConfig(
    userId: string,
    patch: Partial<AgentConfig>
): Promise<AgentConfig> {
    const current = await getAgentConfig(userId);
    const next = { ...current, ...patch, userId };
    db().agentConfigs[userId] = next;
    return next;
}

export async function getNotificationConfig(userId: string): Promise<NotificationConfig> {
    const store = db().notificationConfigs;
    if (!store[userId]) store[userId] = defaultNotificationConfig(userId);
    return store[userId];
}

export async function updateNotificationConfig(
    userId: string,
    patch: Partial<NotificationConfig>
): Promise<NotificationConfig> {
    const current = await getNotificationConfig(userId);
    const next = { ...current, ...patch, userId };
    db().notificationConfigs[userId] = next;
    return next;
}
