import { createAdminSupabase } from './supabase-server';
import type {
    Lead,
    CallAttempt,
    MetaAccount,
    AgentConfig,
    NotificationConfig,
    Analytics,
} from './types';

// ─────────────────────────────────────────────────────────────
// Supabase-backed persistence. Selected by store.ts when hasSupabase()
// is true. Mirrors the exports of store-memory.ts. Schema: supabase/schema.sql
// (snake_case columns ↔ camelCase domain types).
//
// Uses the service-role admin client (bypasses RLS) since these run
// server-side after the app has already authorized the user.
// ─────────────────────────────────────────────────────────────

function sb() {
    return createAdminSupabase();
}

function now() {
    return new Date().toISOString();
}

// ─── Mappers ───

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToLead(r: any, attempts: CallAttempt[] = []): Lead {
    return {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        phone: r.phone,
        email: r.email ?? null,
        status: r.status,
        score: r.score ?? null,
        projectType: r.project_type ?? null,
        budget: r.budget ?? null,
        source: r.source,
        // Column is jsonb; the app treats aiSummary as a JSON string.
        aiSummary: r.ai_summary != null ? JSON.stringify(r.ai_summary) : null,
        transcript: r.transcript ?? null,
        recordingUrl: r.recording_url ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        callAttempts: attempts,
    };
}

function leadPatchToRow(patch: Partial<Lead>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.score !== undefined) row.score = patch.score;
    if (patch.projectType !== undefined) row.project_type = patch.projectType;
    if (patch.budget !== undefined) row.budget = patch.budget;
    if (patch.source !== undefined) row.source = patch.source;
    if (patch.aiSummary !== undefined)
        row.ai_summary = patch.aiSummary ? JSON.parse(patch.aiSummary) : null;
    if (patch.transcript !== undefined) row.transcript = patch.transcript;
    if (patch.recordingUrl !== undefined) row.recording_url = patch.recordingUrl;
    return row;
}

function rowToAttempt(r: any): CallAttempt {
    return {
        id: r.id,
        leadId: r.lead_id,
        status: r.status,
        duration: r.duration ?? null,
        startedAt: r.started_at,
        endedAt: r.ended_at ?? null,
        provider: r.provider,
        providerCallId: r.provider_call_id ?? null,
    };
}

function rowToMetaAccount(r: any): MetaAccount {
    return {
        id: r.id,
        userId: r.user_id,
        pageId: r.page_id,
        pageName: r.page_name ?? null,
        accessToken: r.access_token ?? null,
        connectedAt: r.connected_at,
    };
}

function rowToAgentConfig(r: any): AgentConfig {
    return {
        userId: r.user_id,
        agentName: r.agent_name,
        companyName: r.company_name,
        voiceProvider: r.voice_provider,
        voiceId: r.voice_id,
        aiModel: r.ai_model,
        maxCallDuration: r.max_call_duration,
        firstMessage: r.first_message,
        customQuestions: Array.isArray(r.custom_questions) ? r.custom_questions : [],
    };
}

function rowToNotificationConfig(r: any): NotificationConfig {
    return {
        userId: r.user_id,
        slackWebhookUrl: r.slack_webhook_url ?? null,
        telegramBotToken: r.telegram_bot_token ?? null,
        telegramChatId: r.telegram_chat_id ?? null,
    };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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

async function attemptsFor(leadIds: string[]): Promise<Map<string, CallAttempt[]>> {
    const map = new Map<string, CallAttempt[]>();
    if (leadIds.length === 0) return map;
    const { data, error } = await sb()
        .from('call_attempts')
        .select('*')
        .in('lead_id', leadIds)
        .order('started_at', { ascending: false });
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
        const a = rowToAttempt(r);
        const list = map.get(a.leadId) ?? [];
        list.push(a);
        map.set(a.leadId, list);
    }
    return map;
}

// ─── Leads ───

export async function listLeads(
    userId: string,
    opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ leads: Lead[]; pagination: { total: number; limit: number; offset: number } }> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    let query = sb()
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (opts.status) query = query.eq('status', opts.status);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const attempts = await attemptsFor(rows.map((r) => r.id));
    const leads = rows.map((r) => rowToLead(r, attempts.get(r.id) ?? []));
    return { leads, pagination: { total: count ?? leads.length, limit, offset } };
}

export async function getLead(userId: string, id: string): Promise<Lead | null> {
    const { data, error } = await sb()
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const attempts = await attemptsFor([data.id]);
    return rowToLead(data, attempts.get(data.id) ?? []);
}

export async function getLeadByIdInternal(id: string): Promise<Lead | null> {
    const { data, error } = await sb().from('leads').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const attempts = await attemptsFor([data.id]);
    return rowToLead(data, attempts.get(data.id) ?? []);
}

