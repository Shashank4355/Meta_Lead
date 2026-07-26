import { createClient, isSupabaseConfigured } from './supabase';

// The API now lives in this same Next.js app (src/app/api/**), so requests are
// relative by default. Override NEXT_PUBLIC_API_URL only to point at a separate
// backend host.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
    // Demo mode: no Supabase configured. Skip session lookup entirely —
    // createClient() would throw with empty URL/key.
    if (!isSupabaseConfigured) {
        return { 'Content-Type': 'application/json' };
    }

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function api<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `API Error: ${res.status}`);
    }

    return res.json();
}

// ─── Leads ───
export const fetchLeads = (params?: string) =>
    api<{ leads: unknown[]; pagination: unknown }>(`/api/leads${params ? `?${params}` : ''}`);

export const fetchLead = (id: string) =>
    api<{ lead: unknown }>(`/api/leads/${id}`);

export const triggerCall = (leadId: string) =>
    api<{ success: boolean }>(`/api/leads/${leadId}/call`, { method: 'POST' });

// ─── Analytics ───
export const fetchAnalytics = () =>
    api<Record<string, number>>('/api/analytics');

// ─── Settings ───
export const fetchMetaAccounts = () =>
    api<{ accounts: unknown[] }>('/api/settings/meta');

export const getMetaLoginUrl = () =>
    api<{ url: string }>('/api/meta/auth/login');

export const disconnectMeta = (id: string) =>
    api<{ success: boolean }>(`/api/settings/meta/${id}`, { method: 'DELETE' });

export const fetchAgentConfig = () =>
    api<{ config: Record<string, unknown> }>('/api/settings/agent');

export const updateAgentConfig = (data: Record<string, unknown>) =>
    api<{ config: Record<string, unknown> }>('/api/settings/agent', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const fetchNotificationConfig = () =>
    api<{ config: Record<string, unknown> }>('/api/settings/notifications');

export const updateNotificationConfig = (data: Record<string, unknown>) =>
    api<{ config: Record<string, unknown> }>('/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

// ─── User ───
export const fetchMe = () => api<{ user: unknown }>('/api/me');
