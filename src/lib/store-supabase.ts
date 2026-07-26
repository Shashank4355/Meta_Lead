import { randomUUID } from 'crypto';
import { createAdminSupabase } from './supabase-server';
import type {
    Lead,
    CallAttempt,
    CallStatus,
    MetaAccount,
    AgentConfig,
    NotificationConfig,
    Analytics,
} from './types';

// ─────────────────────────────────────────────────────────────
// Supabase-backed persistence against the EXISTING (Prisma) schema.
//
// Tables are PascalCase with camelCase columns: Lead, CallAttempt,
// MetaAccount, VoiceAgentConfig, NotificationConfig, User. Ids are text
// (cuid); we generate our own on insert. Timestamps are "timestamp without
// time zone" — ISO strings are accepted.
//
// The `userId` passed to these functions is the INTERNAL User.id (a cuid),
// resolved from the Supabase auth id by auth.ts → ensureUser(). Lead/config/
// account rows all key off that internal id.
//
// Selected by store.ts when hasSupabase() is true. Uses the service-role
// admin client (bypasses RLS; runs server-side after the app authorizes).
// ─────────────────────────────────────────────────────────────

function sb() {
    return createAdminSupabase();
}
function now() {
    return new Date().toISOString();
}
function newId() {
    return randomUUID();
}