export async function createLead(
    userId: string,
    data: Partial<Lead> & { name: string; phone: string; source?: string }
): Promise<Lead> {
    const row = {
        user_id: userId,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        status: data.status ?? 'NEW',
        score: data.score ?? null,
        project_type: data.projectType ?? null,
        budget: data.budget ?? null,
        source: data.source ?? 'manual',
        ai_summary: data.aiSummary ? JSON.parse(data.aiSummary) : null,
        transcript: data.transcript ?? null,
        recording_url: data.recordingUrl ?? null,
    };
    const { data: inserted, error } = await sb().from('leads').insert(row).select('*').single();
    if (error) throw new Error(error.message);
    return rowToLead(inserted, []);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
    const row = { ...leadPatchToRow(patch), updated_at: now() };
    const { data, error } = await sb()
        .from('leads')
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
        lead_id: leadId,
        status: data.status ?? 'QUEUED',
        duration: data.duration ?? null,
        started_at: data.startedAt ?? now(),
        ended_at: data.endedAt ?? null,
        provider: data.provider ?? 'vapi',
        provider_call_id: data.providerCallId ?? null,
    };
    const { data: inserted, error } = await sb()
        .from('call_attempts')
        .insert(row)
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToAttempt(inserted);
}

export async function updateCallAttempt(
    id: string,
    patch: Partial<CallAttempt>
): Promise<CallAttempt | null> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.duration !== undefined) row.duration = patch.duration;
    if (patch.endedAt !== undefined) row.ended_at = patch.endedAt;
    if (patch.providerCallId !== undefined) row.provider_call_id = patch.providerCallId;
    const { data, error } = await sb()
        .from('call_attempts')
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
        .from('call_attempts')
        .select('*')
        .eq('provider_call_id', providerCallId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToAttempt(data) : null;
}

export async function getCallAttemptById(id: string): Promise<CallAttempt | null> {
    const { data, error } = await sb()
        .from('call_attempts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToAttempt(data) : null;
}

// ─── Analytics ───

export async function getAnalytics(userId: string): Promise<Analytics> {
    const { data, error } = await sb().from('leads').select('status, score').eq('user_id', userId);
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
    const { data, error } = await sb().from('meta_accounts').select('*').eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToMetaAccount);
}

export async function getMetaAccountByPageId(pageId: string): Promise<MetaAccount | null> {
    const { data, error } = await sb()
        .from('meta_accounts')
        .select('*')
        .eq('page_id', pageId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToMetaAccount(data) : null;
}

export async function createMetaAccount(
    userId: string,
    data: { pageId: string; pageName?: string | null; accessToken?: string | null }
): Promise<MetaAccount> {
    const row = {
        user_id: userId,
        page_id: data.pageId,
        page_name: data.pageName ?? null,
        access_token: data.accessToken ?? null,
    };
    const { data: upserted, error } = await sb()
        .from('meta_accounts')
        .upsert(row, { onConflict: 'user_id,page_id' })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToMetaAccount(upserted);
}

export async function deleteMetaAccount(userId: string, id: string): Promise<boolean> {
    const { data, error } = await sb()
        .from('meta_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id');
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
}

// ─── Configs ───

export async function getAgentConfig(userId: string): Promise<AgentConfig> {
    const { data, error } = await sb()
        .from('agent_configs')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return rowToAgentConfig(data);
    // Seed defaults on first access.
    return updateAgentConfig(userId, defaultAgentConfig(userId));
}

export async function updateAgentConfig(
    userId: string,
    patch: Partial<AgentConfig>
): Promise<AgentConfig> {
    const row: Record<string, unknown> = { user_id: userId };
    if (patch.agentName !== undefined) row.agent_name = patch.agentName;
    if (patch.companyName !== undefined) row.company_name = patch.companyName;
    if (patch.voiceProvider !== undefined) row.voice_provider = patch.voiceProvider;
    if (patch.voiceId !== undefined) row.voice_id = patch.voiceId;
    if (patch.aiModel !== undefined) row.ai_model = patch.aiModel;
    if (patch.maxCallDuration !== undefined) row.max_call_duration = patch.maxCallDuration;
    if (patch.firstMessage !== undefined) row.first_message = patch.firstMessage;
    if (patch.customQuestions !== undefined) row.custom_questions = patch.customQuestions;

    const { data, error } = await sb()
        .from('agent_configs')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToAgentConfig(data);
}

export async function getNotificationConfig(userId: string): Promise<NotificationConfig> {
    const { data, error } = await sb()
        .from('notification_configs')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return rowToNotificationConfig(data);
    return { userId, slackWebhookUrl: null, telegramBotToken: null, telegramChatId: null };
}

export async function updateNotificationConfig(
    userId: string,
    patch: Partial<NotificationConfig>
): Promise<NotificationConfig> {
    const row = {
        user_id: userId,
        slack_webhook_url: patch.slackWebhookUrl ?? null,
        telegram_bot_token: patch.telegramBotToken ?? null,
        telegram_chat_id: patch.telegramChatId ?? null,
    };
    const { data, error } = await sb()
        .from('notification_configs')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return rowToNotificationConfig(data);
}