// ─── Enum mapping: domain CallStatus ↔ DB CallAttemptStatus ───
// DB enum: INITIATED | IN_PROGRESS | COMPLETED | FAILED | NO_ANSWER | VOICEMAIL
function callStatusToDb(s: CallStatus): string {
    switch (s) {
        case 'QUEUED':
        case 'RINGING':
            return 'INITIATED';
        default:
            return s; // IN_PROGRESS | COMPLETED | FAILED | NO_ANSWER
    }
}
function callStatusFromDb(s: string): CallStatus {
    switch (s) {
        case 'INITIATED':
            return 'RINGING';
        case 'VOICEMAIL':
            return 'NO_ANSWER';
        default:
            return s as CallStatus;
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mappers (DB row → domain) ───

function rowToLead(r: any, attempts: CallAttempt[] = []): Lead {
    return {
        id: r.id,
        userId: r.userId ?? '',
        name: r.name,
        phone: r.phone,
        email: r.email ?? null,
        status: r.status,
        score: r.score ?? null,
        projectType: r.projectType ?? null,
        budget: r.budget ?? null,
        source: r.metaLeadId && !String(r.metaLeadId).startsWith('manual_') ? 'meta' : 'manual',
        aiSummary: r.aiSummary ?? null, // column is text; already a JSON string
        transcript: r.transcript ?? null,
        recordingUrl: r.recordingUrl ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        callAttempts: attempts,
    };
}

function rowToAttempt(r: any): CallAttempt {
    return {
        id: r.id,
        leadId: r.leadId,
        status: callStatusFromDb(r.status),
        duration: r.duration ?? null,
        startedAt: r.startedAt,
        endedAt: r.endedAt ?? null,
        provider: 'vapi',
        providerCallId: r.vapiCallId ?? null,
    };
}

function rowToMetaAccount(r: any): MetaAccount {
    return {
        id: r.id,
        userId: r.userId,
        pageId: r.pageId,
        pageName: r.pageName ?? null,
        accessToken: r.pageAccessToken ?? null,
        connectedAt: r.connectedAt,
    };
}

function rowToAgentConfig(r: any): AgentConfig {
    return {
        userId: r.userId,
        agentName: r.agentName ?? 'Priya',
        companyName: r.companyName ?? 'Vector Lead',
        voiceProvider: r.voiceProvider ?? 'vapi',
        voiceId: r.voiceId ?? 'Elliot',
        aiModel: r.aiModel ?? 'claude-opus-4-8',
        maxCallDuration: r.maxCallDuration ?? 600,
        firstMessage: r.firstMessage ?? 'Hi, am I speaking with {{name}}?',
        customQuestions: Array.isArray(r.customQuestions) ? r.customQuestions : [],
    };
}

function rowToNotificationConfig(r: any): NotificationConfig {
    return {
        userId: r.userId,
        slackWebhookUrl: r.slackWebhookUrl ?? null,
        telegramBotToken: r.telegramBotToken ?? null,
        telegramChatId: r.telegramChatId ?? null,
    };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function attemptsFor(leadIds: string[]): Promise<Map<string, CallAttempt[]>> {
    const map = new Map<string, CallAttempt[]>();
    if (leadIds.length === 0) return map;
    const { data, error } = await sb()
        .from('CallAttempt')
        .select('*')
        .in('leadId', leadIds)
        .order('startedAt', { ascending: false });
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
        const a = rowToAttempt(r);
        const list = map.get(a.leadId) ?? [];
        list.push(a);
        map.set(a.leadId, list);
    }
    return map;
}

// ─── User indirection ───

/** Map a Supabase auth id to the internal User.id, creating the row if needed. */
export async function ensureUser(authId: string, email: string | null): Promise<string> {
    const { data, error } = await sb()
        .from('User')
        .select('id')
        .eq('supabaseId', authId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data.id;

    const id = newId();
    const ts = now();
    const { data: ins, error: insErr } = await sb()
        .from('User')
        .insert({ id, supabaseId: authId, email, createdAt: ts, updatedAt: ts })
        .select('id')
        .single();
    if (insErr) throw new Error(insErr.message);
    return ins.id;
}

// ─── Leads ───

export async function listLeads(
    userId: string,
    opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ leads: Lead[]; pagination: { total: number; limit: number; offset: number } }> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    let query = sb()
        .from('Lead')
        .select('*', { count: 'exact' })
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);
    if (opts.status) query = query.eq('status', opts.status);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const attempts = await attemptsFor(rows.map((r) => r.id));
    return {
        leads: rows.map((r) => rowToLead(r, attempts.get(r.id) ?? [])),
        pagination: { total: count ?? rows.length, limit, offset },
    };
}

export async function getLead(userId: string, id: string): Promise<Lead | null> {
    const { data, error } = await sb()
        .from('Lead')
        .select('*')
        .eq('id', id)
        .eq('userId', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const attempts = await attemptsFor([data.id]);
    return rowToLead(data, attempts.get(data.id) ?? []);
}

export async function getLeadByIdInternal(id: string): Promise<Lead | null> {
    const { data, error } = await sb().from('Lead').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const attempts = await attemptsFor([data.id]);
    return rowToLead(data, attempts.get(data.id) ?? []);
}

export async function createLead(
    userId: string,
    data: Partial<Lead> & { name: string; phone: string; source?: string }
): Promise<Lead> {
    const id = newId();
    const ts = now();

    // Guard against a non-existent owner (e.g. the mock DEMO_USER id reaching
    // a webhook in live mode): store the lead unowned rather than violate the
    // User foreign key. Matches the existing ownerless-lead pattern.
    let ownerId: string | null = userId || null;
    if (ownerId) {
        const u = await sb().from('User').select('id').eq('id', ownerId).maybeSingle();
        if (!u.data) ownerId = null;
    }

    const row = {
        id,
        userId: ownerId,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        // metaLeadId is likely NOT NULL/unique in the source schema; keep it
        // unique per row. Manual/n8n leads get a `manual_`-prefixed id.
        metaLeadId: (data as { metaLeadId?: string }).metaLeadId ?? `manual_${id}`,
        formAnswers: {},
        projectType: data.projectType ?? null,
        budget: data.budget ?? null,
        status: data.status ?? 'NEW',
        score: data.score ?? null,
        aiSummary: data.aiSummary ?? null,
        transcript: data.transcript ?? null,
        recordingUrl: data.recordingUrl ?? null,
        createdAt: ts,
        updatedAt: ts,
    };
    const { data: ins, error } = await sb().from('Lead').insert(row).select('*').single();
    if (error) throw new Error(error.message);
    return rowToLead(ins, []);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
    const row: Record<string, unknown> = { updatedAt: now() };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.status !== undefined) {
        row.status = patch.status;
        if (patch.status === 'QUALIFIED') row.qualifiedAt = now();
    }
    if (patch.score !== undefined) row.score = patch.score;
    if (patch.projectType !== undefined) row.projectType = patch.projectType;
    if (patch.budget !== undefined) row.budget = patch.budget;
    if (patch.aiSummary !== undefined) row.aiSummary = patch.aiSummary;
    if (patch.transcript !== undefined) row.transcript = patch.transcript;
    if (patch.recordingUrl !== undefined) row.recordingUrl = patch.recordingUrl;

    const { data, error } = await sb()
        .from('Lead')
        .update(row)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const attempts = await attemptsFor([data.id]);
    return rowToLead(data, attempts.get(data.id) ?? []);
}

// ─── Call attempts ───

export async function createCallAttempt(
    leadId: string,
    data: Partial<CallAttempt> = {}
): Promise<CallAttempt> {
    const row = {
        id: newId(),
        leadId,
        vapiCallId: data.providerCallId ?? null,
        status: callStatusToDb(data.status ?? 'QUEUED'),
        duration: data.duration ?? null,
        startedAt: data.startedAt ?? now(),
        endedAt: data.endedAt ?? null,
    };
    const { data: ins, error } = await sb()
        .from('CallAttempt')
        .insert(row)
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToAttempt(ins);
}

export async function updateCallAttempt(
    id: string,
    patch: Partial<CallAttempt>
): Promise<CallAttempt | null> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = callStatusToDb(patch.status);
    if (patch.duration !== undefined) row.duration = patch.duration;
    if (patch.endedAt !== undefined) row.endedAt = patch.endedAt;
    if (patch.providerCallId !== undefined) row.vapiCallId = patch.providerCallId;

    const { data, error } = await sb()
        .from('CallAttempt')
        .update(row)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToAttempt(data) : null;
}

export async function findCallAttemptByProviderId(
    providerCallId: string
): Promise<CallAttempt | null> {
    const { data, error } = await sb()
        .from('CallAttempt')
        .select('*')
        .eq('vapiCallId', providerCallId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToAttempt(data) : null;
}

export async function getCallAttemptById(id: string): Promise<CallAttempt | null> {
    const { data, error } = await sb().from('CallAttempt').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToAttempt(data) : null;
}

// ─── Analytics ───

export async function getAnalytics(userId: string): Promise<Analytics> {
    const { data, error } = await sb().from('Lead').select('status, score').eq('userId', userId);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
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
    const { data, error } = await sb().from('MetaAccount').select('*').eq('userId', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToMetaAccount);
}

export async function getMetaAccountByPageId(pageId: string): Promise<MetaAccount | null> {
    const { data, error } = await sb()
        .from('MetaAccount')
        .select('*')
        .eq('pageId', pageId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToMetaAccount(data) : null;
}

export async function createMetaAccount(
    userId: string,
    data: { pageId: string; pageName?: string | null; accessToken?: string | null }
): Promise<MetaAccount> {
    const existing = await sb()
        .from('MetaAccount')
        .select('*')
        .eq('userId', userId)
        .eq('pageId', data.pageId)
        .maybeSingle();
    if (existing.data) {
        const { data: upd, error } = await sb()
            .from('MetaAccount')
            .update({
                pageName: data.pageName ?? existing.data.pageName,
                pageAccessToken: data.accessToken ?? existing.data.pageAccessToken,
                updatedAt: now(),
            })
            .eq('id', existing.data.id)
            .select('*')
            .single();
        if (error) throw new Error(error.message);
        return rowToMetaAccount(upd);
    }
    const ts = now();
    const { data: ins, error } = await sb()
        .from('MetaAccount')
        .insert({
            id: newId(),
            userId,
            pageId: data.pageId,
            pageName: data.pageName ?? null,
            pageAccessToken: data.accessToken ?? null,
            status: 'CONNECTED',
            connectedAt: ts,
            updatedAt: ts,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToMetaAccount(ins);
}

export async function deleteMetaAccount(userId: string, id: string): Promise<boolean> {
    const { data, error } = await sb()
        .from('MetaAccount')
        .delete()
        .eq('id', id)
        .eq('userId', userId)
        .select('id');
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
}

// ─── Configs (get-or-create; one row per user) ───

export async function getAgentConfig(userId: string): Promise<AgentConfig> {
    const { data, error } = await sb()
        .from('VoiceAgentConfig')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return rowToAgentConfig(data);
    return updateAgentConfig(userId, {});
}

export async function updateAgentConfig(
    userId: string,
    patch: Partial<AgentConfig>
): Promise<AgentConfig> {
    const existing = await sb()
        .from('VoiceAgentConfig')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    const fields: Record<string, unknown> = {};
    if (patch.agentName !== undefined) fields.agentName = patch.agentName;
    if (patch.companyName !== undefined) fields.companyName = patch.companyName;
    if (patch.voiceProvider !== undefined) fields.voiceProvider = patch.voiceProvider;
    if (patch.voiceId !== undefined) fields.voiceId = patch.voiceId;
    if (patch.aiModel !== undefined) fields.aiModel = patch.aiModel;
    if (patch.maxCallDuration !== undefined) fields.maxCallDuration = patch.maxCallDuration;
    if (patch.firstMessage !== undefined) fields.firstMessage = patch.firstMessage;
    if (patch.customQuestions !== undefined) fields.customQuestions = patch.customQuestions;

    if (existing.data) {
        const { data, error } = await sb()
            .from('VoiceAgentConfig')
            .update({ ...fields, updatedAt: now() })
            .eq('id', existing.data.id)
            .select('*')
            .single();
        if (error) throw new Error(error.message);
        return rowToAgentConfig(data);
    }

    const ts = now();
    const { data, error } = await sb()
        .from('VoiceAgentConfig')
        .insert({
            id: newId(),
            userId,
            agentName: fields.agentName ?? 'Priya',
            companyName: fields.companyName ?? 'Vector Lead',
            voiceProvider: fields.voiceProvider ?? 'vapi',
            voiceId: fields.voiceId ?? 'Elliot',
            aiModel: fields.aiModel ?? 'claude-opus-4-8',
            maxCallDuration: fields.maxCallDuration ?? 600,
            firstMessage: fields.firstMessage ?? 'Hi, am I speaking with {{name}}?',
            customQuestions: fields.customQuestions ?? [],
            createdAt: ts,
            updatedAt: ts,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToAgentConfig(data);
}

export async function getNotificationConfig(userId: string): Promise<NotificationConfig> {
    const { data, error } = await sb()
        .from('NotificationConfig')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return rowToNotificationConfig(data);
    return { userId, slackWebhookUrl: null, telegramBotToken: null, telegramChatId: null };
}

export async function updateNotificationConfig(
    userId: string,
    patch: Partial<NotificationConfig>
): Promise<NotificationConfig> {
    const existing = await sb()
        .from('NotificationConfig')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    const fields = {
        slackWebhookUrl: patch.slackWebhookUrl ?? null,
        telegramBotToken: patch.telegramBotToken ?? null,
        telegramChatId: patch.telegramChatId ?? null,
    };

    if (existing.data) {
        const { data, error } = await sb()
            .from('NotificationConfig')
            .update({ ...fields, updatedAt: now() })
            .eq('id', existing.data.id)
            .select('*')
            .single();
        if (error) throw new Error(error.message);
        return rowToNotificationConfig(data);
    }

    const ts = now();
    const { data, error } = await sb()
        .from('NotificationConfig')
        .insert({ id: newId(), userId, ...fields, createdAt: ts, updatedAt: ts })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToNotificationConfig(data);
}
